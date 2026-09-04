from enum import StrEnum


class DiscoveryRunStatus(StrEnum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    COMPLETED_WITH_ERRORS = "COMPLETED_WITH_ERRORS"
    FAILED = "FAILED"


class BatchStatus(StrEnum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class OnboardingStatus(StrEnum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    IGNORED = "IGNORED"


class OperationalStatus(StrEnum):
    UNKNOWN = "UNKNOWN"
    IDLE = "IDLE"
    PRINTING = "PRINTING"
    WARMUP = "WARMUP"
    ERROR = "ERROR"
    NO_COMMUNICATION = "NO_COMMUNICATION"


class SupplyType(StrEnum):
    TONER = "TONER"
    INK = "INK"
    DRUM = "DRUM"
    WASTE = "WASTE"
    MAINTENANCE_KIT = "MAINTENANCE_KIT"
    OTHER = "OTHER"
    UNKNOWN = "UNKNOWN"


class SupplyColor(StrEnum):
    BLACK = "BLACK"
    CYAN = "CYAN"
    MAGENTA = "MAGENTA"
    YELLOW = "YELLOW"
    OTHER = "OTHER"
    UNKNOWN = "UNKNOWN"


class SupplyAlert(StrEnum):
    NORMAL = "NORMAL"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"
    UNKNOWN = "UNKNOWN"

