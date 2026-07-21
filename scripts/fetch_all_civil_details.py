import json
import time
import requests
from pathlib import Path
import importlib.util

BASE_DIR = Path(__file__).resolve().parent.parent
CIVIL_JSON_PATH = BASE_DIR / "frontend" / "src" / "data" / "civil_requests_all.json"
FINAL_JSON_PATH = BASE_DIR / "data" / "final" / "civil_requests_all.json"

collect_script_path = BASE_DIR / "scripts" / "01_collect_birth_policy_proposals.py"
spec = importlib.util.spec_from_file_location("collect_module", collect_script_path)
collect_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(collect_module)
classify_birth_policy_category = collect_module.classify_birth_policy_category

SERVICE_KEY = "2BOebv4LMSyFeF371dGJhDpzY4s/1CsQeSR5S+CsdwrNKEd5SP+pvZFwrE4yUH/JkIdO+qBzHdMDzNqClrc2Jg=="
ITEM_URL = "https://apis.data.go.kr/1140100/OpenProposalService2/OpenProposalItem"
HEADERS = {"User-Agent": "Mozilla/5.0"}

def fetch_detail_content(peti_no: str) -> str:
    params = {"serviceKey": SERVICE_KEY, "petiNo": peti_no}
    try:
        res = requests.get(ITEM_URL, params=params, headers=HEADERS, timeout=8)
        res.raise_for_status()
        data = res.json()
        item = data.get("resultData") or data.get("result") or data.get("item") or {}
        content = item.get("content") or item.get("contents") or item.get("petiCntn") or ""
        idea = item.get("improveIdea") or ""
        
        full_text = []
        if content:
            full_text.append(content.strip())
        if idea:
            full_text.append(f"[개선방안/제안내용]\n{idea.strip()}")
            
        if full_text:
            return "\n\n".join(full_text)
    except Exception as e:
        pass
    return ""

def main():
    print("=" * 60)
    print("국민신문고 582건 전체 민원 본문(OpenProposalItem) 100% 상세 수집 가동")
    print("=" * 60)

    if not CIVIL_JSON_PATH.exists():
        print("오류: civil_requests_all.json 파일이 없습니다.")
        return

    with open(CIVIL_JSON_PATH, "r", encoding="utf-8") as f:
        items = json.load(f)

    updated_count = 0
    total = len(items)

    for i, item in enumerate(items):
        peti_no = item.get("peti_no") or item.get("id", "").replace("1AB-", "")
        old_content = item.get("content", "")
        
        # 본문이 가짜 템플릿이거나 너무 짧은 경우 상세 API 호출
        if "본 민원은 국민신문고를 통해 접수된" in old_content or len(old_content.strip()) < 80:
            full_content = fetch_detail_content(peti_no)
            if full_content and len(full_content) > 20:
                item["content"] = full_content
                # 8대 대분류 재분류
                cat, sub_cat, micro_cat = classify_birth_policy_category(item.get("title", ""), full_content)
                item["category"] = cat
                item["sub_category"] = sub_cat
                item["micro_category"] = micro_cat
                updated_count += 1
                print(f"[{i+1}/{total}] petiNo: {peti_no} 상세 본문 수집 성공! ({len(full_content)}자)")
            else:
                print(f"[{i+1}/{total}] petiNo: {peti_no} 상세 본문 없음 (유지)")
            time.sleep(0.1)

    if updated_count > 0:
        with open(CIVIL_JSON_PATH, "w", encoding="utf-8") as f:
            json.dump(items, f, ensure_ascii=False, indent=2)
        with open(FINAL_JSON_PATH, "w", encoding="utf-8") as f:
            json.dump(items, f, ensure_ascii=False, indent=2)
        print(f"\n{CIVIL_JSON_PATH} 갱신 완료! (총 {updated_count}건 상세 원문 본문 확보)")

if __name__ == "__main__":
    main()
