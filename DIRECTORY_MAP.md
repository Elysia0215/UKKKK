# 🗺️ UKKKK 프로젝트 직관적 디렉토리 & 데이터 맵 (DIRECTORY_MAP)

> **프로젝트 디렉토리 및 데이터 구조 안내서**  
> 각 폴더 및 파일의 역할과 내용이 직관적으로 정리되어 있습니다.

---

## 📁 루트 디렉토리 구조 요약

```text
UKKKK/
├── 📄 DIRECTORY_MAP.md                 # 🗺️ [현재 파일] 직관적 디렉토리 & 데이터 전체 안내서
├── 📄 README.md                        # 📘 프로젝트 개요 및 대시보드 실행 가이드
├── 📄 CONTRIBUTING.md                  # 🤝 프로젝트 기여 및 협업 가이드
│
├── 📂 docs/                            # 📄 프로젝트 기획서, 데이터 정의서, 로드맵 문서 모음
│   ├── 📄 DEVELOPMENT_LOG.md           # 📝 [신설] 기획~구현까지의 상세 프로젝트 개발일지
│   ├── 📄 서울시_출산정책_대시보드_기획서.md     # - 대시보드 기획 및 대분류 8개 축 기본 설계서
│   ├── 📄 데이터분석정의서_템플릿.md           # - 데이터 분석 및 파이프라인 정의서
│   ├── 📄 보고서_및_발표_진행가이드.md        # - 내일 회의 및 최종 데모데이 발표 피치덱 가이드
│   ├── 📄 역할분담_및_일정가이드.md           # - 4인 팀 역할 분담 및 일자별 가이드
│   └── 📄 내일회의_문제정의_점검체크리스트.md  # - 문제정의 및 핵심 KPI 체크리스트
│
├── 📂 data/                            # 📊 원천, 가공, DB, 백업 데이터 일체 관리
│   ├── 📂 raw/                         # 1️⃣ [원천] 통계청 / 서울시 공공데이터 수집 원본
│   │   ├── 📊 합계출산율_및_모의_연령별_출산율_20260720.xlsx
│   │   ├── 📊 보육시설_현황_정원규모별_구별_20260720.csv
│   │   └── 📊 상상대로_서울_전체_최신.csv
│   │
│   ├── 📂 mongttang/                    # 2️⃣ [DB] 몽땅정보통 323개 사업 & 서울시 조직도 DB
│   │   ├── 📊 classified_policy.csv
│   │   └── 📊 출산정책관련_업무담당.xlsx
│   │
│   ├── 📂 processed/                    # 3️⃣ [가공] 규칙 기반 필터링 및 확장 데이터셋
│   │   ├── 📂 ver1_baseline/            # 🎯 [Ver1] 1차 기준 결과물 (704건 기준)
│   │   └── 📂 ver2_expanded/            # 🚀 [Ver2] 2차 확장 및 웹 크롤링 결과물 (824건)
│   │
│   └── 📂 final/                        # 4️⃣ [최종] 100% 원문 동기화 및 엑셀 수동 분석용 CSV/JSON
│       ├── 📊 civil_requests_all.csv    # - 국민신문고 582건 엑셀 수동 분석용 CSV 파일
│       └── 📊 merged_naver_news_all_categories.csv # - 수집된 네이버 뉴스 1,145건 원본 통합본
│
├── 📂 scripts/                         # 🐍 파이썬 2단계 수집, 분류, 부서 매칭 파이프라인
│   ├── 📂 테스트용/                     # 🧪 분석 스크립트 및 원본 통계 문서 모음
│   │   ├── 📄 2025년+출생.사망통계(잠정).pdf # - 통계청 배포 2025년 잠정 속보치 공식 PDF 문서
│   │   ├── 🐍 classify_naver_news_taxonomy.py # - 1,145건 뉴스 8대 카테고리/강도/유형 분류 스크립트
│   │   └── 📋 birth_policy_news_final_DB.csv # - 태깅 완료된 최종 뉴스 CSV 데이터
│   │
│   ├── 🐍 01_collect_birth_policy_proposals.py  # - 규칙 기반 scoring & 5대 룰 정밀 분류
│   ├── 🐍 06_build_department_ranking.py        # - 조직도 R&R 1·2·3순위 랭킹 & 몽땅정보 매칭
│   ├── 🐍 crawl_naver_news_by_all_categories.py # - 네이버 API 뉴스 카테고리별 크롤러
│   ├── 🐍 convert_civil_json_to_csv.py          # - 국민신문고 JSON ➔ 엑셀 분석용 CSV 변환 스크립트
│   ├── 🐍 convert_news_to_json.py               # - 1,145건 뉴스 CSV ➔ 프론트엔드 JSON 변환 스크립트
│   └── 🐍 update_district_births_to_2025.py     # - 자치구별 출생아 수 통계 2025 기준 자동 업데이트
│
├── 📂 frontend/                        # 💻 React + Vite 대시보드 웹 애플리케이션
│   ├── 📁 src/components/               # 🧩 대시보드 UI 컴포넌트
│   │   ├── ⚛️ DashboardOverview.tsx    # - 홈 개요 대시보드 (2x2 KPI + TOP 3 인사이트)
│   │   ├── ⚛️ GapMatrixDashboard.tsx    # - 6대 의사결정 갭 분석 매트릭스 대시보드 (Tab 7)
│   │   ├── ⚛️ HoverScrollText.tsx       # - 긴 텍스트 마우스 호버 시 3초 정지 가로 전광판 스크롤
│   │   ├── ⚛️ SeoulMap.tsx             # - 서울시 25개 자치구 SVG 인터랙티브 지리 시각화 지도
│   │   └── ⚛️ StatCharts.tsx           # - 자치구별 지표 비교 및 TFR 연도별 분석 차트
│   │
│   ├── 📁 src/data/                     # 📊 프론트엔드 실시간 동기화 데이터셋
│   │   ├── 📋 mongttang.json            # - 상상대로 824건 시민 제안 풀 텍스트 데이터
│   │   ├── 📋 civil_requests_all.json   # - 국민신문고 582건 민원 풀 텍스트 데이터
│   │   ├── 📋 news_all.json             # - 네이버/NMF 1,145건 정규화 뉴스 데이터
│   │   └── 📋 seoulData.ts              # - 25개 자치구 TFR 및 2025 잠정 출생아 수/보육시설 DB
│   └── 📋 vite.config.ts                # - 빌드 및 포트(3002) 설정
│
└── 📂 backend/                         # ⚙️ 백엔드 서비스
```

