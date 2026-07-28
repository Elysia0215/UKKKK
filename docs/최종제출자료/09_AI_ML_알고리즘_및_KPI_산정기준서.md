# 🤖 UKKKK 실제 적용 AI/ML/DL 알고리즘 & KPI 산정 공식 세부 명세서

서울시 출산·양육 정책 수요 분석 및 갭 진단 시스템 **UKKKK**에 실제 구현 및 적용된 **AI, 머신러닝(ML), 딥러닝(DL), 텍스트마이닝(NLP), LLM 모델 및 KPI 산정 수식**의 전수 정리 문서입니다.

---

## 1. 🧠 프로젝트에 실제 적용된 AI / ML / DL / NLP 기술 명세

| 구분 | 기술 / 모델명 | 적용 위치 및 구체적 역할 | 실제 적용 알고리즘 & 메커니즘 |
| :---: | :--- | :--- | :--- |
| **딥러닝 (DL)** | **KR-SBERT**<br />(`snunlp/KR-SBERT-V40K-klue-subword-aug`) | **[3. 긴급 민원 처리] & [5. 정책 갭 진단]**<br />시민 제안 824건 및 민원 582건의 유사 제안 자동 군집화 (Clustering) | 한국어 문장 임베딩(768차원 Dense Vector) ➔ Cosine Similarity (0.70~0.80) 기준 고정밀 의미 유사 제안 묶음 생성 |
| **머신러닝 (ML)** | **TF-IDF & NMF/LDA 토픽 모델링** | **[2. 시민 목소리 분석]**<br />비정형 시민 제안 텍스트에서 57개 주제 군집 추출 및 TOP 30 핵심 키워드 추출 | 단순 빈도(TF)의 한계를 극복하는 역문서 빈도(IDF) 중요도 스코어링 + 비음수 행열 분해(NMF) 기반 토픽 추출 |
| **텍스트마이닝 (NLP)** | **한국어 형태소 전처리 & 자치구 결측치 복원 엔진** (`textMining.ts`) | **[6. 결측치 복원 & 통합 로그]**<br />97.6% 구 미상 자치구 결측치 텍스트 추정 복원 | 조사/어미 제거(`normalizeKoreanWord`) + 유의어 통합(`SYNONYM_MERGES`) + 불용어 제거 + 7개 중의성 키워드 문맥 안심 가드레일(`AMBIGUOUS_DISTRICT_KEYWORDS`) |
| **유연 라우팅 (ML)** | **TF-IDF 기반 부서 R&R 라우터** (`checkDeptMatch.ts`) | **[전체 탭] 헤더 부서 필터링**<br />서울시 8대 대분류 카테고리 ➔ 14개 실무 부서 1·2·3순위 라우팅 | 8대 대분류 R&R 키워드 파이프라인 매칭으로 부서별 0건 필터 소멸 방지 및 맞춤 가이드 연동 |
| **생성형 AI (LLM)** | **Google Gemini 1.5 Pro / GPT-4o** | **[3. 긴급 민원 처리] & [5. 정책 갭 진단]**<br />1클릭 행정 공문 초안 자동 생성 (AI Auto-Drafting) | 행정 공문체 Prompt Engineering ➔ 시민 제안 + 5원 근거(학술/뉴스/통계) 통합 행정 공문 초안 즉시 생성 |
| **다기준 의사결정 (ML)** | **MCDA 6대 갭 매트릭스 알고리즘** | **[5. 정책 갭 진단]**<br />시민 수요 대비 정책 공급 공백 수치화 | 수요·공급·민원·뉴스·학술·인프라 6개 축 다기준 가중합(Weighted Sum Score) 스코어링 |

---

## 2. 📐 KPI 산정 공식 & 가중치 방법론 (MCDA)

### ① 시민 체감 정책 공백 지수 (Policy Gap Score)
$$\text{Policy Gap Score} = \frac{\text{시민 제안 수요량 (Demand)}}{\text{몽땅정보통 현행 정책 수 (Supply) } + 1} \times \log(1 + \text{공감수})$$

### ② 6대 갭 매트릭스 종합 신뢰도 스코어 (Evidence Confidence Index)
$$\text{Confidence Score} = \sum_{i=1}^{6} w_i \times S_i = w_1 S_{\text{수요}} + w_2 S_{\text{공급공백}} + w_3 S_{\text{민원시급성}} + w_4 S_{\text{뉴스여론}} + w_5 S_{\text{학술근거}} + w_6 S_{\text{인프라통계}}$$

* **가중치 옵션 3종 제공**:
  1. **기본 균등 가중치**: $w_1 = w_2 = w_3 = w_4 = w_5 = w_6 = 0.166$
  2. **박미경 (2022) 연구 가중치**: 수요(0.25), 공급공백(0.25), 민원시급성(0.20), 뉴스(0.10), 학술(0.10), 통계(0.10)
  3. **KICCE (2023) 육아정책 연구 가중치**: 수요(0.30), 공급공백(0.20), 민원시급성(0.25), 뉴스(0.08), 학술(0.07), 통계(0.10)

---

## 📂 3. 제출자료 파일별 AI/ML/KPI 상세 기재 위치

| 제출자료 파일명 | AI/ML/DL/NLP & KPI 관련 주요 기재 섹션 |
| :--- | :--- |
| 📄 **[01_PRD_시스템기획서_최종본_ver3.md](file:///Users/parkcy/Desktop/sesac_pjt/UKKKK/docs/최종제출자료/01_PRD_시스템기획서_최종본_ver3.md)** | `## 3. 데이터 파이프라인 및 AI/ML 모델 아키텍처`<br />`## 4. 6대 갭 매트릭스 & KPI 산정 수식 (MCDA)` |
| 📄 **[02_대시보드_서비스기획서_최종본_ver4.md](file:///Users/parkcy/Desktop/sesac_pjt/UKKKK/docs/최종제출자료/02_대시보드_서비스기획서_최종본_ver4.md)** | `4. KPI 가설 및 가중치 방법론`<br />`[Page 8] 결측치 복원 & textMining.ts 알고리즘` |
| 📄 **[03_데이터분석정의서_최종본_ver3.md](file:///Users/parkcy/Desktop/sesac_pjt/UKKKK/docs/최종제출자료/03_데이터분석정의서_최종본_ver3.md)** | `3. 개발 내용 - [수요 vs 공급 불균형 프레임]`<br />`4. KPI 가설 - 3가지 가중치 방법론 (기본/박미경2022/KICCE2023)` |
| 📄 **[04_EDA_데이터분석보고서_ver1.md](file:///Users/parkcy/Desktop/sesac_pjt/UKKKK/docs/최종제출자료/04_EDA_데이터분석보고서_ver1.md)** | `TF-IDF 기반 키워드 스코어링 및 NMF 토픽 모델링 파이프라인` |
| 📄 **[05_발표대본_PPT구성_최종본_ver15.md](file:///Users/parkcy/Desktop/sesac_pjt/UKKKK/docs/최종제출자료/05_발표대본_PPT구성_최종본_ver15.md)** | 슬라이드 7 (`KR-SBERT 군집화`), 슬라이드 12 (`MCDA 6대 갭 매트릭스 & Gemini AI 공문 생성`) |
| 📄 **[09_AI_ML_알고리즘_및_KPI_산정기준서.md](file:///Users/parkcy/Desktop/sesac_pjt/UKKKK/docs/최종제출자료/09_AI_ML_알고리즘_및_KPI_산정기준서.md)** | **본 전용 명세 문서** |
