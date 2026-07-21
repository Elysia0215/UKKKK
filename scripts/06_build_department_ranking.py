"""
6단계: 426건 출산·육아 제안 데이터에
1) 출산정책관련 업무담당.xlsx (18개 실무 분장) 기반 부서 매칭 Top 3 랭킹
2) classified_policy.json (몽땅정보 322건) 기반 연관 기존 정책 혜택 정보
를 파싱 매핑하여 proposals.json 및 mockData.ts를 갱신한다.
"""
import json
import ast
import pandas as pd
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
EXCEL_PATH = BASE_DIR / "data" / "출산정책관련 업무담당.xlsx"
CLASSIFIED_PATH = BASE_DIR / "data" / "classified_policy.json"
PROPOSALS_PATH = BASE_DIR / "data" / "final" / "proposals.json"

# 1. 엑셀 실무 부서 정보 로드
dept_df = pd.read_excel(EXCEL_PATH)
dept_info_list = []

for _, row in dept_df.iterrows():
    dept_name = str(row.iloc[0]).strip()
    position = str(row.iloc[1]).strip() if pd.notna(row.iloc[1]) else ""
    phone = str(row.iloc[2]).strip() if pd.notna(row.iloc[2]) else ""
    duty = str(row.iloc[3]).strip() if pd.notna(row.iloc[3]) else ""
    location = str(row.iloc[4]).strip() if pd.notna(row.iloc[4]) else ""
    
    # 단축 팀명 추출 (예: '저출생사업1팀', '돌봄사업팀', '가족지원팀', '가족건강팀' 등)
    short_dept = dept_name.split()[-1] if len(dept_name.split()) > 0 else dept_name
    
    dept_info_list.append({
        "full_dept": dept_name,
        "short_dept": short_dept,
        "position": position,
        "phone": phone,
        "duty": duty,
        "location": location
    })

# 2. 몽땅정보 322건 정책 사업 데이터 로드
with open(CLASSIFIED_PATH, "r", encoding="utf-8") as f:
    classified_policies = json.load(f)

# 3. Proposals 426건 로드 및 매핑
with open(PROPOSALS_PATH, "r", encoding="utf-8") as f:
    proposals = json.load(f)

def match_department_rankings(proposal):
    title_content = proposal["title"] + " " + proposal["content"]
    cat = proposal["category"]
    
    scored_depts = []
    for info in dept_info_list:
        score = 0
        # 카테고리 매칭 가중치
        if cat in info["duty"] or cat in info["full_dept"]:
            score += 30
        
        # 업무분장 키워드 매칭
        words = title_content.split()
        for w in set(words):
            if len(w) >= 2 and w in info["duty"]:
                score += 10
        
        # 지정된 department 배열에 포함되어 있으면 보너스
        if any(info["short_dept"] in d or d in info["short_dept"] for d in proposal["department"]):
            score += 50
            
        scored_depts.append({
            "dept_name": info["short_dept"],
            "full_dept": info["full_dept"],
            "score": score,
            "phone": info["phone"],
            "location": info["location"],
            "position": info["position"],
            "duty_summary": info["duty"].split("\n")[0] if info["duty"] else ""
        })
    
    scored_depts.sort(key=lambda x: x["score"], reverse=True)
    
    # 중복 팀 제거 후 Top 3 선택
    unique_depts = []
    seen = set()
    for d in scored_depts:
        if d["dept_name"] not in seen:
            seen.add(d["dept_name"])
            unique_depts.append(d)
        if len(unique_depts) >= 3:
            break
            
    rankings = []
    for i, d in enumerate(unique_depts):
        rankings.append({
            "rank": i + 1,
            "role_type": "주관부서" if i == 0 else f"협조부서 ({i+1}순위)",
            "dept_name": d["dept_name"],
            "full_dept": d["full_dept"],
            "phone": d["phone"],
            "location": d["location"],
            "duty_summary": d["duty_summary"]
        })
    return rankings

def match_policies(proposal):
    title_content = proposal["title"] + " " + proposal["content"]
    cat = proposal["category"]
    
    matched = []
    for pol in classified_policies:
        pol_cat = pol.get("Category", "")
        pol_title = pol.get("사업명", "")
        pol_content = pol.get("사업내용", "") or ""
        
        score = 0
        if pol_cat == cat:
            score += 20
        
        for kw in ["보육", "돌봄", "산후조리", "다자녀", "임산부", "응급", "바우처", "난임", "유모차"]:
            if kw in title_content and kw in pol_title:
                score += 30
                
        if score >= 30:
            matched.append({
                "policy_id": pol.get("사업소분류명") or pol_title,
                "policy_name": pol_title,
                "summary": pol_content[:120] + ("..." if len(pol_content) > 120 else ""),
                "apply_url": pol.get("신청하기사이트주소") if (pol.get("신청하기사이트주소") and pol.get("신청하기사이트주소") != ".") else "https://umsa.seoul.go.kr/",
                "dept_name": pol.get("Department", "담당팀"),
                "score": score
            })
            
    matched.sort(key=lambda x: x["score"], reverse=True)
    return matched[:5]

# Proposals 갱신
for p in proposals:
    p["department_rankings"] = match_department_rankings(p)
    p["matched_policies"] = match_policies(p)

with open(PROPOSALS_PATH, "w", encoding="utf-8") as f:
    json.dump(proposals, f, ensure_ascii=False, indent=2)

print(f"proposals.json 갱신 완료: {len(proposals)}건 (부서 랭킹 Top 3 및 몽땅정보 연관 혜택 포함)")
