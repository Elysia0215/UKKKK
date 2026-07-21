import os
import json
import pandas as pd

def generate_summary():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    input_csv_path = os.path.join(base_dir, "..", "data", "classified_policy.csv")
    output_summary_path = os.path.join(base_dir, "..", "data", "dashboard_summary.json")
    
    print(f"📥 분류 완료 데이터 읽는 중: {input_csv_path}")
    df = pd.read_csv(input_csv_path, encoding='utf-8-sig')
    
    # 1. 카테고리별 정책 건수 및 평균 수요점수
    category_summary = df.groupby('Category').agg(
        total_count=('Category', 'count'),
        avg_demand_score=('DemandScore', 'mean')
    ).round(1).reset_index().to_dict(orient='records')
    
    # 2. 담당부서별 안건 수
    dept_summary = df['Department'].value_counts().reset_index()
    dept_summary.columns = ['Department', 'count']
    dept_summary_list = dept_summary.to_dict(orient='records')
    
    # 3. 시급성/수요점수 상위 TOP 5 정책
    text_col = '사업명' if '사업명' in df.columns else df.columns[0]
    top_policies = df.sort_values(by='DemandScore', ascending=False).head(5)[
        [text_col, 'Category', 'Department', 'DemandScore']
    ].to_dict(orient='records')
    
    # 전체 대시보드 요약 구조 구성
    summary_data = {
        "total_policy_count": len(df),
        "category_metrics": category_summary,
        "department_metrics": dept_summary_list,
        "top_demand_policies": top_policies
    }
    
    # JSON 파일로 저장
    with open(output_summary_path, 'w', encoding='utf-8') as f:
        json.dump(summary_data, f, ensure_ascii=False, indent=2)
        
    print(f"✅ 요약 통계 JSON 생성 완료: {output_summary_path}")

if __name__ == "__main__":
    generate_summary()