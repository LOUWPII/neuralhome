from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    project_name: str = "NeuralHome API"
    version: str = "1.0.0"
    
    supabase_url: str
    supabase_key: str
    gemini_api_key: str = ""
    groq_api_key: str = ""
    huggingface_api_key: str = ""
    openrouter_api_key: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

settings = Settings()
