/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sparkles, HelpCircle, X, ArrowLeft, ArrowRight, Play, BookOpen, MapPin } from 'lucide-react';

interface Props {
  selectedDept: string | null;
  activeTab: number;
  onNavigateToTab: (tabIndex: number) => void;
  publicSubTab?: 'district' | 'demographics' | 'structure';
}

// 탭(메뉴)별 "이 화면은 왜 있는지" + "지금 할 수 있는 일" + "고급 활용 팁" 단계별 안내
const PAGE_GUIDE: Record<number, { title: string; purpose: string; steps: string[]; advanced: string[]; footnotes?: Record<string, string> }> = {
  0: {
    title: '수요 현황 종합',
    purpose: '서울시 출산·육아 시민 제안 824건의 전체 현황, 연도별 트렌드, 부서별 분류, 데이터 품질 보고를 한눈에 파악하는 종합 대시보드입니다.',
    steps: [
      '상단 4대 KPI 카드(전체 제안·답변 완료·미답변·평균 공감)에서 현재 현황을 확인합니다.',
      '부서별 현황 섹션에서 8대 대분류(보육·돌봄, 주거·교통, 일·가정 양립 등) 소관 부서의 분류 비중과 처리 상태를 확인합니다.',
      '핵심 인사이트 TOP 3에서 가장 시급한 정책 이슈를 파악하고 클릭하여 상세 탭으로 이동합니다.'
    ],
    advanced: [
      '데이터 품질 정제 보고 섹션에서 텍스트마이닝 전처리(조사 제거·불용어 필터링) 현황을 확인할 수 있습니다.',
      '상단 헤더의 부서 필터를 지정하면 전체 대시보드가 해당 부서 소관 카테고리로 실시간 필터링됩니다.',
      '카드 안 개별 항목 클릭 시 해당 카테고리가 필터링된 채로 다른 탭으로 자동 이동합니다.'
    ],
    footnotes: {
      'KPI': 'Key Performance Indicator — 핵심 성과 지표. 정책 현황을 한눈에 보여주는 요약 수치',
      '텍스트마이닝': '비정형 텍스트에서 의미 있는 패턴·키워드를 자동 추출하는 NLP 기법',
      '8대 R&R 분류': '서울시 여성가족실 조직도 기반 출산·보육·돌봄 관련 8개 소관 부서 역할 분류 체계'
    }
  },
  2: {
    title: '시민 목소리 분석',
    purpose: 'TF-IDF 기반 TOP 30 핵심 키워드 태그 클라우드와 5단계 생애주기별 수요 강도를 분석하는 화면입니다.',
    steps: [
      '태그 클라우드에서 최근 급상승 키워드(크기=TF-IDF 중요도)를 확인합니다.',
      '키워드를 클릭하면 하단 2축 차트와 TOP 5 제안이 실시간 필터링됩니다.',
      '5단계 다차원 분류체계 필터(연도·생애주기·대분류·중분류·세분류·부서)로 정밀 탐색합니다.'
    ],
    advanced: [
      '키워드 태그에 마우스를 올리면 실제 포함 제안수, 텍스트 빈도(TF), TF-IDF 점수, 주 연관 부서가 메트릭스로 표시됩니다.',
      '좌측 2축 차트에서 연도별 트렌드와 공감도를 동시에 비교할 수 있습니다.',
      'CSV 다운로드 버튼으로 키워드 분석 결과를 엑셀로 내보낼 수 있습니다.'
    ],
    footnotes: {
      'TF-IDF': 'Term Frequency–Inverse Document Frequency — 특정 문서에서 자주 등장하지만 전체 문서에서는 드문 단어일수록 높은 점수를 부여하는 키워드 중요도 측정 기법',
      '태그 클라우드': '키워드를 빈도·중요도에 비례하는 크기로 시각화한 워드맵',
      '5단계 생애주기': '임신준비 → 임신·출산 → 영아(0~2세) → 유아(3~5세) → 초등 이후의 정책 수요 분류 체계'
    }
  },
  3: {
    title: '긴급 민원 처리',
    purpose: '시민 제안(824건) 및 민원 데이터를 유사 제안 군집별(KR-SBERT 의미 유사도 기준)로 묶어, 미답변 제안과 긴급 안건을 한눈에 검토하고 일괄 답변하는 실무 화면입니다.',
    steps: [
      '상단 검색 + 고정밀 필터(연도·생애주기·대분류·중분류·부서)로 담당 범위를 좁힙니다.',
      '그룹화 뷰에서 유사 제안 군집을 확인하고 [원스톱 일괄 답변] 버튼을 클릭합니다.',
      'AI 공문 초안을 검토·수정 후 승인 처리합니다.'
    ],
    advanced: [
      '깜빡이는 [다중선택] 버튼을 ON하면 여러 제안을 체크박스로 선택해 일괄 CSV 내보내기·답변이 가능합니다.',
      '리스트 뷰와 그룹화 뷰를 전환하며 개별/군집 단위로 검토할 수 있습니다.',
      '맞춤 CSV 버튼으로 현재 필터 조건의 제안 목록을 엑셀 데이터로 다운로드할 수 있습니다.'
    ],
    footnotes: {
      '우수제안 (공감 150표 이상)': '상상대로 서울 플랫폼에서 시민들이 제안에 동의 표시를 누른 횟수가 150표 이상인 제안. 군집화(그룹핑) 기준과는 무관하며, 우선순위 필터링용 지표',
      '군집(그룹)': 'KR-SBERT 임베딩 기반 의미 유사도(70~80%)로 "내용이 비슷한 제안"끼리 자동 그룹화한 묶음. 공감수와는 별개의 기준',
      'AI 공문 초안': 'Gemini/GPT 모델이 행정 공문체로 사전 생성한 답변 초안. 담당자가 검토·수정 후 승인'
    }
  },
  4: {
    title: '현행 정책 검색',
    purpose: '몽땅정보 만능키에 등록된 서울시 322개 공식 출산·보육 사업을 검색하여 시민 제안과 대조하는 화면입니다.',
    steps: [
      '검색창에 키워드를 입력해 관련 기존 정책을 찾습니다.',
      '카테고리 필터로 유사 사업을 묶어서 확인합니다.',
      '시민 제안과 비교해 이미 있는 정책인지, 공백인지 판단합니다.'
    ],
    advanced: [
      '정책명뿐 아니라 이용대상·지원내용 텍스트로도 검색되므로, 대상(예: "다자녀", "한부모")으로 찾으면 더 빠르게 걸립니다.',
      '"없는 정책"으로 확인되면 [정책 갭 진단] 탭에서 해당 카테고리의 공백 점수를 대조해 보십시오.',
      '[자치구 통계 비교] 탭과 함께 보면 자치구별 시행 여부가 다른 사업도 확인할 수 있습니다.'
    ],
    footnotes: {
      '몽땅정보 만능키': '서울시가 운영하는 출산·육아 통합 정보 포털. 322개 공식 지원 사업의 신청 조건·방법·링크를 제공',
      '정책 공백': '시민 수요는 있지만 대응하는 공식 지원 사업이 없거나 부족한 영역'
    }
  },
  5: {
    title: '정책 사각지대 탐색',
    purpose: '시민 제안을 의미 군집으로 묶어 요구량(X축) 대비 공감도(Y축)를 버블 차트로 시각화하고, 정책 공급 격차가 큰 사각지대를 탐색하는 화면입니다.',
    steps: [
      '상단 4대 KPI 카드(분석 군집수, 고위험 사각지대, 보완 권장, 최대 격차점수)로 전체 현황을 파악합니다.',
      'TOP 3 사각지대 경고 카드를 클릭하면 해당 군집의 상세 제안 묶음으로 바로 이동합니다.',
      '버블 차트에서 빨간색·큰 버블(고위험)부터 우선 검토합니다.'
    ],
    advanced: [
      '하단 카테고리별 격차 가로 바 차트에서 어느 생애주기 영역의 정책 공급이 가장 부족한지 한눈에 비교합니다.',
      '전체 군집 목록 테이블을 펼치면 격차점수 순위로 정렬된 전체 주제를 확인하고 [제안 묶음 ↗] 클릭으로 상세 이동합니다.',
      '상단 헤더 부서 필터를 지정하면 해당 부서 소관 카테고리의 군집만 필터링되어 표시됩니다.'
    ],
    footnotes: {
      '의미 군집': 'KR-SBERT 임베딩으로 문장 의미가 유사한 제안들을 자동 그룹화한 묶음',
      '격차점수': '시민 수요 강도 대비 기존 정책 공급 수준의 차이를 수치화한 지표. 높을수록 정책 공백이 심각',
      '사각지대': '시민 수요는 높지만 대응하는 정책이 없거나 부족한 영역'
    }
  },
  6: {
    title: '자치구별 정책·제안 비교',
    purpose: '서울시 25개 자치구 GeoJSON 행정구역 지도와 KOSIS 공공데이터(출생아수·보육시설수)를 시민 제안 데이터와 교차 비교하는 화면입니다.',
    steps: [
      '상단 지도 시각화 지표(합계출산율·출생아수·보육시설수·정책수요점수)를 선택해 지도 색상을 전환합니다.',
      '행정구역 지도에서 자치구를 클릭해 해당 구의 제안 현황과 공공 통계를 확인합니다.',
      '이중축 차트에서 시민 제안수(막대)와 출생아수·보육시설수(꺾은선)를 비교합니다.'
    ],
    advanced: [
      '지도에서 색이 진한 구일수록 해당 지표 값이 높습니다 — 제안은 많은데 보육시설이 적은 구가 공급 공백 지역입니다.',
      '하단 25개 자치구 퀵 필터로 특정 구의 제안 목록을 바로 조회합니다.',
      '이 탭의 수치는 KOSIS 공식 통계이므로, 보고서 인용 시 반드시 "공식 통계"로 출처를 구분하십시오.'
    ],
    footnotes: {
      'GeoJSON': '지리 정보를 JSON 형식으로 표현하는 국제 표준. 서울시 25개 자치구 경계선 데이터에 사용',
      'KOSIS': '통계청 국가통계포털(Korean Statistical Information Service). 출생아수·보육시설수 등 공식 통계 출처',
      '이중축 차트': 'Y축을 2개 사용하여 단위가 다른 지표(건수 vs 시설수)를 하나의 차트에서 비교하는 시각화'
    }
  },
  // 탭 6의 서브탭 "인구동향 분석"용 (코드에서 6.5로 참조)
  6.5: {
    title: '인구동향 분석 (2025 잠정)',
    purpose: '통계청 2025년 잠정 속보치 기반 서울시 합계출산율·출생아수 인구동향을 25개 자치구별로 분석하는 화면입니다.',
    steps: [
      '서울시 전체 합계출산율(0.630명) 및 출생아수 요약 KPI를 확인합니다.',
      '25개 자치구별 출산율 순위 차트에서 최고/최저 구를 파악합니다.',
      '연도별 트렌드 그래프에서 하락·반등 추이를 분석합니다.'
    ],
    advanced: [
      '차트 위 마우스 호버로 자치구별 상세 수치(출생아수, 전년 대비 증감률)를 확인할 수 있습니다.',
      '이 데이터는 통계청 KOSIS "시군구별 합계출산율" 2025년 잠정치입니다.',
      '[자치구별 정책·제안 비교] 서브탭으로 전환하면 같은 자치구의 시민 제안 데이터와 교차 비교가 가능합니다.'
    ],
    footnotes: {
      '합계출산율': '한 여성이 가임 기간(15~49세) 동안 낳을 것으로 예상되는 평균 출생아 수. 서울시 2025년 잠정치 0.630명',
      '잠정 속보치': '통계청이 확정 발표 전에 선공개하는 예비 수치. 추후 소폭 조정 가능',
      'KOSIS': '통계청 국가통계포털(Korean Statistical Information Service)'
    }
  },
  // 탭 6의 서브탭 "민원 구조 분석"용 (코드에서 6.7로 참조)
  6.7: {
    title: '민원 구조 분석',
    purpose: '전체 시민 제안을 "서울시 전체 공통 민원"과 "자치구 특화 민원"으로 분리하여, 데이터 구조적 특성과 카테고리별 분포 차이를 인포그래픽으로 분석하는 화면입니다.',
    steps: [
      '상단 도넛 차트에서 공통 민원 vs 구별 특화 민원의 전체 비율을 확인합니다.',
      '구별 특화 민원 바차트에서 어느 자치구에 제안이 집중되는지 파악합니다.',
      '카테고리별 스택 바에서 8대 분류마다 공통/특화 비율 차이를 비교합니다.'
    ],
    advanced: [
      '공통 민원 비율이 높은 카테고리는 서울시 광역 차원의 정책 대응이 필요합니다.',
      '특화 민원이 집중된 자치구는 [자치구별 정책·제안 비교] 서브탭에서 공공통계와 교차 분석해 보십시오.',
      '하단 인사이트에서 공통 vs 특화 민원의 공감도 차이를 확인하면 정책 우선순위 판단에 참고할 수 있습니다.'
    ],
    footnotes: {
      '서울시 공통 민원': '자치구를 지정하지 않은 "구 미상" 제안. 특정 지역이 아닌 서울시 전체를 대상으로 하는 정책 수요',
      '구별 특화 민원': '특정 자치구를 언급하거나 지정한 제안. 텍스트마이닝으로 자치구가 복원된 건 포함',
      '스택 바': '하나의 바 안에 두 가지 이상의 범주를 누적하여 비율을 보여주는 차트'
    }
  },
  7: {
    title: '정책 갭 진단',
    purpose: '수요·공급·민원 통합 6대 갭 매트릭스 진단표로 정책 공백을 진단하고 AI 답변 승인까지 처리하는 최종 의사결정 화면입니다.',
    steps: [
      '좌측 필터에서 부서·신뢰도 기준을 설정합니다. (i) 아이콘에 마우스를 올리면 신뢰도 산정 기준(MCDA 방법론 + 논문 근거)을 확인할 수 있습니다.',
      '진단표에서 진단 상태(정책 공백·보완 필요·모니터링 등)를 확인하고 우측 스크롤 힌트를 따라 전체 컬럼을 탐색합니다.',
      '[AI 답변 검토·승인] 버튼을 클릭해 공문 초안과 5원 학술·뉴스 근거를 검토 후 승인합니다.'
    ],
    advanced: [
      '근거 신뢰도 슬라이더를 높이면 데이터 기반이 확실한 이슈만 필터링됩니다. 신뢰도 산정은 Rowe & Frewer (2000), Denzin (2012) 삼각검증 방법론에 기반합니다.',
      '소속 부서를 지정하면 해당 부서 소관 카테고리 행이 자동 필터링됩니다.',
      '승인 패널에서 답변 초안을 수정하면 자동으로 "수정 후 승인"만 활성화됩니다(답변 승인 비활성). 승인·수정후승인·반려 이력은 localStorage에 영구 저장되며 [결측치 복원 & 로그] 탭의 통합 로그에서도 조회 가능합니다.'
    ],
    footnotes: {
      'MCDA': 'Multi-Criteria Decision Analysis — 다기준 의사결정 분석. 여러 평가 기준(수요·공급·시급성 등)에 가중치를 부여하여 종합 판단하는 방법론',
      '6대 갭 매트릭스': '시민수요 강도, 정책공급 공백, 민원 시급성, 뉴스 여론, 학술 근거, 인프라 통계를 교차 분석하는 6축 진단표',
      '5원 데이터': '상상대로 제안 + 국민신문고 민원 + 몽땅정보통 정책 + 뉴스 기사 + 공공통계, 5개 출처를 융합한 데이터 파이프라인',
      '삼각검증': 'Triangulation — 2개 이상의 독립 데이터 출처가 동일한 결론을 지지할 때 신뢰도를 높게 산정하는 연구 방법론'
    }
  },
  8: {
    title: '결측치 복원 & 로그',
    purpose: '"구 미상" 시민 제안의 자치구 결측치를 텍스트마이닝으로 일괄 복원하고, 대시보드 전체에서 발생한 피드백·신고·반영 이력을 통합 조회하는 화면입니다.',
    steps: [
      '상단 배너에서 결측 현황(구 미상 비율, 5원 데이터 소스)을 확인합니다.',
      '[일괄 복원 실행] 버튼을 클릭하면 전체 미상 제안이 텍스트마이닝되어 자치구가 자동 추정됩니다.',
      '복원 결과에서 체크박스로 반영할 건을 선택하고 [데이터 반영] 버튼으로 대시보드에 적용합니다.',
      '하단 [통합 품질 관리 로그]에서 정책 오매칭 신고·복원 피드백·데이터 반영·승인 이력을 탭별로 조회합니다.'
    ],
    advanced: [
      '자치구별 복원 분포를 펼치면 어느 구로 가장 많이 복원되었는지 한눈에 확인됩니다.',
      '하단 단건 테스트 영역에서 직접 텍스트를 입력하여 복원 로직을 검증할 수 있습니다. 프리셋(노원 야간돌봄, 강남 난임지원 등)도 제공됩니다.',
      '통합 로그에서 [정책 오매칭] 탭을 선택하면 다른 탭에서 🚩 관련없음 신고된 건만 필터링됩니다. [승인 이력] 탭에서는 정책 갭 진단 탭의 답변 승인·수정 후 승인 내역을 확인합니다.',
      '반영 완료 후에도 목업 데이터 시뮬레이션이므로 새로고침하면 원상복귀됩니다. 로그는 브라우저에 영구 저장됩니다.'
    ],
    footnotes: {
      '결측치': '데이터에서 값이 비어있거나 누락된 항목. 여기서는 자치구가 "미상"인 제안을 의미',
      '5원 데이터 소스': '① 상상대로 제안 ② 국민신문고 민원 ③ 몽땅정보통 정책 DB ④ 네이버 뉴스 ⑤ KOSIS 공공통계 — 5개 출처를 교차 분석하여 정확도를 높이는 융합 파이프라인',
      '동음이의어 안전장치': '"수유"(모유수유 vs 수유동), "방학"(학교방학 vs 방학동) 등 7개 키워드는 같은 구의 확실한 지명이 함께 등장해야만 자치구로 인정',
      '통합 품질 관리 로그': '정책 오매칭 신고(🚩), 복원 피드백(📝), 데이터 반영 이력(✅), 승인 이력(🔏) 4종을 한곳에서 조회하는 Human-in-the-loop 품질 관리 시스템',
      '🚩 담당자 피드백': '오매칭 발견 시 담당자가 맥락을 기록하는 품질 관리 시스템. 기록된 피드백은 향후 API 연동 시 자동 반영'
    }
  }
};

