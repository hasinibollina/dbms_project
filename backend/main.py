"""FastAPI Backend Application for Eventilion DBMS Project.

Provides authentication, bookings, reviews, admin analytics, events,
vendors, venues, and lookup endpoints.
"""

import logging
from typing import Optional
from pydantic import BaseModel, Field
from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

try:
    from backend.routes.auth import router as auth_router
except ImportError:
    from routes.auth import router as auth_router

try:
    from backend.bookings import router as booking_router
    from backend.admin import router as admin_router
    from backend.events import router as events_router
    from backend.vendors import router as vendors_router
    from backend.venues import router as venues_router
    from backend.reviews import router as reviews_router
except ImportError:
    from bookings import router as booking_router
    from admin import router as admin_router
    from events import router as events_router
    from vendors import router as vendors_router
    from venues import router as venues_router
    from reviews import router as reviews_router

try:
    from backend.database import engine
except ImportError:
    from database import engine


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("eventilion_api")


def _db_error(context: str, exc: Exception):
    logger.error("%s: %s", context, exc)
    raise HTTPException(
        status_code=503,
        detail=f"{context}. Check the backend terminal for details."
    )


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="Eventilion API",
    description="Backend API for Eventilion Event & Venue Management System",
    version="1.0.0",
)


# ============================================================
# REGISTER ROUTERS
# Each router is registered exactly once.
# ============================================================

app.include_router(auth_router)
app.include_router(booking_router)
app.include_router(reviews_router)
app.include_router(admin_router)
app.include_router(events_router)
app.include_router(vendors_router)
app.include_router(venues_router)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# LOOKUP & MANAGEMENT TABLES
# ============================================================

class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    description: Optional[str] = Field(default=None, max_length=255)


@app.get("/api/services")
def list_services():
    try:
        with engine.connect() as conn:
            rows = conn.execute(
                text("""
                    SELECT service_id, service_name
                    FROM services
                    ORDER BY service_name;
                """)
            ).mappings().all()

            return [dict(row) for row in rows]

    except Exception as exc:
        _db_error("Could not load services", exc)


@app.get("/api/categories")
def list_categories():
    try:
        with engine.connect() as conn:
            rows = conn.execute(
                text("""
                    SELECT category_id, name, description
                    FROM categories
                    ORDER BY name;
                """)
            ).mappings().all()

            return [dict(row) for row in rows]

    except Exception as exc:
        _db_error("Could not load categories", exc)


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
    except Exception as exc:
        _db_error("Could not create category", exc)


@app.delete("/api/categories/{category_id}")
def delete_category(category_id: int):
    try:
        with engine.begin() as conn:
            deleted = conn.execute(
                text("DELETE FROM categories WHERE category_id = :id RETURNING category_id"),
                {"id": category_id}
            ).scalar_one_or_none()
            if not deleted:
                raise HTTPException(status_code=404, detail="Category not found.")
            return {"message": "Category deleted successfully", "category_id": category_id}
    except HTTPException:
        raise
    except Exception as exc:
        _db_error("Could not delete category", exc)


# ============================================================
# VENUE OPERATING HOURS LOOKUP
# Read-only endpoint for retrieving operating hours.
# Create/update operations are handled by venues.py.
# ============================================================

@app.get("/api/venue-hours")
def list_venue_hours(
    venue_id: int | None = Query(default=None, gt=0)
):
    """Return operating hours for all venues or one selected venue."""

    try:
        with engine.connect() as conn:
            sql = """
                SELECT
                    hours_id,
                    venue_id,
                    day_of_week,
                    open_time,
                    close_time,
                    is_closed
                FROM venueoperatinghours
            """

            params = {}

            if venue_id is not None:
                sql += " WHERE venue_id = :venue_id"
                params["venue_id"] = venue_id

            sql += " ORDER BY venue_id, day_of_week;"

            rows = conn.execute(
                text(sql),
                params
            ).mappings().all()

            return [
                {
                    **dict(row),
                    "open_time": (
                        row["open_time"].strftime("%H:%M:%S")
                        if row["open_time"] is not None
                        else None
                    ),
                    "close_time": (
                        row["close_time"].strftime("%H:%M:%S")
                        if row["close_time"] is not None
                        else None
                    ),
                }
                for row in rows
            ]

    except Exception as exc:
        _db_error("Could not load operating hours", exc)
