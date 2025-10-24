# Partay - Party Equipment Rental Management System

A full-stack web application for managing party equipment rentals, drivers, and bookings.

## Features

- **Customer Booking Flow**: Browse equipment, check availability, and create bookings
- **Admin Dashboard**: Manage bookings, inventory, and drivers with calendar view
- **Driver Portal**: View daily routes, deliveries, and pickups
- **AI Business Assistant**: Claude-powered chatbot for business insights
- **Real-time Availability**: Check equipment availability across date ranges
- **Driver Assignment**: Assign and manage driver workloads

## Tech Stack

### Backend
- **FastAPI**: Modern Python web framework
- **SQLAlchemy**: ORM for database operations
- **Pydantic v2**: Data validation and settings
- **Anthropic Claude API**: AI-powered business assistant
- **PostgreSQL** (Production) / **SQLite** (Development)

### Frontend
- **React 18**: UI framework
- **Vite**: Build tool
- **Tailwind CSS**: Styling
- **Lucide React**: Icons
- **React Router**: Client-side routing

## Local Development

### Prerequisites
- Python 3.12+
- Node.js 18+
- uv (Python package manager)

### Backend Setup

```bash
cd backend

# Install dependencies
uv sync

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
uv run python -m backend.database.seed

# Start development server
uv run uvicorn backend.main:app --reload
```

Backend will run on http://localhost:8000

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev
```

Frontend will run on http://localhost:5173

## Deployment to Render

### Prerequisites
1. GitHub account
2. Render account (https://render.com)
3. API keys:
   - Anthropic API key (for chatbot)
   - Google Maps API key (optional)
   - Stripe keys (optional)

### Step 1: Push to GitHub

```bash
# Initialize git repository
git init
git add .
git commit -m "Initial commit"

# Create repository on GitHub and push
git remote add origin https://github.com/YOUR_USERNAME/partay-rental.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy to Render

1. Go to https://render.com/dashboard
2. Click "New +" → "Blueprint"
3. Connect your GitHub repository
4. Render will automatically detect `render.yaml` and create:
   - PostgreSQL database
   - Backend web service
   - Frontend static site

### Step 3: Configure Environment Variables

In Render dashboard, set these environment variables:

**Backend Service:**
- `FRONTEND_URL`: Your frontend URL (e.g., https://partay-frontend.onrender.com)
- `ANTHROPIC_API_KEY`: Your Anthropic API key
- `GOOGLE_MAPS_API_KEY`: (Optional) Your Google Maps API key
- `STRIPE_SECRET_KEY`: (Optional) Your Stripe secret key
- `STRIPE_PUBLISHABLE_KEY`: (Optional) Your Stripe publishable key
- `STRIPE_WEBHOOK_SECRET`: (Optional) Your Stripe webhook secret

**Frontend Service:**
- `VITE_API_URL`: Your backend URL (e.g., https://partay-backend.onrender.com)

### Step 4: Seed Production Database

After deployment, run the seed script once:

```bash
# In Render dashboard, open Shell for backend service and run:
python -m backend.database.seed
```

## Environment Variables

### Backend (.env)

```bash
# Database (auto-configured on Render)
DATABASE_URL=postgresql://user:password@host:5432/dbname

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=False

# CORS
FRONTEND_URL=https://your-frontend-url.com

# API Keys
ANTHROPIC_API_KEY=sk-ant-api03-...
GOOGLE_MAPS_API_KEY=AIza...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Security
SECRET_KEY=your-secret-key-here
```

### Frontend (.env)

```bash
# Backend API URL
VITE_API_URL=https://your-backend-url.com

# Google Maps (for address autocomplete)
VITE_GOOGLE_MAPS_API_KEY=AIza...

# Stripe (for payments)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

## Project Structure

```
Rental/
├── backend/
│   ├── src/
│   │   └── backend/
│   │       ├── api/          # API endpoints
│   │       ├── database/     # Models, schemas, migrations
│   │       ├── config.py     # Configuration
│   │       └── main.py       # FastAPI app
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API service layer
│   │   └── App.jsx         # Main app component
│   ├── package.json
│   └── .env
├── render.yaml             # Render deployment config
└── README.md
```

## API Documentation

Once deployed, API documentation is available at:
- Swagger UI: `https://your-backend-url.com/docs`
- ReDoc: `https://your-backend-url.com/redoc`

## License

MIT License - see LICENSE file for details

## Support

For issues and questions, please open an issue on GitHub.
