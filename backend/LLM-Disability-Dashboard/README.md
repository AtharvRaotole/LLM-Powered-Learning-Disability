# LLM-Disability-Dashboard

FastAPI backend for the Learning Disability Simulation Dashboard.

## Setup

Create a `.env` file in this directory:

```bash
# Required for LangGraph workflows and problem generation
OPENAI_API_KEY=your_openai_api_key_here

# Required for AI tutor chat (NVIDIA NIM)
NVIDIA_API_KEY=your_nvidia_api_key_here
NVIDIA_CHAT_MODEL=qwen/qwen3.5-122b-a10b

# Optional fallback model if primary is unavailable
NVIDIA_CHAT_MODEL_FALLBACK=moonshotai/kimi-k2.6

# Optional LangGraph cache settings
LANGGRAPH_CACHE_ENABLED=true
LANGGRAPH_CACHE_TTL=600
LANGGRAPH_CACHE_SIZE=128
```

Install dependencies and run:

```bash
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Chat API

The floating chat widget and AI Tutor Chat page both use:

```
POST /api/v1/openai/chat
```

Payload:

```json
{
  "message": "Explain fractions",
  "chat_mode": "tutor",
  "personality": "helpful",
  "conversation_history": []
}
```

Chat responses are powered by NVIDIA NIM (`qwen/qwen3.5-122b-a10b` by default). LangGraph workflows continue to use OpenAI.
