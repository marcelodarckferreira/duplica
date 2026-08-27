from app.print_fleet.types import SupplyAlert


def calculate_supply_percent(level_raw: int, capacity_raw: int) -> int | None:
    if level_raw < 0 or capacity_raw <= 0:
        return None
    percentage = round((level_raw / capacity_raw) * 100)
    return max(0, min(100, percentage))


def classify_supply_alert(
    percent: int | None,
    warning: int = 20,
    critical: int = 10,
) -> SupplyAlert:
    if not 0 <= critical < warning <= 100:
        raise ValueError("Os limites de insumo são inválidos.")
    if percent is None:
        return SupplyAlert.UNKNOWN
    if percent <= critical:
        return SupplyAlert.CRITICAL
    if percent <= warning:
        return SupplyAlert.WARNING
    return SupplyAlert.NORMAL
