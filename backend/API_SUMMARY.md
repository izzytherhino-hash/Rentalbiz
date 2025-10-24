# Party Rental Management API - Complete Endpoints

## Base URL
`http://localhost:8000`

## API Documentation
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

---

## Root Endpoints

### GET /
Get API information and available endpoints

### GET /health
Health check endpoint for monitoring

---

## Booking Endpoints (`/api/bookings`)

### POST /api/bookings/check-availability
Check if items are available for date range
```json
{
  "item_ids": ["uuid1", "uuid2"],
  "delivery_date": "2025-10-20",
  "pickup_date": "2025-10-22"
}
```

### POST /api/bookings/filter-items
Filter inventory by space requirements
```json
{
  "area_size": 400,
  "surface": "grass",
  "has_power": true
}
```

### POST /api/bookings
Create a new booking
```json
{
  "customer_id": "customer-uuid",
  "delivery_date": "2025-10-20",
  "pickup_date": "2025-10-22",
  "delivery_address": "123 Main St",
  "items": [
    {"inventory_item_id": "item-uuid", "price": 250.00, "quantity": 1}
  ],
  "subtotal": 250.00,
  "delivery_fee": 50.00,
  "total": 300.00
}
```

### GET /api/bookings/{booking_id}
Get booking details by ID

### GET /api/bookings
List all bookings with filters
- Query params: `skip`, `limit`, `status`, `delivery_date`

---

## Inventory Endpoints (`/api/inventory`)

### GET /api/inventory
List all inventory items
- Query params: `category`, `status`, `warehouse_id`

### GET /api/inventory/{item_id}
Get item details

### GET /api/inventory/{item_id}/calendar
Get booking calendar for item
- Query params: `start_date`, `end_date`

### GET /api/inventory/{item_id}/availability
Check item availability for date range
- Query params: `delivery_date`, `pickup_date`

### PATCH /api/inventory/{item_id}
Update inventory item

---

## Driver Endpoints (`/api/drivers`)

### GET /api/drivers
List all drivers
- Query params: `is_active`

### GET /api/drivers/{driver_id}
Get driver details

### GET /api/drivers/{driver_id}/route/{route_date}
Get driver's route for specific date
Returns organized stops:
1. Warehouse pickups
2. Customer deliveries
3. Customer pickups
4. Warehouse returns

### POST /api/drivers/movements
Record inventory movement
```json
{
  "inventory_item_id": "item-uuid",
  "booking_id": "booking-uuid",
  "movement_type": "delivery_to_customer",
  "from_location_type": "warehouse",
  "from_location_id": "warehouse-uuid",
  "to_location_type": "customer",
  "to_location_id": "customer-uuid",
  "driver_id": "driver-uuid"
}
```

---

## Admin Endpoints (`/api/admin`)

### GET /api/admin/bookings
Get all bookings with filters
- Query params: `date_filter`, `status`, `driver_id`, `skip`, `limit`

### GET /api/admin/conflicts
Detect all booking conflicts in system

### GET /api/admin/stats
Get dashboard statistics
- deliveries_today
- active_rentals
- unassigned_bookings
- total_conflicts
- total_drivers
- available_inventory

### PATCH /api/admin/bookings/{booking_id}
Update booking (assign driver, change status, etc.)

### GET /api/admin/drivers/unassigned-bookings
Get bookings without assigned drivers

### GET /api/admin/drivers/workload
Get workload statistics for all drivers

---

## Business Logic Features

### Smart Equipment Filtering
- Filters by area size (square feet)
- Filters by surface type compatibility
- Filters by power requirement

### Conflict Detection
- Prevents double-booking
- Checks date overlaps
- Shows conflicting bookings

### Return Warehouse Logic
- Determines correct warehouse for returns
- Checks next booking for each item
- Routes items to nearest booking location

### Real-time Inventory Tracking
- Logs all inventory movements
- Updates item locations
- Audit trail for compliance

---

## Sample Data Available

### Warehouses
- Warehouse A - Main (Costa Mesa)
- Warehouse B - North (Costa Mesa)

### Drivers
- Mike Johnson
- Sarah Chen
- James Rodriguez

### Inventory Items (8 items)
- Bounce House Castle ($250)
- Water Slide Mega ($350)
- Obstacle Course ($400)
- Cotton Candy Machine ($75)
- Photo Booth Deluxe ($200)
- Popcorn Machine ($65)
- Mini Bounce House ($150)
- Tables & Chairs Set ($50)

---

## Running the API

```bash
cd backend
export PYTHONPATH=/home/izzy4598/projects/Rental/backend/src
source .venv/bin/activate
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

Visit http://localhost:8000/docs for interactive API documentation.
