import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
import uvicorn

from app.Routes import langgraph_router, openai_router
from app.limiter import limiter

load_dotenv()

REQUIRE_API_KEYS = os.getenv("REQUIRE_API_KEYS", "false").strip().lower() in {"1", "true", "yes"}
if REQUIRE_API_KEYS and not os.getenv("OPENAI_API_KEY", "").strip():
    raise RuntimeError("OPENAI_API_KEY is required when REQUIRE_API_KEYS=true")

allowed_origins_raw = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
ALLOWED_ORIGINS = [origin.strip() for origin in allowed_origins_raw.split(",") if origin.strip()]

app = FastAPI(
    title="Educational Dashboard API",
    description="API for an educational dashboard using AI to generate and analyze math questions",
    version="1.0.0",
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def healthcheck():
    return {
        "status": "ok",
        "openai_configured": bool(os.getenv("OPENAI_API_KEY", "").strip()),
        "nvidia_configured": bool(os.getenv("NVIDIA_API_KEY", "").strip()),
    }


app.include_router(openai_router, prefix="/api/v1/openai", tags=["OpenAI"])
app.include_router(langgraph_router, prefix="/api/v1/langgraph", tags=["LangGraph"])
app.include_router(langgraph_router, prefix="/api/v2/langgraph", tags=["LangGraph"])

if __name__ == "__main__":
    reload = os.getenv("UVICORN_RELOAD", "false").strip().lower() in {"1", "true", "yes"}
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=reload)
