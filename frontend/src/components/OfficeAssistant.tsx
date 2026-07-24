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
}

// 탭(메뉴)별 "이 화면은 왜 있는지" + "지금 할 수 있는 일" + "고급 활용 팁" 단계별 안내
const PAGE_GUIDE: Record<number, { title: string; purpose: string; steps: string[]; advanced: string[] }> = {
  0: {
    title: '정책 수요 개요',
    purpose: '서울시 출산·육아 시민 제안 전체 물량과 연도별 트렌드를 한눈에 파악하는 진입 화면입니다.',
    steps: [
      '상단 요약 카드에서 전체 제안 건수와 연도별 증감 추이를 확인합니다.',
      '[최다 제안 분야 TOP 3]에서 최근 급증하는 카테고리를 확인합니다.',
      '관심 카테고리를 클릭하면 [키워드·수요 강도 분석] 탭으로 바로 이동합니다.'
    ],
    advanced: [
      '키워드 영역의 "더보기"를 누르면 TOP 5 ↔ TOP 10으로 표시 개수를 늘려 더 세밀하게 볼 수 있습니다.',
      '카드 안 개별 항목을 클릭하면 자동으로 해당 카테고리가 필터링된 채로 다른 탭으로 넘어갑니다. 매번 필터를 다시 설정할 필요가 없습니다.',
      '미답변 긴급 제안 카드를 클릭하면 [정책 우선순위 상세] 탭으로 바로 진입해 실무 처리를 이어갈 수 있습니다.'
    ]
  },
  1: {
    title: '지역별 비교',
    purpose: '25개 자치구 간 제안 건수와 출생아·보육 인프라 격차를 비교해 자원 배분 우선순위를 판단하는 화면입니다.',
    steps: [
      '지도에서 자치구를 클릭해 해당 구의 상세 통계를 확인합니다.',
      '우측 패널에서 선택 구의 맞춤 지원사업 목록을 확인합니다.',
      '구별 비교 테이블 정렬 기준을 바꿔가며 취약 자치구를 찾습니다.'
    ],
    advanced: [
      '비교 테이블 헤더(정렬 아이콘)를 클릭하면 오름차순/내림차순으로 바꿔가며 "가장 취약한 구"만 골라낼 수 있습니다.',
      '자치구를 선택한 상태로 좌측 사이드바 메뉴명 옆에 빨간 점이 뜨는데, 이는 "선택된 구 정보가 아직 열려 있다"는 표시입니다.',
      '지도와 테이블을 같이 두고 보면, 제안 건수는 많은데 실제 지원사업은 적은 구(공급 공백 지역)를 빠르게 짚어낼 수 있습니다.'
    ]
  },
  2: {
    title: '키워드·수요 강도 분석',
    purpose: '어떤 키워드·생애주기 단계에서 시민 수요가 몰리는지 세부적으로 진단하는 화면입니다.',
    steps: [
      '태그 클라우드에서 최근 급상승 키워드를 확인합니다.',
      '키워드를 클릭하면 관련 제안 목록과 대표 사례가 모달로 열립니다.',
      '생애주기별(임신~영유아) 필터로 구간별 수요 강도를 비교합니다.'
    ],
    advanced: [
      '다중 계층 카테고리 필터(대분류 → 중분류 → 소분류)를 함께 조합하면 특정 세부 이슈만 정밀하게 좁혀볼 수 있습니다.',
      '키워드 모달 안 원문 제안 목록에서 실제 시민 표현을 그대로 확인할 수 있어, 보고서에 인용할 생생한 사례를 찾을 때 유용합니다.',
      '검색 결과가 예상보다 적다면 조사·불용어 필터링 때문일 수 있으니, 유사어(줄임말 등)로도 검색해 보십시오.'
    ]
  },
  3: {
    title: '정책 우선순위 상세',
    purpose: '시민 공감 150표 이상인데 아직 서울시 공식 답변이 없는 긴급 제안을 찾아 실제 답변 처리를 진행하는 실무 화면입니다.',
    steps: [
      '상단 필터(연도·카테고리·부서)로 담당 업무 범위를 좁힙니다.',
      '미답변·고득표 제안 카드를 확인하고 [일괄 답변] 또는 개별 답변을 진행합니다.',
      'AI 추천 답변을 검토·수정 후 승인해 결재 문서를 생성합니다.'
    ],
    advanced: [
      '여러 건을 체크박스로 동시에 선택하면 [일괄 답변] 모달에서 공통 답변 템플릿을 한 번에 적용할 수 있습니다.',
      '내 소속 부서를 지정해 두면 이 화면의 목록이 담당 카테고리 우선으로 자동 정렬됩니다.',
      '상세 모달 안에서 원본 민원 전문과 AI 매칭 근거를 함께 확인해, 답변 승인 전 근거 신뢰도를 직접 검증할 수 있습니다.'
    ]
  },
  4: {
    title: '서울시 현행 정책',
    purpose: '시민 제안과 대조할 서울시의 실제 시행 중인 322개 공식 지원사업(몽땅정보 만능키)을 검색·확인하는 화면입니다.',
    steps: [
      '검색창에 키워드를 입력해 관련 기존 정책을 찾습니다.',
      '카테고리 필터로 유사 사업을 묶어서 확인합니다.',
      '시민 제안과 비교해 이미 있는 정책인지, 공백인지 판단하는 근거로 활용합니다.'
    ],
    advanced: [
      '정책명뿐 아니라 이용대상·지원내용 텍스트로도 검색되므로, 대상(예: "다자녀", "한부모")으로 찾으면 더 빠르게 걸립니다.',
      '여기서 "없는 정책"으로 확인되면, 바로 [의사결정 갭 분석표]에서 해당 카테고리의 공백 점수를 대조해 보십시오.',
      '자치구별 시행 여부가 다른 사업도 있으니, [지역별 비교] 탭에서 선택한 구 기준으로 다시 한 번 필터링해 확인하는 것이 정확합니다.'
    ]
  },
  5: {
    title: '군집 볼륨 분석',
    purpose: 'BERT 임베딩으로 유사한 제안을 자동으로 묶어, 개별 민원이 아닌 군집 단위 이슈 규모를 파악하는 화면입니다.',
    steps: [
      '볼록(Voronoi/3D) 지도에서 크게 뭉친 군집을 확인합니다.',
      '군집을 클릭해 대표 제안 사례와 건수를 확인합니다.',
      '위험도(HIGH/MEDIUM) 배지를 참고해 우선 대응할 군집을 선정합니다.'
    ],
    advanced: [
      '군집 크기(면적)는 건수, 색상은 위험도를 나타냅니다 — 크고 빨간 군집부터 우선 검토하는 것이 효율적입니다.',
      '개별 민원 리스트에서는 안 보이던 "숨은 다수 의견"이 이 화면에서는 하나의 뭉치로 드러나므로, 보고서에 "총 N건의 유사 요구"로 인용하기 좋습니다.',
      '군집 경계가 애매한 항목은 실제 원문을 열어 직접 확인해, 자동 분류 오류 여부를 검증하는 습관을 들이십시오.'
    ]
  },
  6: {
    title: '공공데이터 지표',
    purpose: 'KOSIS 등 공식 통계로 서울시 출생아 수·합계출산율·보육시설 현황을 객관적으로 확인하는 화면입니다.',
    steps: [
      '연도별 추이 차트에서 장기 트렌드를 확인합니다.',
      '자치구별 지표를 비교해 통계적 근거를 확보합니다.',
      '이 수치를 다른 탭의 시민 제안 데이터와 교차 검증합니다.'
    ],
    advanced: [
      '이 탭의 수치는 "공식 통계", 나머지 탭은 "시민 제안 기반 추정치"입니다 — 보고서에 인용할 때는 반드시 출처를 구분해서 표기하십시오.',
      '합계출산율과 보육시설 정원 추이를 나란히 보면, 통계상 공급이 늘었는데도 민원이 계속되는 구간(체감 공백)을 짚어낼 수 있습니다.',
      '차트 위 항목에 마우스를 올리면 세부 수치 툴팁이 뜨니, 정확한 값이 필요할 때 활용하십시오.'
    ]
  },
  7: {
    title: '의사결정 갭 분석표',
    purpose: '수요·공급·민원 데이터를 통합해 실제 정책 공백이 어디인지 진단하고 답변안까지 만드는 최종 의사결정 화면입니다.',
    steps: [
      '버블 차트에서 정책 공백·시급성·수요가 큰 버블을 클릭합니다.',
      '우측 고정 패널에서 5대 진단 지표와 추천 액션을 확인합니다.',
      '[AI 답변 승인 패널]에서 답변 초안을 검토·수정 후 승인 처리합니다.'
    ],
    advanced: [
      '우측 하단 "비교뷰"를 열면 선택한 이슈와 관련된 원문 제안·민원·정책·뉴스를 한 화면에서 교차 비교할 수 있습니다.',
      '소속 부서를 지정하면 이 화면의 버블 중 내 담당 카테고리만 강조되고 나머지는 흐려져(포커스 아웃), 내가 봐야 할 것만 빠르게 골라낼 수 있습니다.',
      '5대 지표(수요·정책공백·시급성·실현가능성·근거신뢰도) 중 근거신뢰도가 낮은 이슈는 승인 전에 원문을 한 번 더 확인하는 것을 권장합니다.'
    ]
  },
  8: {
    title: '결측치 복원 시뮬레이터',
    purpose: '상상대로 서울 시민제안의 자치구 미입력(구 미상) 결측치를 5원 데이터 교차분석 및 AI로 자동 복원하는 화면입니다.',
    steps: [
      'Quick Preset 선택 또는 임의의 시민제안 원문 텍스트를 입력합니다.',
      '[Gemini AI 모드] 및 [규칙 기반 모드] 선택 후 [결측치 복원 실행]을 클릭합니다.',
      '추정 자치구, 정책 대분류, 신뢰도 및 5원 데이터 교차검증 근거를 확인합니다.'
    ],
    advanced: [
      '텍스트 내 지명/지하철역/지역 키워드가 자동 추출되어 KOSIS 통계 및 몽땅정보통 정책 데이터와 실시간 결합합니다.',
      '복원 신뢰도가 90% 이상인 안건은 자치구 갭 분석 및 지도 통계에 실시간으로 반영됩니다.'
    ]
  }
};

