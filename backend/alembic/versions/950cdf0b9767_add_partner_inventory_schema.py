"""add_partner_inventory_schema

Revision ID: 950cdf0b9767
Revises: bfee1df3136e
Create Date: 2025-10-30 16:21:54.539601

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '950cdf0b9767'
down_revision: Union[str, Sequence[str], None] = '20f88b106586'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Add partner inventory management schema.

    - Creates partners table (if not exists)
    - Creates warehouse_locations table
    - Creates inventory_sync_logs table
    - Adds partner-related columns to inventory_items
    """
    # Use raw SQL to safely create partners table
    connection = op.get_bind()

    # Create partners table only if it doesn't exist
    connection.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS partners (
            partner_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL,
            contact_person VARCHAR(255),
            email VARCHAR(255),
            phone VARCHAR(50),
            status VARCHAR(50) DEFAULT 'prospecting',
            website_url VARCHAR(500),
            commission_rate NUMERIC(5,2),
            markup_percentage NUMERIC(5,2),
            integration_type VARCHAR(50) DEFAULT 'manual',
            last_sync_at TIMESTAMP,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """))

    # Create warehouse_locations table only if it doesn't exist
    connection.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS warehouse_locations (
            location_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            partner_id UUID REFERENCES partners(partner_id) ON DELETE CASCADE,
            location_name VARCHAR(255) NOT NULL,
            address VARCHAR(500) NOT NULL,
            address_lat NUMERIC(10,7) NOT NULL,
            address_lng NUMERIC(10,7) NOT NULL,
            service_area_radius_miles NUMERIC(6,2),
            service_area_cities JSONB,
            contact_person VARCHAR(255),
            contact_phone VARCHAR(50),
            contact_email VARCHAR(255),
            is_active BOOLEAN DEFAULT TRUE,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """))

    # Create inventory_sync_logs table only if it doesn't exist
    connection.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS inventory_sync_logs (
            sync_log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            partner_id UUID REFERENCES partners(partner_id) ON DELETE CASCADE,
            warehouse_location_id UUID REFERENCES warehouse_locations(location_id) ON DELETE SET NULL,
            sync_type VARCHAR(50),
            items_added INTEGER DEFAULT 0,
            items_updated INTEGER DEFAULT 0,
            items_removed INTEGER DEFAULT 0,
            status VARCHAR(50) DEFAULT 'pending',
            error_message TEXT,
            sync_started_at TIMESTAMP,
            sync_completed_at TIMESTAMP
        )
    """))

    # Add columns to inventory_items table (with IF NOT EXISTS checks)
    connection.execute(sa.text("""
        DO $$
        BEGIN
            -- Add ownership_type column
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                          WHERE table_name='inventory_items' AND column_name='ownership_type') THEN
                ALTER TABLE inventory_items ADD COLUMN ownership_type VARCHAR(50) DEFAULT 'own_inventory';
            END IF;

            -- Add partner_id column
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                          WHERE table_name='inventory_items' AND column_name='partner_id') THEN
                ALTER TABLE inventory_items ADD COLUMN partner_id UUID;
            END IF;

            -- Add warehouse_location_id column
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                          WHERE table_name='inventory_items' AND column_name='warehouse_location_id') THEN
                ALTER TABLE inventory_items ADD COLUMN warehouse_location_id UUID;
            END IF;

            -- Add partner_cost column
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                          WHERE table_name='inventory_items' AND column_name='partner_cost') THEN
                ALTER TABLE inventory_items ADD COLUMN partner_cost NUMERIC(10,2);
            END IF;

            -- Add customer_price column
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                          WHERE table_name='inventory_items' AND column_name='customer_price') THEN
                ALTER TABLE inventory_items ADD COLUMN customer_price NUMERIC(10,2);
            END IF;

            -- Add partner_product_url column
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                          WHERE table_name='inventory_items' AND column_name='partner_product_url') THEN
                ALTER TABLE inventory_items ADD COLUMN partner_product_url VARCHAR(500);
            END IF;

            -- Add is_duplicate column
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                          WHERE table_name='inventory_items' AND column_name='is_duplicate') THEN
                ALTER TABLE inventory_items ADD COLUMN is_duplicate BOOLEAN DEFAULT FALSE;
            END IF;

            -- Add duplicate_group_id column
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                          WHERE table_name='inventory_items' AND column_name='duplicate_group_id') THEN
                ALTER TABLE inventory_items ADD COLUMN duplicate_group_id UUID;
            END IF;

            -- Add last_synced_at column
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                          WHERE table_name='inventory_items' AND column_name='last_synced_at') THEN
                ALTER TABLE inventory_items ADD COLUMN last_synced_at TIMESTAMP;
            END IF;
        END $$;
    """))

    # Add foreign key constraints to inventory_items (if they don't exist)
    connection.execute(sa.text("""
        DO $$
        BEGIN
            -- Add foreign key to partners
            IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                          WHERE constraint_name='fk_inventory_partner') THEN
                ALTER TABLE inventory_items
                ADD CONSTRAINT fk_inventory_partner
                FOREIGN KEY (partner_id) REFERENCES partners(partner_id) ON DELETE SET NULL;
            END IF;

            -- Add foreign key to warehouse_locations
            IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                          WHERE constraint_name='fk_inventory_warehouse_location') THEN
                ALTER TABLE inventory_items
                ADD CONSTRAINT fk_inventory_warehouse_location
                FOREIGN KEY (warehouse_location_id) REFERENCES warehouse_locations(location_id) ON DELETE SET NULL;
            END IF;
        END $$;
    """))


def downgrade() -> None:
    """Remove partner inventory management schema."""
    # Drop foreign keys from inventory_items
    op.drop_constraint('fk_inventory_warehouse_location', 'inventory_items', type_='foreignkey')
    op.drop_constraint('fk_inventory_partner', 'inventory_items', type_='foreignkey')

    # Drop columns from inventory_items
    op.drop_column('inventory_items', 'last_synced_at')
    op.drop_column('inventory_items', 'duplicate_group_id')
    op.drop_column('inventory_items', 'is_duplicate')
    op.drop_column('inventory_items', 'partner_product_url')
    op.drop_column('inventory_items', 'customer_price')
    op.drop_column('inventory_items', 'partner_cost')
    op.drop_column('inventory_items', 'warehouse_location_id')
    op.drop_column('inventory_items', 'partner_id')
    op.drop_column('inventory_items', 'ownership_type')

    # Drop tables (in reverse order due to foreign keys)
    op.drop_table('inventory_sync_logs')
    op.drop_table('warehouse_locations')
    op.drop_table('partners')
