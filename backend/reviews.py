
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session
from typing import Optional

try:
    from backend.routes.auth import get_current_user
except ImportError:
    from routes.auth import get_current_user

try:
    from backend.database import get_db
except ImportError:
    from database import get_db


router = APIRouter(
    prefix="/api/reviews",
    tags=["Reviews"]
)


class ReviewCreate(BaseModel):
    event_id: str
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = Field(default=None, max_length=1000)


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_review(
    review: ReviewCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    user_id = current_user.id

    try:
        # 1. Verify that the user has a confirmed booking
        #    and a successful payment for this event.
        eligibility_query = text("""
            SELECT b.booking_id
            FROM bookings b
            WHERE b.user_id = :user_id
              AND b.event_id = :event_id
              AND b.status = 'CONFIRMED'
              AND EXISTS (
                  SELECT 1
                  FROM payments p
                  WHERE p.booking_id = b.booking_id
                    AND p.payment_status = 'PAID'
              )
            LIMIT 1
        """)

        booking_id = db.execute(
            eligibility_query,
            {
                "user_id": str(user_id),
                "event_id": review.event_id
            }
        ).scalar_one_or_none()

        if booking_id is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "You must have a confirmed booking and "
                    "successful payment for this event to review it."
                )
            )

        # 2. Prevent duplicate reviews by the same user
        #    for the same event.
        duplicate_query = text("""
            SELECT review_id
            FROM reviews
            WHERE user_id = :user_id
              AND event_id = :event_id
            LIMIT 1
        """)

        existing_review = db.execute(
            duplicate_query,
            {
                "user_id": str(user_id),
                "event_id": review.event_id
            }
        ).scalar_one_or_none()

        if existing_review is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="You have already reviewed this event."
            )

        # 3. Insert the review using the authenticated user's ID.
        insert_query = text("""
            INSERT INTO reviews (
                user_id,
                event_id,
                rating,
                comment,
                review_date
            )
            VALUES (
                :user_id,
                :event_id,
                :rating,
                :comment,
                CURRENT_TIMESTAMP
            )
            RETURNING
                review_id,
                user_id,
                event_id,
                rating,
                comment,
                review_date
        """)

        result = db.execute(
            insert_query,
            {
                "user_id": str(user_id),
                "event_id": review.event_id,
                "rating": review.rating,
                "comment": (
                    review.comment.strip()
                    if review.comment and review.comment.strip()
                    else None
                )
            }
        ).mappings().one()

        db.commit()

        return {
            "message": "Review submitted successfully.",
            "review": dict(result)
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not submit review."
        )
# Edit an existing review
@router.put("/{review_id}")
def update_review(
    review_id: str,
    review: ReviewCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    user_id = str(current_user.id)

    try:
        update_query = text("""
            UPDATE reviews
            SET rating = :rating,
                comment = :comment
            WHERE review_id = :review_id
              AND user_id = :user_id
            RETURNING
                review_id,
                user_id,
                event_id,
                rating,
                comment,
                review_date
        """)

        result = db.execute(
            update_query,
            {
                "review_id": review_id,
                "user_id": user_id,
                "rating": review.rating,
                "comment": (
                    review.comment.strip()
                    if review.comment and review.comment.strip()
                    else None
                )
            }
        ).mappings().one_or_none()

        if result is None:
            db.rollback()
            raise HTTPException(
                status_code=404,
                detail="Review not found or you do not own this review."
            )

        db.commit()

        return {
            "message": "Review updated successfully.",
            "review": dict(result)
        }

    except HTTPException:
        raise
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not update review."
        )


# Delete your own review
@router.delete("/{review_id}")
def delete_review(
    review_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    user_id = str(current_user.id)

    try:
        delete_query = text("""
            DELETE FROM reviews
            WHERE review_id = :review_id
              AND user_id = :user_id
            RETURNING review_id
        """)

        deleted_id = db.execute(
            delete_query,
            {
                "review_id": review_id,
                "user_id": user_id
            }
        ).scalar_one_or_none()

        if deleted_id is None:
            db.rollback()
            raise HTTPException(
                status_code=404,
                detail="Review not found or you do not own this review."
            )

        db.commit()

        return {
            "message": "Review deleted successfully.",
            "review_id": str(deleted_id)
        }

    except HTTPException:
        raise
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not delete review."
        )

