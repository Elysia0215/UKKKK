import json
import csv
from pathlib import Path

def main():
    workspace_dir = Path("/Users/parkcy/Desktop/sesac_pjt/UKKKK")
    mongttang_path = workspace_dir / "frontend/src/data/mongttang.json"
    civil_path = workspace_dir / "frontend/src/data/civil_requests_all.json"
    input_csv_path = workspace_dir / "scripts/테스트용/input.csv"
    
    # 1. Load proposals
    with mongttang_path.open("r", encoding="utf-8") as f:
        proposals = json.load(f)
        
    # 2. Load civil requests
    with civil_path.open("r", encoding="utf-8") as f:
        civil_requests = json.load(f)
        
    items = []
    
    # Add proposals
    for p in proposals:
        items.append({
            "id": p.get("id", ""),
            "category": p.get("category", ""),
            "title": p.get("title", ""),
            "content": p.get("content", ""),
            "source": p.get("source", "상상대로서울"),
            "created_at": p.get("reg_date", ""),
            "unresolved": 100.0 if p.get("reply_yn") == "N" else 0.0,
            "urgency": "",
            "feasibility": "",
            "policy_coverage": ""
        })
        
    # Add civil requests
    for c in civil_requests:
        items.append({
            "id": c.get("id", ""),
            "category": c.get("category", ""),
            "title": c.get("title", ""),
            "content": c.get("content", ""),
            "source": c.get("source", "국민신문고"),
            "created_at": c.get("reg_date", ""),
            "unresolved": 100.0 if c.get("status") != "답변완료" else 0.0,
            "urgency": "",
            "feasibility": "",
            "policy_coverage": ""
        })
        
    # 3. Write to input.csv
    headers = ["id", "category", "title", "content", "source", "created_at", "unresolved", "urgency", "feasibility", "policy_coverage"]
    with input_csv_path.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        writer.writerows(items)
        
    print(f"Generated input CSV: {input_csv_path} with {len(items)} rows.")

if __name__ == "__main__":
    main()
