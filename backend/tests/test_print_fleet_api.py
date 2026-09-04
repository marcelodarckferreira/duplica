import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException

import app.core.deps as deps_module
from app.api.routes import print_fleet
from app.core.deps import require_any_permission


def test_router_registers_management_contract() -> None:
    routes = {(route.path, frozenset(route.methods or set()), route.status_code) for route in print_fleet.router.routes}

    assert ("/api/v1/print-fleet/networks", frozenset({"GET"}), 200) in routes
    assert ("/api/v1/print-fleet/networks", frozenset({"POST"}), 201) in routes
    assert ("/api/v1/print-fleet/networks/{network_id}/discoveries", frozenset({"POST"}), 202) in routes
    assert ("/api/v1/print-fleet/discoveries", frozenset({"GET"}), 200) in routes
    assert ("/api/v1/print-fleet/printers", frozenset({"GET"}), 200) in routes
    assert ("/api/v1/print-fleet/printers", frozenset({"POST"}), 201) in routes
    assert ("/api/v1/print-fleet/printers/{printer_id}/confirm", frozenset({"POST"}), 200) in routes
    assert ("/api/v1/print-fleet/printers/{printer_id}/supplies", frozenset({"GET"}), 200) in routes


def test_read_permission_accepts_view_or_manage_and_rejects_unrelated(monkeypatch) -> None:
    user = SimpleNamespace(role="Operador")
    db = object()
    allowed = require_any_permission("viewPrintFleet", "managePrintFleet")

    permission_check = AsyncMock(side_effect=lambda _db, _role, permission: permission == "managePrintFleet")
    monkeypatch.setattr(deps_module, "can_perform", permission_check)
    assert asyncio.run(allowed(user=user, db=db)) is user

    permission_check.side_effect = lambda _db, _role, _permission: False
    with pytest.raises(HTTPException) as denied:
        asyncio.run(allowed(user=user, db=db))

    assert denied.value.status_code == 403
