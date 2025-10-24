# Party Rentals Database Schema

## Overview
This database tracks customers, bookings, inventory, warehouses, drivers, and real-time equipment movements.

---

## Tables

### 1. **customers**
Stores customer information for all bookings.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique customer identifier |
| name | VARCHAR(255) | NOT NULL | Full name |
| email | VARCHAR(255) | UNIQUE, NOT NULL | Email address |
| phone | VARCHAR(20) | NOT NULL | Phone number |
| address | TEXT | | Primary address |
| address_lat | DECIMAL(10,8) | | Latitude for routing |
| address_lng | DECIMAL(11,8) | | Longitude for routing |
| created_at | TIMESTAMP | DEFAULT NOW() | Account creation date |
| total_bookings | INTEGER | DEFAULT 0 | Lifetime booking count |
| total_spent | DECIMAL(10,2) | DEFAULT 0 | Lifetime revenue |

**Indexes:** email, phone

---

### 2. **warehouses**
Physical locations where equipment is stored.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique warehouse identifier |
| name | VARCHAR(255) | NOT NULL | Warehouse name (e.g., "Warehouse A - Main") |
| address | TEXT | NOT NULL | Full address |
| address_lat | DECIMAL(10,8) | NOT NULL | Latitude for routing |
| address_lng | DECIMAL(11,8) | NOT NULL | Longitude for routing |
| is_active | BOOLEAN | DEFAULT TRUE | Whether warehouse is operational |
| created_at | TIMESTAMP | DEFAULT NOW() | Date added |

**Indexes:** name

---

### 3. **inventory_items**
Master list of all rental equipment.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique item identifier |
| name | VARCHAR(255) | NOT NULL | Item name (e.g., "Bounce House Castle") |
| category | VARCHAR(100) | NOT NULL | Category (Inflatable, Concession, Entertainment, Furniture) |
| base_price | DECIMAL(10,2) | NOT NULL | Daily rental price |
| requires_power | BOOLEAN | DEFAULT FALSE | Needs electricity |
| min_space_sqft | INTEGER | | Minimum space required |
| allowed_surfaces | TEXT[] | | Array: ['grass', 'concrete', 'indoor', etc.] |
| default_warehouse_id | UUID | FOREIGN KEY | Default storage location |
| current_warehouse_id | UUID | FOREIGN KEY | Current location (NULL if rented) |
| status | ENUM | NOT NULL | 'available', 'rented', 'maintenance', 'retired' |
| created_at | TIMESTAMP | DEFAULT NOW() | Date added to inventory |

**Indexes:** name, category, status
**Foreign Keys:** 
- default_warehouse_id → warehouses(id)
- current_warehouse_id → warehouses(id)

---

### 4. **bookings**
Customer orders/reservations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique booking identifier |
| order_number | VARCHAR(50) | UNIQUE, NOT NULL | Human-readable ID (e.g., "PR-2847") |
| customer_id | UUID | FOREIGN KEY, NOT NULL | Who booked this |
| delivery_date | DATE | NOT NULL | When to deliver |
| delivery_time_window | VARCHAR(50) | | e.g., "10:00 AM - 11:00 AM" |
| pickup_date | DATE | NOT NULL | When to collect equipment |
| pickup_time_window | VARCHAR(50) | | Time window for pickup |
| rental_days | INTEGER | NOT NULL | Number of days |
| delivery_address | TEXT | NOT NULL | Where to deliver |
| delivery_lat | DECIMAL(10,8) | | Latitude for routing |
| delivery_lng | DECIMAL(11,8) | | Longitude for routing |
| setup_instructions | TEXT | | Special instructions (gate codes, etc.) |
| status | ENUM | NOT NULL | 'pending', 'confirmed', 'out_for_delivery', 'active', 'pickup_scheduled', 'completed', 'cancelled' |
| assigned_driver_id | UUID | FOREIGN KEY | Driver for delivery |
| pickup_driver_id | UUID | FOREIGN KEY | Driver for pickup (can be different) |
| subtotal | DECIMAL(10,2) | NOT NULL | Items total |
| delivery_fee | DECIMAL(10,2) | NOT NULL | Delivery charge |
| tip | DECIMAL(10,2) | DEFAULT 0 | Driver tip |
| total | DECIMAL(10,2) | NOT NULL | Grand total |
| payment_status | ENUM | NOT NULL | 'pending', 'paid', 'refunded' |
| stripe_payment_id | VARCHAR(255) | | Stripe transaction ID |
| created_at | TIMESTAMP | DEFAULT NOW() | Booking creation date |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last modification |

**Indexes:** order_number, customer_id, delivery_date, pickup_date, status, assigned_driver_id
**Foreign Keys:**
- customer_id → customers(id)
- assigned_driver_id → drivers(id)
- pickup_driver_id → drivers(id)

