from fastapi import FastAPI
from fastapi_pagination import add_pagination
from .schemas import UserCreate, UserRead, UserUpdate
from .users import auth_backend, fastapi_users, AUTH_URL_PATH
from fastapi.middleware.cors import CORSMiddleware
from .utils import simple_generate_unique_route_id
from app.routes.videos import router as videos_router
from app.routes.tts import router as tts_router
from app.routes.ttimage import router as ttimage_router
from app.routes.lesson import router as lesson_router
from app.config import settings

# ✅ NEW IMPORT
from app.routes.generate_script import router as script_router

# -----------------------------
# Create the main FastAPI app
# -----------------------------
app = FastAPI(
    generate_unique_id_function=simple_generate_unique_route_id,
    openapi_url=settings.OPENAPI_URL,
)

# -----------------------------
# CORS setup
# -----------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# Auth routes
# -----------------------------
app.include_router(
    fastapi_users.get_auth_router(auth_backend),
    prefix=f"/{AUTH_URL_PATH}/jwt",
    tags=["auth"],
)
app.include_router(
    fastapi_users.get_register_router(UserRead, UserCreate),
    prefix=f"/{AUTH_URL_PATH}",
    tags=["auth"],
)
app.include_router(
    fastapi_users.get_reset_password_router(),
    prefix=f"/{AUTH_URL_PATH}",
    tags=["auth"],
)
app.include_router(
    fastapi_users.get_verify_router(UserRead),
    prefix=f"/{AUTH_URL_PATH}",
    tags=["auth"],
)
app.include_router(
    fastapi_users.get_users_router(UserRead, UserUpdate),
    prefix="/users",
    tags=["users"],
)

# -----------------------------
# Application routes
# -----------------------------
app.include_router(videos_router, prefix="/videos", tags=["videos"])
app.include_router(tts_router, prefix="/tts", tags=["tts"])
app.include_router(ttimage_router, prefix="/ttimage", tags=["ttimage"])
app.include_router(lesson_router, prefix="/lessons", tags=["lessons"])

# ✅ NEW ROUTE for PDF → Script generation
app.include_router(script_router, prefix="/api/scripts", tags=["Script Generation"])

# -----------------------------
# Pagination
# -----------------------------
add_pagination(app)