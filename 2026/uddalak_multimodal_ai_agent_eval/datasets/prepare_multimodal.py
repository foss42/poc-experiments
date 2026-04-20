import base64
import json
import os

def encode_image(filepath):
    with open(filepath, 'rb') as f:
        return base64.b64encode(f.read()).decode('utf-8')

base_dir = os.path.dirname(os.path.abspath(__file__))
liberty_path = os.path.join(base_dir, 'downloads', 'liberty.jpg')
react_path = os.path.join(base_dir, 'downloads', 'react.png')

liberty_b64 = encode_image(liberty_path)
react_b64 = encode_image(react_path)

data = [
    {
        "prompt": "What famous monument is shown in this image?", 
        "images": [liberty_b64], 
        "ground_truth": "Statue of Liberty"
    },
    {
        "prompt": "Is the weather sunny or cloudy?", 
        "images": [liberty_b64], 
        "ground_truth": "sunny"
    },
    {
        "prompt": "What technology logo is this?", 
        "images": [react_b64], 
        "ground_truth": "React"
    }
]

out_path = os.path.join(base_dir, 'multimodal_sample.jsonl')
with open(out_path, 'w') as f:
    for item in data:
        f.write(json.dumps(item) + '\n')

print(f'Successfully created {out_path}')
