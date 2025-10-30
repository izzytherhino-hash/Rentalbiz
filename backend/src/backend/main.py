"""
FastAPI main application for Party Rental Management System.

Provides REST API for:
- Customer booking flow
- Driver route management
- Admin dashboard operations
- Inventory tracking
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from pathlib import Path

from backend.config import get_settings
from backend.database import Base, engine

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.

    Handles startup and shutdown events.
    """
    # Startup: Create database tables
    Base.metadata.create_all(bind=engine)
    print("Database tables created/verified")
    print(f"API running on http://{settings.api_host}:{settings.api_port}")
    print(f"API docs available at http://{settings.api_host}:{settings.api_port}/docs")

    yield

    # Shutdown
    print("Shutting down API...")


# Create FastAPI application
app = FastAPI(
    title="Partay Rental Management API",
    description="API for managing party equipment rentals, drivers, and inventory",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Configure CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Root endpoint
@app.get("/", tags=["Root"])
async def root():
    """
    Root endpoint with API information.

    Returns:
        dict: API status and available endpoints
    """
    return {
        "message": "Partay Rental Management API",
        "version": "1.0.0",
        "status": "operational",
        "docs": "/docs",
        "endpoints": {
            "bookings": "/api/bookings",
            "customers": "/api/customers",
            "drivers": "/api/drivers",
            "inventory": "/api/inventory",
            "partners": "/api/partners",
            "admin": "/api/admin",
        },
    }


# Health check endpoint
@app.get("/health", tags=["Root"])
async def health_check():
    """
    Health check endpoint for monitoring.

    Returns:
        dict: Service health status
    """
    return {
        "status": "healthy",
        "database": "connected",
        "version": "1.0.0",
    }


# Import and include API routers
from backend.api.bookings import router as bookings_router
from backend.api.drivers import router as drivers_router
from backend.api.admin import router as admin_router
from backend.api.inventory import router as inventory_router
from backend.api.customers import router as customers_router
from backend.api.chatbot import router as chatbot_router
from backend.api.phineas import router as phineas_router
from backend.api.routes import router as routes_router
from backend.api.warehouses import router as warehouses_router
from backend.api.partners import router as partners_router
from backend.api.inventory_sync import router as inventory_sync_router

app.include_router(bookings_router, prefix="/api/bookings", tags=["Bookings"])
app.include_router(drivers_router, prefix="/api/drivers", tags=["Drivers"])
app.include_router(admin_router, prefix="/api/admin", tags=["Admin"])
app.include_router(inventory_router, prefix="/api/inventory", tags=["Inventory"])
app.include_router(customers_router, prefix="/api/customers", tags=["Customers"])
app.include_router(warehouses_router, prefix="/api/warehouses", tags=["Warehouses"])
app.include_router(partners_router, prefix="/api/partners", tags=["Partners"])
app.include_router(inventory_sync_router, prefix="/api/inventory", tags=["Inventory Sync"])
app.include_router(chatbot_router, prefix="/api/admin/chatbot", tags=["Chatbot"])
app.include_router(phineas_router, prefix="/api/admin/phineas", tags=["Phineas"])
app.include_router(routes_router, prefix="/api/routes", tags=["Routes"])

# Mount static files for uploads
uploads_dir = Path(__file__).parent.parent.parent / "uploads"
uploads_dir.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "backend.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.debug,
    )
