
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, EmailStr
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


router = APIRouter(prefix="/api/vendors", tags=["Vendors"])


class VendorCreate(BaseModel):
    vendor_name: str = Field(min_length=1, max_length=150)
    service_id: int = Field(gt=0)
    service_description: str | None = None
    phone: str | None = Field(default=None, max_length=20)
    email: EmailStr | None = None


class VendorUpdate(BaseModel):
    vendor_name: str | None = Field(default=None, min_length=1, max_length=150)
    service_id: int | None = Field(default=None, gt=0)
    service_description: str | None = None
    phone: str | None = Field(default=None, max_length=20)
    email: EmailStr | None = None


# GET: Both authenticated admins and organizers can view vendors
@router.get("")
def get_vendors(
    user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    result = db.execute(text("""
        SELECT v.vendor_id, v.vendor_name, v.service_id,
               s.service_name, v.service_description,
               v.phone, v.email, v.created_at
        FROM vendors v
        JOIN services s ON v.service_id = s.service_id
        ORDER BY v.vendor_id
    """))

    return [dict(row) for row in result.mappings().all()]


# POST: Only admins can add vendors
@router.post("", status_code=status.HTTP_201_CREATED)
def add_vendor(
    vendor: VendorCreate,
    user=Depends(require_admin),
    db: Session = Depends(get_db)
):
    try:
        result = db.execute(text("""
            INSERT INTO vendors
                (vendor_name, service_id, service_description, phone, email)
            VALUES
                (:name, :service_id, :description, :phone, :email)
            RETURNING vendor_id, vendor_name, service_id,
                      service_description, phone, email, created_at
        """), {
            "name": vendor.vendor_name.strip(),
            "service_id": vendor.service_id,
            "description": vendor.service_description,
            "phone": vendor.phone,
            "email": str(vendor.email) if vendor.email else None,
        })

        saved = dict(result.mappings().one())
        db.commit()

        return {
            "message": "Vendor added successfully",
            "vendor": saved
        }

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid service_id or vendor data."
        )


# PUT: Only admins can update vendors
@router.put("/{vendor_id}")
def update_vendor(
    vendor_id: int,
    vendor: VendorUpdate,
    user=Depends(require_admin),
    db: Session = Depends(get_db)
):
    changes = vendor.model_dump(exclude_unset=True)

    if not changes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields provided."
        )

    if "vendor_name" in changes and changes["vendor_name"] is not None:
        changes["vendor_name"] = changes["vendor_name"].strip()

        if not changes["vendor_name"]:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Vendor name cannot be empty."
            )

    if "email" in changes and changes["email"] is not None:
        changes["email"] = str(changes["email"])

    fields = {
        "vendor_name",
        "service_id",
        "service_description",
        "phone",
        "email"
    }

    updates = {
        key: value
        for key, value in changes.items()
        if key in fields
    }

    if not updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid fields provided."
        )

    try:
        # Lock the vendor row to avoid conflicting concurrent updates.
        existing_vendor = db.execute(text("""
            SELECT vendor_id, service_id
            FROM vendors
            WHERE vendor_id = :vendor_id
            FOR UPDATE
        """), {
            "vendor_id": vendor_id
        }).mappings().one_or_none()

        if existing_vendor is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vendor not found."
            )

        # Prevent changing the service of a vendor who is assigned
        # to an event. Keeping the same service_id is allowed.
        if (
            "service_id" in updates
            and updates["service_id"] is not None
            and updates["service_id"] != existing_vendor["service_id"]
        ):
            assignment_query = text("""
                SELECT 1
                FROM event_vendors
                WHERE vendor_id = :vendor_id
                LIMIT 1
            """)

            is_assigned = db.execute(
                assignment_query,
                {"vendor_id": vendor_id}
            ).scalar_one_or_none()

            if is_assigned is not None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        "This vendor is assigned to an event, so their "
                        "service cannot be changed until all event "
                        "assignments are removed."
                    )
                )

        assignments = ", ".join(
            f"{key} = :{key}" for key in updates
        )

        result = db.execute(text(f"""
            UPDATE vendors
            SET {assignments}
            WHERE vendor_id = :vendor_id
            RETURNING vendor_id, vendor_name, service_id,
                      service_description, phone, email, created_at
        """), {
            **updates,
            "vendor_id": vendor_id
        })

        row = result.mappings().one_or_none()

        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vendor not found."
            )

        saved = dict(row)
        db.commit()

        return {
            "message": "Vendor updated successfully",
            "vendor": saved
        }

    except HTTPException:
        db.rollback()
        raise

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid service_id or vendor data."
        )

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not update vendor."
        )


# DELETE: Only admins can delete vendors
@router.delete("/{vendor_id}")
def delete_vendor(
    vendor_id: int,
    user=Depends(require_admin),
    db: Session = Depends(get_db)
):
    try:
        result = db.execute(text("""
            DELETE FROM vendors
            WHERE vendor_id = :vendor_id
            RETURNING vendor_id
        """), {
            "vendor_id": vendor_id
        })

        deleted = result.scalar_one_or_none()

        if deleted is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vendor not found."
            )

        db.commit()

        return {
            "message": "Vendor deleted successfully",
            "vendor_id": vendor_id
        }

    except HTTPException:
        db.rollback()
        raise

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Vendor cannot be deleted because it is in use."
        )

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not delete vendor."
        )
