import urllib.request
import json
import re
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
JSON_OUT_PATH = BASE_DIR / "frontend" / "src" / "data" / "news_all.json"

CLIENT_ID = "HnYWtTbBzWf9n1u820JU"
CLIENT_SECRET = "VqVNs553SP"

def search_news(query):
    encText = urllib.parse.quote(query)
    url = f"https://openapi.naver.com/v1/search/news.json?query={encText}&display=30"
    request = urllib.request.Request(url)
    request.add_header("X-Naver-Client-Id", CLIENT_ID)
    request.add_header("X-Naver-Client-Secret", CLIENT_SECRET)
    
    try:
        response = urllib.request.urlopen(request, timeout=5)
        rescode = response.getcode()
        if rescode == 200:
            response_body = response.read()
            return json.loads(response_body.decode('utf-8')).get('items', [])
    except Exception as e:
        print(f"Error fetching live Naver News: {e}")
    return []

def clean_html(text):
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'&quot;', '"', text)
    text = re.sub(r'&apos;', "'", text)
    text = re.sub(r'&amp;', "&", text)
    text = re.sub(r'&lt;', "<", text)
    text = re.sub(r'&gt;', ">", text)
    return text

def main():
    print("=" * 60)
    print("Naver Live News Search API 가동")
    print("=" * 60)

    # Fetch live news for low birthrate terms
    queries = ["서울시 저출생 대책", "난임 지원금 확대", "출산지원 주거"]
    live_items = []
    
    for q in queries:
        items = search_news(q)
        print(f"Query '{q}': {len(items)} articles fetched")
        for it in items:
            title = clean_html(it.get('title', ''))
            desc = clean_html(it.get('description', ''))
            link = it.get('originallink') or it.get('link') or ''
            
            # Map query to topic
            topic = "Topic 1: 지자체 육아·돌봄 인프라"
            category = "돌봄"
            if "난임" in title or "지원금" in title:
                topic = "Topic 4: 현금성 출산 지원금 및 수당"
                category = "출산지원"
            elif "주거" in title or "주택" in title or "대출" in title:
                topic = "Topic 2: 신혼·신생아 주거 및 금융 지원"
                category = "주거"
            
            live_items.append({
                "category": category,
                "topic_name": topic,
                "core_keywords": q,
                "title": title,
                "snippet": desc[:150] + "..." if len(desc) > 150 else desc,
                "url": link
            })

    # Merge with existing news_all.json if exists
    existing_items = []
    if JSON_OUT_PATH.exists():
        with open(JSON_OUT_PATH, "r", encoding="utf-8") as f:
            existing_items = json.load(f)
            
    all_items = live_items + existing_items
    
    # De-duplicate by title
    seen_titles = set()
    unique_items = []
    for it in all_items:
        t = it.get('title')
        if t not in seen_titles:
            seen_titles.add(t)
            unique_items.append(it)

    with open(JSON_OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(unique_items, f, ensure_ascii=False, indent=2)

    print(f"Successfully integrated {len(live_items)} live articles. Total database count: {len(unique_items)}!")

if __name__ == "__main__":
    main()
