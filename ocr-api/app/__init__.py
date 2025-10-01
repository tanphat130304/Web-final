from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import api_router
from app.core.config import get_settings
from contextlib import asynccontextmanager
from app.modules.video_process import ocr as global_ocr

settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load the ML model and other resources
    print("Application startup: Initializing resources...")
    # Nothing specific to do for OCR object on startup beyond its global initialization
    yield
    # Clean up the ML model and other resources
    print("Application shutdown: Cleaning up resources...")
    try:
        del global_ocr
        print("Global OCR object deleted.")
    except NameError:
        print("Global OCR object was not found to delete.")
    except Exception as e:
        print(f"Error deleting global OCR object: {e}")


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name, 
        version=settings.app_version,
        lifespan=lifespan
    )

    # Define allowed origins explicitly to resolve CORS issues
    allowed_origins = [
        "http://localhost:3000",  # React development server
        "http://127.0.0.1:3000",
        "http://localhost:5173",  # Vite default port
        "http://127.0.0.1:5173",
        "http://localhost",
        settings.frontend_url,
    ]

    # Print allowed origins for debugging
    print(f"CORS Allowed Origins: {allowed_origins}")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_origin_regex=None,  # No regex pattern to avoid potential misconfigurations
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"],
        allow_headers=["*"],
        expose_headers=["Content-Disposition", "ETag", "Cache-Control"],
        max_age=600,  # Cache preflight requests for 10 minutes
    )

    app.include_router(api_router, prefix="/api/v1")
    return app