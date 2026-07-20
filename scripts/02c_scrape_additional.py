"""
키워드 확장(난임/부모급여/쌍둥이 등 추가) 후 새로 잡힌 건만 스크래핑
기존 267건은 안 건드리고, 신규분만 처리해서 합침

실행 위치: class_pjt/scripts/
필요 파일: data/processed/상상대로_서울_전체.csv (1단계에서 이미 받아둔 19,638건 원본)
          data/processed/상상대로_서울_출산육아_본문포함.csv (기존 267건, 이미 본문 확보됨)
"""
import requests
from bs4 import BeautifulSoup
import pandas as pd
import time
from pathlib import Path

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
}

# 확장된 키워드 (기존 10개 + 신규 11개)
KEYWORDS = [
    "출산", "육아", "보육", "임신", "다자녀", "산후조리", "어린이집", "아이돌봄", "저출생", "돌봄",
    "난임", "부모급여", "아동수당", "위기임산부", "미혼모", "보호출산",
    "다태아", "쌍둥이", "모유수유", "산후우울", "유모차",
]

RAW_ALL = Path("../data/processed/상상대로_서울_전체.csv")
OLD_DETAIL = Path("../data/processed/상상대로_서울_출산육아_본문포함.csv")
OUT_PATH = Path("../data/processed/상상대로_서울_출산육아_본문포함.csv")  # 덮어씀 (신규분 합친 최종본)


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


if __name__ == "__main__":
    df_full = pd.read_csv(RAW_ALL)
    df_old_detail = pd.read_csv(OLD_DETAIL)

    # 확장 키워드로 재필터링
    pattern = "|".join(KEYWORDS)
    mask = df_full["TITLE"].str.contains(pattern, na=False) | df_full["CONTENT"].str.contains(pattern, na=False)
    df_new_filtered = df_full[mask]

    old_sn = set(df_old_detail["SN"])
    new_only_sn = [sn for sn in df_new_filtered["SN"].astype(int).tolist() if sn not in old_sn]
    print(f"기존 확보: {len(old_sn)}건 / 신규 대상: {len(new_only_sn)}건")

    results = []
    for i, sn in enumerate(new_only_sn):
        results.append(fetch_detail(sn))
        if (i + 1) % 20 == 0:
            print(f"{i + 1}/{len(new_only_sn)} 완료")
        time.sleep(0.5)

    df_new_detail = pd.DataFrame(results)
    df_new_merged = df_new_filtered[df_new_filtered["SN"].isin(new_only_sn)].merge(
        df_new_detail, on="SN", how="left"
    )

    df_all = pd.concat([df_old_detail, df_new_merged], ignore_index=True)
    df_all.to_csv(OUT_PATH, index=False, encoding="utf-8-sig")

    print(f"\n최종 총 {len(df_all)}건")
    print(f"본문 확보: {df_all['content_full'].notna().sum()}건")
    print(f"지역분류 있음: {(df_all['district_site'] != '-').sum()}건")
    print(f"에러: {df_all['error'].notna().sum()}건")
