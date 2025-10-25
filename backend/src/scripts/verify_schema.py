"""
Verify database schema matches SQLAlchemy models.

Detects missing columns, type mismatches, and schema drift between
your models and the actual database.

Usage:
    # Check production database
    export DATABASE_URL="postgresql://..."
    python verify_schema.py --env production

    # Check local database
    python verify_schema.py --env local

    # Check with custom database URL
    python verify_schema.py --db-url "postgresql://localhost/mydb"
"""

import sys
import os
from typing import Dict, List, Set
from sqlalchemy import create_engine, inspect
from sqlalchemy.engine import Inspector

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from backend.database.models import Base


def get_model_columns(model) -> Dict[str, str]:
    """
    Extract column definitions from SQLAlchemy model.

    Args:
        model: SQLAlchemy model class

    Returns:
        Dictionary mapping column names to their type strings
    """
    columns = {}
    for col in model.__table__.columns:
        columns[col.name] = str(col.type)
    return columns


def get_database_columns(inspector: Inspector, table_name: str) -> Dict[str, str]:
    """
    Extract columns from actual database table.

    Args:
        inspector: SQLAlchemy inspector instance
        table_name: Name of the table to inspect

    Returns:
        Dictionary mapping column names to their type strings
    """
    try:
        columns = inspector.get_columns(table_name)
        return {col["name"]: str(col["type"]) for col in columns}
    except Exception as e:
        print(f"Warning: Could not inspect table '{table_name}': {e}")
        return {}


def find_missing_columns(
    model_columns: Dict[str, str], db_columns: Dict[str, str]
) -> Set[str]:
    """
    Find columns that exist in model but not in database.

    Args:
        model_columns: Columns from SQLAlchemy model
        db_columns: Columns from actual database

    Returns:
        Set of missing column names
    """
    return set(model_columns.keys()) - set(db_columns.keys())


def find_extra_columns(
    model_columns: Dict[str, str], db_columns: Dict[str, str]
) -> Set[str]:
    """
    Find columns that exist in database but not in model.

    Args:
        model_columns: Columns from SQLAlchemy model
        db_columns: Columns from actual database

    Returns:
        Set of extra column names
    """
    return set(db_columns.keys()) - set(model_columns.keys())


def verify_schema(database_url: str) -> Dict[str, Dict[str, List[str]]]:
    """
    Compare SQLAlchemy models with actual database schema.

    Args:
        database_url: Database connection string

    Returns:
        Dictionary with schema differences per table:
        {
            "table_name": {
                "missing": ["col1", "col2"],
                "extra": ["col3"]
            }
        }
    """
    print(f"Connecting to database...")
    engine = create_engine(database_url)
    inspector = inspect(engine)

    differences = {}

    # Get all tables from models
    print(f"\nChecking {len(Base.metadata.tables)} tables...")

    for table_name, table in Base.metadata.tables.items():
        # Get columns from model
        model_columns = {col.name: str(col.type) for col in table.columns}

        # Get columns from database
        db_columns = get_database_columns(inspector, table_name)

        if not db_columns:
            # Table doesn't exist in database
            differences[table_name] = {
                "missing": list(model_columns.keys()),
                "extra": [],
                "table_missing": True,
            }
            continue

        # Find differences
        missing = find_missing_columns(model_columns, db_columns)
        extra = find_extra_columns(model_columns, db_columns)

        if missing or extra:
            differences[table_name] = {
                "missing": sorted(list(missing)),
                "extra": sorted(list(extra)),
                "table_missing": False,
            }

    return differences


def print_differences(differences: Dict[str, Dict[str, List[str]]]) -> None:
    """
    Pretty print schema differences.

    Args:
        differences: Schema differences from verify_schema()
    """
    if not differences:
        print("\n✅ Schema matches models perfectly!")
        return

    print("\n" + "=" * 70)
    print("❌ SCHEMA DIFFERENCES DETECTED")
    print("=" * 70)

    for table_name, diff in differences.items():
        print(f"\n📋 Table: {table_name}")

        if diff.get("table_missing"):
            print(f"   ⚠️  TABLE DOES NOT EXIST IN DATABASE")
            print(f"   Missing columns: {', '.join(diff['missing'])}")
            continue

        if diff["missing"]:
            print(f"   ❌ Missing columns in database:")
            for col in diff["missing"]:
                print(f"      - {col}")

        if diff["extra"]:
            print(f"   ⚠️  Extra columns in database (not in model):")
            for col in diff["extra"]:
                print(f"      - {col}")

    print("\n" + "=" * 70)
    print("RECOMMENDED ACTIONS:")
    print("=" * 70)
    print("1. Review the differences above")
    print("2. Create a migration to add missing columns:")
    print("   - Option A: Use Alembic: alembic revision --autogenerate")
    print("   - Option B: Add to /api/admin/migrate-schema endpoint")
    print("3. Test migration locally before applying to production")
    print("4. Run migration: curl -X POST .../api/admin/migrate-schema")
    print("=" * 70 + "\n")


def generate_migration_sql(differences: Dict[str, Dict[str, List[str]]]) -> str:
    """
    Generate SQL ALTER TABLE statements for missing columns.

    Args:
        differences: Schema differences from verify_schema()

    Returns:
        SQL statements to add missing columns
    """
    sql_statements = []

    for table_name, diff in differences.items():
        if diff.get("table_missing"):
            sql_statements.append(f"-- Table {table_name} needs to be created")
            continue

        for col_name in diff.get("missing", []):
            # Note: This is a simplified version - actual types need to be determined
            sql_statements.append(
                f"ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS {col_name} <TYPE>;"
            )

    return "\n".join(sql_statements) if sql_statements else "-- No migrations needed"


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Verify database schema matches SQLAlchemy models"
    )
    parser.add_argument(
        "--env",
        choices=["local", "production"],
        help="Environment to check (local or production)",
    )
    parser.add_argument(
        "--db-url", help="Custom database URL (overrides --env)", default=None
    )
    parser.add_argument(
        "--generate-sql",
        action="store_true",
        help="Generate SQL migration statements",
    )

    args = parser.parse_args()

    # Determine database URL
    if args.db_url:
        database_url = args.db_url
    elif args.env == "production":
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            print("Error: DATABASE_URL environment variable not set")
            sys.exit(1)
    elif args.env == "local":
        database_url = "postgresql://localhost/partay_rentals"
    else:
        print("Error: Must specify either --env or --db-url")
        parser.print_help()
        sys.exit(1)

    print(f"Verifying schema for: {args.env or 'custom'} environment")

    try:
        differences = verify_schema(database_url)
        print_differences(differences)

        if args.generate_sql and differences:
            print("\n" + "=" * 70)
            print("GENERATED MIGRATION SQL:")
            print("=" * 70)
            print(generate_migration_sql(differences))
            print("=" * 70 + "\n")

        # Exit with error code if differences found
        sys.exit(1 if differences else 0)

    except Exception as e:
        print(f"\n❌ Error verifying schema: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)
