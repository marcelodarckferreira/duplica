import os
from pathlib import Path

_PROJECT_ROOT = Path(__file__).resolve().parents[3]
_VERSION_FILE = _PROJECT_ROOT / "VERSION"

GIT_SHA = os.environ.get("GIT_SHA", "unknown")
APPLICATION_VERSION = _VERSION_FILE.read_text().strip() if _VERSION_FILE.exists() else "0.0.0"
