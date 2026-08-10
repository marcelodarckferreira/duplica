import asyncio

from app.core.security import hash_password
from app.db.base import AsyncSessionLocal
from app.db.models.request import CopyRequest, StatusHistoryEntry
from app.db.models.unit import Unit
from app.db.models.user import User

DEMO_USERS = [
    {"id": "admin", "name": "Administrador SEMED", "role": "Administrador", "email": "admin@grafica.local", "password": "admin123"},
    {"id": "operador", "name": "Operador da Gráfica", "role": "Operador", "email": "operador@grafica.local", "password": "operador123"},
    {"id": "consulta", "name": "Consulta SEMED", "role": "Consulta", "email": "consulta@grafica.local", "password": "consulta123"},
    {"id": "ti-semed", "name": "TI SEMED", "role": "Administrador", "email": "ti.semed@novaiguacu.rj.gov.br", "password": "semed123"},
]

DEMO_UNITS = [
    {"id": "emef-paulo-freire", "code": "ESC-001", "name": "EMEF Paulo Freire", "origin": "Escola"},
    {"id": "emef-ana-nery", "code": "ESC-002", "name": "EMEF Ana Nery", "origin": "Escola"},
    {"id": "emei-cora-coralina", "code": "ESC-003", "name": "EMEI Cora Coralina", "origin": "Escola"},
    {"id": "setor-pedagogico", "code": "SED-PED", "name": "Sede - Coordenação Pedagógica", "origin": "Sede SEMED"},
    {"id": "setor-ti", "code": "SED-TI", "name": "Sede - Tecnologia da Informação", "origin": "Sede SEMED"},
    {"id": "setor-rh", "code": "SED-RH", "name": "Sede - Recursos Humanos", "origin": "Sede SEMED"},
]

DEMO_REQUESTS = [
    {
        "id": "req-1", "code": "CP-2026-0001", "origin": "Escola", "unit_id": "emef-paulo-freire",
        "unit_name": "EMEF Paulo Freire", "requester": "Ana Souza", "contact": "(11) 99999-0000",
        "document_description": "Avaliação de Língua Portuguesa - 5º ano", "pages": 8, "copies": 120,
        "duplex": False, "printed_faces": 960, "consumed_sheets": 960, "paper": "A4", "color_mode": "P&B",
        "priority": "Normal", "desired_deadline": "2026-08-15", "status": "Recebido", "production_owner": "Marta",
        "requested_at": "2026-08-10", "produced_at": "", "delivered_at": "", "picked_up_by": "",
        "notes": "Separar por turma.",
        "history": [{"status": "Recebido", "date": "2026-08-10", "by": "Marta"}],
    },
    {
        "id": "req-2", "code": "CP-2026-0002", "origin": "Sede SEMED", "unit_id": "setor-pedagogico",
        "unit_name": "Sede - Coordenação Pedagógica", "requester": "Rafael Mendes", "contact": "(11) 98888-1010",
        "document_description": "Circular de formação continuada", "pages": 3, "copies": 80,
        "duplex": True, "printed_faces": 240, "consumed_sheets": 160, "paper": "A4", "color_mode": "P&B",
        "priority": "Institucional", "desired_deadline": "2026-08-12", "status": "Em produção", "production_owner": "Carlos",
        "requested_at": "2026-08-09", "produced_at": "", "delivered_at": "", "picked_up_by": "", "notes": "",
        "history": [
            {"status": "Recebido", "date": "2026-08-09", "by": "Carlos"},
            {"status": "Em produção", "date": "2026-08-10", "by": "Carlos"},
        ],
    },
    {
        "id": "req-3", "code": "CP-2026-0003", "origin": "Escola", "unit_id": "emef-ana-nery",
        "unit_name": "EMEF Ana Nery", "requester": "Beatriz Lima", "contact": "(11) 97777-2323",
        "document_description": "Atividades de recuperação", "pages": 5, "copies": 45,
        "duplex": True, "printed_faces": 225, "consumed_sheets": 135, "paper": "A4", "color_mode": "P&B",
        "priority": "Urgente", "desired_deadline": "2026-08-11", "status": "Pronto", "production_owner": "Marta",
        "requested_at": "2026-08-08", "produced_at": "2026-08-10", "delivered_at": "", "picked_up_by": "",
        "notes": "Aguardar retirada pela secretaria.",
        "history": [
            {"status": "Recebido", "date": "2026-08-08", "by": "Marta"},
            {"status": "Pronto", "date": "2026-08-10", "by": "Marta"},
        ],
    },
    {
        "id": "req-4", "code": "CP-2026-0004", "origin": "Sede SEMED", "unit_id": "setor-rh",
        "unit_name": "Sede - Recursos Humanos", "requester": "Priscila Rocha", "contact": "(11) 96666-4545",
        "document_description": "Ficha funcional e termo de ciência", "pages": 2, "copies": 60,
        "duplex": False, "printed_faces": 120, "consumed_sheets": 120, "paper": "A4", "color_mode": "P&B",
        "priority": "Normal", "desired_deadline": "2026-07-29", "status": "Entregue", "production_owner": "Carlos",
        "requested_at": "2026-07-25", "produced_at": "2026-07-26", "delivered_at": "2026-07-27", "picked_up_by": "Priscila Rocha",
        "notes": "",
        "history": [
            {"status": "Recebido", "date": "2026-07-25", "by": "Carlos"},
            {"status": "Pronto", "date": "2026-07-26", "by": "Carlos"},
            {"status": "Entregue", "date": "2026-07-27", "by": "Priscila Rocha"},
        ],
    },
]


async def seed() -> None:
    async with AsyncSessionLocal() as session:
        for data in DEMO_USERS:
            existing = await session.get(User, data["id"])
            if existing:
                continue
            session.add(
                User(
                    id=data["id"],
                    name=data["name"],
                    role=data["role"],
                    email=data["email"],
                    hashed_password=hash_password(data["password"]),
                    active=True,
                )
            )

        for data in DEMO_UNITS:
            existing = await session.get(Unit, data["id"])
            if existing:
                continue
            session.add(Unit(**data, active=True))

        await session.flush()  # unit_id em copy_requests depende de units já persistido

        for data in DEMO_REQUESTS:
            existing = await session.get(CopyRequest, data["id"])
            if existing:
                continue
            history = data.pop("history")
            request = CopyRequest(**data)
            request.history = [StatusHistoryEntry(**entry) for entry in history]
            session.add(request)

        await session.commit()
    print("Seed concluído.")


if __name__ == "__main__":
    asyncio.run(seed())
