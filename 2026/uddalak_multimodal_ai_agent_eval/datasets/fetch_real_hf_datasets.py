import os
import json
import base64
from io import BytesIO
try:
    from datasets import load_dataset
except ImportError as e:
    print(f"Failed to import datasets: {e}\nPlease ensure 'datasets' and 'Pillow' are installed.")
    exit(1)

base_dir = os.path.dirname(os.path.abspath(__file__))

def image_to_base64(img):
    """Converts a PIL Image to a base64 string."""
    buffered = BytesIO()
    # Convert to RGB if needed to avoid issues with RGBA/L
    if img.mode != 'RGB':
        img = img.convert('RGB')
    img.save(buffered, format="JPEG")
    return base64.b64encode(buffered.getvalue()).decode('utf-8')

def fetch_mmlu():
    print("Fetching MMLU tiny sample from cais/mmlu...")
    # Use the abstract_algebra split as an example
    dataset = load_dataset("cais/mmlu", "all", split="test", streaming=True)
    
    samples = []
    for i, item in enumerate(dataset):
        if i >= 5: break
        prompt = item['question'] + "\n"
        for idx, choice in enumerate(item['choices']):
            prompt += f"{chr(65+idx)}) {choice}\n"
        answer_char = chr(65 + item['answer'])
        
        samples.append({
            "prompt": prompt.strip(),
            "ground_truth": answer_char
        })
        
    out_path = os.path.join(base_dir, 'mmlu_hf_sample.jsonl')
    with open(out_path, 'w') as f:
        for sample in samples:
            f.write(json.dumps(sample) + '\n')
    print(f"Saved {len(samples)} MMLU authentic records to {out_path}")

def fetch_vqa():
    print("Fetching VQA format sample from multimodality...")
    # Use a small visual dataset for simplicity, e.g. HuggingFaceM4/VQA or similar small dataset
    # Actually finding a stable streaming VQA dataset that doesn't require login/approval can be tricky.
    # Using plain coco images from 'HuggingFaceM4/DocVQA' or similar, but let's use 'visual-question-answering-vqa-v2'
    # There is 'HuggingFaceM4/VQA' but wait, that might be large. We use streaming=True anyway.
    try:
        dataset = load_dataset("merve/vqav2-small", split="validation", streaming=True)
        samples = []
        for i, item in enumerate(dataset):
            if i >= 3: break
            img_b64 = image_to_base64(item['image'])
            samples.append({
                "prompt": item['question'],
                "images": [img_b64],
                "ground_truth": item['multiple_choice_answer']
            })
            
        out_path = os.path.join(base_dir, 'vqa_hf_sample.jsonl')
        with open(out_path, 'w') as f:
            for sample in samples:
                f.write(json.dumps(sample) + '\n')
        print(f"Saved {len(samples)} authentic VQA records to {out_path}")
    except Exception as e:
        print(f"Error fetching VQA dataset: {e}")

if __name__ == "__main__":
    fetch_mmlu()
    fetch_vqa()
    print("Done fetching real HuggingFace datasets.")
