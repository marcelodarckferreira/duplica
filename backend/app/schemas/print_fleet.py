from datetime import datetime
from ipaddress import IPv4Address
from typing import Self

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.print_fleet.networking import normalize_network


class DiscoveryNetworkCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    cidr: str
    excluded_cidrs: list[str] = Field(default_factory=list)
    community: str = Field(min_length=1, max_length=255)
    timeout_ms: int = Field(default=1000, ge=250, le=10_000)
    retries: int = Field(default=0, ge=0, le=3)
    concurrency_limit: int = Field(default=64, ge=1, le=128)
    target_count: int = 0
    is_private: bool = False

    @field_validator("name", "community")
    @classmethod
    def _strip_required_text(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("O valor não pode ficar vazio.")
        return normalized

    @model_validator(mode="after")
    def _normalize_network(self) -> Self:
        normalized = normalize_network(self.cidr, self.excluded_cidrs)
        self.cidr = normalized.cidr
        self.excluded_cidrs = list(normalized.exclusions)
        self.target_count = normalized.target_count
        self.is_private = normalized.is_private
        return self


class DiscoveryNetworkUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    cidr: str | None = None
    excluded_cidrs: list[str] | None = None
    community: str | None = Field(default=None, min_length=1, max_length=255)
    timeout_ms: int | None = Field(default=None, ge=250, le=10_000)
    retries: int | None = Field(default=None, ge=0, le=3)
    concurrency_limit: int | None = Field(default=None, ge=1, le=128)

    @field_validator("name", "community")
    @classmethod
    def _strip_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        if not normalized:
            raise ValueError("O valor não pode ficar vazio.")
        return normalized


class DiscoveryNetworkActiveUpdate(BaseModel):
    active: bool


class DiscoveryNetworkOut(BaseModel):
    id: str
    name: str
    cidr: str
    excluded_cidrs: list[str]
    snmp_version: str
    timeout_ms: int
    retries: int
    concurrency_limit: int
    active: bool
    credential_configured: bool
    target_count: int
    is_private: bool
    created_at: datetime
    updated_at: datetime


class DiscoveryRunOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    network_id: str
    status: str
    total_targets: int
    scanned_targets: int
    responsive_devices: int
    printers_found: int
    new_printers: int
    error_count: int
    requested_by_user_id: str
    requested_at: datetime
    started_at: datetime | None
    finished_at: datetime | None
    heartbeat_at: datetime | None
    last_error_code: str | None
    last_error_message: str | None


class ManualPrinterCreate(BaseModel):
    discovery_network_id: str = Field(min_length=1, max_length=36)
    management_address: IPv4Address
    display_name: str = Field(min_length=1, max_length=180)
    unit_id: str = Field(min_length=1, max_length=64)
    manufacturer: str | None = Field(default=None, max_length=120)
    model: str | None = Field(default=None, max_length=180)
    serial_number: str | None = Field(default=None, max_length=120)
    mac_address: str | None = Field(default=None, max_length=17)

    @field_validator("display_name", "unit_id", "discovery_network_id")
    @classmethod
    def _strip_required(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("O valor não pode ficar vazio.")
        return normalized


class PrinterUpdate(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=180)
    manufacturer: str | None = Field(default=None, max_length=120)
    model: str | None = Field(default=None, max_length=180)
    unit_id: str | None = Field(default=None, min_length=1, max_length=64)


class PrinterConfirm(BaseModel):
    display_name: str = Field(min_length=1, max_length=180)
    unit_id: str = Field(min_length=1, max_length=64)
    manufacturer: str | None = Field(default=None, max_length=120)
    model: str | None = Field(default=None, max_length=180)


class MonitoringUpdate(BaseModel):
    enabled: bool


class SupplyThresholdUpdate(BaseModel):
    warning_threshold_percent: int = Field(default=20, ge=0, le=100)
    critical_threshold_percent: int = Field(default=10, ge=0, le=100)

    @model_validator(mode="after")
    def _validate_order(self) -> Self:
        if self.critical_threshold_percent >= self.warning_threshold_percent:
            raise ValueError("O limite crítico deve ser menor que o limite de atenção.")
        return self


class PrinterSupplyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    printer_id: str
    snmp_index: str
    description_raw: str
    normalized_type: str
    color: str
    capacity_raw: int
    level_raw: int
    capacity_unit_raw: int | None
    level_percent: float | None
    alert_status: str
    warning_threshold_percent: int
    critical_threshold_percent: int
    last_seen_at: datetime


class SupplyReadingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    printer_supply_id: str
    capacity_raw: int
    level_raw: int
    capacity_unit_raw: int | None
    level_percent: float | None
    alert_status: str
    recorded_at: datetime


class PrinterOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    discovery_network_id: str
    management_address: str
    mac_address: str | None
    serial_number: str | None
    sys_object_id: str | None
    sys_name: str | None
    sys_description: str | None
    manufacturer: str | None
    model: str | None
    display_name: str | None
    unit_id: str | None
    onboarding_status: str
    monitoring_enabled: bool
    operational_status: str
    normalized_errors: list[str]
    consecutive_poll_failures: int
    first_seen_at: datetime
    last_seen_at: datetime | None
    last_polled_at: datetime | None
    updated_at: datetime

    @field_validator("management_address", mode="before")
    @classmethod
    def _serialize_management_address(cls, value: object) -> str:
        return str(value)


class PaginatedPrintersOut(BaseModel):
    items: list[PrinterOut]
    total: int
    page: int
    page_size: int


class PaginatedDiscoveryRunsOut(BaseModel):
    items: list[DiscoveryRunOut]
    total: int
    page: int
    page_size: int
