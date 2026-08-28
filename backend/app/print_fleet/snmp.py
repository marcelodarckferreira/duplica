from collections.abc import Sequence
from typing import Any, Protocol

from pysnmp.hlapi.v3arch.asyncio import (
    CommunityData,
    ContextData,
    ObjectIdentity,
    ObjectType,
    SnmpEngine,
    UdpTransportTarget,
    get_cmd,
    walk_cmd,
)

SYS_DESCRIPTION = "1.3.6.1.2.1.1.1.0"
SYS_OBJECT_ID = "1.3.6.1.2.1.1.2.0"
SYS_NAME = "1.3.6.1.2.1.1.5.0"
HR_DEVICE_TYPE = "1.3.6.1.2.1.25.3.2.1.2"
HR_DEVICE_PRINTER = "1.3.6.1.2.1.25.3.1.5"
HR_PRINTER_STATUS = "1.3.6.1.2.1.25.3.5.1.1"
HR_PRINTER_ERROR_STATE = "1.3.6.1.2.1.25.3.5.1.2"
PRT_GENERAL_PRINTER_NAME = "1.3.6.1.2.1.43.5.1.1.16"
PRT_GENERAL_SERIAL_NUMBER = "1.3.6.1.2.1.43.5.1.1.17"
PRT_SUPPLIES_DESCRIPTION = "1.3.6.1.2.1.43.11.1.1.6"
PRT_SUPPLIES_TYPE = "1.3.6.1.2.1.43.11.1.1.5"
PRT_SUPPLIES_UNIT = "1.3.6.1.2.1.43.11.1.1.7"
PRT_SUPPLIES_MAX_CAPACITY = "1.3.6.1.2.1.43.11.1.1.8"
PRT_SUPPLIES_LEVEL = "1.3.6.1.2.1.43.11.1.1.9"


class SnmpRequestError(RuntimeError):
    def __init__(self, code: str, detail: str) -> None:
        super().__init__(detail)
        self.code = code


class SnmpTransport(Protocol):
    async def get(
        self,
        address: str,
        community: str,
        oids: Sequence[str],
        timeout_ms: int,
        retries: int,
    ) -> dict[str, Any]: ...

    async def walk(
        self,
        address: str,
        community: str,
        base_oid: str,
        timeout_ms: int,
        retries: int,
    ) -> list[tuple[str, Any]]: ...

    async def aclose(self) -> None: ...


def _python_value(value: Any) -> Any:
    if hasattr(value, "asOctets"):
        raw = value.asOctets()
        try:
            return raw.decode("utf-8").strip("\x00")
        except UnicodeDecodeError:
            return bytes(raw)
    if hasattr(value, "prettyPrint"):
        rendered = value.prettyPrint()
        try:
            return int(rendered)
        except (TypeError, ValueError):
            return rendered
    return value


class PysnmpTransport:
    def __init__(self) -> None:
        self._engine = SnmpEngine()

    async def _target(self, address: str, timeout_ms: int, retries: int) -> UdpTransportTarget:
        return await UdpTransportTarget.create(
            (address, 161), timeout=timeout_ms / 1000, retries=retries
        )

    async def get(
        self,
        address: str,
        community: str,
        oids: Sequence[str],
        timeout_ms: int,
        retries: int,
    ) -> dict[str, Any]:
        error_indication, error_status, error_index, var_binds = await get_cmd(
            self._engine,
            CommunityData(community, mpModel=1),
            await self._target(address, timeout_ms, retries),
            ContextData(),
            *(ObjectType(ObjectIdentity(oid)) for oid in oids),
        )
        if error_indication:
            raise SnmpRequestError("TIMEOUT", "Equipamento não respondeu à consulta SNMP.")
        if error_status:
            raise SnmpRequestError(
                "PROTOCOL_ERROR",
                f"Equipamento recusou a consulta SNMP no índice {int(error_index or 0)}.",
            )
        return {
            str(var_bind[0]): _python_value(var_bind[1])
            for var_bind in var_binds
        }

    async def walk(
        self,
        address: str,
        community: str,
        base_oid: str,
        timeout_ms: int,
        retries: int,
    ) -> list[tuple[str, Any]]:
        rows: list[tuple[str, Any]] = []
        iterator = walk_cmd(
            self._engine,
            CommunityData(community, mpModel=1),
            await self._target(address, timeout_ms, retries),
            ContextData(),
            ObjectType(ObjectIdentity(base_oid)),
            lexicographicMode=False,
        )
        async for error_indication, error_status, error_index, var_binds in iterator:
            if error_indication:
                raise SnmpRequestError("TIMEOUT", "Equipamento não respondeu à consulta SNMP.")
            if error_status:
                raise SnmpRequestError(
                    "PROTOCOL_ERROR",
                    f"Equipamento recusou a consulta SNMP no índice {int(error_index or 0)}.",
                )
            rows.extend((str(item[0]), _python_value(item[1])) for item in var_binds)
        return rows

    async def aclose(self) -> None:
        self._engine.close_dispatcher()


