import re
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session
try:
    from backend.routes.auth import get_current_user
except ImportError:
    from routes.auth import get_current_user

try:
    from backend.database import get_db
except ImportError:
    from database import get_db


router = APIRouter(
    prefix="/bookings",
    tags=["Bookings"]
)


# ---------------------------------------------------------
# STATUS WORDS (read from the database's own CHECK constraints so the
# code always matches whatever spelling/case the live tables allow)
# ---------------------------------------------------------

_TABLE_OF = {"bookings_status_check": ("bookings", "status"),
             "payments_status_check": ("payments", "payment_status")}


def _allowed_status(db, constraint_name, synonyms, default):
    """Pick a status word accepted by EVERY check constraint on that column."""
    table, column = _TABLE_OF[constraint_name]
    try:
        defs = db.execute(
            text("""
                SELECT pg_get_constraintdef(oid)
                FROM pg_constraint
                WHERE conrelid = CAST(:t AS regclass) AND contype = 'c'
            """),
            {"t": table},
        ).scalars().all()
    except Exception:
        db.rollback()
        return default
    sets = [set(re.findall(r"'([^']+)'", d)) for d in defs if column in d]
    if not sets:
        return default
    allowed = set.intersection(*sets)
    for lit in sorted(allowed):
        if lit.lower() in synonyms:
            return lit
    return default


# ---------------------------------------------------------
# REQUEST MODEL
# ---------------------------------------------------------

class BookingCreate(BaseModel):
    event_id: str
    ticket_quantity: int = Field(gt=0)


# ---------------------------------------------------------
# CREATE BOOKING
# ---------------------------------------------------------

