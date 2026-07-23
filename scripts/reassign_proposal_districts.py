import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
MONGTTANG_PATH = BASE_DIR / "frontend" / "src" / "data" / "mongttang.json"
MOCK_DATA_PATH = BASE_DIR / "frontend" / "src" / "data" / "mockData.ts"
PROPOSALS_PATH = BASE_DIR / "data" / "final" / "proposals.json"

SEOUL_DISTRICTS = [
    '종로구', '중구', '용산구', '성동구', '광진구', '동대문구', '중랑구', '성북구', 
    '도봉구', '노원구', '은평구', '서대문구', '마포구', '양천구', '강서구', '구로구', 
    '금천구', '영등포구', '동작구', '관악구', '서초구', '강남구', '송파구', '강동구', '강북구'
]

DONG_MAP = {
    '자양': '광진구', '구의': '광진구', '화양': '광진구',
    '마장': '성동구', '성수': '성동구', '왕십리': '성동구', '옥수': '성동구',
    '여의도': '영등포구', '당산': '영등포구', '문래': '영등포구',
    '신도림': '구로구', '개봉': '구로구', '오류': '구로구', '가리봉': '구로구',
    '상암': '마포구', '연남': '마포구', '망원': '마포구', '합정': '마포구',
    '목동': '양천구', '신정': '양천구',
    '대치': '강남구', '삼성': '강남구', '역삼': '강남구', '청담': '강남구', '압구정': '강남구', '신사': '강남구',
    '반포': '서초구', '방배': '서초구', '양재': '서초구',
    '잠실': '송파구', '문정': '송파구', '위례': '송파구', '가락': '송파구',
    '천호': '강동구', '길동': '강동구', '명일': '강동구', '고덕': '강동구',
    '창동': '도봉구', '쌍문': '도봉구',
    '상계': '노원구', '중계': '노원구', '하계': '노원구', '월계': '노원구',
    '신림': '관악구', '봉천': '관악구',
    '사당': '동작구', '흑석': '동작구', '노량진': '동작구',
    '이태원': '용산구', '한남': '용산구', '보광': '용산구',
    '혜화': '종로구', '대학로': '종로구', '평창': '종로구', '부암': '종로구',
    '신촌': '서대문구', '연희': '서대문구', '홍제': '서대문구',
    '불광': '은평구', '갈현': '은평구', '응암': '은평구',
    '미아': '강북구', '수유': '강북구',
    '공릉': '노원구', '석관': '성북구', '길음': '성북구', '안암': '성북구',
    '제기': '동대문구', '청량리': '동대문구', '답십리': '동대문구',
    '상봉': '중랑구', '면목': '중랑구', '신내': '중랑구',
    '화곡': '강서구', '발산': '강서구', '마곡': '강서구',
    '독산': '금천구', '시흥': '금천구'
}

def main():
    print("=" * 60)
    print("본문 기반 자치구 분류 및 미상 유지 스크립트 실행")
    print("=" * 60)

    with open(MONGTTANG_PATH, "r", encoding="utf-8") as f:
        items = json.load(f)

    explicit_count = 0
    unassigned_count = 0

    for i, item in enumerate(items):
        title = item.get("TITLE") or item.get("title") or ""
        content = item.get("CONTENT") or item.get("content") or ""
        full_text = title + " " + content

        found = None
        for d in SEOUL_DISTRICTS:
            if d in full_text:
                found = d
                break
        if not found:
            for dong, dist in DONG_MAP.items():
                if dong in full_text:
                    found = dist
                    break

        if found:
            item["district"] = found
            explicit_count += 1
        else:
            item["district"] = "미상"
            unassigned_count += 1

    with open(MONGTTANG_PATH, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)
    print(f"{MONGTTANG_PATH} 자치구 재배치 완료! (본문기반 매핑: {explicit_count}건, 미상 유지: {unassigned_count}건)")

    if PROPOSALS_PATH.exists():
        with open(PROPOSALS_PATH, "w", encoding="utf-8") as f:
            json.dump(items, f, ensure_ascii=False, indent=2)

    # 두 개의 mockData.ts 경로 모두 업데이트 적용
    mock_paths = [
        MOCK_DATA_PATH,
        BASE_DIR / "frontend" / "src" / "mockData.ts"
    ]

    import re
    id_dist_map = { (it.get("id") or f"PROP-{int(float(it.get('SN', 0)))}"): it.get("district") for it in items if it.get("id") or it.get("SN") }

    for path in mock_paths:
        if path.exists():
            with open(path, "r", encoding="utf-8") as f:
                mock_code = f.read()

            for p_id, dist in id_dist_map.items():
                if not dist:
                    continue
                pattern = re.compile(rf'("id":\s*"{re.escape(p_id)}",[\s\S]*?"district":\s*")([^"]+)(")')
                mock_code = pattern.sub(rf'\g<1>{dist}\g<3>', mock_code)

            with open(path, "w", encoding="utf-8") as f:
                f.write(mock_code)
            print(f"{path} 자치구 동기화 완료!")

if __name__ == "__main__":
    main()
