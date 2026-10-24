"""Event CRUD endpoints with role and ownership checks."""
import logging
from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

try:
    from backend.database import engine
    from backend.routes.auth import get_current_user
except ImportError:
    from database import engine
    from routes.auth import get_current_user

router = APIRouter(prefix="/api/events", tags=["Events"])
logger = logging.getLogger("eventilion_api")


def get_user_role(user) -> str:
    try:
        with engine.connect() as conn:
            role = conn.execute(
                text("SELECT role FROM public.profiles WHERE id = :user_id"),
                {"user_id": str(user.id)},
            ).scalar_one_or_none()
    except Exception:
        logger.exception("Could not verify user role")
        raise HTTPException(status_code=503, detail="Could not verify permissions")

    if role not in ("admin", "organizer"):
        raise HTTPException(status_code=403, detail="User profile or role not found")
    return role


def require_event_manager(user=Depends(get_current_user)):
    get_user_role(user)
    return user


class EventCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: Optional[str] = None
    category_id: Optional[int] = Field(default=None, gt=0)
    venue_id: Optional[int] = Field(default=None, gt=0)
    start_time: datetime
    end_time: datetime
    ticket_price: Decimal = Field(ge=0)
    capacity: int = Field(gt=0)
    status: str = "published"


class EventUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    description: Optional[str] = None
    category_id: Optional[int] = Field(default=None, gt=0)
    venue_id: Optional[int] = Field(default=None, gt=0)
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    ticket_price: Optional[Decimal] = Field(default=None, ge=0)
    capacity: Optional[int] = Field(default=None, gt=0)
    status: Optional[str] = None


class EventVendorCreate(BaseModel):
    vendor_id: int = Field(gt=0)
    agreed_cost: Decimal = Field(default=Decimal("0"), ge=0)



# Event rows with category/venue names and ticket totals, used by the list endpoints
EVENT_LIST_SQL = """
    SELECT e.event_id, e.title, e.description, e.organizer_id,
           e.category_id, e.venue_id, e.start_time, e.end_time,
           e.ticket_price, e.capacity, e.status, e.created_at,
           COALESCE(c.name, 'Uncategorized') AS category,
           COALESCE(v.name, 'Unassigned')    AS venue,
           COALESCE(v.city, 'N/A')           AS city,
           COALESCE(SUM(b.ticket_quantity) FILTER (WHERE b.status <> 'cancelled'), 0) AS tickets_sold,
           COALESCE(SUM(b.total_amount)   FILTER (WHERE b.status <> 'cancelled'), 0) AS revenue
    FROM events e
    LEFT JOIN categories c ON c.category_id = e.category_id
    LEFT JOIN venues     v ON v.venue_id    = e.venue_id
    LEFT JOIN bookings   b ON b.event_id    = e.event_id
    {where}
    GROUP BY e.event_id, c.name, v.name, v.city
    ORDER BY e.start_time
"""


EVENT_COLUMNS = """
    event_id, title, description, organizer_id, category_id, venue_id,
    start_time, end_time, ticket_price, capacity, status, created_at
"""


@router.get("")
def list_events():
    """Public list of all events with category, venue and city names."""
    try:
        with engine.connect() as conn:
            rows = conn.execute(text(EVENT_LIST_SQL.format(where=""))).mappings().all()
            return [dict(row) for row in rows]
    except Exception:
        logger.exception("Could not list events")
        raise HTTPException(status_code=503, detail="Could not load events")


@router.get("/{event_id}")
def get_event(event_id: int):
    try:
        with engine.connect() as conn:
            row = conn.execute(
                text(f"SELECT {EVENT_COLUMNS} FROM events WHERE event_id = :event_id"),
                {"event_id": event_id},
            ).mappings().one_or_none()
    except Exception:
        logger.exception("Could not load event")
        raise HTTPException(status_code=503, detail="Could not load event")

    if row is None:
        raise HTTPException(status_code=404, detail="Event not found")
    return dict(row)


@router.post("", status_code=status.HTTP_201_CREATED)
def create_event(event: EventCreate, user=Depends(require_event_manager)):
    """Create an event; organizer_id always comes from the verified token."""
    role = get_user_role(user)
    values = event.model_dump()
    if values["end_time"] <= values["start_time"]:
        raise HTTPException(status_code=400, detail="end_time must be after start_time")

    try:
        with engine.begin() as conn:
            row = conn.execute(
                text(f"""
                    INSERT INTO events
                    (title, description, organizer_id, category_id, venue_id,
                     start_time, end_time, ticket_price, capacity, status)
                    VALUES
                    (:title, :description, :organizer_id, :category_id, :venue_id,
                     :start_time, :end_time, :ticket_price, :capacity, :status)
                    RETURNING {EVENT_COLUMNS}
                """),
                {**values, "organizer_id": str(user.id)},
            ).mappings().one()
            return dict(row)
    except IntegrityError:
        raise HTTPException(status_code=400, detail="Invalid category or venue")
    except HTTPException:
        raise
    except Exception:
        logger.exception("Could not create event")
        raise HTTPException(status_code=503, detail="Could not create event")


