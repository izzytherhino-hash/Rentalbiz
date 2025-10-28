#!/bin/bash

#
# Deployment Verification Script
#
# This script runs comprehensive checks after each deployment to verify:
# 1. All critical endpoints return 200 (not 500 or CORS errors)
# 2. Frontend and backend data counts match
# 3. No "Unknown" values appear in the UI
# 4. Photos are properly displayed
#
# Run this after every production deployment to catch issues immediately.
#

BACKEND_URL="${BACKEND_URL:-https://partay-backend.onrender.com}"
FRONTEND_URL="${FRONTEND_URL:-https://partay-frontend.onrender.com}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

echo "=========================================="
echo "🔍 DEPLOYMENT VERIFICATION"
echo "=========================================="
echo ""
echo "Backend:  $BACKEND_URL"
echo "Frontend: $FRONTEND_URL"
echo ""

# Function to print success
success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Function to print error
error() {
    echo -e "${RED}✗${NC} $1"
    ((ERRORS++))
}

# Function to print warning
warning() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

echo "=========================================="
echo "1. Backend Health Checks"
echo "=========================================="

# Test health endpoint
HEALTH_STATUS=$(timeout 5 curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/health" 2>/dev/null)
if [ "$HEALTH_STATUS" = "200" ]; then
    success "Health endpoint returns 200"
else
    error "Health endpoint failed (status: $HEALTH_STATUS)"
fi

# Test root endpoint
ROOT_STATUS=$(timeout 5 curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/" 2>/dev/null)
if [ "$ROOT_STATUS" = "200" ]; then
    success "Root endpoint returns 200"
else
    error "Root endpoint failed (status: $ROOT_STATUS)"
fi

echo ""
echo "=========================================="
echo "2. Critical Endpoint Tests"
echo "=========================================="

# Test inventory endpoint
INVENTORY_STATUS=$(timeout 5 curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/inventory/" 2>/dev/null)
if [ "$INVENTORY_STATUS" = "200" ]; then
    success "Inventory endpoint returns 200"
else
    error "Inventory endpoint failed (status: $INVENTORY_STATUS)"
fi

# Test bookings endpoint
BOOKINGS_STATUS=$(timeout 5 curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/bookings/" 2>/dev/null)
if [ "$BOOKINGS_STATUS" = "200" ]; then
    success "Bookings endpoint returns 200"
else
    error "Bookings endpoint failed (status: $BOOKINGS_STATUS)"
fi

# Test warehouses endpoint
WAREHOUSES_STATUS=$(timeout 5 curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/warehouses/" 2>/dev/null)
if [ "$WAREHOUSES_STATUS" = "200" ]; then
    success "Warehouses endpoint returns 200"
else
    error "Warehouses endpoint failed (status: $WAREHOUSES_STATUS)"
fi

# Test admin stats endpoint
STATS_STATUS=$(timeout 5 curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/admin/stats" 2>/dev/null)
if [ "$STATS_STATUS" = "200" ]; then
    success "Admin stats endpoint returns 200"
else
    error "Admin stats endpoint failed (status: $STATS_STATUS)"
fi

# Test unassigned bookings endpoint
UNASSIGNED_STATUS=$(timeout 5 curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/admin/drivers/unassigned-bookings" 2>/dev/null)
if [ "$UNASSIGNED_STATUS" = "200" ]; then
    success "Unassigned bookings endpoint returns 200"
else
    error "Unassigned bookings endpoint failed (status: $UNASSIGNED_STATUS)"
fi

echo ""
echo "=========================================="
echo "3. Driver Recommendations Endpoint"
echo "=========================================="

# Get an unassigned booking to test recommendations
UNASSIGNED_RESPONSE=$(timeout 5 curl -s "$BACKEND_URL/api/admin/drivers/unassigned-bookings" 2>/dev/null)
UNASSIGNED_BOOKING_ID=$(echo "$UNASSIGNED_RESPONSE" | python3 -c "import sys, json; bookings=json.load(sys.stdin); print(bookings[0]['booking_id'] if bookings else '')" 2>/dev/null)

if [ ! -z "$UNASSIGNED_BOOKING_ID" ]; then
    RECOMMENDATIONS_STATUS=$(timeout 5 curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/admin/drivers/recommendations/$UNASSIGNED_BOOKING_ID" 2>/dev/null)

    if [ "$RECOMMENDATIONS_STATUS" = "200" ]; then
        success "Driver recommendations endpoint returns 200"
    elif [ "$RECOMMENDATIONS_STATUS" = "500" ]; then
        error "Driver recommendations endpoint returns 500 (CRITICAL: This breaks the Unassigned card)"
    else
        error "Driver recommendations endpoint failed (status: $RECOMMENDATIONS_STATUS)"
    fi
else
    warning "No unassigned bookings available to test recommendations endpoint"
fi

echo ""
echo "=========================================="
echo "4. Data Consistency Checks"
echo "=========================================="

# Check unassigned count consistency
STATS_RESPONSE=$(timeout 5 curl -s "$BACKEND_URL/api/admin/stats" 2>/dev/null)
STATS_UNASSIGNED=$(echo "$STATS_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('unassigned_bookings', -1))" 2>/dev/null)

UNASSIGNED_LIST_RESPONSE=$(timeout 5 curl -s "$BACKEND_URL/api/admin/drivers/unassigned-bookings" 2>/dev/null)
ACTUAL_UNASSIGNED=$(echo "$UNASSIGNED_LIST_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('total', len(data.get('bookings', []))))" 2>/dev/null)

if [ "$STATS_UNASSIGNED" = "$ACTUAL_UNASSIGNED" ]; then
    success "Unassigned count consistent ($ACTUAL_UNASSIGNED bookings)"
else
    error "CRITICAL: Unassigned count mismatch! Stats shows $STATS_UNASSIGNED, API returns $ACTUAL_UNASSIGNED"
fi

# Check total bookings
TOTAL_BOOKINGS=$(timeout 5 curl -s "$BACKEND_URL/api/bookings/" 2>/dev/null | python3 -c "import sys, json; print(len(json.load(sys.stdin)))" 2>/dev/null)
if [ ! -z "$TOTAL_BOOKINGS" ] && [ "$TOTAL_BOOKINGS" -gt "0" ]; then
    success "Total bookings: $TOTAL_BOOKINGS"
else
    warning "No bookings found or failed to fetch (count: $TOTAL_BOOKINGS)"
fi

# Check inventory items
TOTAL_ITEMS=$(timeout 5 curl -s "$BACKEND_URL/api/inventory/" 2>/dev/null | python3 -c "import sys, json; print(len(json.load(sys.stdin)))" 2>/dev/null)
if [ ! -z "$TOTAL_ITEMS" ] && [ "$TOTAL_ITEMS" -gt "0" ]; then
    success "Total inventory items: $TOTAL_ITEMS"
else
    error "No inventory items found (count: $TOTAL_ITEMS)"
fi

# Check for items with photos
ITEMS_WITH_PHOTOS=$(timeout 5 curl -s "$BACKEND_URL/api/inventory/" 2>/dev/null | python3 -c "import sys, json; items=json.load(sys.stdin); print(len([i for i in items if i.get('photos') and len(i['photos']) > 0]))" 2>/dev/null)
if [ ! -z "$ITEMS_WITH_PHOTOS" ] && [ "$ITEMS_WITH_PHOTOS" -gt "0" ]; then
    success "Inventory items with photos: $ITEMS_WITH_PHOTOS"
else
    warning "No inventory items have photos"
fi

echo ""
echo "=========================================="
echo "5. Warehouse Data Quality"
echo "=========================================="

# Check warehouses have proper data (not null/Unknown)
WAREHOUSES=$(timeout 5 curl -s "$BACKEND_URL/api/warehouses/" 2>/dev/null)
WAREHOUSE_COUNT=$(echo "$WAREHOUSES" | python3 -c "import sys, json; print(len(json.load(sys.stdin)))" 2>/dev/null)

if [ ! -z "$WAREHOUSE_COUNT" ] && [ "$WAREHOUSE_COUNT" -gt "0" ]; then
    success "Total warehouses: $WAREHOUSE_COUNT"

    # Check if all warehouses have required fields
    VALID_WAREHOUSES=$(echo "$WAREHOUSES" | python3 -c "
import sys, json
warehouses = json.load(sys.stdin)
valid = all(
    w.get('name') and
    w.get('address') and
    w.get('address_lat') is not None and
    w.get('address_lng') is not None
    for w in warehouses
)
print('true' if valid else 'false')
" 2>/dev/null)

    if [ "$VALID_WAREHOUSES" = "true" ]; then
        success "All warehouses have required fields (name, address, coordinates)"
    else
        error "Some warehouses are missing required fields (this causes 'Unknown' in UI)"
    fi
else
    error "No warehouses found (count: $WAREHOUSE_COUNT)"
fi

echo ""
echo "=========================================="
echo "6. Frontend Accessibility"
echo "=========================================="

# Check frontend is accessible
FRONTEND_STATUS=$(timeout 10 curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL/" 2>/dev/null)
if [ "$FRONTEND_STATUS" = "200" ]; then
    success "Frontend is accessible (status: 200)"
else
    error "Frontend failed to load (status: $FRONTEND_STATUS)"
fi

echo ""
echo "=========================================="
echo "📊 VERIFICATION SUMMARY"
echo "=========================================="

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo ""
    echo "Deployment verified successfully. Production is healthy."
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ $WARNINGS warnings${NC}"
    echo ""
    echo "Deployment completed with warnings. Review above."
    exit 0
else
    echo -e "${RED}✗ $ERRORS errors, $WARNINGS warnings${NC}"
    echo ""
    echo "DEPLOYMENT VERIFICATION FAILED!"
    echo "Fix the errors above before considering deployment successful."
    exit 1
fi