---

## 💡 폴더별 직관적 가이드 (Quick Guide)

| 폴더 명 | 직관적인 역할 설명 | 주요 포함 내용 |
| :--- | :--- | :--- |
| **`docs/`** | 📄 **프로젝트 기획/정의서** | 기획서.md, PRD, PPT 가이드, 체크리스트, 개발일지 |
| **`data/raw/`** | 📊 **수집 원천 데이터** | 상상대로 원문 19,657건, 통계청 출산율/보육시설 현황 |
| **`data/mongttang/`** | 🏛 **서울시 공식 행정 DB** | 몽땅정보통 323개 사업 DB, 서울시 18개 팀 전화번호 DB |
| **`data/final/`** | 🏆 **최종 엑셀 배포 데이터** | 국민신문고 CSV(582건), 네이버 뉴스 통합 CSV(1,145건) |
| **`scripts/`** | 🐍 **파이썬 파이프라인** | 19,657건 정제, 분류, 부서 R&R 라우팅, 뉴스 수집/태깅 자동화 |
| **`scripts/테스트용/`** | 🧪 **연구자료 및 테스트** | 2025 통계청 잠정 PDF, 뉴스 감성 분석 스크립트 |
| **`frontend/src/components/`** | 🧩 **대시보드 UI 컴포넌트** | 지도(SeoulMap), KPI(DashboardOverview), 갭 매트릭스(GapMatrixDashboard), Marquee(HoverScrollText) |
| **`frontend/src/data/`** | 📋 **대시보드 라이브 DB** | 상상대로(824건), 민원(582건), 뉴스(1,145건), 자치구 통계(2025 잠정) |
