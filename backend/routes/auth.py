from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from gotrue.errors import AuthApiError
from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

try:
    from backend.supabase_client import supabase
except ImportError:
    from supabase_client import supabase

from sqlalchemy import text

try:
    from backend.database import engine
except ImportError:
    from database import engine


def get_profile_role(user_id: str) -> str:
    """Role comes from public.profiles, the same table admin.py and events.py check."""
    try:
        with engine.connect() as conn:
            role = conn.execute(
                text("SELECT role FROM public.profiles WHERE id = :user_id"),
                {"user_id": user_id},
            ).scalar_one_or_none()
        return role or "organizer"
    except Exception:
        return "organizer" 

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    access_token = credentials.credentials

    try:
        result = supabase.auth.get_user(access_token)

        user = result.user

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token"
            )

        return user

    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token"
        )

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class SignupRequest(BaseModel):
    full_name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str


@router.post("/login")
def login(request: LoginRequest):
    try:
        result = supabase.auth.sign_in_with_password({
            "email": request.email,
            "password": request.password,
        })

        if not result.user or not result.session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )

        role = get_profile_role(str(result.user.id))
        full_name = (result.user.user_metadata or {}).get("full_name") or result.user.email.split("@")[0]

        return {
            "message": "Login successful",
            "access_token": result.session.access_token,
            "token_type": "bearer",
            "user": {
                "id": str(result.user.id),
                "email": result.user.email,
                "full_name": full_name,
                "role": role,
            },
        }

    except AuthApiError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )


@router.post("/signup", status_code=status.HTTP_201_CREATED)
def signup(request: SignupRequest):
    if len(request.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters",
        )

    try:
        result = supabase.auth.sign_up({
            "email": request.email,
            "password": request.password,
            "options": {
                "data": {
                    "full_name": request.full_name,
                }
            },
        })

        return {
            "message": (
                "Signup successful. Check your email to confirm your account."
                if result.user and not result.session
                else "Signup successful"
            ),
            "user": {
                "id": result.user.id,
                "email": result.user.email,
            } if result.user else None,
        }

    except AuthApiError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to register with these credentials",
        )