export const OfficeAssistant: React.FC<Props> = ({ selectedDept, activeTab, onNavigateToTab }) => {
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
        '2. 홈 대시보드(정책 수요 개요)에서 부서별 전담 민원 필터링 수치를 확인합니다.',
        '3. [종합 의사결정 분석표]로 이동하여 상단에 정렬된 전담 카테고리의 갭 상태를 확인합니다.',
        '4. [맞춤 보고서 생성] 버튼을 통해 공문 기안서 초안과 Excel 원본 자료를 출력합니다.'
      ];
    }

    switch (selectedDept) {
      case '가족건강팀':
        return [
          '1. [의료·건강·심리 지원] 카테고리가 가족건강팀 전담 R&R 영역입니다.',
          '2. [종합 의사결정 분석표] 탭으로 이동하면 해당 카테고리가 최상단에 고정 정렬됩니다.',
          '3. 매핑 제안 81건 중 답변 수립 여부를 검토하고 AI 답변 승인/수정 처리를 진행합니다.',
          '4. 상단 우측 [맞춤 보고서 생성] 단추를 클릭해 한글(HWP) 결재문서 초안을 출력합니다.'
        ];
      case '저출생사업1팀':
        return [
          '1. [출산·산후 초기지원] 및 [양육비·금융지원]이 저출생사업1팀 소관 업무입니다.',
          '2. 대시보드 상단 4대 스트레이트 바에서 부서 필터링 비중(현 10.5%)과 미답변 건수를 점검합니다.',
          '3. [Gap Matrix] 화면에서 해당 2대 카테고리를 제외한 행들이 포커스 아웃(투명화)된 것을 봅니다.',
          '4. [맞춤 보고서 생성]에서 엑셀 CSV 생데이터를 받아 민원인 개별 요구 사항을 정밀 분석합니다.'
        ];
      case '저출생사업2팀':
        return [
          '1. [육아지원·돌봄] 및 [일·가정 양립] 카테고리가 저출생사업2팀 담당입니다.',
          '2. 홈 화면 우측 [최다 제안 분야 TOP 3]에 실시간 랭크된 돌봄 수요 변화를 모니터링합니다.',
          '3. [Gap Matrix] 2열 대조 팝업을 열어 돌봄 교실 확대 요구와 현행 정책 공급 격차를 확인합니다.',
          '4. 조치 피드백 승인 완료 후 부서 맞춤형 한글(HWP) 기안서 파일을 로컬 다운로드합니다.'
        ];
      default:
        return [
          `1. [${selectedDept}]의 소관 저출생 카테고리가 대시보드 전체에 실시간 동기화되었습니다.`,
          '2. 홈 화면 상단의 스트레이트 바를 통해 부서 담당 지표 격차(%)를 실시간 확인합니다.',
          '3. [종합 의사결정 분석표]에서 소속 부서 담당 행들이 최상단에 자동 우선 정렬됩니다.',
          '4. [맞춤 보고서 생성] 기능을 이용하여 1초 만에 내부 결재용 개조식 기안 문서를 다운로드합니다.'
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
                      📖 대시보드 주요 기능 설명
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

            {activeScreen === 'guide' && (
              <div className="space-y-2">
                <span className="font-extrabold text-emerald-900 text-[11px] block">
                  📖 대시보드 사용 설명서
                </span>
                <div className="space-y-2.5 text-slate-700 pt-1 text-[10px]">
                  <div className="border-b border-slate-200 pb-1.5">
                    <strong className="text-slate-900 block mb-0.5">1. 정책 수요 개요 (홈)</strong>
                    실시간 민원 키워드 급증세 및 8대 분야 시민 제안 모니터링
                  </div>
                  <div className="border-b border-slate-200 pb-1.5">
                    <strong className="text-slate-900 block mb-0.5">2. 지역별 비교 (3D 지도)</strong>
                    구별 출산율/보육시설 공급도 점수 매핑을 통한 공백 지역 진단
                  </div>
                  <div className="border-b border-slate-200 pb-1.5">
                    <strong className="text-slate-900 block mb-0.5">3. 정책 우선순위 상세 (Gap Matrix)</strong>
                    행정 R&R 연동, 실무자 피드백 승인 패널 및 <strong>[맞춤형 HWP 공문 기안서 생성]</strong> 지원
                  </div>
                </div>
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
            )}
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
