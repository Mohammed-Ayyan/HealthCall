"""Centralized configuration management for CareOps AI Engine."""

import json
from typing import List, Optional, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Centralized application settings loaded from environment or defaults."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_NAME: str = "careops-ai-engine"
    APP_VERSION: str = "1.0.0"
    API_PREFIX: str = "/api/v1"
    MAX_TRANSCRIPT_LENGTH: int = 50000
    ALLOWED_LANGUAGES: List[str] = ["en", "hi", "kn"]
    LOG_LEVEL: str = "INFO"
    DEBUG: bool = False

    HOST: str = "127.0.0.1"
    PORT: int = 8000
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # =========================================================================
    # Phase 2: Audio Transcription Engine Configuration
    # =========================================================================
    WHISPER_MODEL_SIZE: str = "base"
    WHISPER_DEVICE: str = "cpu"
    WHISPER_COMPUTE_TYPE: str = "int8"
    WHISPER_DOWNLOAD_ROOT: Optional[str] = None
    MAX_AUDIO_UPLOAD_SIZE_MB: int = 25
    ALLOWED_AUDIO_EXTENSIONS: List[str] = [".wav", ".mp3", ".m4a", ".flac", ".ogg"]
    SUPPORTED_AUDIO_LANGUAGES: List[str] = ["en", "hi", "kn"]

    # =========================================================================
    # Phase 4: Core AI Intelligence Engine Configuration
    # =========================================================================
    LLM_PROVIDER: str = "ollama"
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    LLM_MODEL: str = "llama3:latest"
    LLM_TIMEOUT_SECONDS: float = 60.0
    LLM_TEMPERATURE: float = 0.0
    LLM_MAX_RETRIES: int = 1

    @property
    def max_upload_size_bytes(self) -> int:
        """Maximum audio upload file size in bytes."""
        return self.MAX_AUDIO_UPLOAD_SIZE_MB * 1024 * 1024

    @field_validator("ALLOWED_LANGUAGES", mode="before")
    @classmethod
    def parse_allowed_languages(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("[") and v.endswith("]"):
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [item.strip() for item in v.split(",") if item.strip()]
        return v

    @field_validator("ALLOWED_AUDIO_EXTENSIONS", mode="before")
    @classmethod
    def parse_allowed_audio_extensions(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("[") and v.endswith("]"):
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [item.strip() for item in v.split(",") if item.strip()]
        return v

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("[") and v.endswith("]"):
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [item.strip() for item in v.split(",") if item.strip()]
        return v


settings = Settings()
