from pydantic import BaseModel, ConfigDict


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
    code: str
    origin: str
    contact: str | None = None
