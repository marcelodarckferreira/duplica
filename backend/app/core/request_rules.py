import re
from datetime import datetime, timezone


def today_iso() -> str:
    return datetime.now(timezone.utc).date().isoformat()


def calculate_print_totals(pages: int, copies: int, duplex: bool) -> tuple[int, int]:
    pages = max(0, int(pages))
    copies = max(0, int(copies))
    printed_faces = pages * copies
    sheets_per_copy = -(-pages // 2) if duplex else pages  # ceil(pages / 2) quando duplex
    return printed_faces, sheets_per_copy * copies


def generate_request_code(existing_codes: list[str], year: int = 2026) -> str:
    pattern = re.compile(rf"^CP-{year}-(\d{{4}})$")
    max_seq = 0
    for code in existing_codes:
        match = pattern.match(code)
        if match:
            max_seq = max(max_seq, int(match.group(1)))
    return f"CP-{year}-{max_seq + 1:04d}"