@router.put("/{event_id}")
def update_event(event_id: int, changes: EventUpdate, user=Depends(require_event_manager)):
    role = get_user_role(user)
    updates = changes.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields provided")
    if "start_time" in updates and updates["start_time"] is None:
        raise HTTPException(status_code=400, detail="start_time cannot be null")
    if "end_time" in updates and updates["end_time"] is None:
        raise HTTPException(status_code=400, detail="end_time cannot be null")

    allowed = {"title", "description", "category_id", "venue_id", "start_time",
               "end_time", "ticket_price", "capacity", "status"}
    updates = {key: value for key, value in updates.items() if key in allowed}

    try:
        with engine.begin() as conn:
            existing = conn.execute(
                text("SELECT organizer_id, start_time, end_time FROM events WHERE event_id = :id"),
                {"id": event_id},
            ).mappings().one_or_none()
            if existing is None:
                raise HTTPException(status_code=404, detail="Event not found")
            if role != "admin" and str(existing["organizer_id"]) != str(user.id):
                raise HTTPException(status_code=403, detail="You can only edit your own events")

            start_time = updates.get("start_time", existing["start_time"])
            end_time = updates.get("end_time", existing["end_time"])
            if start_time is not None and end_time is not None and end_time <= start_time:
                raise HTTPException(status_code=400, detail="end_time must be after start_time")

            assignments = ", ".join(f"{key} = :{key}" for key in updates)
            row = conn.execute(
                text(f"UPDATE events SET {assignments} WHERE event_id = :id RETURNING {EVENT_COLUMNS}"),
                {**updates, "id": event_id},
            ).mappings().one()
            return dict(row)
    except HTTPException:
        raise
    except IntegrityError:
        raise HTTPException(status_code=400, detail="Invalid event data")
    except Exception:
        logger.exception("Could not update event")
        raise HTTPException(status_code=503, detail="Could not update event")


@router.delete("/{event_id}")
def delete_event(event_id: int, user=Depends(require_event_manager)):
    role = get_user_role(user)
    try:
        with engine.begin() as conn:
            existing = conn.execute(
                text("SELECT organizer_id FROM events WHERE event_id = :id"),
                {"id": event_id},
            ).mappings().one_or_none()
            if existing is None:
                raise HTTPException(status_code=404, detail="Event not found")
            if role != "admin" and str(existing["organizer_id"]) != str(user.id):
                raise HTTPException(status_code=403, detail="You can only delete your own events")

            conn.execute(text("DELETE FROM events WHERE event_id = :id"), {"id": event_id})
            return {"message": "Event deleted successfully", "event_id": event_id}
    except HTTPException:
        raise
    except IntegrityError:
        raise HTTPException(status_code=409, detail="Event cannot be deleted because it is in use")
    except Exception:
        logger.exception("Could not delete event")
        raise HTTPException(status_code=503, detail="Could not delete event")


@router.get("/{event_id}/vendors")
def get_event_vendors(
    event_id: int,
    user=Depends(require_event_manager),
):
    """List vendors selected for an event the user is allowed to manage."""
    role = get_user_role(user)

    try:
        with engine.connect() as conn:
            event = conn.execute(
                text("""
                    SELECT organizer_id
                    FROM events
                    WHERE event_id = :event_id
                """),
                {"event_id": event_id},
            ).mappings().one_or_none()

            if event is None:
                raise HTTPException(status_code=404, detail="Event not found")

            if role != "admin" and str(event["organizer_id"]) != str(user.id):
                raise HTTPException(
                    status_code=403,
                    detail="You can only view vendors for your own events",
                )

            rows = conn.execute(
                text("""
                    SELECT
                        ev.event_id,
                        ev.vendor_id,
                        v.vendor_name,
                        ev.service_id,
                        s.service_name,
                        ev.agreed_cost,
                        ev.booking_status,
                        ev.created_at
                    FROM event_vendors ev
                    JOIN vendors v ON v.vendor_id = ev.vendor_id
                    JOIN services s ON s.service_id = ev.service_id
                    WHERE ev.event_id = :event_id
                    ORDER BY s.service_name, v.vendor_name
                """),
                {"event_id": event_id},
            ).mappings().all()

            return [dict(row) for row in rows]

    except HTTPException:
        raise
    except Exception:
        logger.exception("Could not load event vendors")
        raise HTTPException(
            status_code=503,
            detail="Could not load event vendors",
        )


