import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    # Primary providers for this PoC (keys the user actually has)
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    # Optional / legacy
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    # Networking
    ALLOWED_ORIGINS_RAW: str = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:5174,http://localhost:3000,null")
    
    @property
    def ALLOWED_ORIGINS(self) -> list[str]:
        return [orig.strip() for orig in self.ALLOWED_ORIGINS_RAW.split(",") if orig.strip()]


settings = Settings()
