from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "development"

    database_url: str = "postgresql+psycopg2://opera:opera@db:5432/opera_bridge"

    jwt_secret: str = "change-me-to-a-long-random-string"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440

    upload_dir: str = "uploads"

    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    # MQTT (Legrand GRMS Guest Control Platform protocol) - dùng để test trước khi
    # nối với RCU/OPERA Cloud thật. Mặc định tắt (mqtt_enabled=False) nên demo chạy
    # bình thường mà không cần broker.
    mqtt_enabled: bool = False
    mqtt_broker_host: str = "localhost"
    mqtt_broker_port: int = 1883
    mqtt_username: str | None = None
    mqtt_password: str | None = None
    mqtt_hotel_id: str = "DEMO001"
    mqtt_client_id: str = "opera-bridge-api"


settings = Settings()
