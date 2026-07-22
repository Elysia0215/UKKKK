import pandas as pd
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
CSV_PATH = BASE_DIR / "data" / "final" / "merged_naver_news_all_categories.csv"
JSON_OUT_PATH = BASE_DIR / "frontend" / "src" / "data" / "news_all.json"

def main():
    print("=" * 60)
    print("Converting birth_policy_news_final_DB.csv to light JSON")
    print("=" * 60)

    if not CSV_PATH.exists():
        print(f"Error: {CSV_PATH} not found!")
        return

    df = pd.read_csv(CSV_PATH)
    
    # Select and rename columns
    light_news = []
    for _, row in df.iterrows():
        # Clean clean_content to a shortened snippet
        content = str(row.get('clean_content') or '')
        snippet = content[:150].strip() + ("..." if len(content) > 150 else "")
        
        light_news.append({
            "category": str(row.get('category') or '').strip(),
            "topic_name": str(row.get('topic_name') or '').strip(),
            "core_keywords": str(row.get('core_keywords') or '').strip(),
            "title": str(row.get('title') or '').strip(),
            "snippet": snippet,
            "url": str(row.get('originallink') or '').strip()
        })

    with open(JSON_OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(light_news, f, ensure_ascii=False, indent=2)

    print(f"Saved {len(light_news)} news articles to {JSON_OUT_PATH}!")

if __name__ == "__main__":
    main()
