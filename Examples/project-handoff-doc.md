# Party Rentals Management System - Project Handoff

## Project Overview
A complete party equipment rental management platform with customer booking, driver logistics, admin dashboard, and real-time inventory tracking across multiple warehouses.

---

## Business Context

### The Problem
Managing party rental equipment with:
- Multiple warehouses (Warehouse A, Warehouse B)
- Items that move between warehouses and customers
- Drivers delivering and picking up equipment
- Variable rental periods (1-day to 5-day rentals)
- Items that need to return to SPECIFIC warehouses based on next bookings
- Same-day pickups and deliveries

### The Solution
An AI-enabled rental platform that:
- Filters available equipment based on space, surface type, and power availability
- Tracks real-time item locations (warehouse → customer → warehouse)
- Manages driver routes with warehouse pickup/delivery/return logistics
- Detects booking conflicts automatically
- Optimizes equipment returns based on next bookings

---

## Tech Stack Decisions

### Frontend
- **React** with functional components and hooks
- **Tailwind CSS** for styling (Drybar-inspired design: white, gray, yellow accents)
- **Lucide React** for icons
- **Google Maps Places API** for address autocomplete and routing

### Backend (To Be Built)
- **Node.js + Express** OR **Supabase** (recommended for speed)
- **PostgreSQL** database
- **Prisma ORM** (if using Node) OR Supabase auto-generated API

### Deployment
- **Render** (chosen by client - has existing account)
- Frontend: Static site on Render
- Backend: Web service on Render
- Database: Render PostgreSQL OR Supabase PostgreSQL

### Payments
- **Stripe** for payment processing
- Collect: full payment + delivery fee + driver tip
- All prepaid (like UberEats model)

---

## Artifacts Built

I've created 5 complete artifacts in our conversation:

### 1. `party-rental-booking` - Customer Booking Flow
**File**: Should become `src/pages/CustomerBooking.jsx`

**Features:**
- Step 1: Date selection
- Step 2: Party space details (size, surface type, power availability)
- Step 3: Equipment selection (filtered based on step 2)
- Step 4: Customer info + Google Maps address autocomplete
- Step 5: Confirmation

**Key Logic:**
- Smart filtering: Only shows items that fit the customer's space/surface/power constraints
- Google Places Autocomplete for address (captures lat/lng for routing)
- Drybar-inspired design (clean, white, yellow accents)

**Sample Data Structure:**
```javascript
{
  selectedDate: '2025-10-20',
  partyDetails: {
    areaSize: 400, // square feet
    surface: 'grass',
    hasPower: true
  },
  selectedItems: [1, 3, 5], // item IDs
  customerInfo: {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '(555) 123-4567',
    address: '123 Main St...',
    addressDetails: {
      lat: 33.6412,
      lng: -117.9187,
      placeId: 'ChIJ...',
      formatted: '123 Main St, City, CA 12345'
    }
  }
}
```

### 2. `driver-route-app` - Driver Dashboard
**File**: Should become `src/pages/DriverDashboard.jsx`

**Features:**
- Login screen (select driver)
- Today's route with 4 stop types:
  1. **Warehouse Pickups** (blue) - Load items at start of route
  2. **Customer Deliveries** (yellow) - Drop off items
  3. **Customer Pickups** (purple) - Collect items from ended rentals
  4. **Warehouse Returns** (green) - Return items to correct warehouse
- Shows earnings (fees + tips)
- One-tap call customer
- One-tap navigate to address
- Mark stops complete
- Critical warnings when items must go to specific warehouse

**Key Innovation:**
The `nextBooking` logic that tells drivers where to return equipment:
```javascript
{
  type: 'pickup',
  items: ['Bounce House'],
  nextBooking: {
    hasNext: true,
    deliveryDate: 'Tomorrow',
    warehouse: 'Warehouse B - North' // Driver MUST return here!
  }
}
```

### 3. `admin-dashboard-cal` - Admin Dashboard
**File**: Should become `src/pages/AdminDashboard.jsx`

**Features:**
- **Calendar View**: Month calendar showing all bookings, click days to see details
- **Inventory View**: Real-time item locations, click items to see their booking calendar
- **Drivers View**: See all drivers, their assignments, earnings, and unassigned bookings
- **Conflicts View**: Automatic detection of double-booked items with red alerts
- **Quick Stats**: Deliveries today, active rentals, unassigned bookings, conflicts
- **Booking Detail Modal**: Click any booking to see full details, edit status, reassign driver

