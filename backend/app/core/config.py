from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_ENV_FILE = Path(__file__).resolve().parents[3] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(_ENV_FILE), env_file_encoding="utf-8", extra="ignore")

    POSTGRES_HOST: str = "127.0.0.1"
    POSTGRES_PORT: int = 5435
    POSTGRES_DB: str = "duplica"
    POSTGRES_USER: str = "app"
    POSTGRES_PASSWORD: str

    # Sem default: a app deve falhar ao subir se isso não estiver definido no
    # .env, em vez de rodar com um segredo fraco conhecido (gap do ForgeHub).
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    CORS_ORIGINS: str = "http://127.0.0.1:5173,http://127.0.0.1:4174"

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


settings = Settings()
