/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sparkles, HelpCircle, X, ArrowLeft, ArrowRight, Play, BookOpen, MapPin } from 'lucide-react';

interface Props {
  selectedDept: string | null;
  selectedDeptGroup?: string | null;
  activeTab: number;
  onNavigateToTab: (tabIndex: number) => void;
  publicSubTab?: 'district' | 'demographics' | 'structure';
}

// 실제 사이드바 탭 번호와 일치하는 페이지별 최신 기능 안내
const PAGE_GUIDE: Record<number, { title: string; purpose: string; steps: string[]; advanced: string[]; footnotes?: Record<string, string> }> = {
  0: {
    title: '1. 수요 현황 종합',
    purpose: '현재 선택한 8대 정책 담당군과 실제 R&R 팀 범위에서 시민 제안 현황, 연도별 추이, 주관부서별 처리 현황과 자치구 데이터 품질을 확인하는 종합 대시보드입니다.',
    steps: [
      '상단 4대 KPI 카드(전체 제안·답변 완료·미답변·평균 공감)에서 현재 현황을 확인합니다.',
      '실무부서 현황에서 제안별 1순위 주관부서의 처리 건수와 답변률을 확인합니다.',
      '상단 첫 번째 필터에서 8대 정책 담당군을, 두 번째 필터에서 실제 R&R 팀을 선택하면 모든 분석 화면의 데이터 범위가 함께 좁혀집니다.'
    ],
    advanced: [
      '자치구 데이터 품질 현황에서 현재 분석 범위의 특정 자치구 지정 건과 구 미상 건을 확인할 수 있습니다.',
      '8대 정책 담당군과 실제 1·2·3순위 실무부서는 별도 계층으로 표시됩니다.',
      '분류 카드와 부서 항목을 선택하면 해당 조건을 유지한 채 관련 분석 화면으로 이동할 수 있습니다.'
    ],
    footnotes: {
      'KPI': 'Key Performance Indicator — 핵심 성과 지표. 정책 현황을 한눈에 보여주는 요약 수치',
      '텍스트마이닝': '비정형 텍스트에서 의미 있는 패턴·키워드를 자동 추출하는 NLP 기법',
      '8대 정책 담당군': '제안을 8개 정책 대분류로 묶는 상위 분석 단위. 실제 조직명과 실무 R&R 순위는 별도로 표시'
    }
  },
  2: {
    title: '2. 시민 목소리 분석',
    purpose: '선택 연도와 현재 R&R 범위에서 TF-IDF 기반 TOP 30 핵심 키워드와 분류별 수요 강도를 분석하는 화면입니다.',
    steps: [
      '연도를 선택하고 해당 기간의 TF-IDF 상위 키워드와 실제 등장 횟수를 확인합니다.',
      '키워드를 클릭하면 하단 2축 차트와 TOP 5 제안이 실시간 필터링됩니다.',
      '6개 필터축(연도·생애주기·대분류·중분류·세분류·담당부서)으로 정밀 탐색합니다.'
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
    title: '3. 긴급 민원 처리',
    purpose: '시민 제안을 유사 내용 군집으로 묶고 연관 민원 건수를 함께 표시하여, 미답변 제안과 긴급 안건을 검토하고 일괄 답변하는 실무 화면입니다.',
    steps: [
      '상단 검색 + 고정밀 필터(연도·생애주기·대분류·중분류·부서)로 담당 범위를 좁힙니다.',
      '그룹화 뷰에서 유사 제안 군집을 확인하고 [원스톱 일괄 답변] 버튼을 클릭합니다.',
      'AI 공문 초안을 검토·수정 후 승인 처리합니다.'
    ],
    advanced: [
      '[다중선택]을 ON하면 여러 제안을 체크박스로 선택해 일괄 답변할 수 있습니다.',
      '리스트 뷰와 그룹화 뷰를 전환하며 개별/군집 단위로 검토할 수 있습니다.',
      '[맞춤 CSV]는 체크 여부와 관계없이 현재 검색·연도·긴급·분류·담당부서 필터에 부합하는 제안 전체를 내려받습니다.'
    ],
    footnotes: {
      '긴급 정책 공백': '공감 150표 이상이면서 아직 답변되지 않아 우선 검토가 필요한 제안',
      '군집(그룹)': 'KR-SBERT 임베딩 기반 의미 유사도(70~80%)로 내용이 비슷한 제안끼리 자동 그룹화한 묶음',
      'AI 공문 초안': 'Gemini/GPT 모델이 행정 공문체로 사전 생성한 답변 초안'
    }
  },
  4: {
    title: '4. 현행 정책 검색',
    purpose: '몽땅정보통에서 수집한 서울시 공식 출산·보육 사업을 검색하여 시민 제안과 대조하는 화면입니다.',
    steps: [
      '검색창에 키워드를 입력해 관련 기존 정책을 찾습니다.',
      '카테고리 필터로 유사 사업을 묶어서 확인합니다.',
      '시민 제안과 비교해 이미 있는 정책인지, 공백인지 판단합니다.'
    ],
    advanced: [
      '정책명뿐 아니라 이용대상·지원내용 텍스트로도 검색되므로, 대상(예: "다자녀", "한부모")으로 찾으면 더 빠르게 걸립니다.',
      '"없는 정책"으로 확인되면 [정책 갭 진단] 탭에서 해당 카테고리의 공백 점수를 대조해 보십시오.',
      '정책 상세의 원문 링크를 클릭하면 해당 공식 안내 페이지로 이동합니다.'
    ],
    footnotes: {
      '몽땅정보통': '서울시가 운영하는 임신·출산·육아 통합 정보 포털',
      '정책 공백': '시민 수요는 있지만 대응하는 공식 지원 사업이 없거나 부족한 영역'
    }
  },
  5: {
    title: '5. 정책 사각지대 탐색',
    purpose: '내용이 유사한 시민 제안을 군집으로 묶고, 반복 수요가 큰데 기존 정책 대응이 약한 사각지대를 탐색하는 화면입니다.',
    steps: [
      '버블의 크기와 색으로 군집별 제안 건수와 평균 공감도를 비교합니다.',
      '관심 군집을 선택해 대표 제안·핵심 키워드·미답변 비율을 확인합니다.',
      '선택한 군집을 시민 목소리 분석으로 넘겨 개별 제안과 R&R을 검토합니다.'
    ],
    advanced: [
      '상단 8대 정책 담당군 선택이 군집 데이터 범위에도 동일하게 적용됩니다.',
      '건수는 작아도 공감도와 미답변률이 높은 군집은 긴급 검토 후보입니다.',
      '군집은 행정 부서가 아니라 텍스트 의미 유사도 기준의 분석 단위입니다.'
    ],
    footnotes: {
      '의미 유사 군집': '문장의 표면 단어가 달라도 요구 취지가 비슷한 제안을 임베딩 유사도로 묶은 그룹',
      '정책 사각지대': '반복되는 시민 수요에 비해 기존 사업이나 행정 답변이 부족한 영역'
    }
  },
  6: {
    title: '6. 자치구 통계 비교',
    purpose: '25개 자치구의 출생·보육 공공지표와 시민 제안을 같은 화면에서 비교해 지역별 수요·공급 격차를 확인합니다.',
    steps: [
      '지도 또는 자치구 선택기로 분석 지역을 지정합니다.',
      '출생아수·보육시설수·합계출산율·정책수요점수를 비교합니다.',
      '선택 자치구의 지원사업과 시민 제안 목록을 나란히 검토합니다.'
    ],
    advanced: [
      '수치순·자치구명순 정렬과 지표 색상 기준을 바꿔 분포를 비교할 수 있습니다.',
      '자치구가 미상인 제안은 특정 자치구 실적으로 임의 합산하지 않습니다.',
      'CSV 내보내기로 현재 25개 자치구 비교표를 저장할 수 있습니다.'
    ]
  },
  6.5: {
    title: '6-2. 인구·보육 지표 분석',
    purpose: '출생아수·합계출산율·보육시설 등 공공데이터 지표의 자치구별 격차와 추세를 비교하는 화면입니다.',
    steps: [
      '비교할 자치구와 지표를 선택합니다.',
      '차트에서 출생 규모와 보육 공급 수준을 함께 확인합니다.',
      '시민 제안 수요가 공공지표 변화와 같은 방향인지 대조합니다.'
    ],
    advanced: [
      '출생아수와 합계출산율은 의미가 다르므로 절대 규모와 비율을 분리해서 해석합니다.',
      '보육시설 수만으로 공급 충분성을 판단하지 말고 아동 인구와 함께 비교합니다.',
      '화면에 표시된 기준연도와 잠정치 여부를 보고서에 함께 기록합니다.'
    ]
  },
  6.7: {
    title: '6-3. 서울 공통·자치구 특화 구조',
    purpose: '시민 제안을 서울시 전체 공통 수요와 특정 자치구 특화 수요로 나눠 대응 주체와 정책 범위를 판단합니다.',
    steps: [
      '전체 공통 제안과 자치구 특화 제안의 건수·비중을 비교합니다.',
      '자치구 특화 제안의 지역 분포와 8대 정책 대분류 구성을 확인합니다.',
      '공통 수요는 서울시 단위, 특화 수요는 자치구 협업 대상으로 구분합니다.'
    ],
    advanced: [
      '본문에 지역명이 없다는 이유만으로 임의 자치구를 배정하지 않습니다.',
      '공통·특화 집단의 평균 공감도를 비교해 광역 대응 우선도를 판단합니다.',
      '결측치 복원 결과는 원본과 추정값을 구분해 품질 로그에서 확인합니다.'
    ]
  },
  7: {
    title: '7. 정책 갭 진단',
    purpose: '수요·공백·시급성·실행성·근거 신뢰도의 5대 진단축으로 정책 공백을 비교하고 AI 답변 초안을 담당자가 검토·승인하는 최종 의사결정 화면입니다.',
    steps: [
      '필터에서 진단 상태·실제 담당부서·근거 신뢰도 기준을 설정합니다.',
      '진단표에서 4단계 상태(즉시 검토·제도 개선·빠른 개선·모니터링)를 확인합니다.',
      '[AI 답변 검토·승인] 버튼을 클릭해 공문 초안과 연결된 제안·민원·정책·뉴스 근거를 검토 후 승인합니다.'
    ],
    advanced: [
      '근거 신뢰도 슬라이더를 높이면 데이터 기반이 확실한 이슈만 필터링됩니다.',
      '상단 정책 담당군으로 분석 범위를 좁힌 뒤 화면 내부에서 실제 담당부서를 추가 선택할 수 있습니다.',
      '승인 패널에서 답변 초안을 수정하면 자동으로 "수정 후 승인"만 활성화됩니다.'
    ],
    footnotes: {
      '5대 진단축': '시민수요 강도, 정책공급 공백, 민원 시급성, 실행 가능성, 근거 신뢰도를 가중 결합하는 우선순위 비교 기준',
      '연결 근거': '선택한 진단 이슈와 연결된 상상대로 제안·국민신문고 민원·몽땅정보통 정책·뉴스 기사'
    }
  },
  8: {
    title: '8. 결측치 복원 & 로그',
    purpose: '"구 미상" 시민 제안의 자치구 결측치를 텍스트마이닝으로 일괄 복원하고, 대시보드 전체에서 발생한 피드백·신고·반영 이력을 통합 조회하는 화면입니다.',
    steps: [
      '상단 배너에서 현재 R&R 필터 범위의 전체 제안과 구 미상 제안 건수를 확인합니다.',
      '[일괄 복원 실행] 버튼을 클릭하면 현재 분석 범위의 미상 제안을 텍스트마이닝하여 자치구를 추정합니다.',
      '하단 [통합 품질 관리 로그]에서 정책 오매칭 신고·복원 피드백·데이터 반영·승인 이력을 탭별로 조회합니다.'
    ],
    advanced: [
      '통합 로그에서 [정책 오매칭] 탭을 선택하면 다른 탭에서 🚩 관련없음 신고된 건만 필터링됩니다.',
      '하단 단건 테스트 영역에서 직접 텍스트를 입력하여 복원 로직을 검증할 수 있습니다.',
      '로그는 현재 브라우저의 로컬 저장소에 보관되며, 브라우저 데이터 삭제나 기기 변경 시 유지되지 않을 수 있습니다.'
    ],
    footnotes: {
      '결측치': '데이터에서 값이 비어있거나 누락된 항목. 여기서는 자치구가 "미상"인 제안을 의미',
      '통합 품질 관리 로그': '정책 오매칭 신고(🚩), 복원 피드백(📝), 데이터 반영 이력(✅), 승인 이력(🔏) 4종을 한곳에서 조회하는 시스템'
    }
  }
};

export const OfficeAssistant: React.FC<Props> = ({
  selectedDept,
  selectedDeptGroup = null,
  activeTab,
  onNavigateToTab,
  publicSubTab,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeScreen, setActiveScreen] = useState<'menu' | 'flow' | 'guide' | 'page'>('menu');
  const [bubbleText, setBubbleText] = useState('안녕하세요! 저는 서울시 오피스 길잡이 새싹이입니다. 공직 업무 수행을 위한 맞춤형 분석 동선을 추천해 드립니다.');
  // 최초 화면에서 한 번 클릭을 유도한 뒤에는 힌트 말풍선을 다시 띄우지 않기 위한 플래그
  const [hasInteracted, setHasInteracted] = useState(false);
  // "지금 화면 안내"에서 기본 3단계를 본 다음, 다음 단계로 고급 활용 팁을 펼쳐 보는 토글
  const [showAdvanced, setShowAdvanced] = useState(false);
  // 부서 변경 팝업을 처음 한 번만 자동으로 열기 위한 플래그
  const [hasDeptPopupShown, setHasDeptPopupShown] = useState(false);
  // 처음 로드 시에만 바운스 애니메이션 재생
  const [shouldBounce, setShouldBounce] = useState(true);

  // 3초 뒤 바운스 중지
  useEffect(() => {
    const t = setTimeout(() => setShouldBounce(false), 3000);
    return () => clearTimeout(t);
  }, []);

  // 8대 정책 담당군이 바뀔 때 안내 텍스트 자동 갱신 (처음 한 번만 팝업 자동 오픈)
  useEffect(() => {
    if (selectedDept) {
      setBubbleText(`실제 R&R 팀 [${selectedDept}] 기준으로 제안과 보고서 범위를 좁혔습니다.`);
      setActiveScreen('flow');
      if (!hasDeptPopupShown) {
        setIsOpen(true);
        setHasDeptPopupShown(true);
        setHasInteracted(true);
      }
    } else if (selectedDeptGroup) {
      setBubbleText(`[${selectedDeptGroup}] 대분류 담당군 기준으로 제안을 모았습니다. 필요하면 옆 필터에서 실제 R&R 팀을 추가 선택하세요.`);
      setActiveScreen('flow');
      if (!hasDeptPopupShown) {
        setIsOpen(true);
        setHasDeptPopupShown(true);
        setHasInteracted(true);
      }
    }
  }, [selectedDept, selectedDeptGroup]);

  // 추천 업무 플로우 텍스트 생성
  const getFlowSteps = () => {
    const scopeText = selectedDept
      ? selectedDeptGroup
        ? `[${selectedDeptGroup}]에서 [${selectedDept}]이 1순위 주관인 제안`
        : `전체 분야에서 [${selectedDept}]이 주관 또는 협조로 참여한 제안`
      : selectedDeptGroup
        ? `[${selectedDeptGroup}] 대분류 제안`
        : '전체 출산·양육 제안';

    if (!selectedDept && !selectedDeptGroup) {
      return [
        '1. [수요 현황 종합] — 전체 KPI, 답변 현황, 정책 대분류와 실제 주관팀 분포를 확인합니다.',
        '2. [시민 목소리 분석] — 연도·생애주기·분류별 키워드와 시민 공감 수요를 찾습니다.',
        '3. [긴급 민원 처리] — 미답변·고공감·최신 안건을 한 건 또는 다중 조건으로 검토합니다.',
        '4. [현행 정책 검색] — 몽땅정보통 322개 공식 사업에서 기존 대응 정책을 대조합니다.',
        '5. [정책 사각지대 탐색] — 반복되는 유사 제안 군집과 공급이 약한 영역을 찾습니다.',
        '6. [자치구 통계 비교] — 25개 자치구의 출생·보육 지표와 지역 확인 제안을 비교합니다.',
        '7. [정책 갭 진단] — 수요·공백·시급성·실행성·신뢰도를 보고 조치안을 검토·승인합니다.',
        '8. [결측치 복원 & 로그] — 자치구 미상 복원 후보와 오매칭·반영·승인 이력을 관리합니다.'
      ];
    }

    return [
      `적용 범위: ${scopeText}`,
      `1. [수요 현황 종합] — ${scopeText}의 KPI와 미답변 현황을 확인합니다.`,
      '2. [시민 목소리 분석] — 현재 범위의 핵심 키워드·연도·생애주기 수요를 확인합니다.',
      '3. [긴급 민원 처리] — 현재 범위의 미답변·고공감·최신 안건과 1·2·3순위 R&R을 검토합니다.',
      '4. [현행 정책 검색] — 공식 사업 322개에서 대응 정책을 검색해 제안과 대조합니다.',
      '5. [정책 사각지대 탐색] — 현재 범위에서 반복되는 유사 제안 군집을 확인합니다.',
      '6. [자치구 통계 비교] — 지역 확인 제안과 25개 자치구 공공지표를 함께 봅니다.',
      '7. [정책 갭 진단] — 현재 범위의 정책 공백과 추천 조치안을 검토·수정·승인합니다.',
      '8. [결측치 복원 & 로그] — 데이터 복원 후보와 오매칭·반영·승인 이력을 확인합니다.',
      selectedDeptGroup && !selectedDept
        ? '다음 행동: 상단 두 번째 필터에서 실제 R&R 팀을 선택하면 1순위 주관 안건으로 더 좁힐 수 있습니다.'
        : '다음 행동: 우측 보고서 다운로드에서 현재 범위를 HWP 호환 텍스트(.hwp.txt)·PDF 인쇄본·CSV로 내보냅니다.'
    ];
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
              const guideKey = activeTab === 6 && publicSubTab === 'demographics'
                ? 6.5
                : activeTab === 6 && publicSubTab === 'structure'
                  ? 6.7
                  : activeTab;
              const guide = PAGE_GUIDE[guideKey] ?? PAGE_GUIDE[0];
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
                    💡 {selectedDept
                      ? `${selectedDept} 실제 팀 플로우`
                      : selectedDeptGroup
                        ? `${selectedDeptGroup} 대분류 플로우`
                        : '기본 행정 업무 동선'}
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
                  {(selectedDept || selectedDeptGroup) && (
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
        className={`relative cursor-pointer group drop-shadow-md select-none ${shouldBounce ? 'animate-bounce' : ''}`}
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
