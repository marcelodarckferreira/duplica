import asyncio
import signal
import socket
from collections.abc import Awaitable, Callable

from app.core.config import settings
from app.print_fleet.monitoring import PrintFleetWorkerCycle
from app.print_fleet.snmp import create_transport

WorkerCycle = Callable[[], Awaitable[bool]]


async def run_worker(
    stop_event: asyncio.Event,
    cycle: WorkerCycle,
    *,
    idle_seconds: float | None = None,
) -> None:
    wait_seconds = settings.PRINT_FLEET_WORKER_IDLE_SECONDS if idle_seconds is None else idle_seconds
    while not stop_event.is_set():
        did_work = await cycle()
        if did_work:
            continue
        try:
            await asyncio.wait_for(stop_event.wait(), timeout=wait_seconds)
        except TimeoutError:
            pass


async def main() -> None:
    stop_event = asyncio.Event()
    loop = asyncio.get_running_loop()
    for signal_name in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(signal_name, stop_event.set)
    transport = create_transport(settings.PRINT_FLEET_SNMP_TRANSPORT)
    worker_id = f"{socket.gethostname()}:{id(transport)}"
    try:
        await run_worker(stop_event, PrintFleetWorkerCycle(transport, worker_id))
    finally:
        await transport.aclose()


if __name__ == "__main__":
    asyncio.run(main())