@router.post("/{event_id}/vendors", status_code=status.HTTP_201_CREATED)
def add_vendor_to_event(
    event_id: int,
    data: EventVendorCreate,
    user=Depends(require_event_manager),
):
    """Add a vendor, allowing at most one vendor per service per event."""
    role = get_user_role(user)

    try:
        with engine.begin() as conn:
            event = conn.execute(
                text("""
                    SELECT organizer_id
                    FROM events
                    WHERE event_id = :event_id
                """),
                {"event_id": event_id},
            ).mappings().one_or_none()

            if event is None:
                raise HTTPException(status_code=404, detail="Event not found")

            if role != "admin" and str(event["organizer_id"]) != str(user.id):
                raise HTTPException(
                    status_code=403,
                    detail="You can only add vendors to your own events",
                )

            vendor = conn.execute(
                text("""
                    SELECT vendor_id, vendor_name, service_id
                    FROM vendors
                    WHERE vendor_id = :vendor_id
                """),
                {"vendor_id": data.vendor_id},
            ).mappings().one_or_none()

            if vendor is None:
                raise HTTPException(status_code=404, detail="Vendor not found")

            existing = conn.execute(
                text("""
                    SELECT v.vendor_name, s.service_name
                    FROM event_vendors ev
                    JOIN vendors v ON v.vendor_id = ev.vendor_id
                    JOIN services s ON s.service_id = ev.service_id
                    WHERE ev.event_id = :event_id
                      AND ev.service_id = :service_id
                """),
                {
                    "event_id": event_id,
                    "service_id": vendor["service_id"],
                },
            ).mappings().first()

            if existing:
                raise HTTPException(
                    status_code=409,
                    detail=(
                        f"You have already selected a vendor for "
                        f"{existing['service_name']}: {existing['vendor_name']}. "
                        "Remove that vendor before selecting another."
                    ),
                )

            row = conn.execute(
                text("""
                    INSERT INTO event_vendors (
                        event_id,
                        vendor_id,
                        service_id,
                        agreed_cost,
                        booking_status
                    )
                    VALUES (
                        :event_id,
                        :vendor_id,
                        :service_id,
                        :agreed_cost,
                        'pending'
                    )
                    RETURNING
                        event_id,
                        vendor_id,
                        service_id,
                        agreed_cost,
                        booking_status,
                        created_at
                """),
                {
                    "event_id": event_id,
                    "vendor_id": vendor["vendor_id"],
                    "service_id": vendor["service_id"],
                    "agreed_cost": data.agreed_cost,
                },
            ).mappings().one()

            return {
                "message": "Vendor added to event successfully",
                "vendor_name": vendor["vendor_name"],
                **dict(row),
            }

    except HTTPException:
        raise
    except IntegrityError as exc:
        # The unique database constraint also protects against
        # two simultaneous requests selecting the same service.
        logger.info("Vendor selection conflicted with a database constraint: %s", exc)
        raise HTTPException(
            status_code=409,
            detail="A vendor for this service is already selected for this event.",
        )
    except Exception:
        logger.exception("Could not add vendor to event")
        raise HTTPException(
            status_code=503,
            detail="Could not add vendor to event",
        )


@router.delete("/{event_id}/vendors/{vendor_id}")
def remove_vendor_from_event(
    event_id: int,
    vendor_id: int,
    user=Depends(require_event_manager),
):
    """Remove a vendor selection without deleting the vendor itself."""
    role = get_user_role(user)

    try:
        with engine.begin() as conn:
            event = conn.execute(
                text("""
                    SELECT organizer_id
                    FROM events
                    WHERE event_id = :event_id
                """),
                {"event_id": event_id},
            ).mappings().one_or_none()

            if event is None:
                raise HTTPException(status_code=404, detail="Event not found")

            if role != "admin" and str(event["organizer_id"]) != str(user.id):
                raise HTTPException(
                    status_code=403,
                    detail="You can only remove vendors from your own events",
                )

            deleted = conn.execute(
                text("""
                    DELETE FROM event_vendors
                    WHERE event_id = :event_id
                      AND vendor_id = :vendor_id
                    RETURNING vendor_id
                """),
                {
                    "event_id": event_id,
                    "vendor_id": vendor_id,
                },
            ).scalar_one_or_none()

            if deleted is None:
                raise HTTPException(
                    status_code=404,
                    detail="This vendor is not selected for this event",
                )

            return {
                "message": "Vendor removed from event successfully",
                "event_id": event_id,
                "vendor_id": vendor_id,
            }

    except HTTPException:
        raise
    except Exception:
        logger.exception("Could not remove vendor from event")
        raise HTTPException(
            status_code=503,
            detail="Could not remove vendor from event",
        )