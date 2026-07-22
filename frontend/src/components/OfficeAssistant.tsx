/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sparkles, HelpCircle, X, ArrowLeft, ArrowRight, Play, BookOpen } from 'lucide-react';

interface Props {
  selectedDept: string | null;
  onNavigateToTab: (tabIndex: number) => void;
}

export const OfficeAssistant: React.FC<Props> = ({ selectedDept, onNavigateToTab }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeScreen, setActiveScreen] = useState<'menu' | 'flow' | 'guide'>('menu');
  const [bubbleText, setBubbleText] = useState('안녕하세요! 저는 서울시 오피스 길잡이 새싹이입니다. 공직 업무 수행을 위한 맞춤형 분석 동선을 추천해 드립니다.');

  // 부서가 바뀔 때 안내 텍스트 자동 갱신 및 말풍선 깜빡임 효과
  useEffect(() => {
    if (selectedDept) {
      setBubbleText(`소속 부서가 [${selectedDept}](으)로 확인되었습니다! 맞춤형 R&R 보고서 기안을 위한 전담 추천 플로우가 준비되었습니다. 아래 버튼을 눌러 확인해 보십시오.`);
      setIsOpen(true);
      setActiveScreen('flow');
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
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 font-sans select-none">
      
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
        }}
        className="flex items-center gap-2 cursor-pointer group drop-shadow-md select-none animate-bounce"
      >
        {/* 새싹이 말풍선 툴팁 */}
        {!isOpen && (
          <div className="bg-[#ffffe1] border border-slate-600 px-3 py-1.5 text-[10px] text-slate-800 font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-md">
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
