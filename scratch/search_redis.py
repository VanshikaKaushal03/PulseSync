import json

log_path = r"C:\Users\vansh\.gemini\antigravity\brain\a873f598-8e16-43e0-8edd-0cb0b5df3cb9\.system_generated\logs\transcript.jsonl"

with open(log_path, 'r', encoding='utf-8') as f:
    for idx, line in enumerate(f):
        try:
            data = json.loads(line)
            step = data.get("step_index", idx)
            if 2614 <= step <= 2618:
                print(f"Step {step}: {json.dumps(data, indent=2)}")
        except Exception as e:
            pass
