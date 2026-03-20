import os
import requests
from dotenv import load_dotenv

load_dotenv()
HF_KEY = os.getenv("HUGGINGFACE_API_KEY")
model_id = "BAAI/bge-small-en-v1.5"
hf_infra = "https://router.huggingface.co/hf-inference/models/"
url = f"{hf_infra}{model_id}"
headers = {"Authorization": f"Bearer {HF_KEY}"}

try:
    print("Testing Hugging Face...")
    response = requests.post(url, headers=headers, json={"inputs": ["Hello world"]}, timeout=10)
    print("Status:", response.status_code)
    if response.status_code != 200:
        print("Error:", response.text)
    else:
        print("HF is working. Length output:", len(response.json()))
except Exception as e:
    print(f"HF Exception: {e}")
