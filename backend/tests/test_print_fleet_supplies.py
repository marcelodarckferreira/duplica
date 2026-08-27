import pytest

from app.print_fleet.supplies import calculate_supply_percent, classify_supply_alert
from app.print_fleet.types import SupplyAlert


@pytest.mark.parametrize(
    ("level", "capacity", "expected"),
    [
        (50, 100, 50),
        (1, 3, 33),
        (120, 100, 100),
        (-1, 100, None),
        (-2, 100, None),
        (-3, 100, None),
        (10, 0, None),
        (10, -1, None),
    ],
)
def test_calculates_only_safe_supply_percentages(level: int, capacity: int, expected: int | None) -> None:
    assert calculate_supply_percent(level, capacity) == expected


@pytest.mark.parametrize(
    ("percent", "expected"),
    [
        (None, SupplyAlert.UNKNOWN),
        (21, SupplyAlert.NORMAL),
        (20, SupplyAlert.WARNING),
        (11, SupplyAlert.WARNING),
        (10, SupplyAlert.CRITICAL),
        (0, SupplyAlert.CRITICAL),
    ],
)
def test_classifies_threshold_boundaries(percent: int | None, expected: SupplyAlert) -> None:
    assert classify_supply_alert(percent) is expected


@pytest.mark.parametrize(
    ("warning", "critical"),
    [(20, 20), (10, 20), (101, 10), (20, -1)],
)
def test_rejects_invalid_threshold_ordering(warning: int, critical: int) -> None:
    with pytest.raises(ValueError, match="limites"):
        classify_supply_alert(15, warning=warning, critical=critical)
