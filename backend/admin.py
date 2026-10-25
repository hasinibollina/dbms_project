"""Admin-only analytics endpoints for Eventilion."""
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text

try:
    from backend.database import engine
    from backend.routes.auth import get_current_user
except ImportError:
    from database import engine
    from routes.auth import get_current_user

router = APIRouter(tags=["Admin"])
logger = logging.getLogger("eventilion_api")


VENDOR_COLUMNS = """
    v.vendor_id, v.vendor_name, v.service_id, s.service_name,
    v.service_description, v.phone, v.email, v.created_at
"""



def require_admin(user=Depends(get_current_user)):
    """Verify the authenticated Supabase user has the admin role."""
    try:
        with engine.connect() as conn:
            role = conn.execute(
                text("SELECT role FROM public.profiles WHERE id = :user_id"),
                {"user_id": str(user.id)},
            ).scalar_one_or_none()
    except Exception:
        logger.exception("Could not verify user role")
        raise HTTPException(status_code=503, detail="Could not verify permissions")

    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# --------------------------------------------------------------------------
# Admin Analytics (read-only). Errors are returned to the client instead of
# being replaced by sample data, so problems are visible on screen.
# --------------------------------------------------------------------------
def _db_error(context: str, exc: Exception):
    logger.error(f"{context}: {exc}")
    raise HTTPException(status_code=503, detail=f"{context}. Check the backend terminal for details.")


@router.get("/api/admin/stats", dependencies=[Depends(require_admin)])
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


@router.get("/api/admin/events", dependencies=[Depends(require_admin)])
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


@router.get("/api/admin/venues", dependencies=[Depends(require_admin)])
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


@router.get("/api/admin/vendors", dependencies=[Depends(require_admin)])
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


