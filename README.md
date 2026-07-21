# 서울시 출산·양육 정책 수요 분석 대시보드

## 폴더 구조 (상세 안내: [DIRECTORY_MAP.md](file:///Users/parkcy/Desktop/sesac_pjt/UKKKK/DIRECTORY_MAP.md))
```text
UKKKK/
├── 📄 DIRECTORY_MAP.md                 # 🗺️ 직관적 디렉토리 & 데이터 전체 안내서
├── 📄 README.md                        # 📘 프로젝트 개요 및 가이드
├── 📂 docs/                            # 📄 프로젝트 기획서, 분석정의서, 로드맵 문서 모음
├── 📂 data/                            # 📊 원천, 가공, DB, 백업 데이터 관리
│   ├── 📂 raw/                         # 1️⃣ [원천] 통계청 / 서울시 공공데이터 수집 원본
│   ├── 📂 mongttang/                    # 2️⃣ [DB] 몽땅정보통 323개 사업 & 서울시 조직도 DB
│   ├── 📂 processed/                    # 3️⃣ [가공] 규칙 기반 필터링 및 확장 데이터셋
│   │   ├── 📂 ver1_baseline/            # 🎯 [Ver1] 1차 기준 결과물 (704건 기준)
│   │   └── 📂 ver2_expanded/            # 🚀 [Ver2] 2차 확장 및 웹 크롤링 결과물 (824건 & 팀검증용 137건)
│   └── 📂 archive/                      # 4️⃣ [백업] 과거 압축 백업 파일
├── 📂 scripts/                         # 🐍 파이썬 2단계 수집, 정제, 분류, 매칭 파이프라인
├── 📂 frontend/                        # 💻 React + Vite 대시보드 웹 애플리케이션
└── 📂 backend/                         # ⚙️ 백엔드 서비스
```

## 🐍 Poetry 가상환경 설정 (팀원 공통 개발 환경)
본 프로젝트는 팀원 간 동일한 패키지 버전을 유지하기 위해 `poetry`를 사용합니다.

```bash
# 1. Poetry 가상환경 패키지 설치
poetry install

# 2. 가상환경 진입 (셀 실행)
poetry shell

# 3. 데이터 파이프라인 또는 스크립트 실행 예시
python scripts/04_build_dashboard_json.py
```

## 실행 순서
```
scripts/01_collect_proposals.py   -> 팀장 1명만 실행 (전체 API 수집, 1회면 충분)
scripts/02_scrape_details.py      -> 4명이 각자 --part 1~4로 나눠서 실행 (아래 참고)
scripts/02b_merge_parts.py        -> 아무나 1명이 4개 결과 병합
정책/03_classify.py               -> 병합 후 1명이 실행 (분류 결과 안 좋으면 category_keywords.py / department_keywords.py만 수정하면 됨)
scripts/04_build_dashboard_json.py -> 최종 JSON 생성
```

## 4인 크롤링 분담 방법

`01_collect_proposals.py`를 팀장이 먼저 실행해서
`data/processed/상상대로_서울_출산육아_필터링.csv`를 만들고 GitHub에 커밋 & push.

나머지 3명은 그 파일을 pull 받은 뒤, 아래처럼 **자기 번호만 다르게** 실행:

```bash
# 팀원 1
python 02_scrape_details.py --part 1 --total-parts 4

# 팀원 2
python 02_scrape_details.py --part 2 --total-parts 4

# 팀원 3
python 02_scrape_details.py --part 3 --total-parts 4

# 팀원 4
python 02_scrape_details.py --part 4 --total-parts 4
```

각자 `data/raw/part_N.csv`만 생성되니까, **자기 파일만 커밋 & push하면 충돌 안 남**
(같은 파일을 여러 명이 건드리는 게 아니라 파일 자체가 나뉘어 있어서).

## GitHub 워크플로우 (충돌 최소화 버전)

1. 팀장이 레포 만들고 이 구조 그대로 push
2. 팀원들은 각자 브랜치 파서 작업 (`git checkout -b crawl-part2` 등)
   - 급하면 브랜치 안 나누고 main에 바로 push해도 됨 (파일이 겹치지 않아서 충돌 위험 낮음)
3. `data/raw/part_N.csv`만 커밋 → push → (PR 생략 가능, 시간 없으니)
4. 전원 push 끝나면 팀장이 `02b_merge_parts.py` 실행해서 병합
5. 이후 `03_classify.py` → `04_build_dashboard_json.py` 순서로 팀장(또는 방법론 담당)이 진행