class SimulatedSnmpTransport:
    """Deterministic adapter for isolated E2E only; never selected by default."""

    @staticmethod
    def _responds(address: str) -> bool:
        return address.rsplit(".", 1)[-1] == "2"

    async def get(
        self,
        address: str,
        community: str,
        oids: Sequence[str],
        timeout_ms: int,
        retries: int,
    ) -> dict[str, Any]:
        if not self._responds(address):
            raise SnmpRequestError("TIMEOUT", "Equipamento simulado não respondeu.")
        values = {
            SYS_DESCRIPTION: "HP LaserJet Pro M404dn",
            SYS_OBJECT_ID: "1.3.6.1.4.1.11.2.3.9.1",
            SYS_NAME: "HP-SEDE-E2E",
        }
        return {oid: values.get(oid, "") for oid in oids}

    async def walk(
        self,
        address: str,
        community: str,
        base_oid: str,
        timeout_ms: int,
        retries: int,
    ) -> list[tuple[str, Any]]:
        if not self._responds(address):
            raise SnmpRequestError("TIMEOUT", "Equipamento simulado não respondeu.")
        suffix = ".1.1"
        values: dict[str, Any] = {
            HR_DEVICE_TYPE: HR_DEVICE_PRINTER,
            PRT_GENERAL_PRINTER_NAME: "HP Sede E2E",
            PRT_GENERAL_SERIAL_NUMBER: "E2E-HP-0001",
            HR_PRINTER_STATUS: 3,
            HR_PRINTER_ERROR_STATE: b"\x00\x00",
            PRT_SUPPLIES_DESCRIPTION: "Black Toner Cartridge",
            PRT_SUPPLIES_TYPE: 3,
            PRT_SUPPLIES_UNIT: 19,
            PRT_SUPPLIES_MAX_CAPACITY: 100,
            PRT_SUPPLIES_LEVEL: 18,
        }
        value = values.get(base_oid)
        return [] if value is None else [(f"{base_oid}{suffix}", value)]

    async def aclose(self) -> None:
        return None


def is_printer_device(rows: Sequence[tuple[str, Any]]) -> bool:
    return any(str(value).lstrip(".") == HR_DEVICE_PRINTER for _, value in rows)


_ERROR_BITS = (
    "LOW_PAPER",
    "NO_PAPER",
    "LOW_TONER",
    "NO_TONER",
    "DOOR_OPEN",
    "JAMMED",
    "OFFLINE",
    "SERVICE_REQUESTED",
    "INPUT_TRAY_MISSING",
    "OUTPUT_TRAY_MISSING",
    "MARKER_SUPPLY_MISSING",
    "OUTPUT_NEAR_FULL",
    "OUTPUT_FULL",
    "INPUT_TRAY_EMPTY",
    "OVERDUE_PREVENTIVE_MAINTENANCE",
)


def parse_detected_error_state(raw: bytes) -> list[str]:
    detected: list[str] = []
    for bit_index, label in enumerate(_ERROR_BITS):
        byte_index, offset = divmod(bit_index, 8)
        if byte_index < len(raw) and raw[byte_index] & (1 << (7 - offset)):
            detected.append(label)
    return detected
