# Deployment Checklist & Migration Guide

## Pre-Deployment Checklist

### 1. Database Schema Verification
Before deploying to production, verify schema matches models:

```bash
# Compare local models with production database schema
# Run this script to detect missing columns:
python backend/src/scripts/verify_schema.py --env production
```

**Action Items:**
- [ ] Run schema verification script
- [ ] Review any schema differences
- [ ] Create migration for missing columns
- [ ] Test migration on staging database first

### 2. Local Testing
- [ ] All unit tests passing (`uv run pytest`)
- [ ] All integration tests passing
- [ ] Local server runs without errors
- [ ] No console errors in browser

### 3. Code Review
- [ ] All changes committed with descriptive messages
- [ ] No debug code or print statements
- [ ] Environment variables documented in `.env.example`
- [ ] No secrets committed to git

### 4. Migration Strategy
- [ ] Create migration scripts in `backend/src/migrations/`
- [ ] Test migrations on local database
- [ ] Document rollback procedure
- [ ] Have database backup ready

---

## Migration Best Practices

### Option 1: Use Alembic (RECOMMENDED)

**Why Alembic?**
- Automatic migration generation from model changes
- Version control for database schema
- Built-in rollback support
- Standard tool in Python ecosystem

**Setup:**
```bash
cd backend
uv add alembic
alembic init alembic

# Configure alembic.ini with your DATABASE_URL
# Edit alembic/env.py to import your models

# Generate migration from model changes
alembic revision --autogenerate -m "Add missing columns to inventory and drivers"

# Review the generated migration file
# Apply migration
alembic upgrade head
```

**Production Deployment with Alembic:**
```bash
# 1. Push code with migration files
git add alembic/versions/*.py
git commit -m "feat: add alembic migration for missing columns"
git push origin main

# 2. After deployment, run migration via API endpoint
curl -X POST https://partay-backend.onrender.com/api/admin/alembic-upgrade
```

### Option 2: Manual Migration Scripts (CURRENT)

**When to use:** Quick fixes, small projects, or when Alembic isn't set up yet

**Best Practices:**
1. **Create comprehensive migration in one go** - Don't discover columns iteratively
2. **Use a verification script first** to find ALL differences
3. **Test locally** before running in production
4. **Use IF NOT EXISTS** to make migrations idempotent

**Example Migration Endpoint (improved):**
```python
@router.post("/migrate-schema")
async def migrate_schema(db: Session = Depends(get_db)):
    """
    Run database migrations safely.

    NOTE: This is a manual migration approach.
    Consider using Alembic for better migration management.
    """
    from sqlalchemy import inspect

    # Get current database columns
    inspector = inspect(db.bind)

    # Compare with model definitions
    missing_columns = detect_missing_columns(inspector)

    # Apply all missing columns in one transaction
    try:
        for table, columns in missing_columns.items():
            for column in columns:
                add_column_sql = generate_alter_table(table, column)
                db.execute(text(add_column_sql))

        db.commit()
        return {"success": True, "changes": missing_columns}
    except Exception as e:
        db.rollback()
        raise HTTPException(500, detail=str(e))
```

---

## Schema Verification Script

Create this script to proactively detect schema drift:

**File:** `backend/src/scripts/verify_schema.py`

```python
"""
Verify production database schema matches SQLAlchemy models.

Usage:
    python verify_schema.py --env production
    python verify_schema.py --env local
"""

from sqlalchemy import create_engine, inspect
from backend.database.models import Base
import os
import sys

def get_model_columns(model):
    """Extract column definitions from SQLAlchemy model."""
    return {col.name: col.type for col in model.__table__.columns}

def get_database_columns(inspector, table_name):
    """Extract columns from actual database."""
    columns = inspector.get_columns(table_name)
    return {col['name']: col['type'] for col in columns}

def verify_schema(database_url):
    """Compare models with database schema."""
    engine = create_engine(database_url)
    inspector = inspect(engine)

    differences = {}

    for model in Base.__subclasses__():
        table_name = model.__tablename__

        # Get columns from model and database
        model_columns = get_model_columns(model)
        db_columns = get_database_columns(inspector, table_name)

        # Find missing columns
        missing = set(model_columns.keys()) - set(db_columns.keys())

        if missing:
            differences[table_name] = list(missing)

    return differences

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--env", choices=["local", "production"], required=True)
    args = parser.parse_args()

    if args.env == "production":
        db_url = os.getenv("DATABASE_URL")
    else:
        db_url = "postgresql://localhost/partay_rentals"

    differences = verify_schema(db_url)

    if differences:
        print("❌ Schema differences detected:")
        for table, columns in differences.items():
            print(f"  {table}: missing columns {columns}")
        sys.exit(1)
    else:
        print("✅ Schema matches models!")
        sys.exit(0)
```

