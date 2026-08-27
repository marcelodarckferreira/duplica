import asyncio

from app.print_fleet.worker import run_worker


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
