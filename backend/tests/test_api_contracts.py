"""
API Contract Tests - Validate expected API responses.

These tests define the expected structure and behavior of all API endpoints.
They serve as a contract that both backend and frontend must follow.
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


class TestBookingAPIContracts:
    """Test booking API endpoint contracts."""

    def test_unassigned_bookings_contract(self):
        """
        Validate unassigned bookings endpoint returns expected structure.

        This is the contract the frontend depends on for the Unassigned tile.
        """
        response = client.get("/api/admin/drivers/unassigned-bookings")
        assert response.status_code == 200

        data = response.json()

        # Contract: Must return an object with total and trips/bookings
        # NOTE: API changed from "bookings" to "trips" to represent delivery+pickup pairs
        if isinstance(data, dict):
            # New structure: {"total": 1, "trips": [...]} or {"total": 1, "bookings": [...]}
            if "trips" in data:
                assert isinstance(data["trips"], list), "trips must be an array"
                bookings = data["trips"]
            elif "bookings" in data:
                assert isinstance(data["bookings"], list), "bookings must be an array"
                bookings = data["bookings"]
            else:
                raise AssertionError("Response must have 'trips' or 'bookings' key")
        elif isinstance(data, list):
            # Legacy structure: [...]
            bookings = data
        else:
            raise AssertionError(
                f"Unexpected response type: {type(data)}. "
                f"Expected dict with 'bookings' key or list"
            )

        # Contract: Each booking must have required fields
        if len(bookings) > 0:
            booking = bookings[0]
            required_fields = [
                "booking_id",
                "order_number",
                "customer_name",
                "delivery_date",
                "items_count",
            ]
            for field in required_fields:
                assert field in booking, f"Missing required field: {field}"

        # Return count for validation
        return len(bookings)

    def test_driver_recommendations_contract(self):
        """
        Validate driver recommendations endpoint contract.

        This endpoint was returning 500 errors and breaking the frontend.
        """
        # First get an unassigned booking
        unassigned_response = client.get("/api/admin/drivers/unassigned-bookings")
        assert unassigned_response.status_code == 200

        unassigned_data = unassigned_response.json()

        # Handle both response formats
        if isinstance(unassigned_data, dict):
            unassigned = unassigned_data.get("bookings", [])
        else:
            unassigned = unassigned_data

        if len(unassigned) == 0:
            pytest.skip("No unassigned bookings to test recommendations")

        booking_id = unassigned[0]["booking_id"]

        # Contract: Endpoint must return 200, not 500
        response = client.get(f"/api/admin/drivers/recommendations/{booking_id}")
        assert response.status_code == 200, (
            f"Driver recommendations endpoint returned {response.status_code} "
            f"(expected 200). This breaks the Unassigned card functionality. "
            f"Response: {response.text}"
        )

        data = response.json()

        # Contract: Response should be an object with recommendations array
        # New format: {"booking_id": "...", "recommendations": [...]}
        # Legacy format: [...]
        if isinstance(data, dict):
            assert "recommendations" in data, (
                f"Response must have 'recommendations' key. Got: {data.keys()}"
            )
            recommendations = data["recommendations"]
        elif isinstance(data, list):
            recommendations = data
        else:
            raise AssertionError(
                f"Unexpected response type: {type(data)}. Response: {data}"
            )

        assert isinstance(recommendations, list), (
            f"Recommendations must be an array, got {type(recommendations)}"
        )

        # Contract: Each recommendation must have driver details
        if len(recommendations) > 0:
            recommendation = recommendations[0]
            required_fields = ["driver_id", "driver_name", "score"]
            for field in required_fields:
                assert field in recommendation, f"Missing required field: {field}"

    def test_bookings_list_contract(self):
        """Validate bookings list endpoint contract."""
        response = client.get("/api/bookings/")
        assert response.status_code == 200

        data = response.json()
        assert isinstance(data, list), "Bookings must be an array"

        # Return count for validation
        return len(data)

    def test_admin_stats_contract(self):
        """
        Validate admin stats endpoint contract.

        Frontend dashboard tiles depend on this structure.
        """
        response = client.get("/api/admin/stats")
        assert response.status_code == 200

        data = response.json()

        # Contract: Must include unassigned count
        assert "unassigned_bookings" in data, (
            "Missing unassigned_bookings in stats - "
            "frontend Unassigned tile depends on this"
        )

        # Contract: Unassigned count must be a number
        assert isinstance(data["unassigned_bookings"], int), (
            "unassigned_bookings must be an integer"
        )

        return data["unassigned_bookings"]


class TestInventoryAPIContracts:
    """Test inventory API endpoint contracts."""

    def test_inventory_list_contract(self):
        """Validate inventory list endpoint contract."""
        response = client.get("/api/inventory/")
        assert response.status_code == 200

        data = response.json()
        assert isinstance(data, list), "Inventory items must be an array"

        if len(data) > 0:
            item = data[0]
            required_fields = [
                "inventory_item_id",
                "name",
                "category",
                "base_price",
                "photos"
            ]
            for field in required_fields:
                assert field in item, f"Missing required field: {field}"

            # Contract: Photos must be an array
            assert isinstance(item["photos"], list), "Photos must be an array"

            # If photos exist, validate structure
            if len(item["photos"]) > 0:
                photo = item["photos"][0]
                photo_fields = ["photo_id", "image_url", "display_order"]
                for field in photo_fields:
                    assert field in photo, f"Missing photo field: {field}"


class TestWarehouseAPIContracts:
    """Test warehouse API endpoint contracts."""

    def test_warehouse_list_contract(self):
        """Validate warehouse list endpoint contract."""
        response = client.get("/api/warehouses/")
        assert response.status_code == 200

        data = response.json()
        assert isinstance(data, list), "Warehouses must be an array"

        if len(data) > 0:
            warehouse = data[0]
            required_fields = [
                "warehouse_id",
                "name",
                "address",
                "address_lat",
                "address_lng"
            ]
            for field in required_fields:
                assert field in warehouse, f"Missing required field: {field}"


class TestDataConsistency:
    """Test data consistency between different endpoints."""

    def test_unassigned_bookings_count_consistency(self):
        """
        CRITICAL: Validate that unassigned bookings count is consistent.

        This test catches the bug where UI showed 9 unassigned but API returned 1.
        """
        # Get unassigned count from stats endpoint
        stats_response = client.get("/api/admin/stats")
        assert stats_response.status_code == 200
        stats_unassigned = stats_response.json()["unassigned_bookings"]

        # Get actual unassigned bookings list
        list_response = client.get("/api/admin/drivers/unassigned-bookings")
        assert list_response.status_code == 200
        list_data = list_response.json()

        # Handle both old and new API structures
        if isinstance(list_data, dict):
            # New structure: {"total": 10, "trips": [...]} or {"total": 10, "bookings": [...]}
            actual_unassigned = list_data.get("total", len(list_data.get("trips", list_data.get("bookings", []))))
        else:
            # Old structure: [...]
            actual_unassigned = len(list_data)

        # CONTRACT: These MUST match
        assert stats_unassigned == actual_unassigned, (
            f"CRITICAL DATA INCONSISTENCY: "
            f"Stats endpoint reports {stats_unassigned} unassigned bookings, "
            f"but unassigned-bookings endpoint returns {actual_unassigned}. "
            f"This causes frontend to show incorrect counts!"
        )

        print(f"✅ Data consistency verified: {actual_unassigned} unassigned bookings")
