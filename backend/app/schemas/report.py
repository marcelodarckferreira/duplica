from pydantic import BaseModel


class DashboardMetrics(BaseModel):
    total_requests: int
    total_copies: int
    pending: int
    ready: int
    delivered: int
    canceled: int
    total_sheets: int
    estimated_reams: float


class UnitRankingItem(BaseModel):
    unit_id: str
    unit_name: str
    requests: int
    printed_faces: int


class MonthlyConsolidationItem(BaseModel):
    month: str
    requests: int
    printed_faces: int
    consumed_sheets: int
