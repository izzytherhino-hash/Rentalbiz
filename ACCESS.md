# 🎉 Partay Rental Management - Application Access Guide

## ✅ Your Application is Now Running!

Both the backend and frontend servers are running and ready to use.

---

## 🌐 Application URLs

### **Main Application (Frontend)**
**URL:** http://localhost:5173

Open this URL in your browser to access the full application.

#### Available Pages:
1. **Landing Page:** http://localhost:5173/
   - Marketing landing page with Drybar-inspired design
   - "Get Started" button to begin booking

2. **Customer Booking:** http://localhost:5173/book
   - 5-step booking wizard
   - Smart equipment filtering
   - Date selection and customer information

3. **Driver Dashboard:** http://localhost:5173/driver
   - Select driver: Mike Johnson, Sarah Chen, or James Rodriguez
   - View daily routes organized by stop type
   - Mark stops as complete
   - Navigate to addresses

4. **Admin Dashboard:** http://localhost:5173/admin
   - Calendar view of all bookings
   - Inventory tracking
   - Driver management
   - Conflict detection

---

### **Backend API**
**URL:** http://localhost:8000

#### API Documentation (Interactive):
**URL:** http://localhost:8000/docs

This provides:
- Complete API documentation
- Interactive testing interface
- Try out any endpoint directly in your browser

#### Health Check:
**URL:** http://localhost:8000/health

Returns: `{"status":"healthy","database":"connected","version":"1.0.0"}`

---

## 🚀 Quick Test Flow

### Test the Customer Booking Flow:

1. Open http://localhost:5173
2. Click "Get Started" or "Plan Your Partay"
3. Follow the 5-step booking wizard:
   - **Step 1:** Select delivery and pickup dates
   - **Step 2:** Enter party space details
     - Area size: Try "20ft × 20ft" (400 sq ft)
     - Surface: Select "Grass"
     - Power: Select "Yes"
   - **Step 3:** Browse and select equipment
   - **Step 4:** Enter customer information
   - **Step 5:** View confirmation

### Test the Driver Dashboard:

1. Open http://localhost:5173/driver
2. Select a driver (e.g., "Mike Johnson")
3. View the route (currently empty - bookings will appear here)
4. Try changing the date to see different routes

### Test the Admin Dashboard:

1. Open http://localhost:5173/admin
2. Switch between tabs:
   - **Calendar:** View bookings by date
   - **Inventory:** See all 8 equipment items
   - **Drivers:** View driver workload
   - **Conflicts:** Check for double-bookings

---

## 📊 Sample Data Available

### Warehouses:
- Warehouse A - Main (1500 Adams Ave, Costa Mesa, CA 92626)
- Warehouse B - North (2800 Harbor Blvd, Costa Mesa, CA 92626)

### Drivers:
- Mike Johnson - (714) 555-0101
- Sarah Chen - (714) 555-0102
- James Rodriguez - (714) 555-0103

### Inventory Items (8 total):
1. **Bounce House Castle** - $250/day
   - Requires: 15×15ft (225 sqft), grass/turf, power
2. **Water Slide Mega** - $350/day
   - Requires: 20×20ft (400 sqft), grass/turf, power
3. **Obstacle Course** - $400/day
   - Requires: 30×20ft (600 sqft), grass/turf, power
4. **Mini Bounce House** - $150/day
   - Requires: 12×12ft (144 sqft), grass/turf, power
5. **Cotton Candy Machine** - $75/day
   - Requires: Power only (works on any surface)
6. **Popcorn Machine** - $65/day
   - Requires: Power only (works on any surface)
7. **Photo Booth Deluxe** - $200/day
   - Requires: 8×8ft (64 sqft), any surface, power
8. **Tables & Chairs Set** - $50/day
   - No special requirements (works anywhere)

---

## 🛠️ Server Status

### Backend Server:
- **Status:** ✅ Running
- **Port:** 8000
- **Process:** Background (uvicorn with auto-reload)
- **Database:** SQLite (partay_rentals.db)

### Frontend Server:
- **Status:** ✅ Running
- **Port:** 5173
- **Process:** Background (Vite dev server)
- **Hot Reload:** Enabled

---

## 🔧 API Endpoint Examples

### List All Inventory:
```bash
curl http://localhost:8000/api/inventory/
```

### List All Drivers:
```bash
curl http://localhost:8000/api/drivers/
```

### Filter Equipment by Requirements:
```bash
curl -X POST http://localhost:8000/api/bookings/filter-items \
  -H "Content-Type: application/json" \
  -d '{
    "area_size": 400,
    "surface": "grass",
    "has_power": true
  }'
```

### Check Equipment Availability:
```bash
curl -X POST http://localhost:8000/api/bookings/check-availability \
  -H "Content-Type: application/json" \
  -d '{
    "item_ids": ["<item-id>"],
    "delivery_date": "2025-10-25",
    "pickup_date": "2025-10-26"
  }'
```

---

## 💡 Tips

1. **Start with the Landing Page:** http://localhost:5173 - Click "Get Started" to see the full booking flow

2. **Try the API Docs:** http://localhost:8000/docs - Interactive testing interface

3. **Create a Test Booking:** Use the customer booking flow to create sample data

4. **Check Admin Dashboard:** See your test bookings appear in the calendar

5. **View Driver Routes:** After creating bookings, check the driver dashboard

---

## 📝 Next Steps

- **Add Real Google Maps API Key:** Replace placeholder in `frontend/.env`
- **Configure Stripe:** Add Stripe keys for payment processing
- **Switch to PostgreSQL:** For production deployment
- **Add User Authentication:** Implement login/signup
- **Deploy to Production:** Use services like Vercel (frontend) + Railway (backend)

---

## ⚠️ Important Notes

- **Local Development Only:** This setup is for local development
- **No Authentication:** Currently no login required (add before production)
- **Sample Data:** Database contains seed data for testing
- **API Keys:** Google Maps and Stripe are placeholder values

---

## 🎊 Enjoy Your Partay App!

The application is fully functional and ready to test. Start by opening:
**http://localhost:5173**

For questions or issues, check:
- `START_GUIDE.md` - Detailed startup instructions
- `PROJECT_PLAN.md` - Complete architecture documentation
- `backend/API_SUMMARY.md` - API endpoint reference
