from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Monea API"
    environment: str = "development"
    database_url: str = "postgresql://monea:monea_dev_password@db:5432/monea"
    cors_origins: list[str] = ["*"]


settings = Settings()
