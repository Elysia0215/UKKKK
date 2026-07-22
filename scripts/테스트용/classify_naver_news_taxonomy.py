import pandas as pd
import re
from pathlib import Path

INPUT = Path("data/final/merged_naver_news_all_categories.csv")
OUTPUT = Path("data/final/merged_naver_news_all_categories_classified.csv")

EIGHT_CATEGORIES = [
    "임신·난임·생식건강",
    "출산·산후 초기지원",
    "보육·돌봄 인프라",
    "다자녀·양육비·생활지원",
    "주거·교통·도시생활환경",
    "일·가정 양립·부모 노동",
    "취약·다양가족 사각지대",
    "정보·상담·교육·거버넌스",
]

def norm(s):
    if pd.isna(s):
        return ""
    s = str(s)
    s = re.sub(r"<[^>]+>", " ", s)
    s = re.sub(r"&quot;|&#34;", '"', s)
    s = re.sub(r"&amp;", "&", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s

# Rule order matters: specific policy issues should be caught before broad words like "정책" or "지원".
RULES = [
    ("주거·교통·도시생활환경", "출산가구 주거", "신혼부부·출산가구 주거지원",
     ["신혼", "신생아 특례", "주거", "주택", "전세", "월세", "임대", "청약", "대출", "이자지원", "보금자리"]),
    ("일·가정 양립·부모 노동", "육아휴직·근로시간", "육아휴직·출산휴가·유연근무",
     ["육아휴직", "출산휴가", "배우자 출산휴가", "유연근무", "단축근무", "근로시간", "재택근무", "일가정", "일·가정", "경력단절", "직장"]),
    ("출산·산후 초기지원", "출산지원금·수당", "출산장려금·첫만남이용권·부모급여",
     ["출산지원금", "출산 장려금", "출산장려금", "첫만남", "첫 만남", "부모급여", "양육수당", "아동수당", "현금", "수당", "지원금"]),
    ("출산·산후 초기지원", "산모 회복·건강관리", "산후조리·산후우울·수유상담",
     ["산후", "산모", "산후조리", "산후우울", "공공산후", "모유수유", "수유상담", "산모신생아"]),
    ("임신·난임·생식건강", "난임 지원", "난임시술·주사·시술비",
     ["난임", "시술비", "난임시술", "난임 주사", "인공수정", "체외수정"]),
    ("임신·난임·생식건강", "임신 준비·가임력 지원", "가임력검사·난자냉동·예비부부검진",
     ["가임력", "임신준비", "난자냉동", "정자냉동", "예비부부", "난소나이", "생식건강"]),
    ("임신·난임·생식건강", "임산부 건강·고위험 임신", "고위험임산부·산전검사·임산부 의료",
     ["임산부", "임신부", "임신", "고위험", "산전검사", "태아", "분만", "조산"]),
    ("보육·돌봄 인프라", "아동 건강·의료 접근성", "소아응급·영유아검진·야간진료",
     ["소아", "소아응급", "소아과", "어린이병원", "달빛어린이", "영유아검진", "예방접종", "야간진료", "의료", "병원"]),
    ("보육·돌봄 인프라", "긴급·시간제 돌봄", "야간·주말·아픈아이 돌봄",
     ["아픈아이", "병아동", "긴급돌봄", "시간제", "야간돌봄", "주말돌봄", "방학돌봄", "돌봄공백", "틈새돌봄"]),
    ("보육·돌봄 인프라", "어린이집·유치원", "보육시설·유아교육",
     ["어린이집", "유치원", "보육교사", "보육료", "보육시설", "유아교육"]),
    ("보육·돌봄 인프라", "초등돌봄·방과후", "키움센터·늘봄·방과후",
     ["초등돌봄", "늘봄", "방과후", "키움센터", "우리동네키움"]),
    ("보육·돌봄 인프라", "아동 놀이·체험공간", "공공키즈카페·장난감도서관·유아휴게실",
     ["키즈카페", "장난감도서관", "유아휴게실", "수유실", "기저귀", "놀이", "체험", "아동친화", "아이돌봄"]),
    ("다자녀·양육비·생활지원", "다자녀 혜택", "다자녀 기준·할인·감면",
     ["다자녀", "다둥이", "둘째", "셋째", "2자녀", "세자녀", "자녀수"]),
    ("다자녀·양육비·생활지원", "양육비·생활비 지원", "분유·기저귀·아동수당·부모급여",
     ["양육비", "육아비", "분유", "기저귀", "이유식", "육아용품", "교육비", "돌봄비", "부모 급여", "아동 수당"]),
    ("주거·교통·도시생활환경", "임산부 이동권", "임산부 교통배려·배려석",
     ["임산부석", "배려석", "임산부 배려", "교통약자", "임산부 교통", "뱃지", "태그"]),
    ("주거·교통·도시생활환경", "아이동반 이동·공공시설", "유모차·수유실·가족화장실 접근성",
     ["유모차", "유아차", "저상버스", "엘리베이터", "가족화장실", "아이동반", "기저귀교환대", "공공시설"]),
    ("취약·다양가족 사각지대", "한부모·위기임산부", "한부모·미혼부모·위기임산부",
     ["한부모", "미혼모", "미혼부", "위기임산부", "위기 임산부", "입양", "다문화"]),
    ("취약·다양가족 사각지대", "저소득·취약가구 지원", "취약가구·사각지대 지원",
     ["저소득", "취약", "차상위", "기초생활", "사각지대", "위기가구"]),
    ("정보·상담·교육·거버넌스", "저출산 정책 일반", "저출산 대책·정책동향·연구",
     ["저출산", "저출생", "출생률", "합계출산율", "인구동향", "인구", "정책", "대책", "통계"]),
    ("정보·상담·교육·거버넌스", "정보 접근성·신청 개선", "정책홍보·신청·플랫폼",
     ["몽땅", "만능키", "신청", "플랫폼", "정보", "상담", "홍보", "온라인", "서비스"]),
]

CATEGORY_MAP = {
    "의료건강": ("임신·난임·생식건강", "임산부 건강·고위험 임신", "고위험임산부·영유아 의료"),
    "의료·건강·심리 지원": ("임신·난임·생식건강", "임산부 건강·고위험 임신", "고위험임산부·영유아 의료"),
    "주거금융": ("주거·교통·도시생활환경", "출산가구 주거", "신혼부부·출산가구 주거지원"),
    "보육돌봄": ("보육·돌봄 인프라", "돌봄 인프라 일반", "보육·돌봄 서비스 확충"),
    "일가정양립": ("일·가정 양립·부모 노동", "육아휴직·근로시간", "육아휴직·출산휴가·유연근무"),
    "정책지원": ("다자녀·양육비·생활지원", "양육비·생활비 지원", "현금성 지원·수당"),
    "다자녀 가구 특화 혜택": ("다자녀·양육비·생활지원", "다자녀 혜택", "다자녀 기준·할인·감면"),
    "양육비·부모급여·금융지원": ("다자녀·양육비·생활지원", "양육비·생활비 지원", "분유·기저귀·아동수당·부모급여"),
    "일·가정 양립 지원": ("일·가정 양립·부모 노동", "육아휴직·근로시간", "육아휴직·출산휴가·유연근무"),
}

TOPIC_MAP = {
    "Topic 1": ("보육·돌봄 인프라", "돌봄 인프라 일반", "지자체 육아·돌봄 인프라"),
    "Topic 2": ("주거·교통·도시생활환경", "출산가구 주거", "신혼·신생아 주거 및 금융 지원"),
    "Topic 3": ("일·가정 양립·부모 노동", "육아휴직·근로시간", "일·가정 양립 및 근로 환경"),
    "Topic 4": ("다자녀·양육비·생활지원", "양육비·생활비 지원", "현금성 출산 지원금 및 수당"),
    "Topic 5": ("임신·난임·생식건강", "임산부 건강·고위험 임신", "고위험 임산부·영유아 의료 지원"),
}

HIGH_TERMS = ["위기", "응급", "공백", "부족", "폐원", "사각지대", "갈등", "논란", "중단", "악화", "고위험", "긴급", "폭증", "급증", "인상", "부담", "경력단절", "사망", "학대", "안전"]
MEDIUM_TERMS = ["확대", "지원", "개선", "강화", "대책", "정책", "논의", "추진", "보완", "필요", "요구", "완화"]

def classify_news(row):
    text = " ".join(norm(row.get(c, "")) for c in ["title", "clean_content", "category", "topic_name", "core_keywords"])

    best = None
    best_hits = []
    for cat, mid, micro, keywords in RULES:
        hits = [kw for kw in keywords if kw in text]
        if hits and (best is None or len(hits) > len(best_hits)):
            best = (cat, mid, micro)
            best_hits = hits

    if best:
        cat, mid, micro = best
        confidence = "상" if len(best_hits) >= 2 or any(h in norm(row.get("title", "")) for h in best_hits) else "중"
        basis = ", ".join(best_hits[:8])
    else:
        raw_category = norm(row.get("category", ""))
        topic_name = norm(row.get("topic_name", ""))

        if raw_category in EIGHT_CATEGORIES:
            cat, mid, micro = raw_category, "뉴스 일반", "카테고리 기반 분류"
            confidence, basis = "중", "기존카테고리"
        elif raw_category in CATEGORY_MAP:
            cat, mid, micro = CATEGORY_MAP[raw_category]
            confidence, basis = "중", "수집카테고리맵"
        else:
            mapped = None
            for prefix, value in TOPIC_MAP.items():
                if topic_name.startswith(prefix):
                    mapped = value
                    break

            if mapped:
                cat, mid, micro = mapped
                confidence, basis = "중", "NMF토픽맵"
            else:
                cat, mid, micro = "정보·상담·교육·거버넌스", "저출산 정책 일반", "수동검토 필요"
                confidence, basis = "하", "기본값"

    high_hits = [term for term in HIGH_TERMS if term in text]
    medium_hits = [term for term in MEDIUM_TERMS if term in text]

    if len(high_hits) >= 2:
        issue_strength = "상"
    elif len(high_hits) == 1 or len(medium_hits) >= 2:
        issue_strength = "중"
    else:
        issue_strength = "하"

    if any(term in text for term in ["통계", "보고서", "연구원", "조사", "분석", "KOSIS", "인구동향", "합계출산율"]):
        news_type = "통계·연구 근거"
    elif any(term in text for term in ["위기", "논란", "갈등", "부족", "공백", "폐원", "응급"]):
        news_type = "위험·이슈 신호"
    elif any(term in text for term in ["시행", "추진", "발표", "확대", "지원", "도입", "사업", "정책"]):
        news_type = "정책 동향"
    else:
        news_type = "일반 보도"

    return pd.Series({
        "뉴스_대분류": cat,
        "뉴스_중분류": mid,
        "뉴스_소분류": micro,
        "뉴스_분류근거": basis,
        "뉴스_분류신뢰도": confidence,
        "뉴스_이슈강도": issue_strength,
        "뉴스_활용유형": news_type,
    })

def main():
    df = pd.read_csv(INPUT, encoding="utf-8-sig")
    for col in ["title", "clean_content", "category", "topic_name", "core_keywords"]:
        if col in df.columns:
            df[col] = df[col].apply(norm)

    classified = pd.concat([df, df.apply(classify_news, axis=1)], axis=1)
    classified.to_csv(OUTPUT, index=False, encoding="utf-8-sig")

    print(f"뉴스 분류 완료: {len(classified):,}건")
    print("\n[뉴스_대분류 분포]")
    print(classified["뉴스_대분류"].value_counts())
    print("\n[뉴스_이슈강도 분포]")
    print(classified["뉴스_이슈강도"].value_counts())
    print("\n[뉴스_활용유형 분포]")
    print(classified["뉴스_활용유형"].value_counts())
    print(f"\n저장 경로: {OUTPUT}")

if __name__ == "__main__":
    main()
