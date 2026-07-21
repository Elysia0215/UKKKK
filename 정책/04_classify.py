import os
import pandas as pd
import re
from category_keywords import CATEGORY_KEYWORDS
from department_keywords import DEPARTMENT_KEYWORDS, CATEGORY_TO_DEFAULT_DEPARTMENT

def clean_text(text):
    """특수문자 제거 및 '?' 문장부호 공백 처리"""
    if not isinstance(text, str):
        return ""
    # '?' 문자를 공백으로 변경 (공공데이터 깨짐 대응)
    text = text.replace('?', ' ')
    # 한글, 영문, 숫자, 공백만 남기고 특수문자 제거
    text = re.sub(r'[^가-힣a-zA-Z0-9\s]', '', text)
    return text

def classify_and_score(text):
    """텍스트 분석 후 카테고리, 담당부서, 수요점수 산출"""
    cleaned = clean_text(text)
    
    # 1. 카테고리 분류
    category_scores = {}
    for cat, keywords in CATEGORY_KEYWORDS.items():
        score = sum(cleaned.count(kw) for kw in keywords)
        if score > 0:
            category_scores[cat] = score
            
    assigned_category = max(category_scores, key=category_scores.get) if category_scores else "기타"
    
    # 2. 담당부서 분류
    dept_scores = {}
    for dept, keywords in DEPARTMENT_KEYWORDS.items():
        score = sum(cleaned.count(kw) for kw in keywords)
        if score > 0:
            dept_scores[dept] = score
            
    if dept_scores:
        assigned_dept = max(dept_scores, key=dept_scores.get)
    else:
        assigned_dept = CATEGORY_TO_DEFAULT_DEPARTMENT.get(assigned_category, "기타부서")
        
    # 3. 수요점수 산출 (가중치 기반 계산)
    base_score = sum(category_scores.values()) * 10
    demand_score = min(base_score, 100) if assigned_category != "기타" else 0
    
    return assigned_category, assigned_dept, demand_score

def process_csv():
    # 경로 설정
    base_dir = os.path.dirname(os.path.abspath(__file__))
    input_path = os.path.join(base_dir, "..", "data", "mongttang.csv")
    output_csv_path = os.path.join(base_dir, "..", "data", "classified_policy.csv")
    output_json_path = os.path.join(base_dir, "..", "data", "classified_policy.json")
    
    print(f"📥 파일 읽는 중: {input_path}")
    
    # CSV 읽기 (인코딩 대응)
    try:
        df = pd.read_csv(input_path, encoding='utf-8-sig')
    except UnicodeDecodeError:
        df = pd.read_csv(input_path, encoding='cp949')
        
    print(f"✅ 총 {len(df)}건의 정책 데이터를 불러왔습니다.")
    
    # 텍스트 추출 컬럼 찾기 ('사업내용' 또는 '사업명' 등 텍스트 컬럼 자동 탐색)
    text_col = None
    for col in ['사업내용', '내용', '사업명', '정책명']:
        if col in df.columns:
            text_col = col
            break
            
    if not text_col:
        # 적절한 컬럼명이 없으면 첫 번째 문자열 컬럼 사용
        text_col = df.select_dtypes(include=['object']).columns[0]
        
    print(f"🔍 분석 대상 컬럼: [{text_col}]")
    
    # 분류 적용
    categories = []
    departments = []
    scores = []
    
    for text in df[text_col]:
        cat, dept, score = classify_and_score(str(text))
        categories.append(cat)
        departments.append(dept)
        scores.append(score)
        
    # 결과 컬럼 추가
    df['Category'] = categories
    df['Department'] = departments
    df['DemandScore'] = scores
    
    # 결과 저장 (CSV 및 JSON)
    df.to_csv(output_csv_path, index=False, encoding='utf-8-sig')
    df.to_json(output_json_path, orient='records', force_ascii=False, indent=2)
    
    print("🎉 분류 완료!")
    print(f"📄 CSV 결과 저장: {output_csv_path}")
    print(f"📄 JSON 결과 저장: {output_json_path}")

if __name__ == "__main__":
    process_csv()