---

### 5. **booking_items**
Junction table linking bookings to specific equipment.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique record identifier |
| booking_id | UUID | FOREIGN KEY, NOT NULL | Which booking |
| inventory_item_id | UUID | FOREIGN KEY, NOT NULL | Which item |
| quantity | INTEGER | DEFAULT 1 | How many (for items like chairs) |
| price | DECIMAL(10,2) | NOT NULL | Price at time of booking |
| pickup_warehouse_id | UUID | FOREIGN KEY | Where item comes from |
| return_warehouse_id | UUID | FOREIGN KEY | Where item should return |

**Indexes:** booking_id, inventory_item_id
**Foreign Keys:**
- booking_id → bookings(id) ON DELETE CASCADE
- inventory_item_id → inventory_items(id)
- pickup_warehouse_id → warehouses(id)
- return_warehouse_id → warehouses(id)

---

### 6. **drivers**
People who deliver and pickup equipment.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique driver identifier |
| name | VARCHAR(255) | NOT NULL | Full name |
| email | VARCHAR(255) | UNIQUE | Email address |
| phone | VARCHAR(20) | NOT NULL | Phone number |
| license_number | VARCHAR(50) | | Driver's license |
| is_active | BOOLEAN | DEFAULT TRUE | Currently employed |
| total_deliveries | INTEGER | DEFAULT 0 | Lifetime delivery count |
| total_earnings | DECIMAL(10,2) | DEFAULT 0 | Lifetime earnings (fees + tips) |
| created_at | TIMESTAMP | DEFAULT NOW() | Date hired |

**Indexes:** name, email, phone

---

### 7. **inventory_movements**
**CRITICAL TABLE** - Tracks real-time item location history.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique movement identifier |
| inventory_item_id | UUID | FOREIGN KEY, NOT NULL | Which item moved |
| booking_id | UUID | FOREIGN KEY | Related booking (NULL for transfers) |
| movement_type | ENUM | NOT NULL | 'pickup_from_warehouse', 'delivery_to_customer', 'pickup_from_customer', 'return_to_warehouse', 'warehouse_transfer' |
| from_location_type | ENUM | NOT NULL | 'warehouse', 'customer' |
| from_location_id | UUID | | warehouse_id or customer_id |
| to_location_type | ENUM | NOT NULL | 'warehouse', 'customer' |
| to_location_id | UUID | | warehouse_id or customer_id |
| driver_id | UUID | FOREIGN KEY | Who performed movement |
| movement_date | TIMESTAMP | DEFAULT NOW() | When it happened |
| notes | TEXT | | Any special notes |

**Indexes:** inventory_item_id, booking_id, movement_date, driver_id
**Foreign Keys:**
- inventory_item_id → inventory_items(id)
- booking_id → bookings(id)
- driver_id → drivers(id)

**This table enables:**
- Real-time tracking: "Where is Bounce House #1 RIGHT NOW?"
- Audit trail: Complete history of every item movement
- Conflict detection: Check if item is available for new booking
- Smart routing: System knows where item needs to return based on next booking

---

### 8. **payments**
Payment transaction records.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique payment identifier |
| booking_id | UUID | FOREIGN KEY, NOT NULL | Related booking |
| stripe_payment_intent_id | VARCHAR(255) | UNIQUE | Stripe ID |
| amount | DECIMAL(10,2) | NOT NULL | Payment amount |
| payment_type | ENUM | NOT NULL | 'deposit', 'full_payment', 'tip', 'refund' |
| status | ENUM | NOT NULL | 'pending', 'succeeded', 'failed', 'refunded' |
| payment_method | VARCHAR(50) | | e.g., "card", "cash" |
| processed_at | TIMESTAMP | | When payment completed |
| created_at | TIMESTAMP | DEFAULT NOW() | Payment initiated |

**Indexes:** booking_id, stripe_payment_intent_id, status
**Foreign Keys:**
- booking_id → bookings(id)

---

### 9. **notifications**
Track SMS/Email notifications sent.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique notification identifier |
| booking_id | UUID | FOREIGN KEY | Related booking |
| customer_id | UUID | FOREIGN KEY | Recipient |
| notification_type | ENUM | NOT NULL | 'booking_confirmation', 'delivery_reminder', 'pickup_reminder', 'driver_assigned' |
| channel | ENUM | NOT NULL | 'sms', 'email' |
| status | ENUM | NOT NULL | 'pending', 'sent', 'failed' |
| sent_at | TIMESTAMP | | When sent |
| created_at | TIMESTAMP | DEFAULT NOW() | When queued |

