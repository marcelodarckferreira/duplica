from pydantic import BaseModel, ConfigDict, field_validator


class UnitOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    origin: str
    code: str
    contact: str | None = None
    active: bool


class UnitSave(BaseModel):
    id: str | None = None
    name: str
    origin: str
    contact: str | None = None

    @field_validator("name")
    @classmethod
    def _uppercase_name(cls, value: str) -> str:
        return value.upper()


class UnitToggleActive(BaseModel):
    active: bool
