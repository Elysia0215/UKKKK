import pandas as pd
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
CSV_PATH = BASE_DIR / "data" / "final" / "merged_naver_news_all_categories_classified.csv"
JSON_OUT_PATH = BASE_DIR / "frontend" / "src" / "data" / "news_all.json"

def main():
    print("=" * 60)
    print("Converting merged_naver_news_all_categories_classified.csv to JSON")
    print("=" * 60)

    if not CSV_PATH.exists():
        print(f"Error: {CSV_PATH} not found!")
        return

    df = pd.read_csv(CSV_PATH)
    
    light_news = []
    for _, row in df.iterrows():
        content = str(row.get('clean_content') or '')
        snippet = content[:150].strip() + ("..." if len(content) > 150 else "")
        
        light_news.append({
            "category": str(row.get('뉴스_대분류') or '').strip(),
            "sub_category": str(row.get('뉴스_중분류') or '').strip(),
            "micro_category": str(row.get('뉴스_소분류') or '').strip(),
            "strength": str(row.get('뉴스_이슈강도') or '').strip(),
            "type": str(row.get('뉴스_활용유형') or '').strip(),
            "title": str(row.get('title') or '').strip(),
            "snippet": snippet,
            "url": str(row.get('originallink') or '').strip()
        })

    with open(JSON_OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(light_news, f, ensure_ascii=False, indent=2)

    print(f"Saved {len(light_news)} news articles to {JSON_OUT_PATH}!")

if __name__ == "__main__":
    main()
