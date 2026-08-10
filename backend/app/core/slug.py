import re
import unicodedata


def generate_unit_id(name: str) -> str:
    normalized = unicodedata.normalize("NFD", name.lower())
    without_marks = "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")
    slug = re.sub(r"[^a-z0-9]+", "-", without_marks).strip("-")
    return slug