**Key Features:**
- Conflict detection algorithm (checks for overlapping rental dates)
- Item-specific calendars (see when ONE item is booked)
- Driver assignment interface
- Quick action buttons for common tasks

### 4. `database-schema` - Complete Database Design
**File**: Should become `docs/database-schema.md`

**9 Tables:**
1. `customers` - Customer records
2. `warehouses` - Storage locations (Warehouse A, B)
3. `inventory_items` - Master list of equipment
4. `bookings` - Customer orders
5. `booking_items` - Junction table (which items in which booking)
6. `drivers` - Driver records
7. `inventory_movements` - **CRITICAL** - Real-time tracking of item movements
8. `payments` - Stripe transactions
9. `notifications` - SMS/email log

**Critical Relationships:**
- Each booking has multiple items
- Each item can have multiple bookings (at different times)
- Each item has a current location (warehouse_id OR null if with customer)
- inventory_movements table logs EVERY item movement for audit trail

**Key Queries Included:**
- Check item availability for date range
- Get driver's route for today
- Detect booking conflicts
- Determine return warehouse based on next booking

### 5. `partay-landing-page` - Marketing Landing Page
**File**: Should become `public/index.html` OR `src/pages/Landing.jsx`

**Features:**
- Drybar-inspired design (clean, elegant, yellow accents)
- Custom SVG delivery truck with "partay" branding
- Hero section with value prop
- Features section (AI-powered, best deals, full service)
- How it works (4 steps)
- CTA sections

**Company Info:**
- Name: "partay"
- Tagline: "Let's get the partay started"
- Description: "AI-enabled event equipment rental aggregator that designs your partay with you and then sources and arranges the best deals on rental equipment"

---

## Sample Data

### Inventory Items
```javascript
[
  {
    id: 1,
    name: 'Bounce House Castle',
    category: 'Inflatable',
    price: 250,
    requiresPower: true,
    minSpaceSqft: 225, // 15x15
    allowedSurfaces: ['grass', 'artificial_turf'],
    currentWarehouse: 'Warehouse A'
  },
  {
    id: 2,
    name: 'Water Slide Mega',
    category: 'Inflatable',
    price: 350,
    requiresPower: true,
    minSpaceSqft: 400, // 20x20
    allowedSurfaces: ['grass', 'artificial_turf'],
    currentWarehouse: 'Warehouse A'
  },
  {
    id: 3,
    name: 'Obstacle Course',
    category: 'Inflatable',
    price: 400,
    requiresPower: true,
    minSpaceSqft: 600, // 30x20
    allowedSurfaces: ['grass', 'artificial_turf'],
    currentWarehouse: 'Warehouse A'
  },
  {
    id: 4,
    name: 'Cotton Candy Machine',
    category: 'Concession',
    price: 75,
    requiresPower: true,
    minSpaceSqft: 0,
    allowedSurfaces: ['grass', 'concrete', 'asphalt', 'artificial_turf', 'indoor'],
    currentWarehouse: 'Warehouse A'
  },
  {
    id: 5,
    name: 'Photo Booth Deluxe',
    category: 'Entertainment',
    price: 200,
    requiresPower: true,
    minSpaceSqft: 64, // 8x8
    allowedSurfaces: ['grass', 'concrete', 'asphalt', 'artificial_turf', 'indoor'],
    currentWarehouse: 'Warehouse B'
  },
  {
    id: 6,
    name: 'Popcorn Machine',
    category: 'Concession',
    price: 65,
    requiresPower: true,
    minSpaceSqft: 0,
    allowedSurfaces: ['grass', 'concrete', 'asphalt', 'artificial_turf', 'indoor'],
    currentWarehouse: 'Warehouse B'
  },
  {
    id: 7,
    name: 'Mini Bounce House',
    category: 'Inflatable',
    price: 150,
    requiresPower: true,
    minSpaceSqft: 144, // 12x12
    allowedSurfaces: ['grass', 'artificial_turf'],
    currentWarehouse: 'Warehouse B'
  },
  {
    id: 8,
    name: 'Tables & Chairs Set',
    category: 'Furniture',
    price: 50,
    requiresPower: false,
    minSpaceSqft: 0,
    allowedSurfaces: ['grass', 'concrete', 'asphalt', 'artificial_turf', 'indoor'],
    currentWarehouse: 'Warehouse B'
  }
]
```

