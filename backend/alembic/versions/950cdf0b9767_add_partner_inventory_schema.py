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

    - Creates partners table
    - Creates warehouse_locations table
    - Creates inventory_sync_logs table
    - Adds partner-related columns to inventory_items
    """
    # Create partners table
    op.create_table(
        'partners',
        sa.Column('partner_id', sa.UUID(), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('contact_person', sa.String(255), nullable=True),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('phone', sa.String(50), nullable=True),
        sa.Column('status', sa.String(50), nullable=True, server_default='prospecting'),
        sa.Column('website_url', sa.String(500), nullable=True),
        sa.Column('commission_rate', sa.Numeric(5, 2), nullable=True),
        sa.Column('markup_percentage', sa.Numeric(5, 2), nullable=True),
        sa.Column('integration_type', sa.String(50), nullable=True, server_default='manual'),
        sa.Column('last_sync_at', sa.TIMESTAMP(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.TIMESTAMP(), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('partner_id')
    )

    # Create warehouse_locations table
    op.create_table(
        'warehouse_locations',
        sa.Column('location_id', sa.UUID(), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('partner_id', sa.UUID(), nullable=True),
        sa.Column('location_name', sa.String(255), nullable=False),
        sa.Column('address', sa.String(500), nullable=False),
        sa.Column('address_lat', sa.Numeric(10, 7), nullable=False),
        sa.Column('address_lng', sa.Numeric(10, 7), nullable=False),
        sa.Column('service_area_radius_miles', sa.Numeric(6, 2), nullable=True),
        sa.Column('service_area_cities', sa.JSON(), nullable=True),
        sa.Column('contact_person', sa.String(255), nullable=True),
        sa.Column('contact_phone', sa.String(50), nullable=True),
        sa.Column('contact_email', sa.String(255), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.TIMESTAMP(), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('location_id'),
        sa.ForeignKeyConstraint(['partner_id'], ['partners.partner_id'], ondelete='CASCADE')
    )

    # Create inventory_sync_logs table
    op.create_table(
        'inventory_sync_logs',
        sa.Column('sync_log_id', sa.UUID(), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('partner_id', sa.UUID(), nullable=True),
        sa.Column('warehouse_location_id', sa.UUID(), nullable=True),
        sa.Column('sync_type', sa.String(50), nullable=True),
        sa.Column('items_added', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('items_updated', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('items_removed', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('status', sa.String(50), nullable=True, server_default='pending'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('sync_started_at', sa.TIMESTAMP(), nullable=True),
        sa.Column('sync_completed_at', sa.TIMESTAMP(), nullable=True),
        sa.PrimaryKeyConstraint('sync_log_id'),
        sa.ForeignKeyConstraint(['partner_id'], ['partners.partner_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['warehouse_location_id'], ['warehouse_locations.location_id'], ondelete='SET NULL')
    )

    # Add columns to inventory_items table
    op.add_column('inventory_items', sa.Column('ownership_type', sa.String(50), nullable=True, server_default='own_inventory'))
    op.add_column('inventory_items', sa.Column('partner_id', sa.UUID(), nullable=True))
    op.add_column('inventory_items', sa.Column('warehouse_location_id', sa.UUID(), nullable=True))
    op.add_column('inventory_items', sa.Column('partner_cost', sa.Numeric(10, 2), nullable=True))
    op.add_column('inventory_items', sa.Column('customer_price', sa.Numeric(10, 2), nullable=True))
    op.add_column('inventory_items', sa.Column('partner_product_url', sa.String(500), nullable=True))
    op.add_column('inventory_items', sa.Column('is_duplicate', sa.Boolean(), nullable=True, server_default='false'))
    op.add_column('inventory_items', sa.Column('duplicate_group_id', sa.UUID(), nullable=True))
    op.add_column('inventory_items', sa.Column('last_synced_at', sa.TIMESTAMP(), nullable=True))

    # Add foreign key constraints to inventory_items
    op.create_foreign_key(
        'fk_inventory_partner',
        'inventory_items', 'partners',
        ['partner_id'], ['partner_id'],
        ondelete='SET NULL'
    )
    op.create_foreign_key(
        'fk_inventory_warehouse_location',
        'inventory_items', 'warehouse_locations',
        ['warehouse_location_id'], ['location_id'],
        ondelete='SET NULL'
    )


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
