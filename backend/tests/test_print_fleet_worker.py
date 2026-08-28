import asyncio

from app.print_fleet.snmp import PysnmpTransport, SimulatedSnmpTransport
from app.print_fleet.worker import create_transport, run_worker


def test_worker_stops_after_event_without_busy_loop() -> None:
    cycles = 0

    async def cycle() -> bool:
        nonlocal cycles
        cycles += 1
        return False

    async def scenario() -> None:
        stop_event = asyncio.Event()
        task = asyncio.create_task(run_worker(stop_event, cycle, idle_seconds=0.01))
        await asyncio.sleep(0.025)
        stop_event.set()
        await asyncio.wait_for(task, timeout=0.2)

    asyncio.run(scenario())

    assert 1 <= cycles <= 4


def test_transport_is_simulated_only_when_explicitly_selected() -> None:
    assert isinstance(create_transport("simulated"), SimulatedSnmpTransport)
    production = create_transport("pysnmp")
    assert isinstance(production, PysnmpTransport)
    production._engine.close_dispatcher()
