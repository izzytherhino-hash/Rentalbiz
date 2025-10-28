"""
Test driver recommendations endpoint functionality.

Catches the 500 error that breaks the Unassigned card.
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


class TestDriverRecommendationsEndpoint:
    """Test driver recommendations endpoint returns 200 and proper data."""

    def test_driver_recommendations_returns_200(self):
        """
        CRITICAL: Driver recommendations endpoint must return 200, not 500.

        This endpoint was returning 500 in production, causing CORS errors
        and breaking the Unassigned card functionality.
        """
        # Get an unassigned booking
        unassigned_response = client.get("/api/admin/drivers/unassigned-bookings")
        assert unassigned_response.status_code == 200

        unassigned_data = unassigned_response.json()

        # Handle both response formats: dict with "bookings" key or direct list
        if isinstance(unassigned_data, dict):
            unassigned_bookings = unassigned_data.get("bookings", [])
        else:
            unassigned_bookings = unassigned_data

        if not unassigned_bookings:
            pytest.skip("No unassigned bookings to test")

        booking_id = unassigned_bookings[0]["booking_id"]

        # CRITICAL: This must return 200, not 500
        recommendations_response = client.get(
            f"/api/admin/drivers/recommendations/{booking_id}"
        )

        assert recommendations_response.status_code == 200, (
            f"Driver recommendations endpoint returned {recommendations_response.status_code} "
            f"(expected 200). This breaks the Unassigned card functionality. "
            f"Error: {recommendations_response.text}"
        )

    def test_driver_recommendations_response_structure(self):
        """
        Validate driver recommendations response has expected structure.

        Frontend expects specific fields to display recommendations properly.
        """
        # Get an unassigned booking
        unassigned_response = client.get("/api/admin/drivers/unassigned-bookings")
        unassigned_data = unassigned_response.json()

        # Handle both response formats
        if isinstance(unassigned_data, dict):
            unassigned_bookings = unassigned_data.get("bookings", [])
        else:
            unassigned_bookings = unassigned_data

        if not unassigned_bookings:
            pytest.skip("No unassigned bookings to test")

        booking_id = unassigned_bookings[0]["booking_id"]

        # Get recommendations
        response = client.get(f"/api/admin/drivers/recommendations/{booking_id}")
        assert response.status_code == 200, (
            f"Expected 200, got {response.status_code}. Response: {response.text}"
        )

        data = response.json()

        # Contract: Must include booking context
        assert "booking_id" in data, f"Missing booking_id in response. Got keys: {data.keys()}"
        assert "delivery_address" in data, f"Missing delivery_address. Got keys: {data.keys()}"
        assert "delivery_date" in data, f"Missing delivery_date. Got keys: {data.keys()}"

        # Contract: Must include recommendations array
        assert "recommendations" in data, f"Missing recommendations array. Got keys: {data.keys()}"
        assert isinstance(
            data["recommendations"], list
        ), f"Recommendations must be an array, got {type(data['recommendations'])}: {data['recommendations']}"

        # Contract: Each recommendation must have required fields
        recommendations = data["recommendations"]
        if len(recommendations) > 0:
            rec = recommendations[0]
            required_fields = [
                "driver_id",
                "driver_name",
                "score",
                "distance_to_delivery",
                "route_disruption",
                "current_stops",
                "reason",
            ]
            for field in required_fields:
                assert field in rec, (
                    f"Missing required field '{field}' in recommendation. "
                    f"Got keys: {rec.keys()}"
                )

    def test_route_optimizer_import_works(self):
        """
        Verify that services.route_optimizer can be imported.

        This was failing in production due to PYTHONPATH issues.
        """
        try:
            from services.route_optimizer import recommend_drivers

            assert callable(recommend_drivers), "recommend_drivers is not callable"
        except ImportError as e:
            pytest.fail(
                f"Failed to import route_optimizer: {e}. "
                f"Check PYTHONPATH is set correctly: "
                f"export PYTHONPATH=/home/izzy4598/projects/Rental/backend/src"
            )

    def test_driver_recommendations_with_invalid_booking_id(self):
        """
        Test error handling for invalid booking IDs.

        Should return 404, not 500.
        """
        fake_booking_id = "00000000-0000-0000-0000-000000000000"
        response = client.get(f"/api/admin/drivers/recommendations/{fake_booking_id}")

        assert response.status_code == 404, (
            f"Expected 404 for invalid booking ID, got {response.status_code}"
        )


class TestDataConsistency:
    """Test data consistency between backend and frontend expectations."""

    def test_unassigned_count_consistency(self):
        """
        CRITICAL: Unassigned count must be consistent across endpoints.

        Frontend shows "9" but backend returns "1" - this test catches that.
        """
        # Get count from stats endpoint
        stats_response = client.get("/api/admin/stats")
        assert stats_response.status_code == 200
        stats_unassigned = stats_response.json()["unassigned_bookings"]

        # Get actual unassigned bookings list
        list_response = client.get("/api/admin/drivers/unassigned-bookings")
        assert list_response.status_code == 200

        list_data = list_response.json()

        # Handle both response formats
        if isinstance(list_data, dict):
            # New format: {"total": N, "bookings": [...]}
            if "total" in list_data:
                actual_unassigned = list_data["total"]
            else:
                actual_unassigned = len(list_data.get("bookings", []))
        else:
            # Legacy format: [...]
            actual_unassigned = len(list_data)

        # CONTRACT: These must match
        assert stats_unassigned == actual_unassigned, (
            f"DATA INCONSISTENCY: "
            f"Stats reports {stats_unassigned} unassigned bookings, "
            f"but unassigned-bookings endpoint returns {actual_unassigned}. "
            f"This causes frontend to show incorrect counts!"
        )

    def test_bookings_have_required_driver_fields(self):
        """
        Validate all bookings have driver assignment fields.

        Frontend checks assigned_driver_id and pickup_driver_id to count unassigned trips.
        """
        response = client.get("/api/bookings/")
        assert response.status_code == 200

        bookings = response.json()
        for booking in bookings:
            # Required fields for frontend to calculate unassigned trips
            assert "assigned_driver_id" in booking, (
                f"Booking {booking.get('booking_id')} missing assigned_driver_id"
            )
            assert "pickup_driver_id" in booking, (
                f"Booking {booking.get('booking_id')} missing pickup_driver_id"
            )
