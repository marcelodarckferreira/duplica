"""add print fleet discovery and monitoring

Revision ID: f2a8c4e1d9b7
Revises: 62ad30878cdf
Create Date: 2026-08-27 15:30:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "f2a8c4e1d9b7"
down_revision: Union[str, Sequence[str], None] = "62ad30878cdf"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("audit_log", sa.Column("resource_type", sa.String(length=64), nullable=True))
    op.add_column("audit_log", sa.Column("resource_id", sa.String(length=64), nullable=True))
    op.execute(
        "UPDATE audit_log SET resource_type = 'copy_request', resource_id = request_id "
        "WHERE resource_type IS NULL"
    )
    op.alter_column("audit_log", "resource_type", nullable=False)
    op.alter_column("audit_log", "resource_id", nullable=False)
    op.alter_column("audit_log", "request_id", existing_type=sa.String(length=64), nullable=True)
    op.alter_column("audit_log", "request_code", existing_type=sa.String(length=32), nullable=True)

    op.create_table(
        "discovery_networks",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("cidr", sa.String(length=43), nullable=False),
        sa.Column("excluded_cidrs", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("snmp_version", sa.String(length=8), nullable=False),
        sa.Column("community_ciphertext", sa.Text(), nullable=False),
        sa.Column("timeout_ms", sa.Integer(), nullable=False),
        sa.Column("retries", sa.Integer(), nullable=False),
        sa.Column("concurrency_limit", sa.Integer(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("created_by_user_id", sa.String(length=64), nullable=False),
        sa.Column("updated_by_user_id", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["updated_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("cidr"),
    )
    op.create_table(
        "discovery_runs",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("network_id", sa.String(length=36), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("total_targets", sa.Integer(), nullable=False),
        sa.Column("scanned_targets", sa.Integer(), nullable=False),
        sa.Column("responsive_devices", sa.Integer(), nullable=False),
        sa.Column("printers_found", sa.Integer(), nullable=False),
        sa.Column("new_printers", sa.Integer(), nullable=False),
        sa.Column("error_count", sa.Integer(), nullable=False),
        sa.Column("requested_by_user_id", sa.String(length=64), nullable=False),
        sa.Column("worker_id", sa.String(length=120), nullable=True),
        sa.Column("parameters_snapshot", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("last_error_code", sa.String(length=64), nullable=True),
        sa.Column("last_error_message", sa.String(length=500), nullable=True),
        sa.Column("requested_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("heartbeat_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["network_id"], ["discovery_networks.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["requested_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_discovery_runs_network_status", "discovery_runs", ["network_id", "status"])
    op.create_index(
        "uq_discovery_runs_active_network",
        "discovery_runs",
        ["network_id"],
        unique=True,
        postgresql_where=sa.text("status IN ('PENDING', 'RUNNING')"),
    )
    op.create_table(
        "discovery_run_batches",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("run_id", sa.String(length=36), nullable=False),
        sa.Column("first_address", postgresql.INET(), nullable=False),
        sa.Column("last_address", postgresql.INET(), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("target_count", sa.Integer(), nullable=False),
        sa.Column("scanned_count", sa.Integer(), nullable=False),
        sa.Column("responsive_count", sa.Integer(), nullable=False),
        sa.Column("printer_count", sa.Integer(), nullable=False),
        sa.Column("error_count", sa.Integer(), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["run_id"], ["discovery_runs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("run_id", "first_address", "last_address", name="uq_discovery_batch_range"),
    )
    op.create_index(
        "ix_discovery_batches_run_status",
        "discovery_run_batches",
        ["run_id", "status", "first_address"],
    )
    op.create_table(
        "discovery_events",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("run_id", sa.String(length=36), nullable=False),
        sa.Column("batch_id", sa.BigInteger(), nullable=True),
        sa.Column("address", postgresql.INET(), nullable=True),
        sa.Column("code", sa.String(length=64), nullable=False),
        sa.Column("detail", sa.String(length=500), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["batch_id"], ["discovery_run_batches.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["run_id"], ["discovery_runs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_discovery_events_run_created", "discovery_events", ["run_id", "created_at"])
    op.create_table(
        "printers",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("discovery_network_id", sa.String(length=36), nullable=False),
        sa.Column("management_address", postgresql.INET(), nullable=False),
        sa.Column("mac_address", sa.String(length=17), nullable=True),
        sa.Column("serial_number", sa.String(length=120), nullable=True),
        sa.Column("sys_object_id", sa.String(length=255), nullable=True),
        sa.Column("sys_name", sa.String(length=255), nullable=True),
        sa.Column("sys_description", sa.Text(), nullable=True),
        sa.Column("manufacturer", sa.String(length=120), nullable=True),
        sa.Column("model", sa.String(length=180), nullable=True),
        sa.Column("display_name", sa.String(length=180), nullable=True),
        sa.Column("unit_id", sa.String(length=64), nullable=True),
        sa.Column("onboarding_status", sa.String(length=16), nullable=False),
        sa.Column("monitoring_enabled", sa.Boolean(), nullable=False),
        sa.Column("operational_status", sa.String(length=32), nullable=False),
        sa.Column("detected_error_state_raw", sa.LargeBinary(), nullable=True),
        sa.Column("normalized_errors", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("consecutive_poll_failures", sa.Integer(), nullable=False),
        sa.Column("first_seen_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_polled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["discovery_network_id"], ["discovery_networks.id"]),
        sa.ForeignKeyConstraint(["unit_id"], ["units.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "discovery_network_id", "management_address", name="uq_printer_network_address"
        ),
    )
    op.create_index("ix_printers_mac", "printers", ["mac_address"])
    op.create_index("ix_printers_onboarding_unit", "printers", ["onboarding_status", "unit_id"])
    op.create_index("ix_printers_serial", "printers", ["serial_number"])
    op.create_table(
        "printer_supplies",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("printer_id", sa.String(length=36), nullable=False),
        sa.Column("snmp_index", sa.String(length=120), nullable=False),
        sa.Column("description_raw", sa.String(length=255), nullable=False),
        sa.Column("type_raw", sa.Integer(), nullable=True),
        sa.Column("normalized_type", sa.String(length=32), nullable=False),
        sa.Column("color", sa.String(length=16), nullable=False),
        sa.Column("capacity_raw", sa.Integer(), nullable=False),
        sa.Column("level_raw", sa.Integer(), nullable=False),
        sa.Column("capacity_unit_raw", sa.Integer(), nullable=True),
        sa.Column("level_percent", sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column("alert_status", sa.String(length=16), nullable=False),
        sa.Column("warning_threshold_percent", sa.Integer(), nullable=False),
        sa.Column("critical_threshold_percent", sa.Integer(), nullable=False),
        sa.Column("missing_poll_count", sa.Integer(), nullable=False),
        sa.Column("first_seen_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["printer_id"], ["printers.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("printer_id", "snmp_index", name="uq_printer_supply_index"),
    )
    op.create_index(
        "ix_printer_supplies_printer_alert", "printer_supplies", ["printer_id", "alert_status"]
    )
    op.create_table(
        "supply_readings",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("printer_supply_id", sa.String(length=36), nullable=False),
        sa.Column("capacity_raw", sa.Integer(), nullable=False),
        sa.Column("level_raw", sa.Integer(), nullable=False),
        sa.Column("capacity_unit_raw", sa.Integer(), nullable=True),
        sa.Column("level_percent", sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column("alert_status", sa.String(length=16), nullable=False),
        sa.Column("recorded_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["printer_supply_id"], ["printer_supplies.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_supply_readings_supply_recorded", "supply_readings", ["printer_supply_id", "recorded_at"]
    )

    op.execute(
        "INSERT INTO role_permissions (role, permission) VALUES "
        "('Admin', 'viewPrintFleet'), ('Admin', 'managePrintFleet') ON CONFLICT DO NOTHING"
    )


def downgrade() -> None:
    op.execute("DELETE FROM role_permissions WHERE permission IN ('viewPrintFleet', 'managePrintFleet')")
    op.drop_index("ix_supply_readings_supply_recorded", table_name="supply_readings")
    op.drop_table("supply_readings")
    op.drop_index("ix_printer_supplies_printer_alert", table_name="printer_supplies")
    op.drop_table("printer_supplies")
    op.drop_index("ix_printers_serial", table_name="printers")
    op.drop_index("ix_printers_onboarding_unit", table_name="printers")
    op.drop_index("ix_printers_mac", table_name="printers")
    op.drop_table("printers")
    op.drop_index("ix_discovery_events_run_created", table_name="discovery_events")
    op.drop_table("discovery_events")
    op.drop_index("ix_discovery_batches_run_status", table_name="discovery_run_batches")
    op.drop_table("discovery_run_batches")
    op.drop_index("uq_discovery_runs_active_network", table_name="discovery_runs")
    op.drop_index("ix_discovery_runs_network_status", table_name="discovery_runs")
    op.drop_table("discovery_runs")
    op.drop_table("discovery_networks")

    op.execute("DELETE FROM audit_log WHERE resource_type <> 'copy_request'")
    op.alter_column("audit_log", "request_code", existing_type=sa.String(length=32), nullable=False)
    op.alter_column("audit_log", "request_id", existing_type=sa.String(length=64), nullable=False)
    op.drop_column("audit_log", "resource_id")
    op.drop_column("audit_log", "resource_type")