export const OfficeAssistant: React.FC<Props> = ({ selectedDept, activeTab, onNavigateToTab, publicSubTab }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeScreen, setActiveScreen] = useState<'menu' | 'flow' | 'guide' | 'page'>('menu');
  const [bubbleText, setBubbleText] = useState('안녕하세요! 저는 서울시 오피스 길잡이 새싹이입니다. 공직 업무 수행을 위한 맞춤형 분석 동선을 추천해 드립니다.');
  // 최초 화면에서 한 번 클릭을 유도한 뒤에는 힌트 말풍선을 다시 띄우지 않기 위한 플래그
  const [hasInteracted, setHasInteracted] = useState(false);
  // "지금 화면 안내"에서 기본 3단계를 본 다음, 다음 단계로 고급 활용 팁을 펼쳐 보는 토글
  const [showAdvanced, setShowAdvanced] = useState(false);

  // 부서가 바뀔 때 안내 텍스트 자동 갱신 및 말풍선 깜빡임 효과
  useEffect(() => {
    if (selectedDept) {
      setBubbleText(`소속 부서가 [${selectedDept}](으)로 확인되었습니다! 맞춤형 R&R 보고서 기안을 위한 전담 추천 플로우가 준비되었습니다. 아래 버튼을 눌러 확인해 보십시오.`);
      setIsOpen(true);
      setActiveScreen('flow');
      setHasInteracted(true);
    }
  }, [selectedDept]);

  // 추천 업무 플로우 텍스트 생성
  const getFlowSteps = () => {
    if (!selectedDept) {
      return [
        '1. GNB 우측 상단의 [소속 부서 선택] 드롭다운에서 담당 부서를 먼저 지정해 주십시오.',
        '2. [수요 현황 종합]에서 전체 현황과 부서별 분류 비중을 확인합니다.',
        '3. [정책 갭 진단]으로 이동하여 6대 갭 매트릭스 진단표에서 정책 공백을 확인합니다.',
        '4. [긴급 민원 처리]에서 미답변 제안을 확인하고 맞춤 CSV로 데이터를 내보냅니다.'
      ];
    }

    switch (selectedDept) {
      case '가족건강팀':
        return [
          '1. [의료·건강·심리 지원] 카테고리가 가족건강팀 전담 R&R 영역입니다.',
          '2. [정책 갭 진단] 탭으로 이동하면 해당 카테고리가 부서 필터로 자동 정렬됩니다.',
          '3. 매핑 제안 중 답변 수립 여부를 검토하고 AI 답변 승인/수정 처리를 진행합니다.',
          '4. [긴급 민원 처리] 탭에서 미답변 고공감 제안을 확인하고 일괄 답변합니다.'
        ];
      case '저출생사업1팀':
        return [
          '1. [출산·산후 초기지원] 및 [양육비·금융지원]이 저출생사업1팀 소관 업무입니다.',
          '2. [수요 현황 종합] 상단 KPI 카드에서 부서 필터링 비중과 미답변 건수를 점검합니다.',
          '3. [정책 갭 진단] 화면에서 해당 카테고리의 갭 상태를 확인합니다.',
          '4. [긴급 민원 처리]에서 맞춤 CSV로 엑셀 데이터를 받아 정밀 분석합니다.'
        ];
      case '저출생사업2팀':
        return [
          '1. [육아지원·돌봄] 및 [일·가정 양립] 카테고리가 저출생사업2팀 담당입니다.',
          '2. [수요 현황 종합] 우측 핵심 인사이트 TOP 3에서 돌봄 수요 변화를 모니터링합니다.',
          '3. [정책 갭 진단] 진단표에서 돌봄 관련 정책 공백·보완 상태를 확인합니다.',
          '4. AI 답변 승인 패널에서 공문 초안 검토 후 승인 처리합니다.'
        ];
      default:
        return [
          `1. [${selectedDept}]의 소관 카테고리가 대시보드 전체에 실시간 동기화되었습니다.`,
          '2. [수요 현황 종합] 상단 KPI를 통해 부서 담당 지표를 실시간 확인합니다.',
          '3. [정책 갭 진단]에서 소속 부서 담당 카테고리가 자동 필터링됩니다.',
          '4. [긴급 민원 처리]에서 미답변 제안을 확인하고 일괄 답변 처리합니다.'
        ];
    }
  };

  return (
    <div className="fixed bottom-2 right-2 z-50 flex flex-col items-end gap-3 font-sans select-none">
      
      {/* 90년대 Windows 95/98 레트로 대화상자 */}
      {isOpen && (
        <div 
          className="w-80 bg-[#c0c0c0] border-2 border-t-white border-l-white border-b-slate-900 border-r-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] p-[3px] animate-fade-in"
          style={{ imageRendering: 'pixelated' }}
        >
          {/* 레트로 파란색 타이틀바 */}
          <div className="bg-gradient-to-r from-[#000080] to-[#1084d0] text-white px-2 py-1 flex items-center justify-between font-bold text-xs select-none">
            <div className="flex items-center gap-1">
              <span className="text-[10px]">🌱</span>
              <span className="font-mono tracking-tight font-black">새싹이 오피스 길잡이</span>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="w-4 h-4 bg-[#c0c0c0] text-slate-900 border border-t-white border-l-white border-b-slate-700 border-r-slate-700 active:border-b-white active:border-r-white flex items-center justify-center font-bold text-[9px] cursor-pointer"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </div>

          {/* 대화내용 영역 (레트로 윈도우 도움말 노란색 말풍선 종이 느낌) */}
          <div className="bg-[#ffffe1] border border-slate-600 m-2 p-3 text-[11px] text-slate-800 leading-relaxed shadow-inner max-h-72 overflow-y-auto">
            {activeScreen === 'menu' && (
              <div className="space-y-3">
                <p className="font-semibold text-slate-900">
                  {bubbleText}
                </p>
                <div className="pt-2 border-t border-slate-300 space-y-1.5">
                  <button
                    onClick={() => setActiveScreen('page')}
                    className="w-full bg-[#c0c0c0] hover:bg-[#d5d5d5] text-slate-900 text-left px-2 py-1.5 border border-t-white border-l-white border-b-slate-700 border-r-slate-700 text-[10px] font-bold flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-rose-800 shrink-0" />
                      📍 지금 화면에서 할 수 있는 일
                    </span>
                    <ArrowRight className="w-3 h-3 text-slate-500" />
                  </button>
                  <button
                    onClick={() => setActiveScreen('flow')}
                    className="w-full bg-[#c0c0c0] hover:bg-[#d5d5d5] text-slate-900 text-left px-2 py-1.5 border border-t-white border-l-white border-b-slate-700 border-r-slate-700 text-[10px] font-bold flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-1">
                      <Play className="w-3 h-3 text-blue-800 shrink-0" />
                      💡 맞춤형 행정 플로우 추천
                    </span>
                    <ArrowRight className="w-3 h-3 text-slate-500" />
                  </button>
                  <button
                    onClick={() => setActiveScreen('guide')}
                    className="w-full bg-[#c0c0c0] hover:bg-[#d5d5d5] text-slate-900 text-left px-2 py-1.5 border border-t-white border-l-white border-b-slate-700 border-r-slate-700 text-[10px] font-bold flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3 h-3 text-emerald-800 shrink-0" />
                      📖 {(PAGE_GUIDE[activeTab === 6 && publicSubTab === 'demographics' ? 6.5 : activeTab === 6 && publicSubTab === 'structure' ? 6.7 : activeTab] ?? PAGE_GUIDE[0]).title} 기능 안내
                    </span>
                    <ArrowRight className="w-3 h-3 text-slate-500" />
                  </button>
                </div>
              </div>
            )}

            {activeScreen === 'page' && (() => {
              const guide = PAGE_GUIDE[activeTab] ?? PAGE_GUIDE[0];
              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-rose-900 text-[11px] flex items-center gap-1">
                      📍 {guide.title}
                    </span>
                    <span className="text-[9px] bg-rose-100 text-rose-800 px-1 rounded font-bold">현재 화면</span>
                  </div>

                  <div className="bg-white/60 p-2 rounded border border-slate-200 text-slate-700">
                    <strong className="text-slate-900 block mb-0.5">왜 이 화면이 있나요?</strong>
                    {guide.purpose}
                  </div>

                  <div className="space-y-1.5">
                    <strong className="text-slate-900 block text-[10px]">지금 할 수 있는 일</strong>
                    {guide.steps.map((step, idx) => (
                      <div key={idx} className="bg-white/60 p-1.5 rounded border border-slate-200 text-slate-700 flex gap-1.5">
                        <span className="font-black text-rose-700 shrink-0">{idx + 1}.</span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>

                  <div>
                    <button
                      onClick={() => setShowAdvanced((prev) => !prev)}
                      className="w-full bg-amber-100 hover:bg-amber-200 text-amber-900 text-left px-2 py-1.5 border border-amber-300 rounded text-[10px] font-bold flex items-center justify-between cursor-pointer"
                    >
                      <span>🎓 {showAdvanced ? '한 걸음 더: 고급 활용 팁' : '다음 단계: 고급 활용 팁 보기'}</span>
                      {showAdvanced ? <ArrowLeft className="w-3 h-3" /> : <ArrowRight className="w-3 h-3" />}
                    </button>
                    {showAdvanced && (
                      <div className="space-y-1.5 mt-1.5">
                        {guide.advanced.map((tip, idx) => (
                          <div key={idx} className="bg-amber-50 p-1.5 rounded border border-amber-200 text-slate-700 flex gap-1.5">
                            <span className="font-black text-amber-700 shrink-0">›</span>
                            <span>{tip}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-300">
                    <button
                      onClick={() => {
                        setActiveScreen('menu');
                        setShowAdvanced(false);
                      }}
                      className="bg-[#c0c0c0] px-2.5 py-1 border border-t-white border-l-white border-b-slate-700 border-r-slate-700 font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-3 h-3" />
                      <span>이전 메뉴</span>
                    </button>
                  </div>
                </div>
              );
            })()}

            {activeScreen === 'flow' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-blue-900 text-[11px] flex items-center gap-1">
                    💡 {selectedDept ? `${selectedDept} 전용 플로우` : '기본 행정 업무 동선'}
                  </span>
                  <span className="text-[9px] bg-blue-100 text-blue-800 px-1 rounded font-bold">R&R 매핑</span>
                </div>
                <div className="space-y-2 text-slate-700">
                  {getFlowSteps().map((step, idx) => (
                    <div key={idx} className="bg-white/60 p-1.5 rounded border border-slate-200">
                      {step}
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-slate-300 flex justify-between">
                  <button
                    onClick={() => setActiveScreen('menu')}
                    className="bg-[#c0c0c0] px-2.5 py-1 border border-t-white border-l-white border-b-slate-700 border-r-slate-700 font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    <span>이전 메뉴</span>
                  </button>
                  {selectedDept && (
                    <button
                      onClick={() => {
                        onNavigateToTab(7); // Gap Matrix 탭으로 이동
                        setBubbleText('종합 의사결정 분석표로 이동했습니다! 부서 소관 카테고리 행에 포커싱된 갭 진단을 시작해 주십시오.');
                        setActiveScreen('menu');
                      }}
                      className="bg-blue-700 text-white px-2.5 py-1 font-bold text-[10px] flex items-center gap-0.5 rounded cursor-pointer animate-pulse"
                    >
                      <span>갭 진단 바로가기</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {activeScreen === 'guide' && (() => {
              const guideKey = activeTab === 6 && publicSubTab === 'demographics' ? 6.5 : activeTab === 6 && publicSubTab === 'structure' ? 6.7 : activeTab;
              const currentGuide = PAGE_GUIDE[guideKey] ?? PAGE_GUIDE[0];
              return (
                <div className="space-y-2">
                  <span className="font-extrabold text-emerald-900 text-[11px] block">
                    📖 {currentGuide.title} — 기능 안내
                  </span>
                  <div className="text-[9px] text-slate-500 -mt-1 mb-1">
                    현재 보고 있는 페이지의 주요 기능입니다
                  </div>

                  {/* 이 화면의 목적 */}
                  <div className="bg-emerald-50 border border-emerald-200 rounded p-2 text-[10px] text-emerald-900">
                    <strong className="block mb-0.5 text-emerald-800">🎯 이 화면의 목적</strong>
                    {currentGuide.purpose}
                  </div>

                  {/* 기본 사용법 */}
                  <div className="space-y-1">
                    <strong className="text-slate-900 text-[10px] block">📋 기본 사용법</strong>
                    {currentGuide.steps.map((step, i) => (
                      <div key={i} className="flex gap-1.5 text-[10px] text-slate-700">
                        <span className="text-emerald-600 font-black shrink-0">{i + 1}.</span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>

                  {/* 고급 팁 */}
                  <div className="space-y-1 border-t border-slate-200 pt-1.5">
                    <strong className="text-slate-900 text-[10px] block">💡 고급 활용 팁</strong>
                    {currentGuide.advanced.map((tip, i) => (
                      <div key={i} className="flex gap-1.5 text-[9.5px] text-slate-600">
                        <span className="text-amber-500 shrink-0">•</span>
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>

                  {/* 용어 주석 (footnotes) */}
                  {currentGuide.footnotes && Object.keys(currentGuide.footnotes).length > 0 && (
                    <div className="border-t border-dashed border-slate-300 pt-1.5 space-y-1">
                      <strong className="text-slate-500 text-[9px] block">📎 용어 설명</strong>
                      {Object.entries(currentGuide.footnotes).map(([term, desc], i) => (
                        <div key={i} className="text-[8.5px] text-slate-500 leading-tight">
                          <span className="font-bold text-slate-700">{term}</span>
                          <span className="mx-0.5">—</span>
                          <span>{desc}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-300">
                    <button
                      onClick={() => setActiveScreen('menu')}
                      className="bg-[#c0c0c0] px-2.5 py-1 border border-t-white border-l-white border-b-slate-700 border-r-slate-700 font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-3 h-3" />
                      <span>이전 메뉴</span>
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* 90년대 오피스 길잡이 플로팅 캐릭터 (새싹이 바둑이) */}
      <div
        onClick={() => {
          setIsOpen(!isOpen);
          setActiveScreen('menu');
          setHasInteracted(true);
        }}
        className="relative cursor-pointer group drop-shadow-md select-none animate-bounce"
      >
        {/* 새싹이 말풍선 툴팁: 최초 화면(한 번도 클릭하지 않았을 때)에만 노출, 캐릭터 위쪽으로 배치해 다른 버튼과 겹치지 않도록 함 */}
        {!isOpen && !hasInteracted && (
          <div className="absolute bottom-full right-0 mb-2 whitespace-nowrap bg-[#ffffe1] border border-slate-600 px-3 py-1.5 text-[10px] text-slate-800 font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-md pointer-events-none">
            무엇을 도와드릴까요? (클릭)
          </div>
        )}

        {/* 업로드된 오피스 길잡이 새싹 강아지 캐릭터 이미지 */}
        <div className="relative w-24 h-28 overflow-visible group-hover:scale-105 transition">
          <img
            src="/rover.png"
            alt="새싹이 길잡이"
            className="w-full h-full object-contain filter drop-shadow-md"
          />
          {/* 알림 배지 (도움이 필요하다는 엠블럼) */}
          <div className="absolute top-1 right-0 w-4.5 h-4.5 bg-rose-600 text-white rounded-full flex items-center justify-center text-[9px] font-black border border-white animate-pulse shadow-sm">
            ?
          </div>
        </div>
      </div>

    </div>
  );
};
