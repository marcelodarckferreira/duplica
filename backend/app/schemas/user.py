from pydantic import BaseModel, ConfigDict, Field, computed_field, field_validator

MIN_PASSWORD_LENGTH = 8


def _validate_password_strength(value: str | None) -> str | None:
    if value and len(value) < MIN_PASSWORD_LENGTH:
        raise ValueError(f"A senha precisa ter pelo menos {MIN_PASSWORD_LENGTH} caracteres.")
    return value


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    username: str
    name: str
    role: str
    email: str
    active: bool
    is_system: bool
    avatar_path: str | None = Field(default=None, exclude=True)

    @computed_field
    @property
    def avatar_url(self) -> str | None:
        return f"/uploads/{self.avatar_path}" if self.avatar_path else None


class UserCreate(BaseModel):
    id: str | None = None
    username: str
    name: str
    role: str
    email: str
    # Opcional só na edição (id presente): em branco mantém a senha atual.
    # Na criação (sem id) é obrigatório — validado na rota.
    password: str | None = None
    active: bool = True

    _validate_password = field_validator("password")(_validate_password_strength)


class UserToggleActive(BaseModel):
    active: bool


class UserSelfUpdate(BaseModel):
    name: str
    email: str
    # Em branco mantém a senha atual. Preenchida, exige current_password correta.
    password: str | None = None
    current_password: str | None = None

    _validate_password = field_validator("password")(_validate_password_strength)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
