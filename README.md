# 🏛️ 서울시 출산·양육 정책 수요 분석 대시보드 (UKKKK)

> **상상대로 서울 시민 정책 제안(824건) + 국민신문고 실시간 현장 민원(582건) + 몽땅정보통 서울시 공식 사업(323건) Multi-API 융합 기반 8대 대분류 및 조직도 18개 실무부서 1·2·3순위 라우팅 & 행정 답변 솔루션 대시보드**

---

## 🚀 최신 업데이트 핵심 기능 (2026.07.22)

1. **상상대로 서울 824건 100% 실시간 웹 원문 크롤링 & 검증 링크**
   * 상상대로 서울 포털(`idea.seoul.go.kr`) 원문에 직접 접속하여 100% 시민 작성 실 원문을 동기화 복원했습니다.
   * 각 제안 카드별 **`[🔗 상상대로 서울 원문 URL 직접 확인 ↗]`** 버튼을 통해 포털 원문 진본성을 1초 만에 검증할 수 있습니다.

2. **국민신문고 582건 공공 API 100% 상세 수집 & Executive 고가독성 모달 (`CivilRequestDetailModal`)**
   * 국민권익위원회 `OpenProposalItem` 공공 API를 연동하여 민원 본문(`content`) 및 시민 개선방안(`improveIdea`) 100% 풀 텍스트를 확보했습니다.
   * **8대 정책 분류 계층 경로(Breadcrumb)** + 소관 처리기관 + **`[🔗 국민신문고 포털에서 원문 전체 열람 ↗]`** 직관적 리더 카드를 적용했습니다.
   * 소분류/세목(Micro-category) 및 주제별 키워드 토픽 클러스터링을 적용하여 **실제 관련성이 높은 민원만 동적으로 정밀 매칭**합니다.

3. **유사 제안 원스톱 AI 군집화 & 일괄 행정 답변 공문 자동 생성 (`BatchReplyModal`)**
   * 유사 안건들을 묶어 담당 부서명(예: `저출생사업1팀`), 몽땅정보 연계 혜택 및 공식 행정 공문 견본을 자동 세팅하여 1클릭 복사/제출을 지원합니다.

4. **서울시 몽땅정보만능키 공식 포털(`https://umppa.seoul.go.kr`) 링크 자동 검증 & 예외 처리**
   * 공공데이터 몽땅정보통 신청 주소가 `"."` 이거나 빈 값인 경우, 공식 엄마아빠행복프로젝트 몽땅정보만능키 포털로 안전 포워딩하여 404 링크 오류를 원천 차단했습니다.

---

## 📂 1. 직관적 프로젝트 폴더 구조 (상세 안내: [DIRECTORY_MAP.md](file:///Users/parkcy/Desktop/sesac_pjt/UKKKK/DIRECTORY_MAP.md))

```text
UKKKK/
├── 📄 DIRECTORY_MAP.md                 # 🗺️ 직관적 디렉토리 & 데이터 전체 안내서
├── 📄 README.md                        # 📘 [현재 파일] 프로젝트 개요 및 종합 가이드
├── 📄 CONTRIBUTING.md                  # 🤝 협업 및 기여 가이드
│
├── 📂 docs/                            # 📄 프로젝트 기획서, 분석정의서, 로드맵 문서 모음
│   ├── 📄 서울시_출산정책_대시보드_기획서.md     # - 대시보드 기획 및 대분류 8개 축 기본 설계서
│   ├── 📄 보고서_및_발표_진행가이드.md        # - 내일 회의 및 최종 데모데이 발표 피치덱 가이드
│   ├── 📄 데이터분석정의서.docx               # - 데이터 분석 및 파이프라인 정의서
│   └── 📄 역할분담_및_일정가이드.md           # - 4인 팀 역할 분담 및 일자별 가이드
│
├── 📂 data/                            # 📊 원천, 가공, DB, 백업 데이터 일체 관리
│   ├── 📂 raw/                         # 1️⃣ [원천] 통계청 / 서울시 공공데이터 수집 원본
│   ├── 📂 mongttang/                    # 2️⃣ [DB] 몽땅정보통 323개 사업 & 서울시 조직도 DB
│   ├── 📂 processed/                    # 3️⃣ [가공] 규칙 기반 필터링 및 확장 데이터셋 (824건)
│   └── 📂 final/                        # 4️⃣ [최종] 100% 원문 동기화 proposals.json & civil_requests_all.json
│
├── 📂 scripts/                         # 🐍 파이썬 2단계 수집, 스크래핑, 분류, 매칭 파이프라인
│   ├── 🐍 01_collect_birth_policy_proposals.py  (# 규칙 기반 scoring & 5대 룰 정밀 분류)
│   ├── 🐍 06_build_department_ranking.py        (# 조직도 R&R 1·2·3순위 랭킹 & 몽땅정보 매칭)
│   ├── 🐍 fetch_real_proposal_contents.py       (# 상상대로 서울 824건 100% 웹 원문 크롤링)
│   ├── 🐍 fetch_all_civil_details.py            (# 국민신문고 582건 OpenProposalItem 상세 수집)
│   └── 🐍 clean_civil_titles_and_contents.py    (# 국민신문고 풀제목 디코딩 & HTML 이스케이프 정화)
│
├── 📂 frontend/                        # 💻 React + Vite 대시보드 웹 애플리케이션
│   ├── 📁 src/components/               # - 행정관/시민용 UI 컴포넌트 모음 (PriorityDetails, BatchReplyModal 등)
│   ├── 📁 src/data/civil_requests_all.json # - 국민신문고 582건 상세 연동 데이터셋
│   ├── 📁 src/data/mongttang.json       # - 상상대로 824건 원문 동기화 데이터셋
│   └── 📁 src/data/mockData.ts          # - 대시보드 바인딩 및 자치구 통계
│
└── 📂 backend/                         # ⚙️ 백엔드 서비스
```

