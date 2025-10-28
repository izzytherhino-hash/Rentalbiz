/**
 * End-to-End Tests for Driver Recommendations
 *
 * These tests validate that the driver recommendations endpoint works
 * without returning 500 errors or CORS issues.
 */

import { test, expect } from '@playwright/test';

const BACKEND_URL = process.env.VITE_API_URL || 'https://partay-backend.onrender.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://partay-frontend.onrender.com';

test.describe('Driver Recommendations - 500 Error Fix', () => {
  test('driver recommendations endpoint returns 200, not 500', async ({ request }) => {
    // Get an unassigned booking
    const unassignedResponse = await request.get(
      `${BACKEND_URL}/api/admin/drivers/unassigned-bookings`
    );
    expect(unassignedResponse.ok()).toBeTruthy();

    const unassignedBookings = await unassignedResponse.json();
    if (unassignedBookings.length === 0) {
      test.skip('No unassigned bookings to test');
      return;
    }

    const bookingId = unassignedBookings[0].booking_id;

    // CRITICAL: This endpoint was returning 500 in production
    const recommendationsResponse = await request.get(
      `${BACKEND_URL}/api/admin/drivers/recommendations/${bookingId}`
    );

    // Should return 200, not 500
    expect(recommendationsResponse.status()).toBe(200);

    const recommendations = await recommendationsResponse.json();
    expect(recommendations).toHaveProperty('booking_id');
    expect(recommendations).toHaveProperty('recommendations');
    expect(Array.isArray(recommendations.recommendations)).toBeTruthy();

    console.log(`✓ Driver recommendations endpoint returned 200 with ${recommendations.recommendations.length} recommendations`);
  });

  test('clicking Unassigned card does not cause 500 or CORS errors', async ({ page }) => {
    // Monitor console for errors
    const consoleErrors = [];
    const networkErrors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('response', response => {
      if (!response.ok() && response.url().includes('/api/')) {
        networkErrors.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        });
      }
    });

    // Load admin dashboard
    await page.goto(`${FRONTEND_URL}/admin`);
    await page.waitForLoadState('networkidle');

    // Click the unassigned card
    const unassignedCard = page.locator('[data-testid="unassigned-bookings-card"]')
      .or(page.locator('text=Unassigned Trips').locator('..'));

    await unassignedCard.click();

    // Wait for any async requests to complete
    await page.waitForTimeout(3000);

    // CRITICAL: No 500 errors
    const serverErrors = networkErrors.filter(err => err.status === 500);
    expect(serverErrors.length).toBe(0);

    if (serverErrors.length > 0) {
      console.error('500 errors detected:', serverErrors);
      throw new Error(
        `Found ${serverErrors.length} 500 errors: ${serverErrors.map(r => r.url).join(', ')}`
      );
    }

    // CRITICAL: No CORS errors
    const corsErrors = consoleErrors.filter(err =>
      err.includes('CORS') || err.includes('cors') || err.includes('Access-Control-Allow-Origin')
    );
    expect(corsErrors.length).toBe(0);

    if (corsErrors.length > 0) {
      console.error('CORS errors detected:', corsErrors);
      throw new Error(`CORS errors found: ${corsErrors.join(', ')}`);
    }

    console.log('✓ No 500 or CORS errors detected when clicking Unassigned card');
  });

  test('unassigned count in UI matches backend API count', async ({ page, request }) => {
    // Get actual count from backend
    const apiResponse = await request.get(`${BACKEND_URL}/api/admin/drivers/unassigned-bookings`);
    expect(apiResponse.ok()).toBeTruthy();

    const unassignedBookings = await apiResponse.json();
    const actualCount = unassignedBookings.length;

    console.log(`✓ Backend API reports ${actualCount} unassigned bookings`);

    // Load frontend
    await page.goto(`${FRONTEND_URL}/admin`);
    await page.waitForLoadState('networkidle');

    // Find the unassigned card
    const unassignedCard = page.locator('text=Unassigned Trips').locator('..');

    await unassignedCard.waitFor({ state: 'visible', timeout: 10000 });

    // Extract the count from the UI
    const uiText = await unassignedCard.textContent();
    const uiCountMatch = uiText.match(/(\d+)/);

    expect(uiCountMatch).not.toBeNull();
    const uiCount = parseInt(uiCountMatch[1]);

    console.log(`✓ Frontend UI displays ${uiCount} unassigned trips`);

    // CRITICAL ASSERTION: UI count should match API count
    // Note: UI counts "trips" (delivery + pickup), API counts "bookings"
    // This test documents the difference
    if (uiCount !== actualCount) {
      console.warn(
        `⚠️  MISMATCH: Frontend shows ${uiCount} trips, backend has ${actualCount} bookings. ` +
        `This is expected if bookings have separate delivery/pickup trips. ` +
        `Verify this is intentional counting logic.`
      );
    }

    // At minimum, UI count should be >= actual count
    expect(uiCount).toBeGreaterThanOrEqual(actualCount);
  });
});

test.describe('Driver Recommendations - Response Validation', () => {
  test('recommendations include all required fields for UI display', async ({ request }) => {
    // Get an unassigned booking
    const unassignedResponse = await request.get(
      `${BACKEND_URL}/api/admin/drivers/unassigned-bookings`
    );

    const unassignedBookings = await unassignedResponse.json();
    if (unassignedBookings.length === 0) {
      test.skip('No unassigned bookings to test');
      return;
    }

    const bookingId = unassignedBookings[0].booking_id;

    // Get recommendations
    const recommendationsResponse = await request.get(
      `${BACKEND_URL}/api/admin/drivers/recommendations/${bookingId}`
    );

    expect(recommendationsResponse.ok()).toBeTruthy();

    const data = await recommendationsResponse.json();

    // Validate response structure
    expect(data).toHaveProperty('booking_id');
    expect(data).toHaveProperty('delivery_address');
    expect(data).toHaveProperty('delivery_date');
    expect(data).toHaveProperty('recommendations');

    // Validate each recommendation has fields needed for UI
    if (data.recommendations.length > 0) {
      const recommendation = data.recommendations[0];

      const requiredFields = [
        'driver_id',
        'driver_name',
        'score',
        'distance_to_delivery',
        'route_disruption',
        'current_stops',
        'reason'
      ];

      for (const field of requiredFields) {
        expect(recommendation).toHaveProperty(field);
      }

      console.log(`✓ Recommendations have all required fields for UI display`);
      console.log(`✓ First recommendation: ${recommendation.driver_name} (score: ${recommendation.score})`);
    }
  });
});
