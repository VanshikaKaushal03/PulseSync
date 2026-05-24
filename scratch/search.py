import os

search_terms = ["changed by", "changed_by", "admin_email", "admin_username", "changed"]
for root, dirs, files in os.walk("c:/Van/atypicsl"):
    if "node_modules" in root or "venv" in root or ".git" in root or "mongodb-data" in root:
        continue
    for file in files:
        if file.endswith((".py", ".tsx", ".ts", ".html", ".js")):
            path = os.path.join(root, file)
            try:
                with open(path, "r", encoding="utf-8") as f:
                    content = f.read()
                    for term in search_terms:
                        if term in content:
                            print(f"Found '{term}' in {path}")
            except Exception as e:
                pass
