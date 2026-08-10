from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    action: str
    request_id: str
    request_code: str
    actor_id: str
    actor_name: str
    detail: str
    created_at: datetime
