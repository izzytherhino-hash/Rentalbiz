# Partay Rental Management - Quick Start Guide

This guide will help you get the Partay rental management application running.

## Prerequisites

- Python 3.12+
- Node.js 18+
- UV package manager (installed)
- Git

## Project Structure

```
Rental/
├── backend/          # Python FastAPI backend
│   ├── src/          # Source code
│   ├── alembic/      # Database migrations
│   └── .env          # Backend configuration
├── frontend/         # React frontend
│   ├── src/          # Source code
│   └── .env          # Frontend configuration
└── Examples/         # Original design examples
```

## Quick Start

### 1. Start the Backend Server

```bash
cd backend
export PATH="$HOME/.local/bin:$PATH"
export PYTHONPATH=/home/izzy4598/projects/Rental/backend/src
uv run uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

The backend will be available at: http://localhost:8000
API documentation at: http://localhost:8000/docs

### 2. Start the Frontend Development Server

Open a new terminal:

```bash
cd frontend
npm install  # First time only
npm run dev
```

The frontend will be available at: http://localhost:5173

## Features Implemented

### Customer Booking Flow (http://localhost:5173/book)
- ✅ 5-step booking wizard
- ✅ Date range selection (delivery + pickup)
- ✅ Party space details (area size, surface type, power availability)
- ✅ Smart equipment filtering based on requirements
- ✅ Customer information with Google Maps autocomplete placeholder
- ✅ Order confirmation with booking number

### Driver Dashboard (http://localhost:5173/driver)
- ✅ Driver selection portal
- ✅ Daily route view with organized stops
- ✅ 4 stop types: Warehouse pickups, Customer deliveries, Customer pickups, Warehouse returns
- ✅ Smart return warehouse routing (items booked for next day go to correct warehouse)
- ✅ Navigation and phone call integration
- ✅ Movement recording on completion
- ✅ Earnings tracking

### Admin Dashboard (http://localhost:5173/admin)
- ✅ Calendar view with all bookings
- ✅ Dashboard statistics (total bookings, revenue, unassigned, conflicts)
- ✅ Inventory tracking
- ✅ Driver management and workload view
- ✅ Conflict detection (double-bookings)
- ✅ Unassigned booking alerts

### Backend API (http://localhost:8000/docs)
- ✅ 20+ RESTful endpoints
- ✅ Complete booking lifecycle management
- ✅ Smart availability checking
- ✅ Equipment filtering by requirements
- ✅ Driver route optimization
- ✅ Inventory tracking with audit trail
- ✅ Conflict detection algorithm

## Database

The application uses SQLite for development (file: `backend/partay_rentals.db`)

### Seed Data Included:
- 2 warehouses in Costa Mesa
- 3 drivers (Mike Johnson, Sarah Chen, James Rodriguez)
- 8 inventory items with realistic pricing and requirements

### To Reset Database:

```bash
cd backend
rm partay_rentals.db
export PYTHONPATH=/home/izzy4598/projects/Rental/backend/src
uv run alembic upgrade head
uv run python -m backend.database.seed
```

## API Testing

### Health Check:
```bash
curl http://localhost:8000/health
```

### List Inventory:
```bash
curl http://localhost:8000/api/inventory
```

### List Drivers:
```bash
curl http://localhost:8000/api/drivers
```

### Filter Equipment by Requirements:
```bash
curl -X POST http://localhost:8000/api/bookings/filter-items \
  -H "Content-Type: application/json" \
  -d '{"area_size": 400, "surface": "grass", "has_power": true}'
```

## Technology Stack

### Backend:
- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - ORM for database operations
- **Pydantic v2** - Data validation and settings
- **Alembic** - Database migrations
- **UV** - Fast Python package manager
- **SQLite** - Development database (PostgreSQL-ready)

### Frontend:
- **React 18** - UI framework
- **Vite** - Build tool
- **React Router v6** - Routing
- **Tailwind CSS** - Styling (Drybar-inspired design)
- **Lucide React** - Icons

## Design Philosophy

The UI follows a "Drybar-inspired" aesthetic:
- **Colors**: Yellow-400 (#FACC15) primary, gray tones
- **Typography**: Georgia serif for headings, clean sans-serif for body
- **Style**: Minimal, elegant, luxury service feel
- **UX**: Simple, straightforward, no clutter

## Project Status

✅ **Phase 1-4 Complete**: Full-stack application with all core features
- Backend API with 9 database tables
- Customer booking flow
- Driver route management
- Admin dashboard
- Complete frontend-backend integration

🔄 **Future Enhancements** (not yet implemented):
- Real Google Maps API integration (currently placeholder)
- Stripe payment processing
- Email notifications
- SMS notifications
- Mobile responsive optimizations
- Unit and integration tests
- Production deployment configuration

## Troubleshooting

### Backend won't start:
```bash
# Check if port 8000 is already in use
lsof -i :8000

# Make sure UV is in PATH
export PATH="$HOME/.local/bin:$PATH"

# Verify Python path is set
export PYTHONPATH=/home/izzy4598/projects/Rental/backend/src
```

### Frontend won't start:
```bash
# Reinstall dependencies
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Database issues:
```bash
# Reset the database (WARNING: deletes all data)
cd backend
rm partay_rentals.db
export PYTHONPATH=/home/izzy4598/projects/Rental/backend/src
uv run alembic upgrade head
uv run python -m backend.database.seed
```

## Next Steps

1. **Try the application**: Open http://localhost:5173 and create a test booking
2. **Explore the API**: Visit http://localhost:8000/docs for interactive API documentation
3. **Review the code**: Check out the well-documented code in `backend/src/` and `frontend/src/`
4. **Plan production deployment**: Configure PostgreSQL, environment variables, and hosting

## Documentation

- `PROJECT_PLAN.md` - Complete project roadmap and architecture
- `backend/API_SUMMARY.md` - Backend API documentation
- `CLAUDE.md` - Development guidelines and best practices

## Support

For issues or questions about the implementation:
1. Check the API documentation: http://localhost:8000/docs
2. Review the PROJECT_PLAN.md for architecture details
3. Examine the seed data in `backend/src/backend/database/seed.py`

---

**Happy Partay Planning! 🎉**
