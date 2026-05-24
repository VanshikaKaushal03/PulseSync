import json
import sys

# Ensure stdout handles unicode
sys.stdout.reconfigure(encoding='utf-8')

path = 'C:/Users/vansh/.gemini/antigravity/brain/cc0deac9-5f16-42e6-b718-d40232b863ab/.system_generated/logs/transcript.jsonl'
with open(path, 'r', encoding='utf-8') as f:
    for line in f:
        data = json.loads(line)
        if data.get('type') in ['USER_INPUT', 'PLANNER_RESPONSE'] and 'content' in data:
            content = data['content']
            # We want to show everything, but keep it readable
            print(f"=== {data.get('type')} ===")
            print(content)
            print("-" * 40)