@router.post("/")
def create_booking(
    booking: BookingCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    user_id = current_user.id

    try:

        # -------------------------------------------------
        # 1. Get event and LOCK the row
        # -------------------------------------------------

        event_query = text("""
            SELECT
                event_id,
                ticket_price,
                capacity,
                status
            FROM events
            WHERE event_id = :event_id
            FOR UPDATE
        """)

        event = db.execute(
            event_query,
            {
                "event_id": booking.event_id
            }
        ).mappings().first()


        # -------------------------------------------------
        # 2. Check whether event exists
        # -------------------------------------------------

        if not event:
            raise HTTPException(
                status_code=404,
                detail="Event not found"
            )


        # -------------------------------------------------
        # 3. Check event status
        # -------------------------------------------------

        if event["status"] != "published":
            raise HTTPException(
                status_code=400,
                detail="This event is not open for booking"
            )


        # -------------------------------------------------
        # 4. Find already booked tickets
        # -------------------------------------------------

        booked_query = text("""
            SELECT COALESCE(SUM(ticket_quantity), 0)
            FROM bookings
            WHERE event_id = :event_id
            AND LOWER(status) IN ('pending', 'confirmed')
        """)

        booked_tickets = db.execute(
            booked_query,
            {
                "event_id": booking.event_id
            }
        ).scalar()


        # -------------------------------------------------
        # 5. Check capacity
        # -------------------------------------------------

        remaining_capacity = event["capacity"] - booked_tickets

        if booking.ticket_quantity > remaining_capacity:

            raise HTTPException(
                status_code=400,
                detail=f"Only {remaining_capacity} tickets are available"
            )


        # -------------------------------------------------
        # 6. Calculate total amount
        # -------------------------------------------------

        total_amount = (
            event["ticket_price"] *
            booking.ticket_quantity
        )


        # -------------------------------------------------
        # 7. Create booking
        # -------------------------------------------------

        insert_booking = text("""
            INSERT INTO bookings (
                user_id,
                event_id,
                booking_date,
                ticket_quantity,
                total_amount,
                status
            )
            VALUES (
                :user_id,
                :event_id,
                CURRENT_DATE,
                :ticket_quantity,
                :total_amount,
                :b_status
            )
            RETURNING booking_id
        """)

        booking_id = db.execute(
            insert_booking,
            {
                "user_id": user_id,
                "event_id": booking.event_id,
                "ticket_quantity": booking.ticket_quantity,
                "total_amount": total_amount,
                "b_status": _allowed_status(db, "bookings_status_check", ("pending",), "pending"),
            }
        ).scalar_one()


        # -------------------------------------------------
        # 8. Create payment record
        # -------------------------------------------------

        insert_payment = text("""
            INSERT INTO payments (
                booking_id,
                amount,
                payment_method,
                payment_status,
                payment_date
            )
            VALUES (
                :booking_id,
                :amount,
                :payment_method,
                :p_status,
                CURRENT_TIMESTAMP
            )
            RETURNING payment_id
        """)

        payment_id = db.execute(
            insert_payment,
            {
                "booking_id": booking_id,
                "amount": total_amount,
                "payment_method": "UPI",
                "p_status": _allowed_status(db, "payments_status_check", ("pending",), "pending"),
            }
        ).scalar_one()


        db.commit()


        return {
            "message": "Booking created. Payment is pending.",
            "booking_id": str(booking_id),
            "payment_id": str(payment_id),
            "event_id": booking.event_id,
            "ticket_quantity": booking.ticket_quantity,
            "total_amount": total_amount,
            "booking_status": "PENDING",
            "payment_status": "PENDING"
        }


    except HTTPException:
        db.rollback()
        raise

    except Exception as e:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

# ---------------------------------------------------------
# PAYMENT REQUEST
# ---------------------------------------------------------

class PaymentCreate(BaseModel):
    booking_id: str
    payment_method: str


# ---------------------------------------------------------
# MAKE PAYMENT
# ---------------------------------------------------------

@router.post("/pay")
def make_payment(
    payment: PaymentCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):

    user_id = current_user.id

    try:

        # -------------------------------------------------
        # 1. Find booking
        # -------------------------------------------------

        booking_query = text("""
            SELECT
                booking_id,
                event_id,
                total_amount,
                status
            FROM bookings
            WHERE booking_id = :booking_id
            AND user_id = :user_id
            FOR UPDATE
        """)

        booking_data = db.execute(
            booking_query,
            {
                "booking_id": payment.booking_id,
                "user_id": user_id
            }
        ).mappings().first()


        if not booking_data:
            raise HTTPException(
                status_code=404,
                detail="Booking not found"
            )


        # -------------------------------------------------
        # 2. Check booking status
        # -------------------------------------------------

        if str(booking_data["status"]).lower() == "confirmed":

            raise HTTPException(
                status_code=400,
                detail="Booking has already been paid"
            )


        if str(booking_data["status"]).lower() == "cancelled":

            raise HTTPException(
                status_code=400,
                detail="Cancelled booking cannot be paid"
            )


        # -------------------------------------------------
        # 3. Check event is still ACTIVE
        # -------------------------------------------------

        event_query = text("""
            SELECT status
            FROM events
            WHERE event_id = :event_id
        """)

        event_status = db.execute(
            event_query,
            {
                "event_id": booking_data["event_id"]
            }
        ).scalar()


        if event_status != "published":

            raise HTTPException(
                status_code=400,
                detail="This event is no longer open for booking"
            )


        # -------------------------------------------------
        # 4. Update payment
        # -------------------------------------------------

        update_payment = text("""
            UPDATE payments
            SET
                payment_method = :payment_method,
                payment_status = :paid_status,
                payment_date = CURRENT_TIMESTAMP
                WHERE booking_id = :booking_id
                AND LOWER(payment_status) = 'pending'
        """)

        db.execute(
            update_payment,
            {
                "booking_id": payment.booking_id,
                "payment_method": payment.payment_method,
                "paid_status": _allowed_status(
                    db, "payments_status_check",
                    ("paid", "completed", "complete", "success", "successful"), "paid"),
            }
        )


        # -------------------------------------------------
        # 5. Confirm booking
        # -------------------------------------------------

        update_booking = text("""
            UPDATE bookings
            SET status = :c_status
            WHERE booking_id = :booking_id
            AND user_id = :user_id
        """)

        db.execute(
            update_booking,
            {
                "booking_id": payment.booking_id,
                "user_id": user_id,
                "c_status": _allowed_status(db, "bookings_status_check", ("confirmed",), "confirmed"),
            }
        )


        db.commit()


        return {
            "message": "Payment successful. Booking confirmed.",
            "booking_id": payment.booking_id,
            "amount": booking_data["total_amount"],
            "payment_method": payment.payment_method,
            "payment_status": "PAID",
            "booking_status": "CONFIRMED"
        }


    except HTTPException:
        db.rollback()
        raise

    except Exception as e:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )