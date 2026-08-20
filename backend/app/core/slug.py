import re
import unicodedata


def generate_unit_id(name: str) -> str:
    normalized = unicodedata.normalize("NFD", name.lower())
    without_marks = "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")
    slug = re.sub(r"[^a-z0-9]+", "-", without_marks).strip("-")
    return slug


# Código gerado uma única vez na criação e nunca mais alterado (nem se a
# origem mudar depois) — daí ser sequencial por prefixo em vez de tentar
# abreviar o nome, que exigiria checar colisão/legibilidade em tempo real.
def generate_unit_code(origin: str, existing_codes: list[str]) -> str:
    prefix = "ESC" if origin == "ESCOLA" else "SED"
    pattern = re.compile(rf"^{prefix}-(\d+)$")
    max_seq = 0
    for code in existing_codes:
        match = pattern.match(code)
        if match:
            max_seq = max(max_seq, int(match.group(1)))
    return f"{prefix}-{max_seq + 1:03d}"
