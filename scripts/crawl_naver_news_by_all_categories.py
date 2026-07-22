import urllib.request
import json
import re
import pandas as pd
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
CLIENT_ID = "HnYWtTbBzWf9n1u820JU"
CLIENT_SECRET = "VqVNs553SP"

EXISTING_CSV_PATH = BASE_DIR / "scripts" / "테스트용" / "birth_policy_news_final_DB.csv"
OUTPUT_CSV_PATH = BASE_DIR / "data" / "final" / "merged_naver_news_all_categories.csv"

CATEGORIES = [
    {"name": "임신·난임·생식건강", "queries": ["서울시 난임 지원", "임신 준비 지원", "난임 부부 시술비"]},
    {"name": "출산·산후 초기지원", "queries": ["서울시 출산 지원금", "산후조리경비", "첫만남이용권 서울"]},
    {"name": "양육비·부모급여·금융지원", "queries": ["서울시 부모급여", "아동수당 지급", "양육비 지원"]},
    {"name": "보육·돌봄 인프라", "queries": ["서울시 어린이집 정원", "우리동네키움센터", "늘봄학교 서울"]},
    {"name": "일·가정 양립 지원", "queries": ["서울시 육아휴직 장려", "출산휴가 급여", "유연근무 저출생"]},
    {"name": "다자녀 가구 특화 혜택", "queries": ["서울시 다둥이카드", "다자녀 취득세 감면", "다자녀 주차요금"]},
    {"name": "주거·교통·도시생활환경", "queries": ["신혼부부 주택 청약", "신생아 특례대출", "임산부 교통비"]},
    {"name": "의료·건강·심리 지원", "queries": ["서울시 소아과 야간", "임산부 우울증 상담", "서울시 소아의료"]}
]

def search_naver_news(query):
    encText = urllib.parse.quote(query)
    url = f"https://openapi.naver.com/v1/search/news.json?query={encText}&display=30"
    request = urllib.request.Request(url)
    request.add_header("X-Naver-Client-Id", CLIENT_ID)
    request.add_header("X-Naver-Client-Secret", CLIENT_SECRET)
    try:
        response = urllib.request.urlopen(request, timeout=5)
        if response.getcode() == 200:
            return json.loads(response.read().decode('utf-8')).get('items', [])
    except Exception as e:
        print(f"Error searching Naver News for '{query}': {e}")
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
    print("Naver API 뉴스 대분류/세분류별 전수 크롤링 가동")
    print("=" * 60)

    all_fetched_news = []
    
    # 1. Loop through all categories and fetch news
    for cat in CATEGORIES:
        cat_name = cat["name"]
        print(f"\n📂 카테고리: {cat_name} 수집 시작")
        
        cat_seen_titles = set()
        for q in cat["queries"]:
            items = search_naver_news(q)
            print(f"  - 검색어 '{q}': {len(items)}건 수집")
            
            for it in items:
                title = clean_html(it.get('title', ''))
                desc = clean_html(it.get('description', ''))
                link = it.get('originallink') or it.get('link') or ''
                
                if title not in cat_seen_titles:
                    cat_seen_titles.add(title)
                    all_fetched_news.append({
                        "category": cat_name,
                        "topic_name": "Naver API Live 뉴스",
                        "core_keywords": q,
                        "title": title,
                        "clean_content": desc,
                        "nouns": "",
                        "originallink": link
                    })

    # 2. Merge with existing researched CSV
    existing_df = pd.DataFrame()
    if EXISTING_CSV_PATH.exists():
        existing_df = pd.read_csv(EXISTING_CSV_PATH)
        print(f"\n기존 연구 뉴스 DB ({len(existing_df)}건) 로드 성공")
        
    fetched_df = pd.DataFrame(all_fetched_news)
    print(f"신규 수집한 네이버 API 뉴스: {len(fetched_df)}건")
    
    # Combine
    combined_df = pd.concat([existing_df, fetched_df], ignore_index=True)
    
    # De-duplicate by title
    initial_len = len(combined_df)
    combined_df.drop_duplicates(subset=["title"], keep="first", inplace=True)
    final_len = len(combined_df)
    print(f"중복 제거 결과: {initial_len}건 ➔ {final_len}건")

    # Save to CSV
    OUTPUT_CSV_PATH.parent.mkdir(parents=True, exist_ok=True)
    combined_df.to_csv(OUTPUT_CSV_PATH, index=False, encoding="utf-8-sig")
    print(f"\n🎉 최종 통합 뉴스 CSV 저장 완료!")
    print(f"👉 파일 위치: {OUTPUT_CSV_PATH.resolve()}")

if __name__ == "__main__":
    main()
