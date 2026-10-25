"""FastAPI Backend Application for Eventilion DBMS Project.

Provides endpoints for Admin Analytics, Venues, Vendors and lookup tables.
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
# Category Pydantic Models
# --------------------------------------------------------------------------
class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    description: Optional[str] = Field(default=None, max_length=255)


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
        return False


# --------------------------------------------------------------------------
# Admin Analytics (read-only). Errors are returned to the client instead of
# being replaced by sample data, so problems are visible on screen.
# --------------------------------------------------------------------------
def _db_error(context: str, exc: Exception):
    logger.error(f"{context}: {exc}")
    orig = getattr(exc, "orig", exc)
    raise HTTPException(status_code=400, detail=f"{context}: {orig}")



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
    """All events with category, venue, tickets sold and revenue (JOIN + GROUP BY)."""
    try:
        with engine.connect() as conn:
            rows = conn.execute(text("""
                SELECT e.event_id, e.title, e.start_time, e.end_time,
                       e.ticket_price, e.capacity, e.status,
                       c.name AS category_name,
                       v.name AS venue_name,
                       v.city AS venue_city,
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


@app.post("/api/categories", status_code=status.HTTP_201_CREATED)
def create_category(category_data: CategoryCreate):
    name = category_data.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Category name cannot be empty.")
    try:
        with engine.begin() as conn:
            existing = conn.execute(
                text("SELECT category_id FROM categories WHERE LOWER(name) = LOWER(:name)"),
                {"name": name}
            ).scalar()
            if existing:
                raise HTTPException(status_code=409, detail=f"Category '{name}' already exists.")

            new_cat = conn.execute(
                text("""
                    INSERT INTO categories (name, description)
                    VALUES (:name, :description)
                    RETURNING category_id, name, description
                """),
                {
                    "name": name,
                    "description": category_data.description.strip() if category_data.description else None
                }
            ).mappings().one()
            return dict(new_cat)
    except HTTPException:
        raise
    except IntegrityError:
        raise HTTPException(status_code=400, detail="Category name already exists or invalid data.")
    except Exception as e:
        _db_error("Could not create category", e)


@app.post("/api/categories/seed")
def seed_categories():
    """Populates standard sample categories if the table is empty or missing them."""
    sample_categories = [
        ("Technology & AI", "Conferences, hackathons, and tech workshops"),
        ("Music & Concerts", "Live music performances, bands, and DJ nights"),
        ("Business & Networking", "Investor summits, trade fairs, and entrepreneur meetups"),
        ("Arts & Theatre", "Exhibitions, drama, and creative showcases"),
        ("Workshops & Learning", "Hands-on skill building bootcamps"),
    ]
    try:
        with engine.begin() as conn:
            for name, desc in sample_categories:
                existing = conn.execute(
                    text("SELECT category_id FROM categories WHERE LOWER(name) = LOWER(:name)"),
                    {"name": name}
                ).scalar()
                if not existing:
                    conn.execute(
                        text("""
                            INSERT INTO categories (name, description)
                            VALUES (:name, :description)
                        """),
                        {"name": name, "description": desc}
                    )
            rows = conn.execute(text(
                "SELECT category_id, name, description FROM categories ORDER BY name;"
            )).mappings().all()
            return [dict(r) for r in rows]
    except Exception as e:
        _db_error("Could not seed categories", e)


@app.delete("/api/categories/{category_id}")
def delete_category(category_id: int):
    try:
        with engine.begin() as conn:
            used = conn.execute(
                text("SELECT 1 FROM events WHERE category_id = :cat_id LIMIT 1"),
                {"cat_id": category_id}
            ).scalar()
            if used:
                raise HTTPException(
                    status_code=400,
                    detail="Cannot delete category because events are currently assigned to it."
                )

            deleted = conn.execute(
                text("DELETE FROM categories WHERE category_id = :cat_id RETURNING category_id"),
                {"cat_id": category_id}
            ).scalar_one_or_none()

            if deleted is None:
                raise HTTPException(status_code=404, detail="Category not found.")

            return {"message": "Category deleted successfully", "category_id": category_id}
    except HTTPException:
        raise
    except Exception as e:
        _db_error("Could not delete category", e)




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
            logger.warning(f"DB query failed: {e}")

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
        
