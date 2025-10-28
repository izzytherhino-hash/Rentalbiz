/**
 * End-to-End Tests for Admin Dashboard
 *
 * These tests validate that the frontend correctly displays data from the backend.
 * They catch issues like "UI shows 9 unassigned but API returns 1".
 */

import { test, expect } from '@playwright/test';

const BACKEND_URL = process.env.VITE_API_URL || 'https://partay-backend.onrender.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://partay-frontend.onrender.com';

test.describe('Admin Dashboard - Unassigned Bookings', () => {
  test('UI unassigned count matches backend API count', async ({ page, request }) => {
    // STEP 1: Get actual count from backend API
    const apiResponse = await request.get(`${BACKEND_URL}/api/admin/drivers/unassigned-bookings`);
    expect(apiResponse.ok()).toBeTruthy();

    const unassignedBookings = await apiResponse.json();
    const actualCount = unassignedBookings.length;

    console.log(`✓ Backend API reports ${actualCount} unassigned bookings`);

    // STEP 2: Load frontend and check UI display
    await page.goto(`${FRONTEND_URL}/admin`);

    // Wait for the unassigned card to load
    const unassignedCard = page.locator('[data-testid="unassigned-bookings-card"]')
      .or(page.locator('text=Unassigned').locator('..')); // Fallback selector

    await unassignedCard.waitFor({ state: 'visible', timeout: 10000 });

    // Extract the count from the UI
    const uiText = await unassignedCard.textContent();
    const uiCountMatch = uiText.match(/(\d+)/);

    expect(uiCountMatch).not.toBeNull();
    const uiCount = parseInt(uiCountMatch[1]);

    console.log(`✓ Frontend UI displays ${uiCount} unassigned bookings`);

    // CRITICAL ASSERTION: UI count MUST match API count
    expect(uiCount).toBe(actualCount);

    if (uiCount !== actualCount) {
      throw new Error(
        `CRITICAL DATA MISMATCH: ` +
        `Frontend shows ${uiCount} unassigned bookings, ` +
        `but backend API returns ${actualCount}. ` +
        `This causes users to see incorrect data!`
      );
    }
  });

  test('clicking Unassigned card does not cause CORS or 500 errors', async ({ page }) => {
    // Monitor console for errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Monitor network for failed requests
    const failedRequests = [];
    page.on('response', response => {
      if (!response.ok() && response.url().includes('/api/')) {
        failedRequests.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        });
      }
    });

    // Load admin dashboard
    await page.goto(`${FRONTEND_URL}/admin`);

    // Click the unassigned card
    const unassignedCard = page.locator('[data-testid="unassigned-bookings-card"]')
      .or(page.locator('text=Unassigned').locator('..'));

    await unassignedCard.click();

    // Wait for any async requests to complete
    await page.waitForTimeout(2000);

    // CRITICAL: No CORS errors
    const corsErrors = consoleErrors.filter(err =>
      err.includes('CORS') || err.includes('cors')
    );
    expect(corsErrors.length).toBe(0);

    if (corsErrors.length > 0) {
      console.error('CORS errors detected:', corsErrors);
      throw new Error(`CORS errors found: ${corsErrors.join(', ')}`);
    }

    // CRITICAL: No 500 errors
    const serverErrors = failedRequests.filter(req => req.status === 500);
    expect(serverErrors.length).toBe(0);

    if (serverErrors.length > 0) {
      console.error('500 errors detected:', serverErrors);
      throw new Error(
        `Server errors found: ${serverErrors.map(r => r.url).join(', ')}`
      );
    }

    console.log('✓ No CORS or 500 errors detected');
  });

  test('driver recommendations endpoint returns valid data', async ({ page, request }) => {
    // Get an unassigned booking
    const unassignedResponse = await request.get(
      `${BACKEND_URL}/api/admin/drivers/unassigned-bookings`
    );
    expect(unassignedResponse.ok()).toBeTruthy();

    const unassigned = await unassignedResponse.json();
    if (unassigned.length === 0) {
      test.skip('No unassigned bookings to test');
      return;
    }

    const bookingId = unassigned[0].booking_id;

    // CRITICAL: Driver recommendations endpoint must return 200
    const recommendationsResponse = await request.get(
      `${BACKEND_URL}/api/admin/drivers/recommendations/${bookingId}`
    );

    expect(recommendationsResponse.ok()).toBeTruthy();
    expect(recommendationsResponse.status()).toBe(200);

    const recommendations = await recommendationsResponse.json();
    expect(Array.isArray(recommendations)).toBeTruthy();

    console.log(`✓ Driver recommendations endpoint returned ${recommendations.length} drivers`);
  });
});

