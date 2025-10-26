# Photo Management Guide

## Current Status

The inventory photo system is fully implemented with:
- Database models for inventory photos
- API endpoints for uploading/managing photos
- Thumbnail display in Admin Dashboard
- Thumbnail display on map markers

## Temporary Development Images

**⚠️ IMPORTANT**: The current seeded images are TEMPORARY placeholders.

Current images are party-themed stock photos from Unsplash that show balloons, parties, and events - NOT actual rental equipment. These work fine for development and demo purposes but should be replaced before production use.

### Why Not Supplier Images?

During development, we attempted to use images from party rental equipment suppliers (Magic Jump, etc.), but discovered:

- Supplier images require customer account authentication
- Images are protected and cannot be programmatically accessed
- Most suppliers only provide marketing images to paying customers
- Copyright/licensing restrictions apply

## Production Photo Management

### Option 1: Upload Your Own Equipment Photos (Recommended)

Take professional photos of your actual inventory and upload them via the API:

```bash
# Upload a photo for an inventory item
curl -X POST "http://localhost:8000/api/inventory/{item_id}/photos" \
  -H "Content-Type: application/json" \
  -d '{
    "image_url": "https://your-cdn.com/bounce-house-1.jpg",
    "display_order": 0,
    "is_thumbnail": true
  }'
```

### Option 2: Manual Download from Suppliers

If you have accounts with equipment suppliers:

1. Log in to your supplier account (Magic Jump, etc.)
2. Download product images from your account
3. Upload to your CDN/hosting
4. Add URLs via the photo management API

### Option 3: Purchase/License Professional Images

Contact your equipment suppliers about licensing their marketing images for your website.

## API Endpoints

### Upload Photo
```
POST /api/inventory/{inventory_item_id}/photos
Body: {
  "image_url": "string",
  "display_order": 0,
  "is_thumbnail": true
}
```

### Update Photo
```
PUT /api/inventory/photos/{photo_id}
Body: {
  "image_url": "string",
  "display_order": 0,
  "is_thumbnail": true
}
```

### Delete Photo
```
DELETE /api/inventory/photos/{photo_id}
```

### Reorder Photos
```
POST /api/inventory/{inventory_item_id}/photos/reorder
Body: {
  "photo_orders": [
    {"photo_id": "uuid", "display_order": 0},
    {"photo_id": "uuid", "display_order": 1}
  ]
}
```

## Image Requirements

### Technical Specifications
- Format: JPEG or PNG
- Recommended size: 800x600px minimum
- Aspect ratio: 4:3 or 16:9 works best
- File size: Under 2MB per image

### Best Practices
- Use professional lighting
- Clean background
- Show equipment from multiple angles
- Include scale reference when helpful
- Ensure equipment is clean and well-maintained
- Take photos in good weather for outdoor items

## Thumbnail Selection

The system uses this logic to select thumbnails:
1. Find the photo with `is_thumbnail: true`
2. If none found, use the first photo (lowest `display_order`)
3. If no photos exist, no image is displayed

Make sure to mark one photo per item as the thumbnail.

## Database Seeding

To clear and reseed photos during development:

```bash
# Clear existing photos and reseed
curl -X POST "http://localhost:8000/api/admin/seed-inventory-photos?clear_existing=true"
```

**Note**: This will use the temporary placeholder images. For production, upload real photos via the API endpoints instead.

## Frontend Implementation

Photos are automatically displayed in:

1. **Admin Dashboard** (`/admin`) - Thumbnail at top of each inventory card
2. **Map Markers** (`InventoryMap.jsx`) - Thumbnail in marker popup

The frontend uses optional chaining to safely handle missing photos:
```javascript
const thumbnail = item.photos?.find(p => p.is_thumbnail) || item.photos?.[0]
```

## Production Checklist

Before going live:

- [ ] Replace all placeholder images with actual equipment photos
- [ ] Set appropriate thumbnails for each item
- [ ] Verify image URLs are accessible
- [ ] Test image loading on slow connections
- [ ] Ensure proper image licensing/permissions
- [ ] Optimize images for web (compression, sizing)
- [ ] Set up CDN for image hosting (optional but recommended)

## Need Help?

The photo management system is fully functional - you just need to provide the actual equipment images. If you need assistance:

1. Check API documentation at `/docs` when backend is running
2. Review the schemas in `/backend/src/backend/database/schemas.py`
3. Look at the photo endpoints in `/backend/src/backend/api/inventory.py`
