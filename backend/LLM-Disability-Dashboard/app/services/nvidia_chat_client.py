import os

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

DEFAULT_MODEL = "qwen/qwen3.5-122b-a10b"

client = OpenAI(
    api_key=os.getenv("NVIDIA_API_KEY"),
    base_url="https://integrate.api.nvidia.com/v1",
)


def chat_completion(messages, model=None, max_tokens=1024, temperature=0.6):
    primary_model = model or os.getenv("NVIDIA_CHAT_MODEL", DEFAULT_MODEL)
    fallback_model = os.getenv("NVIDIA_CHAT_MODEL_FALLBACK")

    try:
        return client.chat.completions.create(
            model=primary_model,
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature,
            top_p=0.95,
        )
    except Exception:
        if not fallback_model or fallback_model == primary_model:
            raise
        return client.chat.completions.create(
            model=fallback_model,
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature,
            top_p=0.95,
        )