---

## Deployment Workflow

### Standard Deployment Process

1. **Pre-Flight Checks**
   ```bash
   # Run all tests
   uv run pytest

   # Verify schema matches
   python scripts/verify_schema.py --env production

   # Check for uncommitted changes
   git status
   ```

2. **Create Migration (if schema changes detected)**
   ```bash
   # Option A: Alembic (recommended)
   alembic revision --autogenerate -m "Description"

   # Option B: Manual migration endpoint
   # Add columns to /api/admin/migrate-schema
   ```

3. **Commit and Push**
   ```bash
   git add -A
   git commit -m "feat: add feature X with schema migration"
   git push origin main
   ```

4. **Monitor Deployment**
   ```bash
   # Watch Render deployment logs
   # Check health endpoint
   curl https://partay-backend.onrender.com/health
   ```

5. **Run Migration** (if needed)
   ```bash
   # After deployment completes
   curl -X POST https://partay-backend.onrender.com/api/admin/migrate-schema
   ```

6. **Verify Production**
   ```bash
   # Test all critical endpoints
   curl https://partay-backend.onrender.com/api/inventory/
   curl https://partay-backend.onrender.com/api/admin/stats
   curl https://partay-backend.onrender.com/api/drivers/
   ```

7. **Monitor for Errors**
   - Check Render logs for errors
   - Test frontend functionality
   - Monitor error tracking (if configured)

---

## Common Pitfalls & Solutions

### Pitfall 1: Schema Drift
**Problem:** Production database doesn't match models
**Solution:** Use schema verification script before every deployment

### Pitfall 2: Discovering Missing Columns One at a Time
**Problem:** Running migration, hitting error, adding column, repeat
**Solution:** Use comprehensive schema comparison tool

### Pitfall 3: No Rollback Plan
**Problem:** Migration fails, no way to recover
**Solution:**
- Always backup production database before migration
- Test migrations on staging environment
- Have rollback SQL ready

### Pitfall 4: Manual Column Tracking
**Problem:** Forgetting which columns need migration
**Solution:** Use Alembic to auto-generate migrations from model changes

---

## Emergency Procedures

### If Migration Fails in Production

1. **Check error logs immediately**
   ```bash
   # View Render logs
   ```

2. **Don't panic - production data is safe**
   - Our migrations use `ADD COLUMN IF NOT EXISTS`
   - No data deletion or modification

3. **Rollback steps:**
   ```bash
   # Option 1: Revert to previous git commit
   git revert HEAD
   git push origin main

   # Option 2: Fix migration and redeploy
   # Fix the migration code
   git add -A && git commit -m "fix: correct migration" && git push
   ```

4. **Database rollback (if needed):**
   ```sql
   -- Only if you need to remove added columns
   ALTER TABLE table_name DROP COLUMN column_name;
   ```

---

## Future Improvements

### Short Term (Next Sprint)
- [ ] Set up Alembic for automated migrations
- [ ] Create schema verification script
- [ ] Add pre-deployment checks to CI/CD
- [ ] Document all environment variables

### Medium Term
- [ ] Set up staging environment
- [ ] Implement blue-green deployments
- [ ] Add database backup automation
- [ ] Set up error monitoring (Sentry)

### Long Term
- [ ] Implement zero-downtime migrations
- [ ] Add migration rollback automation
- [ ] Set up canary deployments
- [ ] Implement database migration testing

---

## Quick Reference

**Before Every Deployment:**
```bash
uv run pytest                                    # Run tests
python scripts/verify_schema.py --env production # Check schema
git status                                        # Verify commits
```

**Standard Deployment:**
```bash
git add -A
git commit -m "descriptive message"
git push origin main
# Wait for Render auto-deploy
curl -X POST https://partay-backend.onrender.com/api/admin/migrate-schema
```

**Emergency Rollback:**
```bash
git revert HEAD
git push origin main
```

---

## Notes

- Always test migrations locally first
- Never skip the schema verification step
- Keep migration scripts in version control
- Document breaking changes in commit messages
- Communicate deployments to team members
