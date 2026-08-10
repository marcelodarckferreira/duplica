from pydantic import BaseModel, ConfigDict, Field, computed_field


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    role: str
    email: str
    active: bool
    avatar_path: str | None = Field(default=None, exclude=True)

    @computed_field
    @property
    def avatar_url(self) -> str | None:
        return f"/uploads/{self.avatar_path}" if self.avatar_path else None


class UserCreate(BaseModel):
    id: str | None = None
    name: str
    role: str
    email: str
    # Opcional só na edição (id presente): em branco mantém a senha atual.
    # Na criação (sem id) é obrigatório — validado na rota.
    password: str | None = None
    active: bool = True


class UserToggleActive(BaseModel):
    active: bool


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