**Indexes:** booking_id, customer_id, status
**Foreign Keys:**
- booking_id → bookings(id)
- customer_id → customers(id)

---

## Key Relationships

```
customers (1) ─────── (M) bookings
bookings (1) ─────── (M) booking_items
inventory_items (1) ─────── (M) booking_items
bookings (M) ─────── (1) drivers [assigned_driver_id]
bookings (M) ─────── (1) drivers [pickup_driver_id]
warehouses (1) ─────── (M) inventory_items [current_warehouse_id]
inventory_items (1) ─────── (M) inventory_movements
bookings (1) ─────── (M) inventory_movements
drivers (1) ─────── (M) inventory_movements
bookings (1) ─────── (M) payments
```

---

## Critical Queries This Schema Enables

### 1. Check Item Availability
```sql
-- Is "Bounce House Castle" available from Oct 20-24?
SELECT i.id, i.name, i.status, i.current_warehouse_id
FROM inventory_items i
WHERE i.id = 'bounce-house-uuid'
  AND i.status = 'available'
  AND NOT EXISTS (
    SELECT 1 FROM booking_items bi
    JOIN bookings b ON bi.booking_id = b.id
    WHERE bi.inventory_item_id = i.id
      AND b.status NOT IN ('cancelled', 'completed')
      AND (b.delivery_date, b.pickup_date) OVERLAPS ('2025-10-20', '2025-10-24')
  );
```

### 2. Current Location of Item
```sql
-- Where is item RIGHT NOW?
SELECT 
  CASE 
    WHEN i.current_warehouse_id IS NOT NULL THEN 
      (SELECT name FROM warehouses WHERE id = i.current_warehouse_id)
    ELSE 
      (SELECT CONCAT('With customer: ', c.name)
       FROM bookings b
       JOIN customers c ON b.customer_id = c.id
       JOIN booking_items bi ON bi.booking_id = b.id
       WHERE bi.inventory_item_id = i.id
         AND b.status = 'active'
       LIMIT 1)
  END as current_location
FROM inventory_items i
WHERE i.id = 'item-uuid';
```

### 3. Driver's Route for Today
```sql
-- Get all stops for Mike Johnson on Oct 20, 2025
SELECT 
  b.order_number,
  c.name as customer_name,
  b.delivery_address,
  b.delivery_time_window,
  b.status,
  ARRAY_AGG(ii.name) as items
FROM bookings b
JOIN customers c ON b.customer_id = c.id
JOIN booking_items bi ON bi.booking_id = b.id
JOIN inventory_items ii ON bi.inventory_item_id = ii.id
WHERE b.assigned_driver_id = 'mike-uuid'
  AND b.delivery_date = '2025-10-20'
GROUP BY b.id, c.name
ORDER BY b.delivery_time_window;
```

### 4. Detect Booking Conflicts
```sql
-- Check if new booking conflicts with existing ones
SELECT DISTINCT i.name, b.order_number, b.delivery_date, b.pickup_date
FROM inventory_items i
JOIN booking_items bi ON bi.inventory_item_id = i.id
JOIN bookings b ON bi.booking_id = b.id
WHERE i.id IN ('item1-uuid', 'item2-uuid')
  AND b.status NOT IN ('cancelled', 'completed')
  AND (b.delivery_date, b.pickup_date) OVERLAPS ('2025-10-20', '2025-10-22');
```

### 5. Next Booking for Item (Determines Return Warehouse)
```sql
-- Where should item return after current booking ends?
SELECT 
  b.order_number as next_booking,
  bi.pickup_warehouse_id as return_to_warehouse,
  w.name as warehouse_name
FROM bookings b
JOIN booking_items bi ON bi.booking_id = b.id
JOIN warehouses w ON w.id = bi.pickup_warehouse_id
WHERE bi.inventory_item_id = 'item-uuid'
  AND b.delivery_date > CURRENT_DATE
  AND b.status NOT IN ('cancelled')
ORDER BY b.delivery_date ASC
LIMIT 1;
```

---

## Tech Stack Recommendations

**Database:** PostgreSQL
- Best for complex queries
- Excellent geospatial support (for routing)
- JSONB for flexible fields
- Strong ACID compliance

**Backend:** Node.js + Express + Prisma (or Supabase)
- Prisma = Type-safe ORM that generates from schema
- Supabase = PostgreSQL + REST API + Auth out of the box

**Deployment:** 
- Render PostgreSQL (free tier for testing)
- Supabase (generous free tier)

---

## Next Steps

1. **Create database on Render or Supabase**
2. **Run migration to create tables**
3. **Seed with sample data**
4. **Build REST API endpoints**
5. **Connect front-end to real data**

This schema handles everything: bookings, payments, inventory tracking, driver logistics, and real-time location management!