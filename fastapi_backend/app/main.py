from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi_pagination import add_pagination

# Local imports
from app.schemas import UserCreate, UserRead, UserUpdate
from app.users import auth_backend, fastapi_users, AUTH_URL_PATH
from app.config import settings
from app.utils import simple_generate_unique_route_id

# Routers
from app.routes.videos import router as videos_router
from app.routes.tts import router as tts_router
from app.routes.ttimage import router as ttimage_router
from app.routes.lesson import router as lesson_router
from app.routes.generate_script import router as script_router

# --------------------------------------------------------
# Initialize FastAPI app
# --------------------------------------------------------
app = FastAPI(
    title="EduPulse Backend",
    description="Backend API for EduPulse platform (lessons, videos, scripts, AI tools).",
    version="1.0.0",
    generate_unique_id_function=simple_generate_unique_route_id,
    openapi_url=settings.OPENAPI_URL,
)

# --------------------------------------------------------
# Middleware (CORS)
# --------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------------------------------------
# Authentication & User Management
# --------------------------------------------------------
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

# --------------------------------------------------------
# Application Routes (Feature Modules)
# --------------------------------------------------------
app.include_router(videos_router, prefix="/videos", tags=["Videos"])
app.include_router(tts_router, prefix="/tts", tags=["Text-to-Speech"])
app.include_router(ttimage_router, prefix="/ttimage", tags=["Text-to-Image"])
app.include_router(lesson_router, prefix="/lessons", tags=["Lessons"])
app.include_router(script_router, prefix="/api/scripts", tags=["Script Generation"])

# --------------------------------------------------------
# Pagination Support
# --------------------------------------------------------
add_pagination(app)


# --------------------------------------------------------
# Health Check Route (for Docker & sanity testing)
# --------------------------------------------------------
@app.get("/", tags=["Root"])
async def root():
    return {
        "status": "✅ EduPulse backend is running",
        "routes": [
            "/api/scripts/generate-script-from-pdf",
            "/api/scripts/save-script",
            "/videos",
            "/lessons",
            "/tts",
            "/ttimage",
            f"/{AUTH_URL_PATH}/jwt/login",
        ],
    }
