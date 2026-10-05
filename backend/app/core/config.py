from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Monea API"
    environment: str = "development"
    # Obligatoria y sin valor por defecto: las credenciales solo viven en el .env.
    database_url: str
    cors_origins: list[str] = ["*"]
    # Zona horaria de los usuarios: define qué es "hoy" / "el mes actual".
    timezone: str = "America/La_Paz"

    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7


settings = Settings()
