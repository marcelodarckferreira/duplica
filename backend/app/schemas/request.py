from pydantic import BaseModel, ConfigDict, Field


class StatusHistoryEntryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    status: str
    date: str
    by: str


class CopyRequestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    code: str
    origin: str
    unit_id: str
    unit_name: str
    requester: str
    contact: str
    document_description: str
    pages: int
    copies: int
    duplex: bool
    printed_faces: int
    consumed_sheets: int
    paper: str
    color_mode: str
    priority: str
    desired_deadline: str
    status: str
    production_owner: str
    requested_at: str
    produced_at: str
    delivered_at: str
    picked_up_by: str
    notes: str
    history: list[StatusHistoryEntryOut]


class RequestDraft(BaseModel):
    origin: str
    unit_id: str
    requester: str
    contact: str
    document_description: str
    pages: int = Field(gt=0)
    copies: int = Field(gt=0)
    duplex: bool
    paper: str
    color_mode: str
    priority: str
    desired_deadline: str
    production_owner: str
    notes: str


class RequestUpdate(BaseModel):
    origin: str | None = None
    unit_id: str | None = None
    requester: str | None = None
    contact: str | None = None
    document_description: str | None = None
    pages: int | None = Field(default=None, gt=0)
    copies: int | None = Field(default=None, gt=0)
    duplex: bool | None = None
    paper: str | None = None
    color_mode: str | None = None
    priority: str | None = None
    desired_deadline: str | None = None
    production_owner: str | None = None
    notes: str | None = None
    picked_up_by: str | None = None


class StatusUpdate(BaseModel):
    status: str
    picked_up_by: str | None = None