# --------------------------------------------------------------------------
# MANAGE EVENTS CRUD - Supabase database
# --------------------------------------------------------------------------

from datetime import datetime, time
from pydantic import BaseModel, Field


class EventCreate(BaseModel):
    title: str = Field(min_length=1, max_length=150)
    category_id: int = Field(gt=0)
    venue_id: int = Field(gt=0)
    start_time: datetime
    end_time: datetime
    ticket_price: float = Field(ge=0)
    capacity: int = Field(gt=0)
    description: Optional[str] = None
    organizer_id: Optional[Any] = None
    vendor_ids: Optional[List[int]] = None


class EventUpdate(EventCreate):
    pass


class EventVendorAssign(BaseModel):
    vendor_id: int = Field(gt=0)
    agreed_cost: Optional[float] = Field(default=0.0, ge=0)
    booking_status: Optional[str] = Field(default="requested")


class EventVendorUpdate(BaseModel):
    agreed_cost: Optional[float] = Field(default=None, ge=0)
    booking_status: Optional[str] = None


def _event_columns(conn):
    """Read the actual events columns so optional fields aren't assumed."""
    return {
        row[0]
        for row in conn.execute(text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'events'
        """)).all()
    }


def _validate_event(conn, event_data, exclude_event_id=None):
    start = event_data.start_time
    end = event_data.end_time

    if end <= start:
        raise HTTPException(
            status_code=400,
            detail="End time must be later than start time."
        )

    # Confirm that the selected venue exists and is active.
    venue = conn.execute(text("""
        SELECT venue_id, name, is_active
        FROM venues
        WHERE venue_id = :venue_id
    """), {"venue_id": event_data.venue_id}).mappings().one_or_none()

    if venue is None:
        raise HTTPException(status_code=400, detail="Selected venue does not exist.")

    if venue["is_active"] is False:
        raise HTTPException(
            status_code=400,
            detail=f"Venue '{venue['name']}' is currently inactive and unavailable for event creation."
        )

    # Confirm the category exists in the Categories table.
    category_exists = conn.execute(text("""
        SELECT 1 FROM categories WHERE category_id = :category_id
    """), {"category_id": event_data.category_id}).scalar()

    if not category_exists:
        raise HTTPException(status_code=400, detail="Selected category does not exist in the database.")

    # Check the venue's operating hours for the event's starting day.
    # Python weekday: Monday=0, Sunday=6.
    day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    day_name = day_names[start.weekday()]

    opening = conn.execute(text("""
        SELECT open_time, close_time, is_closed
        FROM venueoperatinghours
        WHERE venue_id = :venue_id AND day_of_week = :day
    """), {
        "venue_id": event_data.venue_id,
        "day": start.weekday()
    }).mappings().one_or_none()

    # Distinguish missing configuration from explicitly closed venues
    if opening is None:
        raise HTTPException(
            status_code=400,
            detail=f"Operating hours have not been configured for this venue on {day_name}."
        )

    if opening["is_closed"]:
        raise HTTPException(
            status_code=400,
            detail=f"The venue is closed on {day_name}."
        )

    if opening["open_time"] is None or opening["close_time"] is None:
        raise HTTPException(
            status_code=400,
            detail=f"The venue's operating hours for {day_name} are incomplete."
        )

    # Helper to format times as "9:00 AM"
    def _fmt_time(t):
        if hasattr(t, "strftime"):
            formatted = t.strftime("%I:%M %p")
            return formatted.lstrip("0") if formatted.startswith("0") else formatted
        return str(t)

    allowed_hours = f"{_fmt_time(opening['open_time'])} – {_fmt_time(opening['close_time'])}"
    start_clock = start.time().replace(tzinfo=None)
    end_clock = end.time().replace(tzinfo=None)

    # Check operating hours on start day
    if start_clock < opening["open_time"]:
        raise HTTPException(
            status_code=400,
            detail=f"Event start time ({_fmt_time(start_clock)}) is earlier than venue opening hours on {day_name} ({allowed_hours})."
        )

    # If event finishes on the same calendar day, ensure it doesn't exceed close time
    if start.date() == end.date():
        if end_clock > opening["close_time"]:
            raise HTTPException(
                status_code=400,
                detail=f"Event end time ({_fmt_time(end_clock)}) is later than venue closing hours on {day_name} ({allowed_hours})."
            )

    # Prevent overlapping non-cancelled events at the same venue.
    overlap_sql = """
        SELECT title, start_time, end_time
        FROM events
        WHERE venue_id = :venue_id
          AND LOWER(status) <> 'cancelled'
          AND start_time < :end_time
          AND end_time > :start_time
    """
    params = {
        "venue_id": event_data.venue_id,
        "start_time": start,
        "end_time": end
    }

    if exclude_event_id is not None:
        overlap_sql += " AND event_id <> :exclude_id"
        params["exclude_id"] = exclude_event_id

    conflict = conn.execute(
        text(overlap_sql + " LIMIT 1"),
        params
    ).mappings().one_or_none()

    if conflict:
        c_start = _fmt_time(conflict['start_time'].time()) if hasattr(conflict['start_time'], 'time') else str(conflict['start_time'])
        c_end = _fmt_time(conflict['end_time'].time()) if hasattr(conflict['end_time'], 'time') else str(conflict['end_time'])
        raise HTTPException(
            status_code=409,
            detail=f"This venue already has an event scheduled during that time: '{conflict['title']}' ({c_start} – {c_end})."
        )


def _event_response(conn, event_id):
    columns = _event_columns(conn)
    description_select = (
        "e.description" if "description" in columns
        else "NULL AS description"
    )
    organizer_select = (
        "e.organizer_id::text AS organizer_id" if "organizer_id" in columns
        else "NULL AS organizer_id"
    )

    row = conn.execute(text(f"""
        SELECT e.event_id, e.title, e.category_id, e.venue_id,
               e.start_time, e.end_time, e.ticket_price, e.capacity,
               e.status, {description_select}, {organizer_select},
               c.name AS category,
               v.name AS venue,
               v.city,
               COALESCE((
                   SELECT SUM(b.ticket_quantity)
                   FROM bookings b
                   WHERE b.event_id = e.event_id
                     AND LOWER(b.status) <> 'cancelled'
               ), 0) AS tickets_sold
        FROM events e
        LEFT JOIN categories c ON c.category_id = e.category_id
        LEFT JOIN venues v ON v.venue_id = e.venue_id
        WHERE e.event_id = :event_id
    """), {"event_id": event_id}).mappings().one_or_none()

    if row is None:
        return None

    result = dict(row)
    db_status = (result.get("status") or "published").lower()
    if db_status in ("published", "scheduled"):
        result["status"] = "Scheduled"
    elif db_status == "cancelled":
        result["status"] = "Cancelled"
    elif db_status == "completed":
        result["status"] = "Completed"
    elif db_status == "draft":
        result["status"] = "Draft"
    else:
        result["status"] = db_status.capitalize()

    result["tickets_sold"] = int(result["tickets_sold"] or 0)
    result["ticket_price"] = float(result["ticket_price"] or 0)
    result["capacity"] = int(result["capacity"] or 0)

    # Attach assigned vendors from event_vendors
    vendor_rows = conn.execute(text("""
        SELECT ev.vendor_id, v.vendor_name, s.service_name,
               ev.agreed_cost, ev.booking_status, v.phone, v.email
        FROM event_vendors ev
        JOIN vendors v ON v.vendor_id = ev.vendor_id
        JOIN services s ON s.service_id = v.service_id
        WHERE ev.event_id = :event_id
        ORDER BY s.service_name, v.vendor_name;
    """), {"event_id": event_id}).mappings().all()

    result["vendors"] = [
        {
            "vendor_id": r["vendor_id"],
            "vendor_name": r["vendor_name"],
            "service_name": r["service_name"],
            "phone": r["phone"],
            "email": r["email"],
            "agreed_cost": float(r["agreed_cost"] or 0),
            "booking_status": r["booking_status"],
        }
        for r in vendor_rows
    ]
    result["vendors_count"] = len(result["vendors"])
    return result



@app.get("/api/events")
def list_events():
    try:
        with engine.connect() as conn:
            ids = conn.execute(text("""
                SELECT event_id FROM events ORDER BY start_time DESC
            """)).scalars().all()
            return [_event_response(conn, event_id) for event_id in ids]
    except Exception as e:
        _db_error("Could not load events", e)


@app.post("/api/events", status_code=status.HTTP_201_CREATED)
def create_event(event_data: EventCreate):
    try:
        with engine.begin() as conn:
            _validate_event(conn, event_data)

            columns = _event_columns(conn)
            insert_fields = [
                "title", "category_id", "venue_id", "start_time",
                "end_time", "ticket_price", "capacity", "status"
            ]
            values = [
                ":title", ":category_id", ":venue_id", ":start_time",
                ":end_time", ":ticket_price", ":capacity", "'published'"
            ]
            params = event_data.model_dump()
            params["title"] = event_data.title.strip()
            vendor_ids = params.pop("vendor_ids", None)

            if "description" in columns:
                insert_fields.append("description")
                values.append(":description")

            if "organizer_id" in columns:
                insert_fields.append("organizer_id")
                values.append(":organizer_id")
                org_id = None
                if event_data.organizer_id:
                    valid = conn.execute(
                        text("SELECT id FROM auth.users WHERE id::text = :uid"),
                        {"uid": str(event_data.organizer_id)}
                    ).scalar()
                    if valid:
                        org_id = valid

                if not org_id:
                    org_id = conn.execute(
                        text("SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1")
                    ).scalar()

                if not org_id:
                    import uuid
                    new_uid = str(uuid.uuid4())
                    conn.execute(text("""
                        INSERT INTO auth.users (id, email, created_at, updated_at, aud, role)
                        VALUES (:id, 'admin@eventhub.com', NOW(), NOW(), 'authenticated', 'authenticated')
                    """), {"id": new_uid})
                    org_id = new_uid

                params["organizer_id"] = str(org_id)

            new_id = conn.execute(text(f"""
                INSERT INTO events ({", ".join(insert_fields)})
                VALUES ({", ".join(values)})
                RETURNING event_id
            """), params).scalar_one()

            if vendor_ids:
                for vid in vendor_ids:
                    v_exists = conn.execute(
                        text("SELECT 1 FROM vendors WHERE vendor_id = :vid"),
                        {"vid": vid}
                    ).scalar()
                    if v_exists:
                        conn.execute(text("""
                            INSERT INTO event_vendors (event_id, vendor_id, agreed_cost, booking_status)
                            VALUES (:event_id, :vendor_id, 0, 'requested')
                            ON CONFLICT (event_id, vendor_id) DO NOTHING
                        """), {"event_id": new_id, "vendor_id": vid})

            return _event_response(conn, new_id)

    except HTTPException:
        raise
    except IntegrityError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Database integrity error: {getattr(e, 'orig', e)}"
        )
    except Exception as e:
        _db_error("Could not create event", e)


@app.put("/api/events/{event_id}")
def update_event(event_id: int, event_data: EventUpdate):
    try:
        with engine.begin() as conn:
            exists = conn.execute(text("""
                SELECT 1 FROM events WHERE event_id = :id
            """), {"id": event_id}).scalar()

            if not exists:
                raise HTTPException(status_code=404, detail="Event not found.")

            _validate_event(conn, event_data, exclude_event_id=event_id)

            columns = _event_columns(conn)
            updates = {
                "title": event_data.title.strip(),
                "category_id": event_data.category_id,
                "venue_id": event_data.venue_id,
                "start_time": event_data.start_time,
                "end_time": event_data.end_time,
                "ticket_price": event_data.ticket_price,
                "capacity": event_data.capacity,
            }

            if "description" in columns:
                updates["description"] = event_data.description

            assignments = ", ".join(f"{key} = :{key}" for key in updates)

            conn.execute(text(f"""
                UPDATE events
                SET {assignments}
                WHERE event_id = :event_id
            """), {**updates, "event_id": event_id})

            if event_data.vendor_ids is not None:
                existing_vids = set(conn.execute(text("""
                    SELECT vendor_id FROM event_vendors WHERE event_id = :event_id
                """), {"event_id": event_id}).scalars().all())

                new_vids = set(event_data.vendor_ids)
                to_delete = existing_vids - new_vids
                to_add = new_vids - existing_vids

                for vid in to_delete:
                    conn.execute(text("""
                        DELETE FROM event_vendors
                        WHERE event_id = :event_id AND vendor_id = :vid
                    """), {"event_id": event_id, "vid": vid})

                for vid in to_add:
                    v_exists = conn.execute(
                        text("SELECT 1 FROM vendors WHERE vendor_id = :vid"),
                        {"vid": vid}
                    ).scalar()
                    if v_exists:
                        conn.execute(text("""
                            INSERT INTO event_vendors (event_id, vendor_id, agreed_cost, booking_status)
                            VALUES (:event_id, :vendor_id, 0, 'requested')
                            ON CONFLICT (event_id, vendor_id) DO NOTHING
                        """), {"event_id": event_id, "vendor_id": vid})

            return _event_response(conn, event_id)

    except HTTPException:
        raise
    except IntegrityError as e:
        raise HTTPException(status_code=400, detail=f"Invalid event data: {getattr(e, 'orig', e)}")
    except Exception as e:
        _db_error("Could not update event", e)


@app.patch("/api/events/{event_id}/cancel")
def cancel_event(event_id: int):
    try:
        with engine.begin() as conn:
            updated_id = conn.execute(text("""
                UPDATE events
                SET status = 'cancelled'
                WHERE event_id = :id
                RETURNING event_id
            """), {"id": event_id}).scalar_one_or_none()

            if updated_id is None:
                raise HTTPException(status_code=404, detail="Event not found.")

            return _event_response(conn, event_id)

    except HTTPException:
        raise
    except Exception as e:
        _db_error("Could not cancel event", e)


# --------------------------------------------------------------------------
# Event Vendors Management (/api/events/{event_id}/vendors)
# --------------------------------------------------------------------------

def _fetch_event_vendors(conn, event_id: int):
    rows = conn.execute(text("""
        SELECT ev.event_id, ev.vendor_id, v.vendor_name, v.service_id, s.service_name,
               v.phone, v.email, v.service_description,
               ev.agreed_cost, ev.booking_status, ev.created_at
        FROM event_vendors ev
        JOIN vendors v ON v.vendor_id = ev.vendor_id
        JOIN services s ON s.service_id = v.service_id
        WHERE ev.event_id = :event_id
        ORDER BY s.service_name, v.vendor_name;
    """), {"event_id": event_id}).mappings().all()

    return [
        {
            **dict(r),
            "agreed_cost": float(r["agreed_cost"] or 0),
            "created_at": r["created_at"].isoformat() if hasattr(r["created_at"], "isoformat") else str(r["created_at"])
        }
        for r in rows
    ]


@app.get("/api/events/{event_id}/vendors")
def list_event_vendors(event_id: int):
    """List all vendors associated with an event in event_vendors."""
    try:
        with engine.connect() as conn:
            exists = conn.execute(text("SELECT 1 FROM events WHERE event_id = :id"), {"id": event_id}).scalar()
            if not exists:
                raise HTTPException(status_code=404, detail="Event not found.")
            return _fetch_event_vendors(conn, event_id)
    except HTTPException:
        raise
    except Exception as e:
        _db_error("Could not fetch event vendors", e)


@app.post("/api/events/{event_id}/vendors", status_code=status.HTTP_201_CREATED)
def assign_vendor_to_event(event_id: int, payload: EventVendorAssign):
    """Assign a vendor to an event in event_vendors table."""
    status_val = (payload.booking_status or "requested").lower()
    if status_val not in ("requested", "confirmed", "cancelled"):
        raise HTTPException(
            status_code=400,
            detail="Invalid booking status. Allowed values: 'requested', 'confirmed', 'cancelled'."
        )

    try:
        with engine.begin() as conn:
            event_exists = conn.execute(text("SELECT 1 FROM events WHERE event_id = :id"), {"id": event_id}).scalar()
            if not event_exists:
                raise HTTPException(status_code=404, detail="Event not found.")

            vendor = conn.execute(
                text("SELECT vendor_name FROM vendors WHERE vendor_id = :vid"),
                {"vid": payload.vendor_id}
            ).scalar()
            if not vendor:
                raise HTTPException(status_code=404, detail="Vendor not found.")

            conn.execute(text("""
                INSERT INTO event_vendors (event_id, vendor_id, agreed_cost, booking_status)
                VALUES (:event_id, :vendor_id, :agreed_cost, :booking_status)
                ON CONFLICT (event_id, vendor_id)
                DO UPDATE SET agreed_cost = EXCLUDED.agreed_cost, booking_status = EXCLUDED.booking_status
            """), {
                "event_id": event_id,
                "vendor_id": payload.vendor_id,
                "agreed_cost": payload.agreed_cost or 0.0,
                "booking_status": status_val
            })

            vendors = _fetch_event_vendors(conn, event_id)
            match = next((v for v in vendors if v["vendor_id"] == payload.vendor_id), None)
            return {
                "message": f"Vendor '{vendor}' assigned to event successfully.",
                "vendor": match
            }
    except HTTPException:
        raise
    except Exception as e:
        _db_error("Could not assign vendor to event", e)


@app.patch("/api/events/{event_id}/vendors/{vendor_id}")
def update_event_vendor(event_id: int, vendor_id: int, payload: EventVendorUpdate):
    """Update agreed cost or booking status of an assigned vendor."""
    updates = {}
    if payload.booking_status is not None:
        status_val = payload.booking_status.lower()
        if status_val not in ("requested", "confirmed", "cancelled"):
            raise HTTPException(
                status_code=400,
                detail="Invalid booking status. Allowed values: 'requested', 'confirmed', 'cancelled'."
            )
        updates["booking_status"] = status_val

    if payload.agreed_cost is not None:
        if payload.agreed_cost < 0:
            raise HTTPException(status_code=400, detail="Agreed cost cannot be negative.")
        updates["agreed_cost"] = payload.agreed_cost

    if not updates:
        raise HTTPException(status_code=400, detail="No fields provided to update.")

    try:
        with engine.begin() as conn:
            exists = conn.execute(text("""
                SELECT 1 FROM event_vendors WHERE event_id = :eid AND vendor_id = :vid
            """), {"eid": event_id, "vid": vendor_id}).scalar()
            if not exists:
                raise HTTPException(status_code=404, detail="Vendor assignment not found for this event.")

            set_clauses = [f"{k} = :{k}" for k in updates.keys()]
            conn.execute(text(f"""
                UPDATE event_vendors
                SET {", ".join(set_clauses)}
                WHERE event_id = :eid AND vendor_id = :vid
            """), {**updates, "eid": event_id, "vid": vendor_id})

            vendors = _fetch_event_vendors(conn, event_id)
            match = next((v for v in vendors if v["vendor_id"] == vendor_id), None)
            return {
                "message": "Vendor assignment updated successfully.",
                "vendor": match
            }
    except HTTPException:
        raise
    except Exception as e:
        _db_error("Could not update vendor assignment", e)


@app.delete("/api/events/{event_id}/vendors/{vendor_id}")
def remove_vendor_from_event(event_id: int, vendor_id: int):
    """Unassign / remove a vendor from an event."""
    try:
        with engine.begin() as conn:
            deleted = conn.execute(text("""
                DELETE FROM event_vendors
                WHERE event_id = :eid AND vendor_id = :vid
                RETURNING vendor_id
            """), {"eid": event_id, "vid": vendor_id}).scalar()

            if not deleted:
                raise HTTPException(status_code=404, detail="Vendor is not assigned to this event.")

            return {
                "message": "Vendor unassigned from event successfully.",
                "event_id": event_id,
                "vendor_id": vendor_id
            }
    except HTTPException:
        raise
    except Exception as e:
        _db_error("Could not remove vendor from event", e)

