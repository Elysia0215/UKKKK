"""
2단계 (4인 분담 버전): 필터링된 제안 목록을 4등분해서 각자 자기 몫만 스크래핑
사용법: python 02_scrape_details.py --part 1 --total-parts 4
        (팀원마다 --part 번호만 1~4로 바꿔서 실행)

입력: data/processed/상상대로_서울_출산육아_필터링.csv
출력: data/raw/part_{N}.csv   (팀원별로 각자 이 파일만 생성/커밋)
"""
import argparse
import requests
from bs4 import BeautifulSoup
import pandas as pd
import time

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
}


def clean_content(text):
    if not text:
        return text
    return text.split("빈출단어")[0].strip()


def get_label_value(soup, label):
    el = soup.find(string=lambda s: s and label in s)
    if el:
        nxt = el.find_parent().find_next_sibling()
        if nxt:
            return nxt.get_text(strip=True)
    return None


def fetch_detail(sn: int) -> dict:
    url = f"https://idea.seoul.go.kr/front/freeSuggest/view.do?sn={sn}"
    try:
        res = requests.get(url, headers=HEADERS, timeout=10)
        res.raise_for_status()
    except Exception as e:
        return {"SN": sn, "content_full": None, "category_site": None, "district_site": None, "error": str(e)}

    soup = BeautifulSoup(res.text, "html.parser")
    content_block = soup.select_one("div.txt-block")
    content_full = clean_content(content_block.get_text(separator="\n", strip=True)) if content_block else None

    return {
        "SN": sn,
        "content_full": content_full,
        "category_site": get_label_value(soup, "정책분류"),
        "district_site": get_label_value(soup, "지역분류"),
        "error": None,
    }


def get_my_chunk(sn_list: list[int], part: int, total_parts: int) -> list[int]:
    """전체 목록을 total_parts로 나눠서 내 몫(part번째, 1부터 시작)만 반환"""
    n = len(sn_list)
    chunk_size = (n + total_parts - 1) // total_parts  # 올림 나눗셈
    start = (part - 1) * chunk_size
    end = min(start + chunk_size, n)
    return sn_list[start:end]


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--part", type=int, required=True, help="내 담당 번호 (1~4)")
    parser.add_argument("--total-parts", type=int, default=4, help="전체 인원 수 (기본 4)")
    args = parser.parse_args()

    df_filtered = pd.read_csv("../data/processed/상상대로_서울_출산육아_필터링.csv")
    sn_list = df_filtered["SN"].astype(int).tolist()

    my_sn_list = get_my_chunk(sn_list, args.part, args.total_parts)
    print(f"[Part {args.part}/{args.total_parts}] 내 담당: {len(my_sn_list)}건")

    results = []
    for i, sn in enumerate(my_sn_list):
        results.append(fetch_detail(sn))
        if (i + 1) % 10 == 0:
            print(f"  {i + 1}/{len(my_sn_list)} 완료")
        time.sleep(0.5)

    df_detail = pd.DataFrame(results)
    df_merged = df_filtered[df_filtered["SN"].isin(my_sn_list)].merge(df_detail, on="SN", how="left")

    out_path = f"../data/raw/part_{args.part}.csv"
    df_merged.to_csv(out_path, index=False, encoding="utf-8-sig")

    print(f"\n저장 완료: {out_path}")
    print(f"본문 확보: {df_merged['content_full'].notna().sum()}/{len(df_merged)}")
    print(f"에러: {df_merged['error'].notna().sum()}건")