### Warehouses
```javascript
[
  {
    id: 1,
    name: 'Warehouse A - Main',
    address: '1500 Adams Ave, Costa Mesa, CA 92626',
    lat: 33.6595,
    lng: -117.9187
  },
  {
    id: 2,
    name: 'Warehouse B - North',
    address: '2800 Harbor Blvd, Costa Mesa, CA 92626',
    lat: 33.6712,
    lng: -117.9189
  }
]
```

### Drivers
```javascript
[
  { id: 1, name: 'Mike Johnson' },
  { id: 2, name: 'Sarah Chen' },
  { id: 3, name: 'James Rodriguez' }
]
```

---

## Critical Business Logic

### 1. Equipment Filtering Algorithm
When a customer enters their party space details, filter items like this:

```javascript
const availableItems = inventory.filter(item => {
  // Check area size
  if (partyDetails.areaSize < item.minSpaceSqft) return false;
  
  // Check surface compatibility
  if (!item.allowedSurfaces.includes(partyDetails.surface)) return false;
  
  // Check power availability
  if (item.requiresPower && !partyDetails.hasPower) return false;
  
  return true;
});
```

### 2. Conflict Detection
Check if an item is available for a date range:

```javascript
function checkAvailability(itemId, startDate, endDate) {
  const conflicts = bookings.filter(booking => {
    // Skip cancelled bookings
    if (booking.status === 'cancelled') return false;
    
    // Check if booking includes this item
    const hasItem = booking.items.some(i => i.id === itemId);
    if (!hasItem) return false;
    
    // Check for date overlap
    return booking.deliveryDate <= endDate && booking.pickupDate >= startDate;
  });
  
  return conflicts.length === 0;
}
```

### 3. Return Warehouse Logic
Determine where an item should be returned after pickup:

```javascript
function getReturnWarehouse(itemId, currentBookingPickupDate) {
  // Find next booking for this item
  const nextBooking = bookings
    .filter(b => b.deliveryDate > currentBookingPickupDate)
    .filter(b => b.items.some(i => i.id === itemId))
    .sort((a, b) => a.deliveryDate - b.deliveryDate)[0];
  
  if (nextBooking) {
    // Return to warehouse where next booking will pick it up
    return nextBooking.pickupWarehouse;
  } else {
    // No next booking - return to item's default warehouse
    return item.defaultWarehouse;
  }
}
```

---

## Design System (Drybar-Inspired)

### Colors
```css
/* Primary */
--yellow-400: #FACC15  /* Main brand color - buttons, accents */
--yellow-500: #F59E0B  /* Hover states */

/* Neutrals */
--white: #FFFFFF       /* Background */
--gray-50: #F9FAFB     /* Light background */
--gray-200: #E5E7EB    /* Borders */
--gray-600: #6B7280    /* Secondary text */
--gray-800: #1F2937    /* Primary text */

/* Status Colors */
--blue-500: #3B82F6    /* Warehouse pickups */
--green-500: #10B981   /* Available, completed */
--orange-500: #F59E0B  /* Warnings, unassigned */
--red-500: #EF4444     /* Conflicts, errors */
--purple-500: #8B5CF6  /* Customer pickups */
```

### Typography
```css
/* Headers */
font-family: Georgia, serif;
font-weight: 300;
letter-spacing: -0.5px;

/* Body */
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Buttons */
text-transform: uppercase;
letter-spacing: 0.5px;
font-weight: 600;
```

### Components
- **Buttons**: Yellow background, white text, rounded-lg, uppercase
- **Cards**: White background, subtle border, rounded-lg
- **Inputs**: Border on focus changes to yellow
- **Status badges**: Small, rounded, colored background with border

---

## API Endpoints Needed

### Customer Booking Flow
```
POST   /api/bookings/check-availability
  Body: { items: [ids], deliveryDate, pickupDate }
  Returns: { available: boolean, conflicts: [] }

POST   /api/bookings
  Body: { customerInfo, items, dates, address, paymentIntent }
  Returns: { bookingId, orderNumber }

POST   /api/payments/create-intent
  Body: { amount, customerId }
  Returns: { clientSecret, paymentIntentId }
```

### Driver Dashboard
```
GET    /api/drivers/:id/route/:date
  Returns: { stops: [...] }

PATCH  /api/stops/:id/complete
  Body: { status: 'completed', timestamp }
  Returns: { success, inventoryMovement }

POST   /api/inventory-movements
  Body: { itemId, fromLocation, toLocation, driverId, bookingId }
  Returns: { movementId }
```

