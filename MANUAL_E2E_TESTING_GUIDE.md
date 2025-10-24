# Manual End-to-End Testing Guide

**Version:** 1.0
**Last Updated:** October 23, 2025
**Test Environment:** http://localhost:5173

---

## Overview

This guide provides step-by-step instructions for manually testing all major user flows in the Partay Rental Management application. Use this checklist to verify functionality before deploying changes.

---

## Prerequisites

✅ Backend server running on http://localhost:8000
✅ Frontend server running on http://localhost:5173
✅ Sample data seeded in database
✅ Browser developer tools open (F12) for monitoring errors

---

## Test Suite 1: Landing Page

### TC1.1: Landing Page Load
**Steps:**
1. Navigate to http://localhost:5173
2. Verify page loads without errors (check console)
3. Check that all images and styles load correctly

**Expected Results:**
- ✅ Landing page displays with Drybar-inspired design
- ✅ Hero section visible with yellow (#FACC15) accents
- ✅ "Get Started" and "Plan Your Partay" buttons present
- ✅ No console errors

**Status:** ☐ Pass ☐ Fail
**Notes:** ____________________

### TC1.2: Navigation
**Steps:**
1. Click "Get Started" button
2. Verify redirect to booking page

**Expected Results:**
- ✅ Redirects to /book
- ✅ Step 1 of booking wizard displays

**Status:** ☐ Pass ☐ Fail
**Notes:** ____________________

---

## Test Suite 2: Customer Booking Flow

### TC2.1: Step 1 - Date Selection
**Steps:**
1. Navigate to http://localhost:5173/book
2. Click on delivery date picker
3. Select a date 3 days from today
4. Click on pickup date picker
5. Select a date 5 days from today
6. Click "Next"

**Expected Results:**
- ✅ Date pickers open correctly
- ✅ Cannot select pickup date before delivery date
- ✅ "Next" button becomes enabled after both dates selected
- ✅ Advances to Step 2

**Status:** ☐ Pass ☐ Fail
**Notes:** ____________________

### TC2.2: Step 2 - Party Space Details
**Steps:**
1. Enter dimensions: Width = 20, Length = 20
2. Verify calculated area shows "400 sq ft"
3. Select surface type: "Grass"
4. Select power availability: "Yes"
5. Click "Next"

**Expected Results:**
- ✅ Area calculation shows correct square footage
- ✅ All fields marked as required have asterisks
- ✅ Cannot proceed without filling all fields
- ✅ Advances to Step 3

**Status:** ☐ Pass ☐ Fail
**Notes:** ____________________

### TC2.3: Step 3 - Equipment Selection
**Steps:**
1. Verify equipment list displays
2. Check that items are filtered based on Step 2 inputs
3. Click on "Bounce House Castle" (should fit: 225 sqft < 400 sqft)
4. Verify item becomes selected (yellow border)
5. Verify quantity selector appears
6. Change quantity to 2
7. Click "Water Slide Mega"
8. Verify total price updates
9. Click "Back" and verify data persists
10. Click "Next" twice to return to Step 3
11. Click "Next" to continue

**Expected Results:**
- ✅ Only items matching space requirements shown
- ✅ Items with requires_power=true shown (power=yes in Step 2)
- ✅ Items requiring > 400 sqft are filtered out
- ✅ Selected items have yellow border and checkmark
- ✅ Quantity selector works correctly
- ✅ Total price calculates correctly
- ✅ Data persists when navigating back/forward
- ✅ Advances to Step 4

**Status:** ☐ Pass ☐ Fail
**Notes:** ____________________

### TC2.4: Step 4 - Customer Information
**Steps:**
1. Enter name: "Test Customer"
2. Enter email: "test@example.com"
3. Enter phone: "7145550100"
4. Enter address: "123 Test St, Costa Mesa, CA 92626"
5. Enter setup instructions: "Setup in backyard"
6. Try to proceed without filling required fields
7. Verify validation errors appear
8. Fill all required fields
9. Click "Next"

**Expected Results:**
- ✅ All fields present and labeled
- ✅ Required fields have asterisks
- ✅ Email validation works (invalid format rejected)
- ✅ Phone validation works (requires 10 digits)
- ✅ Cannot proceed without required fields
- ✅ Advances to Step 5

**Status:** ☐ Pass ☐ Fail
**Notes:** ____________________

### TC2.5: Step 5 - Review and Confirm
**Steps:**
1. Review booking summary
2. Verify all details are correct:
   - Dates
   - Equipment selected
   - Quantities
   - Prices
   - Customer information
3. Verify subtotal, delivery fee, and total are calculated
4. Click "Confirm Booking" button

**Expected Results:**
- ⚠️ All details display correctly
- ⚠️ Pricing breakdown is accurate
- ⚠️ "Confirm Booking" button attempts API call
- ❌ **KNOWN ISSUE:** Will fail with 404 error (no backend endpoint)
- ❌ Should show success message and booking confirmation

**Status:** ☐ Pass ☐ Fail (Expected to fail - backend not implemented)
**Notes:** ____________________

---

## Test Suite 3: Driver Dashboard

### TC3.1: Driver Selection
**Steps:**
1. Navigate to http://localhost:5173/driver
2. Verify driver list displays
3. Count number of drivers shown
4. Click on "Mike Johnson"

**Expected Results:**
- ✅ Driver portal page loads
- ✅ Three drivers visible: Mike Johnson, Sarah Chen, James Rodriguez
- ✅ Each driver has user icon
- ✅ Clicking driver loads their dashboard

**Status:** ☐ Pass ☐ Fail
**Notes:** ____________________

### TC3.2: Route Display
**Steps:**
1. Verify driver name in header
2. Check date picker (should default to today)
3. Change date to tomorrow
4. Verify route updates
5. Click "Show Route" button if route has stops

**Expected Results:**
- ✅ Driver name displays in header
- ✅ Date picker is functional
- ✅ Stats cards show: Total Stops, Complete, Total Earnings
- ✅ "Show Route" button opens Google Maps (if stops exist)
- ⚠️ May show "No stops scheduled" if no bookings for selected date
- ✅ Google Maps iframe displays (if stops exist)

**Status:** ☐ Pass ☐ Fail
**Notes:** ____________________

### TC3.3: Stop Details (if stops exist)
**Steps:**
1. Find a date with scheduled stops (delivery date from seed data)
2. Verify stops are organized by type with color coding:
   - Blue: Warehouse Pickup
   - Yellow: Customer Delivery
   - Purple: Customer Pickup
   - Green: Warehouse Return
3. Click on a stop to expand details
4. Verify all stop information displays
5. Click "Navigate" button
6. Click "Mark as Complete" button

**Expected Results:**
- ✅ Stops show in correct order with numbered circles
- ✅ Color coding matches stop type
- ✅ Stop cards show address and time window
- ✅ Expanding shows items list, instructions
- ✅ "Already Booked!" warning appears for pre-booked items (purple banner)
- ✅ "CRITICAL" warning for items with next booking
- ✅ Navigate opens Google Maps directions
- ✅ Mark as Complete updates stop status
- ✅ Earnings breakdown shows fees and tips separately

**Status:** ☐ Pass ☐ Fail
**Notes:** ____________________

### TC3.4: Route Completion
**Steps:**
1. Mark all stops as complete
2. Verify completion message appears
3. Verify total earnings display

**Expected Results:**
- ✅ Completion banner appears after last stop
- ✅ Shows "Route Complete!" message
- ✅ Displays total earnings for the day
- ✅ All stops show green checkmark

**Status:** ☐ Pass ☐ Fail
**Notes:** ____________________

---

## Test Suite 4: Admin Dashboard

### TC4.1: Calendar View
**Steps:**
1. Navigate to http://localhost:5173/admin
2. Verify calendar displays current month
3. Use month picker to change months
4. Click on a date with bookings
5. Verify sidebar updates with booking list

**Expected Results:**
- ✅ Calendar displays current month with day names
- ✅ Today's date is highlighted in yellow
- ✅ Dates with bookings have blue background
- ✅ Booking count shows on busy dates ("+ X more")
- ✅ Month picker allows navigation
- ✅ Sidebar shows bookings for selected date
- ✅ Clicking date updates sidebar

**Status:** ☐ Pass ☐ Fail
**Notes:** ____________________

### TC4.2: Stats Cards
**Steps:**
1. Verify four stat cards display at top:
   - Total Bookings
   - Total Revenue
   - Unassigned
   - Conflicts
2. Check that numbers update when data changes

**Expected Results:**
- ✅ All four cards visible
- ✅ Icons match content (Package, DollarSign, AlertCircle)
- ✅ Numbers display correctly
- ✅ Conflicts card turns red if conflicts > 0

**Status:** ☐ Pass ☐ Fail
**Notes:** ____________________

### TC4.3: Booking Detail Modal
**Steps:**
1. Click on any booking in the calendar sidebar
2. Verify modal opens with full booking details
3. Review all sections:
   - Status badge
   - Customer information
   - Delivery & pickup dates
   - Items list
   - Pricing breakdown
   - Setup instructions (if present)
   - Driver assignment
4. Try to assign a driver (if unassigned)
5. Click "Edit Booking" button (placeholder)
6. Click "Close" button
7. Click outside modal to close

**Expected Results:**
- ✅ Modal opens smoothly with animation
- ✅ All booking details display correctly
- ✅ Status badge has correct color
- ✅ Items list shows all equipment with quantities
- ✅ Pricing shows subtotal, delivery fee, tip, total
- ✅ Can assign driver from dropdown
- ✅ "Edit Booking" shows placeholder alert
- ✅ Close button works
- ✅ Clicking outside closes modal

**Status:** ☐ Pass ☐ Fail
**Notes:** ____________________

### TC4.4: Quick Actions Panel
**Steps:**
1. With a date selected, verify Quick Actions panel appears
2. Note the count badges for deliveries and pickups
3. Click "Create Booking" button
4. Go back and click "View Deliveries"
5. Click "View Pickups"
6. Click "Check Inventory"

**Expected Results:**
- ✅ Quick Actions panel visible in sidebar
- ✅ Count badges show correct numbers for selected date
- ✅ "Create Booking" redirects to /book
- ✅ "View Deliveries" shows alert with count
- ✅ "View Pickups" shows alert with count
- ✅ "Check Inventory" switches to Inventory tab

**Status:** ☐ Pass ☐ Fail
**Notes:** ____________________

### TC4.5: Inventory Tab
**Steps:**
1. Click "Inventory" tab
2. Verify all inventory items display in grid
3. Check each item shows:
   - Name
   - Category
   - Status (Available/In Use)
   - Price
4. Click on any inventory item
5. Verify Item-Specific Calendar modal opens
6. Change month to view different dates
7. Check bookings list for that item
8. Click on a booking in the list
9. Verify Booking Detail Modal opens
10. Close modals

**Expected Results:**
- ✅ Inventory tab loads with all items
- ✅ 8 items displayed in 2-column grid
- ✅ Each item card is clickable
- ✅ Item-Specific Calendar modal opens
- ✅ Calendar shows green (available) and red (booked) days
- ✅ Booking count displays on booked days
- ✅ Month selector works
- ✅ Bookings list shows all bookings for that item
- ✅ Clicking booking opens Booking Detail Modal
- ✅ Can navigate between modals smoothly

**Status:** ☐ Pass ☐ Fail
**Notes:** ____________________

### TC4.6: Drivers Tab
**Steps:**
1. Click "Drivers" tab
2. Verify driver list displays
3. Check workload for each driver
4. Scroll to "Unassigned Bookings" section (if present)
5. Try to assign a driver to an unassigned booking
6. Verify assignment updates

**Expected Results:**
- ✅ Drivers tab displays all drivers
- ✅ Each driver shows name, photo icon, booking count
- ✅ Job count displays prominently
- ✅ Unassigned section appears if bookings without drivers exist
- ✅ Can assign driver from dropdown
- ✅ Assignment updates immediately

**Status:** ☐ Pass ☐ Fail
**Notes:** ____________________

### TC4.7: Conflicts Tab
**Steps:**
1. Click "Conflicts" tab
2. Check badge on tab (should show conflict count)
3. Review conflict list
4. Verify each conflict shows:
   - Item name
   - Both conflicting bookings
   - Date ranges
   - Customer names

**Expected Results:**
- ✅ Conflicts tab accessible
- ✅ Badge shows count when conflicts exist
- ✅ No conflicts shows checkmark and success message
- ✅ Conflicts display in red-bordered cards
- ✅ Each conflict clearly shows which item is double-booked
- ✅ Booking details are side-by-side for comparison

**Status:** ☐ Pass ☐ Fail
**Notes:** ____________________

---

## Test Suite 5: Responsive Design

### TC5.1: Mobile View (375px width)
**Steps:**
1. Open browser developer tools
2. Switch to device emulation (iPhone SE)
3. Test all three main pages:
   - Landing page
   - Booking flow
   - Driver dashboard
   - Admin dashboard
4. Verify layouts adapt correctly
5. Check that all buttons are tappable
6. Verify modals display correctly

**Expected Results:**
- ✅ Layout adapts to small screens
- ✅ No horizontal scrolling
- ✅ Text is readable
- ✅ Buttons are appropriately sized
- ✅ Modals fit screen
- ✅ Forms are usable

**Status:** ☐ Pass ☐ Fail
**Notes:** ____________________

### TC5.2: Tablet View (768px width)
**Steps:**
1. Switch to tablet emulation (iPad)
2. Test all main pages
3. Verify layouts use available space effectively

**Expected Results:**
- ✅ Grid layouts adjust (e.g., 2 columns instead of 4)
- ✅ Calendar remains functional
- ✅ All features accessible

**Status:** ☐ Pass ☐ Fail
**Notes:** ____________________

---

## Test Suite 6: Error Handling

### TC6.1: Network Errors
**Steps:**
1. Open browser developer tools, go to Network tab
2. Set throttling to "Offline"
3. Try to load any page
4. Try to submit a form
5. Verify error messages display

**Expected Results:**
- ✅ User-friendly error messages appear
- ✅ Application doesn't crash
- ✅ Can recover when connection restored

**Status:** ☐ Pass ☐ Fail
**Notes:** ____________________

### TC6.2: Invalid Data
**Steps:**
1. In booking flow Step 4, enter invalid email
2. Try to proceed
3. Enter invalid phone number
4. Verify validation errors

**Expected Results:**
- ✅ Email validation catches invalid formats
- ✅ Phone validation requires correct format
- ✅ Error messages are clear and helpful

**Status:** ☐ Pass ☐ Fail
**Notes:** ____________________

---

## Test Suite 7: Browser Compatibility

### TC7.1: Chrome
**Expected Results:** ✅ All features work
**Status:** ☐ Pass ☐ Fail

### TC7.2: Firefox
**Expected Results:** ✅ All features work
**Status:** ☐ Pass ☐ Fail

### TC7.3: Safari
**Expected Results:** ✅ All features work
**Status:** ☐ Pass ☐ Fail

### TC7.4: Edge
**Expected Results:** ✅ All features work
**Status:** ☐ Pass ☐ Fail

---

## Test Suite 8: Performance

### TC8.1: Page Load Times
**Steps:**
1. Open browser developer tools, Network tab
2. Clear cache
3. Reload page
4. Check "Load" time

**Expected Results:**
- ✅ Landing page loads < 2 seconds
- ✅ Dashboard pages load < 3 seconds
- ✅ No excessive API calls

**Status:** ☐ Pass ☐ Fail
**Measured Time:** ____________________

### TC8.2: Console Errors
**Steps:**
1. Open developer tools console
2. Navigate through all pages
3. Perform all major actions
4. Check for errors or warnings

**Expected Results:**
- ✅ No red console errors
- ✅ No React warnings about keys or props
- ✅ Only expected 404s from missing backend endpoints

**Status:** ☐ Pass ☐ Fail
**Errors Found:** ____________________

---

## Known Issues

Based on backend testing, the following issues are expected:

### Critical (Blocking E2E)
- ❌ **Booking creation fails** - No POST /api/bookings/ endpoint working
- ❌ **Customer creation fails** - No POST /api/customers/ endpoint
- ❌ **Admin stats don't load** - No /api/admin/* endpoints
- ❌ **Driver routes don't load** - No /api/drivers/{id}/route/{date} endpoint

### Non-Blocking (UI works)
- ✅ **All frontend UI components work** - Forms, modals, navigation all functional
- ✅ **Validation works** - Client-side validation catches errors
- ✅ **Design is polished** - Drybar-inspired styling complete

---

## Test Summary Template

**Test Date:** ________________
**Tester Name:** ________________
**Build Version:** ________________
**Environment:** ☐ Development ☐ Staging ☐ Production

### Results Summary

| Test Suite | Total Tests | Passed | Failed | Blocked | Pass Rate |
|------------|-------------|--------|--------|---------|-----------|
| Landing Page | 2 | ___ | ___ | ___ | ___% |
| Booking Flow | 5 | ___ | ___ | ___ | ___% |
| Driver Dashboard | 4 | ___ | ___ | ___ | ___% |
| Admin Dashboard | 7 | ___ | ___ | ___ | ___% |
| Responsive Design | 2 | ___ | ___ | ___ | ___% |
| Error Handling | 2 | ___ | ___ | ___ | ___% |
| Browser Compat | 4 | ___ | ___ | ___ | ___% |
| Performance | 2 | ___ | ___ | ___ | ___% |
| **TOTAL** | **28** | ___ | ___ | ___ | ___% |

### Overall Assessment
☐ **Ready for Production** - All critical tests passed
☐ **Ready for Staging** - Minor issues, can proceed
☐ **Needs Work** - Critical failures, do not deploy
☐ **Blocked** - Cannot complete testing

### Critical Issues Found
1. ________________________________________________
2. ________________________________________________
3. ________________________________________________

### Recommendations
________________________________________________
________________________________________________
________________________________________________

### Sign-off
**Tester:** ________________  **Date:** ________________
**Reviewed By:** ________________  **Date:** ________________

---

**Next Testing Cycle:** After Priority 1 backend fixes are implemented