test.describe('Admin Dashboard - Data Consistency', () => {
  test('stats endpoint matches individual endpoint counts', async ({ request }) => {
    // Get stats from admin stats endpoint
    const statsResponse = await request.get(`${BACKEND_URL}/api/admin/stats`);
    expect(statsResponse.ok()).toBeTruthy();

    const stats = await statsResponse.json();
    const statsUnassigned = stats.unassigned_bookings;

    // Get actual unassigned bookings list
    const listResponse = await request.get(
      `${BACKEND_URL}/api/admin/drivers/unassigned-bookings`
    );
    expect(listResponse.ok()).toBeTruthy();

    const actualUnassigned = await listResponse.json();
    const actualCount = actualUnassigned.length;

    // CRITICAL: These must match
    expect(statsUnassigned).toBe(actualCount);

    if (statsUnassigned !== actualCount) {
      throw new Error(
        `DATA INCONSISTENCY: ` +
        `Stats reports ${statsUnassigned} unassigned, ` +
        `but actual count is ${actualCount}`
      );
    }

    console.log(`✓ Data consistency verified: ${actualCount} unassigned bookings`);
  });
});

test.describe('Inventory - Photos Display', () => {
  test('inventory items have photos displayed', async ({ page, request }) => {
    // Get inventory from API
    const apiResponse = await request.get(`${BACKEND_URL}/api/inventory/`);
    expect(apiResponse.ok()).toBeTruthy();

    const items = await apiResponse.json();
    const itemsWithPhotos = items.filter(item => item.photos && item.photos.length > 0);

    console.log(`✓ Backend has ${itemsWithPhotos.length} items with photos`);

    // Load frontend inventory page
    await page.goto(`${FRONTEND_URL}/inventory`);
    await page.waitForLoadState('networkidle');

    // Check if photos are displayed
    const photoElements = page.locator('img[src*="unsplash"]').or(
      page.locator('img[src*="/uploads/"]')
    );

    const photoCount = await photoElements.count();

    console.log(`✓ Frontend displays ${photoCount} photos`);

    // At least some photos should be displayed if backend has them
    if (itemsWithPhotos.length > 0) {
      expect(photoCount).toBeGreaterThan(0);
    }
  });
});

test.describe('Warehouses - Data Display', () => {
  test('warehouse data displays correctly (not "Unknown")', async ({ page, request }) => {
    // Get warehouses from API
    const apiResponse = await request.get(`${BACKEND_URL}/api/warehouses/`);
    expect(apiResponse.ok()).toBeTruthy();

    const warehouses = await apiResponse.json();
    console.log(`✓ Backend has ${warehouses.length} warehouses`);

    // Load a page that displays warehouse data (admin or inventory)
    await page.goto(`${FRONTEND_URL}/admin`);
    await page.waitForLoadState('networkidle');

    // Check for "Unknown" text which indicates missing data
    const unknownElements = page.locator('text="Unknown"');
    const unknownCount = await unknownElements.count();

    // CRITICAL: No "Unknown" values should appear for warehouse data
    expect(unknownCount).toBe(0);

    if (unknownCount > 0) {
      console.error(`Found ${unknownCount} "Unknown" values in UI`);
      throw new Error(
        `Data display error: Found "${unknownCount}" Unknown values. ` +
        `This indicates frontend is not properly mapping warehouse data.`
      );
    }

    console.log('✓ No "Unknown" values found in warehouse data');
  });
});
