from dataclasses import dataclass


@dataclass(frozen=True)
class VendorIdentity:
    manufacturer: str
    model: str


def normalize_vendor(description: str | None, sys_object_id: str | None) -> VendorIdentity:
    value = (description or "").strip()
    lowered = value.casefold()
    if lowered.startswith("hp ") or "hewlett-packard" in lowered or (sys_object_id or "").startswith("1.3.6.1.4.1.11"):
        model = value[3:].strip() if lowered.startswith("hp ") else value
        return VendorIdentity(manufacturer="HP", model=model or "Modelo não informado")
    if lowered.startswith("epson ") or (sys_object_id or "").startswith("1.3.6.1.4.1.1248"):
        model = value[6:].strip() if lowered.startswith("epson ") else value
        return VendorIdentity(manufacturer="Epson", model=model or "Modelo não informado")
    return VendorIdentity(manufacturer="Desconhecido", model=value or "Modelo não informado")
