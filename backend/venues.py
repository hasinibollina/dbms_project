from datetime import datetime, time
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

try:
    from backend.database import get_db
    from backend.routes.auth import get_current_user
    from backend.admin import require_admin
except ImportError:
    from database import get_db
    from routes.auth import get_current_user
    from admin import require_admin


router = APIRouter(prefix="/api/venues", tags=["Venues"])


# ============================================================
# PYDANTIC MODELS
# ============================================================

class VenueCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    address: str = Field(min_length=1, max_length=255)
    city: str = Field(min_length=1, max_length=100)
    capacity: int = Field(gt=0)
    price_per_hour: float = Field(ge=0)
    contact_phone: str | None = Field(default=None, max_length=20)
    description: str | None = None
    image_url: str | None = Field(default=None, max_length=500)
    opening_time: str | None = None
    closing_time: str | None = None


class VenueUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    address: str | None = Field(default=None, min_length=1, max_length=255)
    city: str | None = Field(default=None, min_length=1, max_length=100)
    capacity: int | None = Field(default=None, gt=0)
    price_per_hour: float | None = Field(default=None, ge=0)
    contact_phone: str | None = Field(default=None, max_length=20)
    description: str | None = None
    image_url: str | None = Field(default=None, max_length=500)
    is_active: bool | None = None
    opening_time: str | None = None
    closing_time: str | None = None


class OperatingHoursCreate(BaseModel):
    day_of_week: int = Field(ge=0, le=6)
    open_time: str | None = None
    close_time: str | None = None
    is_closed: bool = False


class OperatingHoursUpdate(BaseModel):
    day_of_week: int | None = Field(default=None, ge=0, le=6)
    open_time: str | None = None
    close_time: str | None = None
    is_closed: bool | None = None


def _format_venue_row(row) -> dict:
    d = dict(row)
    d["id"] = d.get("venue_id")
    d["location"] = d.get("city")
    if d.get("opening_time") is not None:
        if isinstance(d["opening_time"], (datetime, time)):
            d["opening_time"] = d["opening_time"].strftime("%H:%M:%S")
        else:
            d["opening_time"] = str(d["opening_time"])
    else:
        d["opening_time"] = "08:00:00"

    if d.get("closing_time") is not None:
        if isinstance(d["closing_time"], (datetime, time)):
            d["closing_time"] = d["closing_time"].strftime("%H:%M:%S")
        else:
            d["closing_time"] = str(d["closing_time"])
    else:
        d["closing_time"] = "22:00:00"
    return d


# ============================================================
# GET: View all venues
# ============================================================

@router.get("/")
def get_venues(
    db: Session = Depends(get_db)
):

    result = db.execute(text("""
        SELECT
            venue_id,
            name,
            address,
            city,
            capacity,
            price_per_hour,
            contact_phone,
            description,
            image_url,
            is_active,
            opening_time,
            closing_time,
            created_at
        FROM venues
        ORDER BY venue_id
    """))

    return [_format_venue_row(row) for row in result.mappings().all()]


# ============================================================
# GET: Check venue slot availability
# ============================================================

@router.get("/{venue_id}/availability")
def check_venue_availability(
    venue_id: int,
    start: str = Query(..., description="Start ISO datetime"),
    end: str = Query(..., description="End ISO datetime"),
    exclude_event_id: int | None = Query(default=None, description="Event ID to exclude when editing"),
    db: Session = Depends(get_db)
):
    try:
        start_clean = start.replace("Z", "+00:00")
        end_clean = end.replace("Z", "+00:00")
        start_dt = datetime.fromisoformat(start_clean)
        end_dt = datetime.fromisoformat(end_clean)
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Invalid datetime format. Expected ISO-8601 string."
        )

    if end_dt <= start_dt:
        return {
            "available": False,
            "conflicts": [],
            "message": "End time must be after start time."
        }

    venue = db.execute(text("""
        SELECT venue_id, name, opening_time, closing_time, capacity
        FROM venues
        WHERE venue_id = :venue_id
    """), {"venue_id": venue_id}).mappings().one_or_none()

    if venue is None:
        raise HTTPException(status_code=404, detail="Venue not found.")

    open_time = venue["opening_time"] or time(8, 0)
    close_time = venue["closing_time"] or time(22, 0)
    open_str = open_time.strftime("%H:%M")
    close_str = close_time.strftime("%H:%M")

    # Time validation: within opening and closing hours
    if start_dt.time() < open_time:
        return {
            "available": False,
            "conflicts": [],
            "message": f"Venue is open {open_str}-{close_str}. Your event starts at {start_dt.strftime('%H:%M')}."
        }

    if end_dt.time() > close_time:
        return {
            "available": False,
            "conflicts": [],
            "message": f"Venue is open {open_str}-{close_str}. Your event ends at {end_dt.strftime('%H:%M')}."
        }

    if start_dt.date() != end_dt.date():
        return {
            "available": False,
            "conflicts": [],
            "message": f"Venue is open {open_str}-{close_str} daily. Multi-day/overnight events outside venue hours are not permitted."
        }

    # Overlap rule: existing.start_time < new.end_time AND existing.end_time > new.start_time
    params = {
        "venue_id": venue_id,
        "start_time": start_dt,
        "end_time": end_dt,
    }
    exclude_clause = ""
    if exclude_event_id is not None:
        exclude_clause = "AND event_id <> :exclude_event_id"
        params["exclude_event_id"] = exclude_event_id

    conflicts = db.execute(text(f"""
        SELECT event_id, title, start_time, end_time
        FROM events
        WHERE venue_id = :venue_id
          AND status <> 'cancelled'
          AND start_time < :end_time
          AND end_time > :start_time
          {exclude_clause}
        ORDER BY start_time ASC
    """), params).mappings().all()

    if conflicts:
        c = conflicts[0]
        c_start = c["start_time"].strftime("%H:%M")
        c_end = c["end_time"].strftime("%H:%M")
        c_date = c["start_time"].strftime("%d-%m-%Y")
        msg = f"Venue already booked: '{c['title']}' from {c_start} to {c_end} on {c_date}."
        return {
            "available": False,
            "conflicts": [
                {
                    "event_id": row["event_id"],
                    "title": row["title"],
                    "start_time": row["start_time"].isoformat(),
                    "end_time": row["end_time"].isoformat(),
                }
                for row in conflicts
            ],
            "message": msg
        }

    return {
        "available": True,
        "conflicts": [],
        "message": "Venue available"
    }


