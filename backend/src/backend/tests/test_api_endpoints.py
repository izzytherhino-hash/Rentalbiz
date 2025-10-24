"""
API endpoint tests for all routes.
Tests each endpoint's functionality, validation, and error handling.
"""

import pytest
from datetime import date
from decimal import Decimal


class TestHealthCheck:
    """Test the health check endpoint."""

    def test_health_check(self, client):
        """Test that health check returns success."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "database" in data
        assert "version" in data


class TestCustomerEndpoints:
    """Test customer-related endpoints."""

    def test_create_customer_success(self, client):
        """Test creating a new customer with valid data."""
        customer_data = {
            "name": "Jane Smith",
            "email": "jane.smith@example.com",
            "phone": "7145550103",
            "address": "789 Test Ave, Costa Mesa, CA 92626",
            "address_lat": 33.6420,
            "address_lng": -117.9195
        }
        response = client.post("/api/customers/", json=customer_data)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == customer_data["name"]
        assert data["email"] == customer_data["email"]
        assert "customer_id" in data
        assert data["total_bookings"] == 0
        assert data["total_spent"] == "0.00"

    def test_create_customer_invalid_email(self, client):
        """Test that invalid email is rejected."""
        customer_data = {
            "name": "Jane Smith",
            "email": "invalid-email",
            "phone": "7145550103"
        }
        response = client.post("/api/customers/", json=customer_data)
        assert response.status_code == 422  # Validation error

    def test_create_customer_missing_required_fields(self, client):
        """Test that missing required fields are rejected."""
        customer_data = {
            "name": "Jane Smith"
            # Missing email and phone
        }
        response = client.post("/api/customers/", json=customer_data)
        assert response.status_code == 422

    def test_list_customers(self, client, sample_customer):
        """Test listing all customers."""
        response = client.get("/api/customers/")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert any(c["customer_id"] == sample_customer.customer_id for c in data)

    def test_get_customer_by_id(self, client, sample_customer):
        """Test retrieving a specific customer."""
        response = client.get(f"/api/customers/{sample_customer.customer_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["customer_id"] == sample_customer.customer_id
        assert data["name"] == sample_customer.name

    def test_get_customer_not_found(self, client):
        """Test that requesting non-existent customer returns 404."""
        response = client.get("/api/customers/nonexistent-id")
        assert response.status_code == 404


class TestInventoryEndpoints:
    """Test inventory-related endpoints."""

    def test_list_inventory(self, client, sample_inventory_item):
        """Test listing all inventory items."""
        response = client.get("/api/inventory/")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert any(i["inventory_item_id"] == sample_inventory_item.inventory_item_id for i in data)

    def test_get_inventory_item_by_id(self, client, sample_inventory_item):
        """Test retrieving a specific inventory item."""
        response = client.get(f"/api/inventory/{sample_inventory_item.inventory_item_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["inventory_item_id"] == sample_inventory_item.inventory_item_id
        assert data["name"] == sample_inventory_item.name
        assert "allowed_surfaces" in data
        assert isinstance(data["allowed_surfaces"], list)


class TestDriverEndpoints:
    """Test driver-related endpoints."""

    def test_list_drivers(self, client, sample_driver):
        """Test listing all drivers."""
        response = client.get("/api/drivers/")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert any(d["driver_id"] == sample_driver.driver_id for d in data)

    def test_get_driver_by_id(self, client, sample_driver):
        """Test retrieving a specific driver."""
        response = client.get(f"/api/drivers/{sample_driver.driver_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["driver_id"] == sample_driver.driver_id
        assert data["name"] == sample_driver.name


class TestBookingEndpoints:
    """Test booking-related endpoints."""

    def test_filter_items_by_party_space(self, client, sample_inventory_item):
        """Test filtering equipment based on party space requirements."""
        filter_data = {
            "area_size": 300,  # sq ft
            "surface": "grass",
            "has_power": True
        }
        response = client.post("/api/bookings/filter-items", json=filter_data)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Bounce House requires 225 sqft, so it should be included
        assert any(i["inventory_item_id"] == sample_inventory_item.inventory_item_id for i in data)

    def test_filter_items_insufficient_space(self, client, sample_inventory_item):
        """Test that items requiring more space are filtered out."""
        filter_data = {
            "area_size": 100,  # Too small for Bounce House (225 sqft)
            "surface": "grass",
            "has_power": True
        }
        response = client.post("/api/bookings/filter-items", json=filter_data)
        assert response.status_code == 200
        data = response.json()
        # Bounce House should be filtered out
        assert not any(i["inventory_item_id"] == sample_inventory_item.inventory_item_id for i in data)

    def test_check_availability_available(self, client, sample_inventory_item):
        """Test checking availability for items that are available."""
        availability_data = {
            "item_ids": [sample_inventory_item.inventory_item_id],
            "delivery_date": "2025-11-01",
            "pickup_date": "2025-11-03"
        }
        response = client.post("/api/bookings/check-availability", json=availability_data)
        assert response.status_code == 200
        data = response.json()
        assert data["available"] is True
        assert len(data["conflicts"]) == 0

    def test_check_availability_conflicting(self, client, sample_booking, sample_inventory_item):
        """Test checking availability for items with conflicts."""
        availability_data = {
            "item_ids": [sample_inventory_item.inventory_item_id],
            "delivery_date": "2025-10-25",  # Same as sample_booking
            "pickup_date": "2025-10-27"
        }
        response = client.post("/api/bookings/check-availability", json=availability_data)
        assert response.status_code == 200
        data = response.json()
        assert data["available"] is False
        assert len(data["conflicts"]) > 0

    def test_create_booking_success(self, client, sample_customer, sample_inventory_item):
        """Test creating a new booking with valid data."""
        booking_data = {
            "customer_id": sample_customer.customer_id,
            "delivery_date": "2025-11-01",
            "delivery_time_window": "10:00 AM - 12:00 PM",
            "pickup_date": "2025-11-03",
            "pickup_time_window": "2:00 PM - 4:00 PM",
            "delivery_address": "456 Customer Ave, Costa Mesa, CA 92626",
            "delivery_lat": 33.6415,
            "delivery_lng": -117.9190,
            "setup_instructions": "Setup in backyard",
            "subtotal": 500.00,
            "delivery_fee": 50.00,
            "tip": 20.00,
            "total": 570.00,
            "items": [
                {
                    "inventory_item_id": sample_inventory_item.inventory_item_id,
                    "quantity": 1,
                    "price": 250.00
                }
            ]
        }
        response = client.post("/api/bookings/", json=booking_data)
        assert response.status_code == 200
        data = response.json()
        assert "booking_id" in data
        assert "order_number" in data
        assert data["customer_id"] == sample_customer.customer_id
        assert data["status"] == "pending"
        assert len(data["booking_items"]) == 1

    def test_create_booking_invalid_dates(self, client, sample_customer, sample_inventory_item):
        """Test that pickup before delivery is rejected."""
        booking_data = {
            "customer_id": sample_customer.customer_id,
            "delivery_date": "2025-11-05",
            "pickup_date": "2025-11-03",  # Before delivery!
            "delivery_address": "456 Customer Ave, Costa Mesa, CA 92626",
            "subtotal": 250.00,
            "delivery_fee": 50.00,
            "tip": 0.00,
            "total": 300.00,
            "items": [
                {
                    "inventory_item_id": sample_inventory_item.inventory_item_id,
                    "quantity": 1,
                    "price": 250.00
                }
            ]
        }
        response = client.post("/api/bookings/", json=booking_data)
        assert response.status_code == 422

    def test_list_bookings(self, client, sample_booking):
        """Test listing all bookings."""
        response = client.get("/api/bookings/")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert any(b["booking_id"] == sample_booking.booking_id for b in data)

    def test_get_booking_by_id(self, client, sample_booking):
        """Test retrieving a specific booking."""
        response = client.get(f"/api/bookings/{sample_booking.booking_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["booking_id"] == sample_booking.booking_id
        assert "booking_items" in data


class TestAdminEndpoints:
    """Test admin dashboard endpoints."""

    def test_get_stats(self, client, sample_booking):
        """Test retrieving dashboard statistics."""
        response = client.get("/api/admin/stats")
        assert response.status_code == 200
        data = response.json()
        assert "total_bookings" in data
        assert "total_revenue" in data
        assert "active_rentals" in data
        assert data["total_bookings"] >= 1

    def test_get_conflicts(self, client):
        """Test retrieving booking conflicts."""
        response = client.get("/api/admin/conflicts")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_get_unassigned_bookings(self, client, sample_customer, sample_inventory_item):
        """Test retrieving bookings without assigned drivers."""
        # Create booking without driver
        booking_data = {
            "customer_id": sample_customer.customer_id,
            "delivery_date": "2025-11-01",
            "pickup_date": "2025-11-03",
            "delivery_address": "Test Address",
            "subtotal": 250.00,
            "delivery_fee": 50.00,
            "tip": 0.00,
            "total": 300.00,
            "items": [
                {
                    "inventory_item_id": sample_inventory_item.inventory_item_id,
                    "quantity": 1,
                    "price": 250.00
                }
            ]
        }
        client.post("/api/bookings/", json=booking_data)

        response = client.get("/api/admin/unassigned-bookings")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

    def test_get_driver_workload(self, client, sample_driver, sample_booking):
        """Test retrieving driver workload statistics."""
        response = client.get("/api/admin/driver-workload")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Should include sample_driver with at least 1 booking
        driver_data = next((d for d in data if d["driver_id"] == sample_driver.driver_id), None)
        assert driver_data is not None
        assert driver_data["assigned_bookings"] >= 1


class TestDriverRouteEndpoints:
    """Test driver route endpoints."""

    def test_get_driver_route(self, client, sample_driver, sample_booking):
        """Test retrieving a driver's route for a specific date."""
        route_date = "2025-10-25"  # Same as sample_booking delivery_date
        response = client.get(f"/api/drivers/{sample_driver.driver_id}/route/{route_date}")
        assert response.status_code == 200
        data = response.json()
        assert "driver" in data
        assert "date" in data
        assert "warehouse_pickups" in data
        assert "deliveries" in data
        assert "pickups" in data
        assert "warehouse_returns" in data

    def test_get_driver_route_no_stops(self, client, sample_driver):
        """Test retrieving a driver's route for a date with no stops."""
        route_date = "2025-12-25"  # No bookings
        response = client.get(f"/api/drivers/{sample_driver.driver_id}/route/{route_date}")
        assert response.status_code == 200
        data = response.json()
        assert len(data["warehouse_pickups"]) == 0
        assert len(data["deliveries"]) == 0
        assert len(data["pickups"]) == 0
        assert len(data["warehouse_returns"]) == 0