### Admin Dashboard
```
GET    /api/bookings?date=2025-10-20
  Returns: { bookings: [...] }

GET    /api/inventory
  Returns: { items: [...] }

GET    /api/inventory/:id/calendar
  Returns: { bookings: [...] }

GET    /api/conflicts
  Returns: { conflicts: [...] }

PATCH  /api/bookings/:id
  Body: { status, assignedDriverId, etc }
  Returns: { booking }

GET    /api/drivers
  Returns: { drivers: [...] }
```

---

## Environment Variables Needed

```bash
# Database
DATABASE_URL=postgresql://...

# Stripe
STRIPE_SECRET_KEY=sk_...
STRIPE_PUBLISHABLE_KEY=pk_...

# Google Maps
GOOGLE_MAPS_API_KEY=AIza...

# SMS (Twilio - future)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...

# Email (SendGrid - future)
SENDGRID_API_KEY=SG...

# App
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000
```

---

## Next Steps for Claude Code

### Phase 1: Project Setup
1. Create React app with Vite
2. Install dependencies:
   - `react-router-dom`
   - `lucide-react`
   - `tailwindcss`
   - `@stripe/stripe-js` `@stripe/react-stripe-js`
3. Set up Tailwind config with custom colors
4. Create folder structure:
   ```
   src/
     components/
     pages/
       CustomerBooking.jsx
       DriverDashboard.jsx
       AdminDashboard.jsx
       Landing.jsx
     contexts/
     hooks/
     utils/
   ```

### Phase 2: Backend Setup (Recommend Supabase)
1. Create Supabase project
2. Run database migrations (use schema from artifact)
3. Set up Row Level Security policies
4. Generate TypeScript types
5. Create API routes/functions

### Phase 3: Integration
1. Connect customer booking to database
2. Implement Stripe payment flow
3. Build driver route generation logic
4. Connect admin dashboard to real data
5. Add Google Maps integration

### Phase 4: Deployment
1. Deploy frontend to Render (static site)
2. Deploy backend to Render (if not using Supabase)
3. Set up environment variables
4. Configure custom domain (optional)

### Phase 5: Polish
1. Add loading states
2. Error handling
3. Form validation
4. SMS notifications (Twilio)
5. Email confirmations (SendGrid)
6. Analytics

---

## Known Issues & Todos

### Google Maps API Key
- Client deleted their first API key (accidentally exposed)
- Need to create new key with proper restrictions:
  - HTTP referrers restricted to deployed domain
  - API restrictions: Places API + Maps JavaScript API only

### Payment Flow
- Not yet implemented
- Need to add Stripe checkout to customer booking step 4
- Collect: subtotal + delivery fee + tip
- Everything must be prepaid

### Authentication
- Not implemented yet
- Admin dashboard needs login
- Driver dashboard has simple name selection (needs proper auth)

### Real-time Updates
- Driver marking stops complete should update admin dashboard
- Consider WebSockets or polling

### Mobile Optimization
- All interfaces should work on mobile
- Driver dashboard especially critical (used on phones)

---

## Files to Copy from Artifacts

When you're ready to build this in Claude Code, ask me for the full code from these artifacts:

1. `party-rental-booking` → Customer booking component
2. `driver-route-app` → Driver dashboard component  
3. `admin-dashboard-cal` → Admin dashboard component
4. `partay-landing-page` → Landing page HTML
5. `database-schema` → Database schema markdown

Each artifact has complete, working code ready to integrate into a proper React project structure.

---

## Client Notes

- Client has existing Render account
- Prefers Drybar aesthetic (clean, elegant, yellow accents)
- 2 physical warehouses in Costa Mesa area
- Multiple drivers (3+ currently)
- Business model: AI-enabled rental aggregator (future vision)
- Current need: Internal operations management tool
- Critical feature: Real-time inventory tracking across warehouses
- Business logic: Items must return to correct warehouse based on next booking

---

## Questions for Client (Future)

1. How many total items in inventory? (We used 8 for prototype)
2. Pricing structure: flat rate or variable by item/duration?
3. Delivery radius? (affects driver routing)
4. Cancellation policy?
5. Damage/cleaning fees?
6. Peak season pricing?
7. Minimum rental duration?
8. Maximum items per booking?

---

**This is everything we built! You're ready to take this to Claude Code and build the real thing! 🚀**