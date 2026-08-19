from pydantic import BaseModel, ConfigDict, field_validator


class PersonOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    registration_number: str
    phone: str
    unit_id: str
    active: bool


class PersonSave(BaseModel):
    id: str | None = None
    name: str
    registration_number: str = ""
    phone: str = ""
    unit_id: str

    @field_validator("name")
    @classmethod
    def _uppercase_name(cls, value: str) -> str:
        return value.upper()

    @field_validator("registration_number")
    @classmethod
    def _uppercase_registration_number(cls, value: str) -> str:
        return value.upper()


class PersonToggleActive(BaseModel):
    active: bool
