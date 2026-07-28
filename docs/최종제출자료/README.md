# 🏆 UKKKK (Unified Key-Knowledge Kit for Kid) 프로젝트 최종 제출 자료집

서울시 출산·양육 정책 수요 분석 및 갭 진단 시스템 **UKKKK**의 최종 제출 자료 모음입니다.

---

## 📂 최종 제출 산출물 목록 (Final Assets)

| 번호 | 문서/산출물명 | 최종본 파일명 (클릭 가능) | 설명 및 주요 내용 |
| :---: | :--- | :--- | :--- |
| **01** | **PRD & 시스템 기획서** | 📄 [01_PRD_시스템기획서_최종본_ver3.md](file:///Users/parkcy/Desktop/sesac_pjt/UKKKK/docs/최종제출자료/01_PRD_시스템기획서_최종본_ver3.md) | 서비스 정의, 문제정의, 6대 메인 탭 명세, 8대 R&R 부서 라우팅 설계서 (최종 ver3) |
| **02** | **서비스 기획서** | 📄 [02_대시보드_서비스기획서_최종본_ver4.md](file:///Users/parkcy/Desktop/sesac_pjt/UKKKK/docs/최종제출자료/02_대시보드_서비스기획서_최종본_ver4.md) | 출산·양육 백오피스 대시보드 서비스 상세 기획서 (최종 ver4) |
| **03** | **데이터 분석 정의서** | 📄 [03_데이터분석정의서_최종본_ver3.md](file:///Users/parkcy/Desktop/sesac_pjt/UKKKK/docs/최종제출자료/03_데이터분석정의서_최종본_ver3.md)<br />📝 [03_데이터분석정의서_최종본_ver3.docx](file:///Users/parkcy/Desktop/sesac_pjt/UKKKK/docs/최종제출자료/03_데이터분석정의서_최종본_ver3.docx) | 5원 데이터(제안·민원·정책 DB·뉴스·KOSIS 공공통계) 분석 방법론 및 파이프라인 정의서 |
| **04** | **EDA 데이터 분석 보고서** | 📄 [04_EDA_데이터분석보고서_ver1.md](file:///Users/parkcy/Desktop/sesac_pjt/UKKKK/docs/최종제출자료/04_EDA_데이터분석보고서_ver1.md) | 상상대로 824건 제안 및 민원 데이터 탐색적 데이터 분석(EDA) 종합 보고서 |
| **05** | **발표 대본 & PPT 구성** | 📄 [05_발표대본_PPT구성_최종본_ver15.md](file:///Users/parkcy/Desktop/sesac_pjt/UKKKK/docs/최종제출자료/05_발표대본_PPT구성_최종본_ver15.md) | 15분 발표용 슬라이드별 팩트 검증 발표 대본 & PPT 구성안 (ver15 축약본) |
| **06** | **발표 슬라이드 PPTX** | 📊 [06_발표슬라이드_PPTX_최종본_ver17.pptx](file:///Users/parkcy/Desktop/sesac_pjt/UKKKK/docs/최종제출자료/06_발표슬라이드_PPTX_최종본_ver17.pptx) | 시각화 캡처 및 대본 연동이 완료된 최신 최종 발표 슬라이드 덱 (ver17) |
| **07** | **개발 일지 종합 보고서** | 📄 [07_개발일지_종합보고서.md](file:///Users/parkcy/Desktop/sesac_pjt/UKKKK/docs/최종제출자료/07_개발일지_종합보고서.md) | 프로젝트 전체 구현 이력, 버그 수정 및 백오피스 고도화 종합 일지 |
| **08** | **제출자료 정합성 점검표** | 📄 [08_제출자료_정합성_점검표.md](file:///Users/parkcy/Desktop/sesac_pjt/UKKKK/docs/최종제출자료/08_제출자료_정합성_점검표.md) | 수치·용어·기능 정합성 100% 검증 체크리스트 |

---

## 💻 대시보드 MVP 실행 주소 및 소스코드 위치

* **웹 대시보드 MVP 로컬 실행 주소**: `http://localhost:3000/`
* **프론트엔드 소스코드 루트**: `frontend/src/`
  * **[1. 수요 현황 종합]**: [DashboardOverview.tsx](file:///Users/parkcy/Desktop/sesac_pjt/UKKKK/frontend/src/components/DashboardOverview.tsx)
  * **[2. 시민 목소리 분석]**: [CategoryDemand.tsx](file:///Users/parkcy/Desktop/sesac_pjt/UKKKK/frontend/src/components/CategoryDemand.tsx)
  * **[3. 긴급 민원 처리]**: [PriorityDetails.tsx](file:///Users/parkcy/Desktop/sesac_pjt/UKKKK/frontend/src/components/PriorityDetails.tsx)
  * **[4. 몽땅정보 현행사업]**: [MongttangList.tsx](file:///Users/parkcy/Desktop/sesac_pjt/UKKKK/frontend/src/components/MongttangList.tsx)
  * **[5. 정책 갭 진단]**: [ClusterVolumeMap.tsx](file:///Users/parkcy/Desktop/sesac_pjt/UKKKK/frontend/src/components/ClusterVolumeMap.tsx)
  * **[6. 결측치 복원 & 통합 로그]**: [MissingDataSimulator.tsx](file:///Users/parkcy/Desktop/sesac_pjt/UKKKK/frontend/src/components/MissingDataSimulator.tsx)

---

## 💡 주요 기술적 특징
1. **5원 데이터 융합 파이프라인**: 상상대로 제안(824건) + 국민신문고 민원(582건) + 몽땅정보통 정책DB(323건) + 네이버 뉴스(1,145건) + KOSIS 자치구 통계.
2. **KR-SBERT 기반 유사 제안 군집화 & 6대 갭 매트릭스**: 시민 수요와 기존 정책 공급 불일치를 다기준 의사결정(MCDA)으로 수치화.
3. **서울시 8대 실무 부서 1:1 라우팅 매핑**: 조직도 기반 1·2·3순위 R&R 매칭.
4. **1클릭 행정 공문 AI 생성 & Human-in-the-loop 이력 관리**: 담당자 수정 승인 보장 및 통합 로그 기록.
