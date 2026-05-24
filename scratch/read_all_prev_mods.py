import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

path = 'C:/Users/vansh/.gemini/antigravity/brain/cc0deac9-5f16-42e6-b718-d40232b863ab/.system_generated/logs/transcript.jsonl'
with open(path, 'r', encoding='utf-8') as f:
    for line in f:
        data = json.loads(line)
        if 'tool_calls' in data:
            for tc in data['tool_calls']:
                name = tc.get('name')
                if name == 'multi_replace_file_content':
                    args = tc.get('args', {})
                    target = args.get('TargetFile')
                    if 'ReplayCenter.tsx' in target:
                        print("FOUND REPLAYCENTER MODS:")
                        chunks = args.get('ReplacementChunks', [])
                        if isinstance(chunks, str):
                            chunks = json.loads(chunks)
                        for chunk in chunks:
                            print(f"--- Chunk Start: {chunk.get('StartLine')} - End: {chunk.get('EndLine')} ---")
                            print("TARGET CONTENT:")
                            print(chunk.get('TargetContent'))
                            print("REPLACEMENT CONTENT:")
                            print(chunk.get('ReplacementContent'))
                            print("=" * 60)
