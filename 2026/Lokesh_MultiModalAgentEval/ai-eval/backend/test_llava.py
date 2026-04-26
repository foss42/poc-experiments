import requests
import base64
import urllib.request


image_path = r"C:\Users\parsa\Downloads\img.png"

with open(image_path, "rb") as f:
    image_data = base64.b64encode(f.read()).decode("utf-8")

# Send to Ollama exactly as OpenAI vision format
response = requests.post(
    "http://localhost:11434/v1/chat/completions",
    json={
        "model": "llava-phi3",
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{image_data}"
                        }
                    },
                    {
                        "type": "text",
                        "text": "Is there a cat in the image? Answer yes or no."
                    }
                ]
            }
        ]
    }
)

print(response.status_code)
print(response.json())