---

## ⚡ 2. 대시보드 프론트엔드 실행 방법 (Quick Start)

Node.js 환경에서 아래 명령어를 통해 React/Vite 대시보드를 즉시 실행할 수 있습니다.

```bash
# 1. frontend 디렉토리 이동
cd frontend

# 2. 의존성 패키지 설치
npm install

# 3. 개발 서버 실행 (기본 포트: http://localhost:3002)
npm run dev

# 4. 프로덕션 빌드 및 타입 검증
npm run build
```

---

## 🐍 3. 데이터 파이프라인 실행 가이드

파이썬 수집, 상세 스크래핑 및 매칭 파이프라인은 아래 순서로 가동됩니다.

```bash
# 1. 19,657건 원문 대상 2단계 규칙 기반 수집 & 5대 룰 분류 가동
python scripts/01_collect_birth_policy_proposals.py

# 2. 상상대로 서울 824건 웹 원문 100% 실시간 동기화
python scripts/fetch_real_proposal_contents.py

# 3. 국민신문고 582건 OpenProposalItem 공공 API 상세 본문 수집 및 HTML 이스케이프 정화
python scripts/fetch_all_civil_details.py
python scripts/clean_civil_titles_and_contents.py

# 4. 서울시 18개 실무팀 조직도 R&R 랭킹(1·2·3순위) 및 몽땅정보통 323개 사업 매칭
python scripts/06_build_department_ranking.py
```

---

## 🏷️ 4. 출산·양육 대분류 8개 축 체계

1. **임신·난임·생식건강**: 난임 시술비지원, 산전검사, 가임력 검사, 난자동결
2. **출산·산후 초기지원**: 출산지원금, 첫만남이용권, 산후조리원, 산모회복, 산후우울증
3. **보육·돌봄 인프라**: 국공립 어린이집, 키움센터, 야간/주말/아픈아이 긴급돌봄, 공공키즈카페, 소아응급
4. **다자녀·양육비·생활지원**: 다자녀 혜택/감면, 양육수당, 부모급여, 분유/기저귀 지원
5. **주거·교통·도시생활환경**: 신혼부부/출산가구 주거지원, 임산부 배려석/뱃지/교통, 유모차 이동편의
6. **일·가정 양립·부모 노동**: 육아휴직, 출산휴가, 부모 유연근무/단축근무
7. **취약·다양가족 사각지대**: 한부모 가구, 미혼모/부, 위기임산부
8. **정보·상담·교육·거버넌스**: 양육지원 서비스 접근성, 초보부모 공동육아, 저출산 정책 제안

---

## 🌐 5. Multi-API 융합 데이터 구조 (3원 ➔ 5원 확장 로드맵)

```text
[시민 수요] 상상대로 서울 (824건) ──────┐
                                       │
[현장 민원] 국민신문고 (582건)  ───────┼─► [8대 대분류 통합 정규화] ─► [부서 R&R 1·2·3순위 라우팅 & 일괄 공문]
                                       │
[정책 공급] 몽땅정보통 (323건)  ───────┤
                                       │
[공공 통계] 자치구 TFR/보육인프라 ─────┘
                                       │
[확장 5축] 네이버 뉴스 여론 API & 서울시 키움센터/어린이집 실시간 정원 API
```

---

## 🤝 6. 기여 및 개발 문의
- 상세 디렉토리 구조 및 가이드는 [DIRECTORY_MAP.md](file:///Users/parkcy/Desktop/sesac_pjt/UKKKK/DIRECTORY_MAP.md)를 참조하세요.
