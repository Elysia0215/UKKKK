# 💻 UKKKK 백오피스 대시보드 MVP 소스코드 & 실행 가이드

서울시 출산·양육 정책 수요 분석 및 갭 진단 시스템 **UKKKK** 웹 애플리케이션 MVP의 구현 명세 및 로컬 실행 가이드입니다.

---

## 🌐 1. 대시보드 MVP 로컬 실행 주소
* **로컬 웹 애플리케이션 실행 URL**: `http://localhost:3000/`
* **개발 환경**: React 18 + TypeScript + Vite + TailwindCSS + Recharts + Motion

---

## 📂 2. 대시보드 6대 메인 탭 소스코드 아키텍처 (`frontend/src/components/`)

| 탭 번호 | 탭 명칭 (메인 메뉴) | 소스코드 파일 위치 | 핵심 기능 및 구현 내용 |
| :---: | :--- | :--- | :--- |
| **01** | **`1. 수요 현황 종합`** | [DashboardOverview.tsx](file:///Users/parkcy/Desktop/sesac_pjt/UKKKK/frontend/src/components/DashboardOverview.tsx) | 824건 제안 전체 현황, 4대 KPI 카드, 부서별 R&R 분류 비중, 인사이트 TOP 3 |
| **02** | **`2. 시민 목소리 분석`** | [CategoryDemand.tsx](file:///Users/parkcy/Desktop/sesac_pjt/UKKKK/frontend/src/components/CategoryDemand.tsx) | TF-IDF TOP 30 태그 클라우드, 5단계 생애주기 다차원 필터, 공감 Top 5 원문 팝업 |
| **03** | **`3. 긴급 민원 처리`** | [PriorityDetails.tsx](file:///Users/parkcy/Desktop/sesac_pjt/UKKKK/frontend/src/components/PriorityDetails.tsx) | KR-SBERT 유사도 의미 군집화, 30건 슬라이싱 성능 최적화, 1클릭 AI 공문 답변 |
| **04** | **`4. 몽땅정보 현행사업`** | [MongttangList.tsx](file:///Users/parkcy/Desktop/sesac_pjt/UKKKK/frontend/src/components/MongttangList.tsx) | 322개 서울시 공식 지원 사업 검색 DB, 시민 제안 대조 및 몽땅통 원문 링크 |
| **05** | **`5. 정책 갭 진단`** | [ClusterVolumeMap.tsx](file:///Users/parkcy/Desktop/sesac_pjt/UKKKK/frontend/src/components/ClusterVolumeMap.tsx) | 6대 갭 매트릭스 진단표 (MCDA 3종 가중치), 5원 근거 AI 답변 승인 패널 |
| **06** | **`6. 결측치 복원 & 통합 로그`** | [MissingDataSimulator.tsx](file:///Users/parkcy/Desktop/sesac_pjt/UKKKK/frontend/src/components/MissingDataSimulator.tsx) | 97.6% 구 미상 결측치 텍스트마이닝 일괄 복원, Human-in-the-loop 4종 통합 로그 뷰어 |

---

## 🛠️ 3. 백오피스 어시스턴트 & 보고서 다운로드 시스템
* **`🌱 새싹이 오피스 길잡이`**: [OfficeAssistant.tsx](file:///Users/parkcy/Desktop/sesac_pjt/UKKKK/frontend/src/components/OfficeAssistant.tsx)
  * 최신 6대 탭 동기화 및 8대 실무 부서(저출생사업1팀, 영유아담당관 등) 5단계 전담 행정 업무 플로우 가이드.
* **`맞춤 보고서 생성 시스템`**: [ReportExportModal.tsx](file:///Users/parkcy/Desktop/sesac_pjt/UKKKK/frontend/src/components/ReportExportModal.tsx)
  * 2026.07 데이터 보고서 날짜 최신화, 3D 캐릭터 배경 틴트 오버레이, 6개 섹션 맞춤 빌더 (HWP / PDF / Excel).
