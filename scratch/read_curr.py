import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

path = 'C:/Users/vansh/.gemini/antigravity/brain/6ee805e4-ead6-4f36-8956-9931e820dfd0/.system_generated/logs/transcript.jsonl'
try:
    with open(path, 'r', encoding='utf-8') as f:
        for line in f:
            data = json.loads(line)
            if data.get('type') in ['USER_INPUT', 'PLANNER_RESPONSE'] and 'content' in data:
                content = data['content']
                print(f"=== {data.get('type')} ===")
                print(content)
                print("-" * 40)
except Exception as e:
    print(f"Error reading transcript: {e}")
