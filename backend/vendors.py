
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, EmailStr
from sqlalchemy import text
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from database import get_db

router = APIRouter(prefix="/vendors", tags=["Vendors"])


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


# GET: View all vendors
@router.get("/")
def get_vendors(db: Session = Depends(get_db)):
    result = db.execute(text("""
        SELECT v.vendor_id, v.vendor_name, v.service_id,
               s.service_name, v.service_description,
               v.phone, v.email, v.created_at
        FROM vendors v
        JOIN services s ON v.service_id = s.service_id
        ORDER BY v.vendor_id
    """))
    return [dict(row) for row in result.mappings().all()]


# POST: Add a vendor
@router.post("/", status_code=201)
def add_vendor(vendor: VendorCreate, db: Session = Depends(get_db)):
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
        return {"message": "Vendor added successfully", "vendor": saved}
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Invalid service_id or vendor data."
        )


# PUT: Update a vendor
@router.put("/{vendor_id}")
def update_vendor(
    vendor_id: int,
    vendor: VendorUpdate,
    db: Session = Depends(get_db)
):
    changes = vendor.model_dump(exclude_unset=True)

    if not changes:
        raise HTTPException(status_code=400, detail="No fields provided.")

    if "vendor_name" in changes and changes["vendor_name"] is not None:
        changes["vendor_name"] = changes["vendor_name"].strip()

    if "email" in changes and changes["email"] is not None:
        changes["email"] = str(changes["email"])

    fields = {
        "vendor_name", "service_id", "service_description", "phone", "email"
    }
    updates = {key: value for key, value in changes.items() if key in fields}

    assignments = ", ".join(f"{key} = :{key}" for key in updates)

    try:
        result = db.execute(text(f"""
            UPDATE vendors
            SET {assignments}
            WHERE vendor_id = :vendor_id
            RETURNING vendor_id, vendor_name, service_id,
                      service_description, phone, email, created_at
        """), {**updates, "vendor_id": vendor_id})

        row = result.mappings().one_or_none()

        if row is None:
            db.rollback()
            raise HTTPException(status_code=404, detail="Vendor not found.")

        db.commit()
        return {"message": "Vendor updated successfully", "vendor": dict(row)}
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Invalid service_id or vendor data."
        )


# DELETE: Remove a vendor
@router.delete("/{vendor_id}")
def delete_vendor(vendor_id: int, db: Session = Depends(get_db)):
    result = db.execute(text("""
        DELETE FROM vendors
        WHERE vendor_id = :vendor_id
        RETURNING vendor_id
    """), {"vendor_id": vendor_id})

    deleted = result.scalar_one_or_none()

    if deleted is None:
        db.rollback()
        raise HTTPException(status_code=404, detail="Vendor not found.")

    db.commit()
    return {"message": "Vendor deleted successfully"}