# ============================================================
# GET: View one venue
# ============================================================

@router.get("/{venue_id}")
def get_venue(
    venue_id: int,
    db: Session = Depends(get_db)
):

    result = db.execute(text("""
        SELECT
            venue_id,
            name,
            address,
            city,
            capacity,
            price_per_hour,
            contact_phone,
            description,
            image_url,
            is_active,
            opening_time,
            closing_time,
            created_at
        FROM venues
        WHERE venue_id = :venue_id
    """), {
        "venue_id": venue_id
    })

    venue = result.mappings().one_or_none()

    if venue is None:
        raise HTTPException(
            status_code=404,
            detail="Venue not found."
        )

    return _format_venue_row(venue)


# ============================================================
# POST: Add a venue
# ============================================================

@router.post("/", status_code=201)
def add_venue(
    venue: VenueCreate,
    current_admin=Depends(require_admin),
    db: Session = Depends(get_db)
):

    try:

        result = db.execute(text("""
            INSERT INTO venues
                (
                    name,
                    address,
                    city,
                    capacity,
                    price_per_hour,
                    contact_phone,
                    description,
                    image_url,
                    opening_time,
                    closing_time,
                    is_active
                )
            VALUES
                (
                    :name,
                    :address,
                    :city,
                    :capacity,
                    :price_per_hour,
                    :contact_phone,
                    :description,
                    :image_url,
                    COALESCE(CAST(:opening_time AS TIME), '08:00:00'),
                    COALESCE(CAST(:closing_time AS TIME), '22:00:00'),
                    TRUE
                )
            RETURNING
                venue_id,
                name,
                address,
                city,
                capacity,
                price_per_hour,
                contact_phone,
                description,
                image_url,
                opening_time,
                closing_time,
                is_active,
                created_at
        """), {

            "name": venue.name.strip(),
            "address": venue.address.strip(),
            "city": venue.city.strip(),
            "capacity": venue.capacity,
            "price_per_hour": venue.price_per_hour,
            "contact_phone": venue.contact_phone,
            "description": venue.description,
            "image_url": venue.image_url,
            "opening_time": venue.opening_time,
            "closing_time": venue.closing_time,

        })

        saved = _format_venue_row(result.mappings().one())

        db.commit()

        return {
            "message": "Venue added successfully",
            "venue": saved
        }

    except IntegrityError:

        db.rollback()

        raise HTTPException(
            status_code=400,
            detail="Invalid venue data."
        )


# ============================================================
# PUT: Update a venue
# ============================================================

@router.put("/{venue_id}")
def update_venue(
    venue_id: int,
    venue: VenueUpdate,
    current_admin=Depends(require_admin),
    db: Session = Depends(get_db)
):

    changes = venue.model_dump(exclude_unset=True)

    if not changes:
        raise HTTPException(
            status_code=400,
            detail="No fields provided."
        )

    # Remove unnecessary spaces from text fields
    if "name" in changes and changes["name"] is not None:
        changes["name"] = changes["name"].strip()

    if "address" in changes and changes["address"] is not None:
        changes["address"] = changes["address"].strip()

    if "city" in changes and changes["city"] is not None:
        changes["city"] = changes["city"].strip()

    # Only allow these columns to be updated
    fields = {
        "name",
        "address",
        "city",
        "capacity",
        "price_per_hour",
        "contact_phone",
        "description",
        "image_url",
        "is_active",
        "opening_time",
        "closing_time",
    }

    updates = {
        key: value
        for key, value in changes.items()
        if key in fields
    }

    assignments = ", ".join(
        f"{key} = :{key}"
        for key in updates
    )

    try:

        result = db.execute(text(f"""
            UPDATE venues
            SET {assignments}
            WHERE venue_id = :venue_id
            RETURNING
                venue_id,
                name,
                address,
                city,
                capacity,
                price_per_hour,
                contact_phone,
                description,
                image_url,
                opening_time,
                closing_time,
                is_active,
                created_at
        """), {
            **updates,
            "venue_id": venue_id
        })

        row = result.mappings().one_or_none()

        if row is None:

            db.rollback()

            raise HTTPException(
                status_code=404,
                detail="Venue not found."
            )

        db.commit()

        return {
            "message": "Venue updated successfully",
            "venue": _format_venue_row(row)
        }

    except IntegrityError:

        db.rollback()

        raise HTTPException(
            status_code=400,
            detail="Invalid venue data."
        )


