from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    host: str = "127.0.0.1"
    port: int = 8002
    # LLM: "ollama" (free local) | "openai" (paid) | "" (rule-based fallback)
    llm_provider: str = "ollama"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    ollama_base_url: str = "http://127.0.0.1:11434/v1"
    ollama_model: str = "llama3.2"
    languagetool_api_url: str = ""
    database_path: str = str(Path(__file__).resolve().parent.parent / "database" / "app.db")
    cors_origins: str = (
        "http://localhost:5173,http://127.0.0.1:5173,"
        "http://localhost:8002,http://127.0.0.1:8002"
    )
    serve_web: bool = False

    @property
    def cors_origin_list(self) -> list[str]:
        if self.serve_web:
            return ["*"]
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
