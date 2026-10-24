"""FastAPI Backend Application for Eventilion DBMS Project.

Provides endpoints for Admin Analytics, Venues, Vendors, lookup tables and auth.
Uses SQL queries with JOIN, GROUP BY, and aggregate functions.
Database errors are returned to the client (no sample-data fallback).
"""

from fastapi import FastAPI, HTTPException, Depends, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
import logging
try:
    from backend.routes.auth import router as auth_router
except ImportError:
    from routes.auth import router as auth_router

try:
    from backend.bookings import router as booking_router
except ImportError:
    from bookings import router as booking_router

try:
    from backend.reviews import router as reviews_router
except ImportError:
    from reviews import router as reviews_router

try:
    from backend.database import engine, get_db
except ImportError:
    from database import engine, get_db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("eventilion_api")

app = FastAPI(
    title="Eventilion API",
    description="Backend API for Eventilion Event & Venue Management System",
    version="1.0.0",
)
app.include_router(auth_router)
app.include_router(booking_router)
app.include_router(reviews_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------------------------------
# Vendor models (match the live `vendors` table:
#   vendor_id, vendor_name, service_id -> services, service_description, phone, email, created_at)
# --------------------------------------------------------------------------
class VendorCreate(BaseModel):
    vendor_name: str = Field(min_length=1, max_length=150)
    service_id: int = Field(gt=0)
    service_description: Optional[str] = None
    phone: Optional[str] = Field(default=None, max_length=20)
    email: Optional[str] = Field(default=None, max_length=150)


class VendorUpdate(BaseModel):
    vendor_name: Optional[str] = Field(default=None, min_length=1, max_length=150)
    service_id: Optional[int] = Field(default=None, gt=0)
    service_description: Optional[str] = None
    phone: Optional[str] = Field(default=None, max_length=20)
    email: Optional[str] = Field(default=None, max_length=150)


VENDOR_COLUMNS = """
    v.vendor_id, v.vendor_name, v.service_id, s.service_name,
    v.service_description, v.phone, v.email, v.created_at
"""


# --------------------------------------------------------------------------
# Venue Pydantic Models
# --------------------------------------------------------------------------

class VenueCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    address: str = Field(min_length=1, max_length=255)
    city: str = Field(min_length=1, max_length=100)
    capacity: int = Field(gt=0)
    price_per_hour: float = Field(ge=0)
    contact_phone: str | None = Field(default=None, max_length=20)
    description: str | None = None
    image_url: str | None = Field(default=None, max_length=500)


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

# --------------------------------------------------------------------------
# Helper to test DB connection safely
# --------------------------------------------------------------------------
def is_db_connected():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            return True
    except Exception:
        logger.exception("Database connection check failed")
        return False


# --------------------------------------------------------------------------
# Admin Analytics (read-only). Errors are returned to the client instead of
# being replaced by sample data, so problems are visible on screen.
# --------------------------------------------------------------------------
def _db_error(context: str, exc: Exception):
    logger.error(f"{context}: {exc}")
    raise HTTPException(status_code=503, detail=f"{context}. Check the backend terminal for details.")


@app.get("/api/admin/stats")
def get_admin_stats():
    """Top-level KPIs computed from events, bookings, venues, vendors and reviews."""
    try:
        with engine.connect() as conn:
            evt = conn.execute(text("""
                SELECT COUNT(*) AS total_events,
                       COUNT(*) FILTER (WHERE end_time > NOW())  AS upcoming_events,
                       COUNT(*) FILTER (WHERE end_time <= NOW()) AS completed_events
                FROM events;
            """)).mappings().one()
            book = conn.execute(text("""
                SELECT COALESCE(SUM(ticket_quantity), 0) AS total_registrations,
                       COALESCE(SUM(total_amount), 0)    AS total_revenue
                FROM bookings
                WHERE status <> 'cancelled';
            """)).mappings().one()
            total_venues = conn.execute(text("SELECT COUNT(*) FROM venues;")).scalar() or 0
            total_vendors = conn.execute(text("SELECT COUNT(*) FROM vendors;")).scalar() or 0
            total_services = conn.execute(text("SELECT COUNT(*) FROM services;")).scalar() or 0
            avg_rating = conn.execute(text("SELECT ROUND(AVG(rating), 2) FROM reviews;")).scalar()
            weekly = conn.execute(text("""
                SELECT to_char(w.week_start, 'DD Mon') AS label,
                       COALESCE(SUM(b.ticket_quantity), 0) AS registrations,
                       COALESCE(SUM(b.total_amount), 0)    AS revenue
                FROM generate_series(date_trunc('week', CURRENT_DATE) - INTERVAL '11 weeks',
                                     date_trunc('week', CURRENT_DATE), INTERVAL '1 week') AS w(week_start)
                LEFT JOIN bookings b
                       ON date_trunc('week', b.booking_date) = w.week_start
                      AND b.status <> 'cancelled'
                GROUP BY w.week_start
                ORDER BY w.week_start;
            """)).mappings().all()
            by_category = conn.execute(text("""
                SELECT c.name AS category,
                       COUNT(DISTINCT e.event_id) AS events,
                       COALESCE(SUM(b.total_amount) FILTER (WHERE b.status <> 'cancelled'), 0) AS revenue
                FROM categories c
                JOIN events e ON e.category_id = c.category_id
                LEFT JOIN bookings b ON b.event_id = e.event_id
                GROUP BY c.category_id, c.name
                ORDER BY revenue DESC, c.name;
            """)).mappings().all()
            return {
                "total_events": int(evt["total_events"]),
                "upcoming_events": int(evt["upcoming_events"]),
                "completed_events": int(evt["completed_events"]),
                "total_registrations": int(book["total_registrations"]),
                "total_revenue": float(book["total_revenue"]),
                "total_venues": int(total_venues),
                "total_vendors": int(total_vendors),
                "total_services": int(total_services),
                "avg_rating": float(avg_rating) if avg_rating is not None else None,
                "weekly_registrations": [
                    {"label": r["label"], "registrations": int(r["registrations"]), "revenue": float(r["revenue"])}
                    for r in weekly
                ],
                "category_revenue": [
                    {"category": r["category"], "events": int(r["events"]), "revenue": float(r["revenue"])}
                    for r in by_category
                ],
            }
    except Exception as e:
        _db_error("Could not load admin statistics", e)


@app.get("/api/admin/events")
def get_admin_events():
    """All events with category, venue, tickets sold and revenue (JOIN + GROUP BY).
    Also returns category/venue/city/organizer aliases used by the Events and Manage Events pages."""
    try:
        with engine.connect() as conn:
            rows = conn.execute(text("""
                SELECT e.event_id, e.title, e.start_time, e.end_time,
                       e.ticket_price, e.capacity, e.status,
                       c.name AS category_name,
                       v.name AS venue_name,
                       v.city AS venue_city,
                       COALESCE(c.name, 'Uncategorized') AS category,
                       COALESCE(v.name, 'Unassigned')    AS venue,
                       COALESCE(v.city, 'N/A')           AS city,
                       'Admin'                           AS organizer,
                       COALESCE(SUM(b.ticket_quantity) FILTER (WHERE b.status <> 'cancelled'), 0) AS tickets_sold,
                       COALESCE(SUM(b.total_amount)   FILTER (WHERE b.status <> 'cancelled'), 0) AS revenue
                FROM events e
                LEFT JOIN categories c ON c.category_id = e.category_id
                LEFT JOIN venues     v ON v.venue_id    = e.venue_id
                LEFT JOIN bookings   b ON b.event_id    = e.event_id
                GROUP BY e.event_id, c.name, v.name, v.city
                ORDER BY e.start_time DESC;
            """)).mappings().all()
            return [dict(r) for r in rows]
    except Exception as e:
        _db_error("Could not load events analytics", e)


@app.get("/api/admin/venues")
def get_admin_venues():
    """Venues with events hosted, bookings and revenue."""
    try:
        with engine.connect() as conn:
            rows = conn.execute(text("""
                SELECT v.venue_id, v.name, v.city, v.capacity, v.price_per_hour, v.is_active,
                       COUNT(DISTINCT e.event_id)   AS events_hosted,
                       COUNT(DISTINCT b.booking_id) AS total_bookings,
                       COALESCE(SUM(b.total_amount), 0) AS revenue_generated
                FROM venues v
                LEFT JOIN events   e ON e.venue_id = v.venue_id
                LEFT JOIN bookings b ON b.event_id = e.event_id AND b.status <> 'cancelled'
                GROUP BY v.venue_id
                ORDER BY revenue_generated DESC, v.name;
            """)).mappings().all()
            return [dict(r) for r in rows]
    except Exception as e:
        _db_error("Could not load venue analytics", e)


@app.get("/api/admin/vendors")
def get_admin_vendors():
    """Vendors with their service and number of events served (event_vendors)."""
    try:
        with engine.connect() as conn:
            rows = conn.execute(text(f"""
                SELECT {VENDOR_COLUMNS},
                       COUNT(ev.event_id) AS events_served,
                       COALESCE(SUM(ev.agreed_cost) FILTER (WHERE ev.booking_status <> 'cancelled'), 0) AS total_agreed_cost
                FROM vendors v
                JOIN services s ON s.service_id = v.service_id
                LEFT JOIN event_vendors ev ON ev.vendor_id = v.vendor_id
                GROUP BY v.vendor_id, s.service_name
                ORDER BY events_served DESC, v.vendor_name;
            """)).mappings().all()
            return [dict(r) for r in rows]
    except Exception as e:
        _db_error("Could not load vendor analytics", e)


# --------------------------------------------------------------------------
# Lookup tables (read-only)
# --------------------------------------------------------------------------
@app.get("/api/services")
def list_services():
    try:
        with engine.connect() as conn:
            rows = conn.execute(text(
                "SELECT service_id, service_name FROM services ORDER BY service_name;"
            )).mappings().all()
            return [dict(r) for r in rows]
    except Exception as e:
        _db_error("Could not load services", e)


@app.get("/api/categories")
def list_categories():
    try:
        with engine.connect() as conn:
            rows = conn.execute(text(
                "SELECT category_id, name, description FROM categories ORDER BY name;"
            )).mappings().all()
            return [dict(r) for r in rows]
    except Exception as e:
        _db_error("Could not load categories", e)


@app.get("/api/venue-hours")
def list_venue_hours(venue_id: Optional[int] = Query(None)):
    """Operating hours for all venues, or for one venue with ?venue_id=."""
    try:
        with engine.connect() as conn:
            sql = """SELECT hours_id, venue_id, day_of_week, open_time, close_time, is_closed
                     FROM venueoperatinghours"""
            params = {}
            if venue_id is not None:
                sql += " WHERE venue_id = :venue_id"
                params["venue_id"] = venue_id
            rows = conn.execute(text(sql + " ORDER BY venue_id, day_of_week;"), params).mappings().all()
            return [
                {**dict(r),
                 "open_time": r["open_time"].strftime("%H:%M:%S") if r["open_time"] else None,
                 "close_time": r["close_time"].strftime("%H:%M:%S") if r["close_time"] else None}
                for r in rows
            ]
    except Exception as e:
        _db_error("Could not load operating hours", e)


# --------------------------------------------------------------------------
# Vendors CRUD (/api/vendors)
# --------------------------------------------------------------------------
@app.get("/api/vendors")
def list_vendors(
    service_id: Optional[int] = Query(None),
    q: Optional[str] = Query(None),
):
    """List vendors with their service name. Optional filters: service_id, q (name/email/phone)."""
    conditions, params = ["1=1"], {}
    if service_id:
        conditions.append("v.service_id = :service_id")
        params["service_id"] = service_id
    if q:
        conditions.append("(v.vendor_name ILIKE :q OR v.email ILIKE :q OR v.phone ILIKE :q)")
        params["q"] = f"%{q}%"
    try:
        with engine.connect() as conn:
            rows = conn.execute(text(f"""
                SELECT {VENDOR_COLUMNS}, COUNT(ev.event_id) AS events_served
                FROM vendors v
                JOIN services s ON s.service_id = v.service_id
                LEFT JOIN event_vendors ev ON ev.vendor_id = v.vendor_id
                WHERE {' AND '.join(conditions)}
                GROUP BY v.vendor_id, s.service_name
                ORDER BY v.vendor_name;
            """), params).mappings().all()
            return [dict(r) for r in rows]
    except Exception as e:
        _db_error("Could not load vendors", e)


def _fetch_vendor(conn, vendor_id: int):
    return conn.execute(text(f"""
        SELECT {VENDOR_COLUMNS}
        FROM vendors v JOIN services s ON s.service_id = v.service_id
        WHERE v.vendor_id = :id;
    """), {"id": vendor_id}).mappings().one_or_none()


@app.get("/api/vendors/{vendor_id}")
def get_vendor_by_id(vendor_id: int):
    try:
        with engine.connect() as conn:
            row = _fetch_vendor(conn, vendor_id)
    except Exception as e:
        _db_error("Could not load vendor", e)
    if row is None:
        raise HTTPException(status_code=404, detail="Vendor not found.")
    return dict(row)


def _check_service(conn, service_id):
    exists = conn.execute(text("SELECT 1 FROM services WHERE service_id = :id;"), {"id": service_id}).scalar()
    if not exists:
        raise HTTPException(status_code=400, detail="Selected service does not exist.")


@app.post("/api/vendors", status_code=status.HTTP_201_CREATED)
def create_vendor(vendor: VendorCreate):
    try:
        with engine.begin() as conn:
            _check_service(conn, vendor.service_id)
            new_id = conn.execute(text("""
                INSERT INTO vendors (vendor_name, service_id, service_description, phone, email)
                VALUES (:vendor_name, :service_id, :service_description, :phone, :email)
                RETURNING vendor_id;
            """), {
                "vendor_name": vendor.vendor_name.strip(),
                "service_id": vendor.service_id,
                "service_description": vendor.service_description,
                "phone": vendor.phone,
                "email": vendor.email,
            }).scalar_one()
            return dict(_fetch_vendor(conn, new_id))
    except IntegrityError:
        raise HTTPException(status_code=400, detail="Invalid service selected.")
    except HTTPException:
        raise
    except Exception as e:
        _db_error("Could not create vendor", e)


@app.put("/api/vendors/{vendor_id}")
def update_vendor(vendor_id: int, vendor_data: VendorUpdate):
    updates = vendor_data.model_dump(exclude_unset=True)
    if "vendor_name" in updates and updates["vendor_name"]:
        updates["vendor_name"] = updates["vendor_name"].strip()
    if not updates:
        raise HTTPException(status_code=400, detail="No fields provided.")
    assignments = ", ".join(f"{k} = :{k}" for k in updates)
    try:
        with engine.begin() as conn:
            if updates.get("service_id") is not None:
                _check_service(conn, updates["service_id"])
            found = conn.execute(text(
                f"UPDATE vendors SET {assignments} WHERE vendor_id = :vendor_id RETURNING vendor_id;"
            ), {**updates, "vendor_id": vendor_id}).scalar_one_or_none()
            if found is None:
                raise HTTPException(status_code=404, detail="Vendor not found.")
            return dict(_fetch_vendor(conn, vendor_id))
    except IntegrityError:
        raise HTTPException(status_code=400, detail="Invalid service selected.")
    except HTTPException:
        raise
    except Exception as e:
        _db_error("Could not update vendor", e)


@app.delete("/api/vendors/{vendor_id}")
def delete_vendor(vendor_id: int):
    try:
        with engine.begin() as conn:
            deleted = conn.execute(text(
                "DELETE FROM vendors WHERE vendor_id = :id RETURNING vendor_id;"
            ), {"id": vendor_id}).scalar_one_or_none()
    except Exception as e:
        _db_error("Could not delete vendor", e)
    if deleted is None:
        raise HTTPException(status_code=404, detail="Vendor not found.")
    return {"message": "Vendor deleted successfully", "vendor_id": vendor_id}



# --------------------------------------------------------------------------
# CRUD Endpoints for /api/venues
# --------------------------------------------------------------------------

# GET: View all venues
@app.get("/api/venues")
def list_venues():
    """Retrieve all venues."""
    if is_db_connected():
        try:
            with engine.connect() as conn:
                q = text("""
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
                        created_at
                    FROM venues
                    ORDER BY venue_id;
                """)
                rows = conn.execute(q).mappings().all()
                return [dict(r) for r in rows]
        except Exception as e:
            logger.exception("DB query failed")
            raise HTTPException(
                status_code=500,
                detail=f"Venue query failed: {str(e)}"
            )

    raise HTTPException(
        status_code=500,
        detail="Database not connected"
    )

# GET: View one venue
@app.get("/api/venues/{venue_id}")
def get_venue_by_id(venue_id: int):
    """Retrieve a single venue by primary key."""

    if is_db_connected():
        try:
            with engine.connect() as conn:

                q = text("""
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
                        created_at
                    FROM venues
                    WHERE venue_id = :id;
                """)

                row = conn.execute(
                    q,
                    {"id": venue_id}
                ).mappings().first()

                if row:
                    return dict(row)

        except Exception as e:
            logger.warning(f"DB query failed: {e}")

    raise HTTPException(
        status_code=404,
        detail="Venue not found"
    )


# POST: Add a venue
@app.post("/api/venues", status_code=status.HTTP_201_CREATED)
def create_venue(venue: VenueCreate):
    """Create a new venue entry."""

    if is_db_connected():
        try:
            with engine.begin() as conn:

                q = text("""
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
                        :is_active
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
                        is_active,
                        created_at;
                """)

                params = {
                    "name": venue.name.strip(),
                    "address": venue.address.strip(),
                    "city": venue.city.strip(),
                    "capacity": venue.capacity,
                    "price_per_hour": venue.price_per_hour,
                    "contact_phone": venue.contact_phone,
                    "description": venue.description,
                    "image_url": venue.image_url,
                    "is_active": True
                }

                row = conn.execute(
                    q,
                    params
                ).mappings().one()

                return {
                    "message": "Venue added successfully",
                    "venue": dict(row)
                }

        except IntegrityError:
            raise HTTPException(
                status_code=400,
                detail="Invalid venue data."
            )

        except Exception as e:
            logger.warning(f"DB insert failed: {e}")

            raise HTTPException(
                status_code=500,
                detail="Could not create venue."
            )

    raise HTTPException(
        status_code=500,
        detail="Database not connected"
    )


# PUT: Update a venue
@app.put("/api/venues/{venue_id}")
def update_venue(
    venue_id: int,
    venue_data: VenueUpdate
):
    """Update existing venue details."""

    changes = venue_data.dict(exclude_unset=True)

    if not changes:
        raise HTTPException(
            status_code=400,
            detail="No fields provided."
        )

    if "name" in changes and changes["name"] is not None:
        changes["name"] = changes["name"].strip()

    if "address" in changes and changes["address"] is not None:
        changes["address"] = changes["address"].strip()

    if "city" in changes and changes["city"] is not None:
        changes["city"] = changes["city"].strip()

    fields = {
        "name",
        "address",
        "city",
        "capacity",
        "price_per_hour",
        "contact_phone",
        "description",
        "image_url",
        "is_active"
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
        with engine.begin() as conn:

            q = text(f"""
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
                    is_active,
                    created_at;
            """)

            result = conn.execute(
                q,
                {
                    **updates,
                    "venue_id": venue_id
                }
            ).mappings().one_or_none()

            if result is None:
                raise HTTPException(
                    status_code=404,
                    detail="Venue not found."
                )

            return {
                "message": "Venue updated successfully",
                "venue": dict(result)
            }

    except HTTPException:
        raise

    except IntegrityError:
        raise HTTPException(
            status_code=400,
            detail="Invalid venue data."
        )

    except Exception as e:
        logger.warning(f"DB update failed: {e}")

        raise HTTPException(
            status_code=500,
            detail="Could not update venue."
        )


# DELETE: Remove a venue
@app.delete("/api/venues/{venue_id}")
def delete_venue(venue_id: int):
    """Delete a venue by ID."""

    try:
        with engine.begin() as conn:

            q = text("""
                DELETE FROM venues
                WHERE venue_id = :id
                RETURNING venue_id;
            """)

            deleted = conn.execute(
                q,
                {"id": venue_id}
            ).scalar_one_or_none()

            if deleted is None:
                raise HTTPException(
                    status_code=404,
                    detail="Venue not found."
                )

            return {
                "message": "Venue deleted successfully",
                "venue_id": venue_id
            }

    except HTTPException:
        raise

    except IntegrityError:
        raise HTTPException(
            status_code=400,
            detail="Venue could not be deleted."
        )

    except Exception as e:
        logger.warning(f"DB delete failed: {e}")

        raise HTTPException(
            status_code=500,
            detail="Could not delete venue."
        )


# --------------------------------------------------------------------------
# Venue Operating Hours
# --------------------------------------------------------------------------

# POST: Add operating hours for a venue
@app.post(
    "/api/venues/{venue_id}/operating-hours",
    status_code=status.HTTP_201_CREATED
)
def create_operating_hours(
    venue_id: int,
    hours: OperatingHoursCreate
):
    """Add operating hours for a venue."""

    try:
        with engine.begin() as conn:

            # Check that the venue exists
            venue_exists = conn.execute(text("""
                SELECT venue_id
                FROM venues
                WHERE venue_id = :venue_id;
            """), {
                "venue_id": venue_id
            }).scalar_one_or_none()

            if venue_exists is None:
                raise HTTPException(
                    status_code=404,
                    detail="Venue not found."
                )

            q = text("""
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
                    is_closed;
            """)

            row = conn.execute(
                q,
                {
                    "venue_id": venue_id,
                    "day_of_week": hours.day_of_week,
                    "open_time": hours.open_time,
                    "close_time": hours.close_time,
                    "is_closed": hours.is_closed
                }
            ).mappings().one()

            return {
                "message": "Operating hours added successfully",
                "operating_hours": dict(row)
            }

    except HTTPException:
        raise

    except IntegrityError:
        raise HTTPException(
            status_code=400,
            detail="Invalid operating hours data."
        )

    except Exception as e:
        logger.warning(f"DB insert failed: {e}")

        raise HTTPException(
            status_code=500,
            detail="Could not add operating hours."
        )


# PUT: Update operating hours
@app.put("/api/venues/operating-hours/{hours_id}")
def update_operating_hours(
    hours_id: int,
    hours_data: OperatingHoursUpdate
):
    """Update existing venue operating hours."""

    changes = hours_data.dict(exclude_unset=True)

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
        with engine.begin() as conn:

            q = text(f"""
                UPDATE venueoperatinghours
                SET {assignments}
                WHERE hours_id = :hours_id
                RETURNING
                    hours_id,
                    venue_id,
                    day_of_week,
                    open_time,
                    close_time,
                    is_closed;
            """)

            row = conn.execute(
                q,
                {
                    **updates,
                    "hours_id": hours_id
                }
            ).mappings().one_or_none()

            if row is None:
                raise HTTPException(
                    status_code=404,
                    detail="Operating hours not found."
                )

            return {
                "message": "Operating hours updated successfully",
                "operating_hours": dict(row)
            }

    except HTTPException:
        raise

    except IntegrityError:
        raise HTTPException(
            status_code=400,
            detail="Invalid operating hours data."
        )

    except Exception as e:
        logger.warning(f"DB update failed: {e}")

        raise HTTPException(
            status_code=500,
            detail="Could not update operating hours."
        )
