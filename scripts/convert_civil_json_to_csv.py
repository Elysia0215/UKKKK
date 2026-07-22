import json
import pandas as pd
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
JSON_PATH = BASE_DIR / "frontend" / "src" / "data" / "civil_requests_all.json"
CSV_PATH = BASE_DIR / "data" / "final" / "civil_requests_all.csv"

def main():
    print("=" * 60)
    print("Converting civil_requests_all.json to CSV for manual tagging")
    print("=" * 60)

    if not JSON_PATH.exists():
        print(f"Error: {JSON_PATH} not found!")
        return

    with open(JSON_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Flatten the json objects to rows
    rows = []
    for item in data:
        rows.append({
            "id": item.get("id", ""),
            "peti_no": item.get("peti_no", ""),
            "title": item.get("title", ""),
            "content": item.get("content", ""),
            "reg_date": item.get("reg_date", ""),
            "status": item.get("status", ""),
            "category": item.get("category", ""),
            "sub_category": item.get("sub_category", ""),
            "micro_category": item.get("micro_category", ""),
            "dept": item.get("dept", ""),
            "is_seoul": item.get("is_seoul", ""),
            "url": item.get("url", "")
        })

    df = pd.DataFrame(rows)
    CSV_PATH.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(CSV_PATH, index=False, encoding="utf-8-sig")

    print(f"Saved {len(df)} civil requests to {CSV_PATH}!")
    print(f"File absolute path: {CSV_PATH.resolve()}")

if __name__ == "__main__":
    main()
