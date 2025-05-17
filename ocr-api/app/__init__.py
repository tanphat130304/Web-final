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


    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router, prefix="/api/v1")
    return app