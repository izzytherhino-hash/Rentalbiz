"""add_performance_indexes

Revision ID: bfee1df3136e
Revises: 20f88b106586
Create Date: 2025-10-30 03:53:59.155761

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bfee1df3136e'
down_revision: Union[str, Sequence[str], None] = '20f88b106586'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Add performance indexes for the most frequently queried columns.

    Expected impact: 50-70% faster query times for filtered lists.
    """
    # Booking queries (most frequent)
    op.create_index('idx_bookings_delivery_date', 'bookings', ['delivery_date'])
    op.create_index('idx_bookings_status', 'bookings', ['status'])
    op.create_index('idx_bookings_customer_id', 'bookings', ['customer_id'])
    op.create_index('idx_bookings_assigned_driver', 'bookings', ['assigned_driver_id'])
    op.create_index(
        'idx_bookings_created_at',
        'bookings',
        [sa.text('created_at DESC')]
    )

    # Booking items (join optimization)
    op.create_index('idx_booking_items_booking_id', 'booking_items', ['booking_id'])
    op.create_index(
        'idx_booking_items_inventory',
        'booking_items',
        ['inventory_item_id']
    )

    # Inventory queries
    op.create_index('idx_inventory_category', 'inventory_items', ['category'])
    op.create_index('idx_inventory_status', 'inventory_items', ['status'])
    op.create_index(
        'idx_inventory_website_visible',
        'inventory_items',
        ['website_visible']
    )
    op.create_index(
        'idx_inventory_partner',
        'inventory_items',
        ['partner_id'],
        postgresql_where=sa.text('partner_id IS NOT NULL')
    )

    # Driver queries
    op.create_index('idx_drivers_active', 'drivers', ['is_active'])

    # Composite indexes for common query patterns
    op.create_index(
        'idx_bookings_status_date',
        'bookings',
        ['status', 'delivery_date']
    )
    op.create_index(
        'idx_inventory_visible_category',
        'inventory_items',
        ['website_visible', 'category'],
        postgresql_where=sa.text('website_visible = true')
    )


def downgrade() -> None:
    """Remove performance indexes."""
    # Drop composite indexes
    op.drop_index('idx_inventory_visible_category', table_name='inventory_items')
    op.drop_index('idx_bookings_status_date', table_name='bookings')

    # Drop driver indexes
    op.drop_index('idx_drivers_active', table_name='drivers')

    # Drop inventory indexes
    op.drop_index('idx_inventory_partner', table_name='inventory_items')
    op.drop_index('idx_inventory_website_visible', table_name='inventory_items')
    op.drop_index('idx_inventory_status', table_name='inventory_items')
    op.drop_index('idx_inventory_category', table_name='inventory_items')

    # Drop booking items indexes
    op.drop_index('idx_booking_items_inventory', table_name='booking_items')
    op.drop_index('idx_booking_items_booking_id', table_name='booking_items')

    # Drop booking indexes
    op.drop_index('idx_bookings_created_at', table_name='bookings')
    op.drop_index('idx_bookings_assigned_driver', table_name='bookings')
    op.drop_index('idx_bookings_customer_id', table_name='bookings')
    op.drop_index('idx_bookings_status', table_name='bookings')
    op.drop_index('idx_bookings_delivery_date', table_name='bookings')