# ============================================================
# DELETE: Remove a venue
# ============================================================


@router.delete("/{venue_id}")
def delete_venue(
    venue_id: int,
    current_admin=Depends(require_admin),
    db: Session = Depends(get_db)
):
    try:
        # Check whether the venue exists.
        venue = db.execute(
            text("""
                SELECT venue_id
                FROM venues
                WHERE venue_id = :venue_id
            """),
            {"venue_id": venue_id}
        ).scalar_one_or_none()

        if venue is None:
            raise HTTPException(
                status_code=404,
                detail="Venue not found."
            )

        # Delete events connected to this venue.
        db.execute(
            text("""
                DELETE FROM events
                WHERE venue_id = :venue_id
            """),
            {"venue_id": venue_id}
        )

        # Delete the venue after deleting its events.
        db.execute(
            text("""
                DELETE FROM venues
                WHERE venue_id = :venue_id
            """),
            {"venue_id": venue_id}
        )

        # Commit both operations together.
        db.commit()

        return {
            "message": "Venue and associated events deleted successfully",
            "venue_id": venue_id
        }

    except HTTPException:
        db.rollback()
        raise

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail=(
                "The venue or its events are still referenced by other "
                "records. Related records must be handled before deletion."
            )
        )

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Failed to delete venue and its associated events."
        )



# ============================================================
# POST: Add venue operating hours
# ============================================================

@router.post("/{venue_id}/operating-hours", status_code=201)
def add_operating_hours(
    venue_id: int,
    hours: OperatingHoursCreate,
    current_admin=Depends(require_admin),
    db: Session = Depends(get_db)
):

    try:

        # Check whether the venue exists
        venue = db.execute(text("""
            SELECT venue_id
            FROM venues
            WHERE venue_id = :venue_id
        """), {
            "venue_id": venue_id
        }).scalar_one_or_none()

        if venue is None:
            raise HTTPException(
                status_code=404,
                detail="Venue not found."
            )

        result = db.execute(text("""
            INSERT INTO venueoperatinghours
                (
                    venue_id,
                    day_of_week,
                    open_time,
                    close_time,
                    is_closed
                )
            VALUES
                (
                    :venue_id,
                    :day_of_week,
                    :open_time,
                    :close_time,
                    :is_closed
                )
            RETURNING
                hours_id,
                venue_id,
                day_of_week,
                open_time,
                close_time,
                is_closed
        """), {

            "venue_id": venue_id,
            "day_of_week": hours.day_of_week,
            "open_time": hours.open_time,
            "close_time": hours.close_time,
            "is_closed": hours.is_closed

        })

        saved = dict(result.mappings().one())

        db.commit()

        return {
            "message": "Operating hours added successfully",
            "operating_hours": saved
        }

    except IntegrityError:

        db.rollback()

        raise HTTPException(
            status_code=400,
            detail="Invalid operating hours data."
        )


# ============================================================
# PUT: Update venue operating hours
# ============================================================

@router.put("/operating-hours/{hours_id}")
def update_operating_hours(
    hours_id: int,
    hours: OperatingHoursUpdate,
    current_admin=Depends(require_admin),
    db: Session = Depends(get_db)
):

    changes = hours.model_dump(exclude_unset=True)

    if not changes:
        raise HTTPException(
            status_code=400,
            detail="No fields provided."
        )

    fields = {
        "day_of_week",
        "open_time",
        "close_time",
        "is_closed"
    }

    updates = {
        key: value
        for key, value in changes.items()
        if key in fields
    }

    assignments = ", ".join(
        f"{key} = :{key}"
        for key in updates
    )

    try:

        result = db.execute(text(f"""
            UPDATE venueoperatinghours
            SET {assignments}
            WHERE hours_id = :hours_id
            RETURNING
                hours_id,
                venue_id,
                day_of_week,
                open_time,
                close_time,
                is_closed
        """), {
            **updates,
            "hours_id": hours_id
        })

        row = result.mappings().one_or_none()

        if row is None:

            db.rollback()

            raise HTTPException(
                status_code=404,
                detail="Operating hours not found."
            )

        db.commit()

        return {
            "message": "Operating hours updated successfully",
            "operating_hours": dict(row)
        }

    except IntegrityError:

        db.rollback()

        raise HTTPException(
            status_code=400,
            detail="Invalid operating hours data."
        )