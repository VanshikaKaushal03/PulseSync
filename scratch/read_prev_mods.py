import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

path = 'C:/Users/vansh/.gemini/antigravity/brain/cc0deac9-5f16-42e6-b718-d40232b863ab/.system_generated/logs/transcript.jsonl'
with open(path, 'r', encoding='utf-8') as f:
    for line in f:
        data = json.loads(line)
        # Check tool calls
        if 'tool_calls' in data:
            for tc in data['tool_calls']:
                name = tc.get('name')
                if name in ['replace_file_content', 'multi_replace_file_content', 'write_to_file']:
                    args = tc.get('args', {})
                    target = args.get('TargetFile')
                    print(f"=== TOOL CALL: {name} on {target} ===")
                    print(json.dumps(args, indent=2))
                    print("-" * 50)