## 배포

- Frontend + Backend: **Railway** (GitHub 레포 연결, push 시 자동 배포)
- 정적 JSON만 있으면 되는 MVP라면 Vercel도 가능하지만,
  Python 백엔드(FastAPI)까지 같이 띄울 계획이라 Railway 추천

---

## 데이터 구조 (Data Schemas)

### 1. 상상대로 서울 자유제안 데이터 (`data/processed/상상대로_서울_출산육아_필터링.csv`)

| 컬럼명 | 타입 | 설명 | 비고 |
|---|---|---|---|
| `SN` | Float/Int | 제안 고유 번호 (ID) | Primary Key |
| `TITLE` | String | 제안 제목 | 키워드 필터링 대상 |
| `CONTENT` | String | 제안 본문 또는 본문 URL | 상세 스크래핑 시 본문 텍스트 채움 |
| `VOTE_SCORE` | Float | 제안 공감/득표 점수 | 수요 강도(Urgency) 측정 지표 |
| `REG_DATE` | String | 등록 일시 (`YYYY-MM-DD HH:MM:SS`) | 시계열 트렌드 분석용 |
| `VISIOIN_TXT` | String | 서울시 비전/분류 카테고리 | 예: 여성, 주택, 교통 등 |
| `USER_COMMENT_CNT` | Int | 댓글 수 | 관심도 지표 |
| `VOTE_CNT` | Int | 찬성 표수 | |
| `VOTE_DIS_CNT` | Int | 반대 표수 | |
| `REPLY_YN` | String | 서울시 공식 답변 여부 (`Y` / `N`) | **정책 공백(Gap) 탐지 핵심 필드** |

### 2. 자치구별 합계출산율 및 연령별 출산율 (`data/processed/합계출산율_및_모의_연령별_출산율_20260720153003.csv`)

| 컬럼명 | 타입 | 설명 |
|---|---|---|
| `자치구별(1)` | String | 25개 자치구명 (예: 종로구, 성동구, 강남구 등) |
| `합계출산율` | Float | 가임여성 1명당 예상 평균 출생아 수 (2024 기준 서울 평균 0.581) |
| `15-19세` ~ `45-49세` | Float | 모(母)의 연령대별 출산율 (여자인구 1천명당 명) |

### 3. 자치구별 출산순위별 출생 통계 (`data/processed/출산순위별_출생_20260720154514.csv`)

| 컬럼명 | 타입 | 설명 |
|---|---|---|
| `자치구별(2)` | String | 25개 자치구명 |
| `계` | Int | 해당 자치구 총 출생아 수 |
| `1아` / `2아` / `3아 이상` | Int | 첫째 / 둘째 / 셋째 이상 출생아 수 (성별 구분 포함) |

### 4. 자치구별 보육시설 현황 (`data/processed/보육시설_현황(정원규모별_구별)_20260720154435.csv`)

| 컬럼명 | 타입 | 설명 |
|---|---|---|
| `자치구별(2)` | String | 25개 자치구명 |
| `소계` | Int | 구별 총 보육시설(어린이집 등) 개수 |
| `20명 이하` ~ `300명 초과` | Int | 정원 규모별 보육시설 분포 개수 |

### 5. 보조 데이터: 국민권익위 공개제안 API (`OpenProposalService2`)

- **End Point**: `https://apis.data.go.kr/1140100/OpenProposalService2/getOpenProposalList`
- **주요 필드**: `title`(제안제목), `content`(제안내용), `regDate`(등록일), `category`(분류)

### 6. 대시보드 최종 파이프라인 출력 JSON (`data/final/dashboard_data.json`)

```json
{
  "summary": {
    "total_proposals": 269,
    "unanswered_proposals": 210,
    "avg_fertility_rate": 0.581
  },
  "districts": [
    {
      "district_name": "성동구",
      "fertility_rate": 0.714,
      "total_births": 1666,
      "first_child_births": 1202,
      "daycare_centers": 133,
      "proposal_count": 18,
      "top_keywords": ["돌봄", "키즈카페", "임신"]
    }
  ],
  "proposals": [
    {
      "sn": "202286",
      "title": "저출산 고령화 문제에 관한 제안",
      "vote_score": 0.0,
      "reply_yn": "N",
      "category": "임신·출산·건강",
      "matched_department": "저출생담당관"
    }
  ]
}
```

