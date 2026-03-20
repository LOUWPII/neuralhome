import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()
client = OpenAI(
    api_key=os.getenv("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1",
)

try:
    models = client.models.list()
    print("Models accessible:")
    for m in models.data:
        print(m.id)

    print("\nTesting Architect Model (llama-3.1-8b-instant)...")
    resp = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": "Hello"}],
        max_tokens=10
    )
    print("Success:", resp.choices[0].message.content)
except Exception as e:
    print(f"ERROR: {type(e).__name__}: {e}")
