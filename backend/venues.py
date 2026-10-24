from fastapi import APIRouter, Depends, HTTPException
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


# ============================================================
# GET: View all venues
# ============================================================

@router.get("/")
def get_venues(
    current_user=Depends(get_current_user),
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
            created_at
        FROM venues
        ORDER BY venue_id
    """))

    return [dict(row) for row in result.mappings().all()]


# ============================================================
# GET: View one venue
# ============================================================

@router.get("/{venue_id}")
def get_venue(
    venue_id: int,
    current_user=Depends(get_current_user),
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

    return dict(venue)


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
            "image_url": venue.image_url

        })

        saved = dict(result.mappings().one())

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
            "venue": dict(row)
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

        result = db.execute(text("""
            DELETE FROM venues
            WHERE venue_id = :venue_id
            RETURNING venue_id
        """), {
            "venue_id": venue_id
        })

        deleted = result.scalar_one_or_none()

        if deleted is None:

            db.rollback()

            raise HTTPException(
                status_code=404,
                detail="Venue not found."
            )

        db.commit()

        return {
            "message": "Venue deleted successfully"
        }

    except IntegrityError:

        db.rollback()

        raise HTTPException(
            status_code=400,
            detail="Venue could not be deleted."
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