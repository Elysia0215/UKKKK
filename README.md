# 서울시 출산·양육 정책 수요 분석 대시보드

## 폴더 구조
```
class_pjt/
├── docs/                    기획서, 데이터분석정의서, PRD
├── data/
│   ├── raw/                 4명 각자의 스크래핑 결과 (part_1~4.csv)
│   ├── processed/           병합·분류 완료된 중간 산출물
│   └── final/                React 앱에 넣을 최종 JSON
├── scripts/                 데이터 수집·스크래핑·JSON변환 파이프라인
│   ├── 01_collect_proposals.py
│   ├── 02_scrape_details.py
│   ├── 02b_merge_parts.py
│   └── 04_build_dashboard_json.py
├── 정책/                    정책분류·부서매칭 (프로젝트 핵심 로직)
│   ├── category_keywords.py    정책분류 키워드 사전 (수정은 여기서)
│   ├── department_keywords.py  담당부서 키워드 사전 (수정은 여기서)
│   └── 03_classify.py          위 두 사전으로 실제 분류 실행
├── frontend/                React 대시보드 (Google AI Studio 산출물)
└── backend/                 (필요시) FastAPI
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
