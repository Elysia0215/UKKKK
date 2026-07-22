/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { X, FileText, Download, Check, AlertCircle, FileSpreadsheet, Layers } from 'lucide-react';
import { PolicyProposal } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedDept: string | null;
  proposals: PolicyProposal[];
  customActions?: Record<string, { action: string; status: string; overrideSatisfaction?: string }>;
}

export const ReportExportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  selectedDept,
  proposals,
  customActions = {}
}) => {
  const [reportType, setReportType] = useState<'detailed' | 'executive'>('detailed');
  const [format, setFormat] = useState<'hwp' | 'pdf' | 'excel'>('hwp');
  const [includeAI, setIncludeAI] = useState(true);
  const [includeStats, setIncludeStats] = useState(true);
  const [includeGaps, setIncludeGaps] = useState(true);
  const [includeAcademic, setIncludeAcademic] = useState(true);
  const [includeLogs, setIncludeLogs] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);

  // 부서별 카테고리 매핑 정보
  const deptCategories = useMemo(() => {
    if (!selectedDept) {
      return ['임신·난임·생식건강', '출산·산후 초기지원', '양육비·부모급여·금융지원', '보육·돌봄 인프라', '일·가정 양립 지원', '다자녀 가구 특화 혜택', '주거·교통·도시생활환경', '의료·건강·심리 지원'];
    }
    if (selectedDept === '건강임신지원팀') return ['임신·난임·생식건강'];
    if (selectedDept === '저출생사업1팀') return ['출산·산후 초기지원'];
    if (selectedDept === '저출생사업2팀') return ['양육비·부모급여·금융지원', '다자녀 가구 특화 혜택'];
    if (selectedDept === '영유아담당관') return ['보육·돌봄 인프라'];
    if (selectedDept === '가족지원팀') return ['일·가정 양립 지원'];
    if (selectedDept === '주거정비과') return ['주거·교통·도시생활환경'];
    if (selectedDept === '가족건강팀') return ['의료·건강·심리 지원'];
    if (selectedDept === '아동보호팀') return ['취약·다양가족 사각지대'];
    return [];
  }, [selectedDept]);

  // 부서별 필터링된 시민제안
  const deptProposals = useMemo(() => {
    return proposals.filter(p => {
      if (!selectedDept) return true;
      if (selectedDept === '건강임신지원팀') return p.category === '임신·난임·생식건강';
      if (selectedDept === '저출생사업1팀') return p.category === '출산·산후 초기지원';
      if (selectedDept === '저출생사업2팀') return p.category === '다자녀·양육비·생활지원' && (p.sub_category?.includes('양육비') || p.sub_category?.includes('생활비') || p.sub_category?.includes('지원') || p.sub_category?.includes('다자녀'));
      if (selectedDept === '영유아담당관') return p.category === '보육·돌봄 인프라';
      if (selectedDept === '가족지원팀') return p.category === '일·가정 양립·부모 노동';
      if (selectedDept === '주거정비과') return p.category === '주거·교통·도시생활환경';
      if (selectedDept === '가족건강팀') return p.sub_category?.includes('건강') || p.sub_category?.includes('의료') || p.sub_category?.includes('치료') || p.category === '취약·다양가족 사각지대';
      if (selectedDept === '아동보호팀') return p.category === '취약·다양가족 사각지대';
      return true;
    });
  }, [proposals, selectedDept]);

  // 공문 보고서 텍스트 생성기
  const generatedReportText = useMemo(() => {
    const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
    const title = selectedDept 
      ? `[${selectedDept}] 저출생 대책 정책 수요 및 의사결정 분석 보고` 
      : `[여성가족실] 서울시 출산·양육 정책 수요 및 공백(Gap) 종합보고서`;

    let text = `============================================================\n`;
    text += `   ${title}\n`;
    text += `============================================================\n`;
    text += `◈ 보고일자: ${today}\n`;
    text += `◈ 작성부서: 서울특별시 여성가족실 ${selectedDept || 'R&R 통합 기획팀'}\n`;
    text += `◈ 보고구분: ${reportType === 'detailed' ? '행정 실무 상세 보고용' : '시장단 및 간부 브리핑 보고용'}\n\n`;

    text += `1. 추진 배경 및 목적\n`;
    text += `  가. 저출생 위기 극복을 위한 시민들의 실시간 요구사항(상상대로서울) 및 고충 민원(국민신문고) 모니터링 체계 가동.\n`;
    text += `  나. 5원 데이터(제안, 민원, 정책, 뉴스, 실측통계) 융합 분석을 통한 부서 R&R별 정책 사각지대(Gap) 발굴.\n`;
    text += `  다. 수요자 맞춤형 정책 피드백 수립 및 신속한 행정 의사결정 지원.\n\n`;

    if (includeStats) {
      text += `2. 주요 수요/현장 데이터 현황\n`;
      text += `  가. 분석 대상 범위: ${selectedDept ? `${selectedDept} 소관 카테고리 (${deptCategories.join(', ')})` : '서울시 출산·양육 8대 정책 분야 전체'}\n`;
      text += `  나. 시민 정책 제안 수집 건수: 총 ${deptProposals.length}건\n`;
      text += `  다. 총 시민 공감(추천) 수: 총 ${deptProposals.reduce((sum, p) => sum + (p.vote_score || 0), 0).toLocaleString()}표\n`;
      text += `  라. 주요 핵심 키워드: 난임지원, 긴급돌봄, 다자녀 혜택, 유아식 지원, 주택 특별공급, 육아휴직 급여 등\n\n`;
    }

    if (includeGaps) {
      text += `3. 정책 공백(Gap) 분석 결과 및 정책 충족도\n`;
      
      deptCategories.forEach(cat => {
        const catProps = deptProposals.filter(p => p.category === cat || p.sub_category?.includes(cat.substring(0,2)));
        const unanswered = catProps.filter(p => p.reply_yn === 'N').length;
        
        let satisfaction = '60%';
        let action = '이용 조건 조율';
        if (cat.includes('임신') || cat.includes('의료')) {
          satisfaction = '58% (일부 충족)';
          action = '소득/연령 신청기준 개선 및 대리투약 조건 완화 요망';
        } else if (cat.includes('보육') || cat.includes('돌봄')) {
          satisfaction = '82% (우수)';
          action = '기존 365열린어린이집 등 공공 인프라 적극 홍보 강화';
        } else {
          satisfaction = '45% (미충족)';
          action = '신규 수혜 사업 모델 기획 및 예산 편성 검토';
        }

        text += `  ▶ [${cat}]\n`;
        text += `    - 수집 제안/민원: ${catProps.length}건 (이 중 미답변 긴급 안건: ${unanswered}건)\n`;
        text += `    - 현행 정책 매칭 만족도: ${satisfaction}\n`;
        text += `    - AI 행정 추천 액션: ${action}\n`;
      });
      text += `\n`;
    }

    if (includeAI) {
      text += `4. AI 기반 행정 종합 의견\n`;
      if (selectedDept === '가족건강팀' || selectedDept === '건강임신지원팀') {
        text += `  가. [의료/난임 우선과제]: 보건소 난임 주사 대리 투약 허용 및 소득 기준 제한 철폐 요구가 압도적임. 현행 사업과의 조건 불일치 해소를 위해 '신청·이용 기준 개선' 조치가 긴급 요망됨.\n`;
      } else if (selectedDept === '영유아담당관') {
        text += `  가. [보육 인프라 우선과제]: 야간/휴일 긴급돌봄 시설 확충 및 공공형 키즈카페 안전 관리 인력 확충에 대한 요구가 지속됨. 거점 인프라 홍보 강화 및 안전요원 매뉴얼 배포가 추천됨.\n`;
      } else {
        text += `  가. [종합 권고]: 고공감 미답변 제안들에 대해 1차 행정 예비답변을 신속히 송출하여 행정 신뢰도를 높여야 함. 정책 공백 지수가 높은 미충족 분야는 내년도 신규 사업 기획에 적극 반영 권장함.\n`;
      }
      text += `  나. 언론 보도(뉴스) 분석 결과, 타 지자체의 파격 지원 정책과 서울시 정책 간의 혜택 차이를 지적하는 보도가 우세(이슈 강도: 상)하여 선제적 홍보 대응이 동반되어야 함.\n\n`;
    }

    if (includeAcademic) {
      text += `5. 학술적 선행 연구 및 통계 근거 대조 (Factual & Academic Grounding)\n`;
      text += `  가. [홍향희·이정화 (2026) 연구 대조 - 국민신문고 저출산 민원 992건 CONCOR 분석]:\n`;
      text += `    - 시민 민원의 핵심 쟁점은 단순 수당 지원보다 '시간제 보육 편의성', '소아 응급 의료 체계', '맞벌이 돌봄 공백 해소' 등 연속적인 인프라 보장임.\n`;
      text += `    - 본 부서 소관 카테고리 연계도: 실시간 민원 수집본 중 보육/돌봄 인프라에 대한 수요 강도가 강하게 판정되어 정책 연계 및 R&R 부서 조치 권고를 지원함.\n`;
      text += `  나. [이정기 (2021) 연구 대조 - 뉴스 및 대중 댓글 25,800건 텍스트 마이닝 분석]:\n`;
      text += `    - 청년층이 결혼과 출산을 주저하게 만드는 근본적인 진입 장벽이자 체감 정책 공백(Gap)은 단순 일회성 현금 수당보다 '출산가구 주거비 부담 완화', '일·가정 양립을 위한 유연근무 제도화', '육아휴직 직장 내 불이익 해소'로 나타남.\n`;
      text += `    - 본 보고서 연계: 갭 분석 알고리즘에서 산출된 주거 및 노동 유연성 관련 정책 공백(Gap) 지수가 높게 대조되며, 서울시 공급 정책(몽땅정보통 323개 사업)의 수혜 대상 및 이용 자격 보정 필요성을 지지함.\n\n`;
    }

    if (includeLogs) {
      text += `6. 실무자 검토 및 조치 피드백 로그\n`;
      const loggedItems = Object.entries(customActions);
      if (loggedItems.length > 0) {
        loggedItems.forEach(([cat, dataVal], idx) => {
          const data = dataVal as { action: string; status: string };
          text += `  ${String.fromCharCode(97 + idx)}. [${cat}] R&R 처리: 액션 '${data.action}', 상태 '${data.status}'로 확정 및 결재 요청 완료.\n`;
        });
      } else {
        text += `  가. 현재 확정된 수동 오버라이드 피드백 이력이 없습니다. (대시보드 AI 승인 모달에서 결재 시 자동 추가됨)\n`;
      }
      text += `\n`;
    }

    text += `------------------------------------------------------------\n`;
    text += `※ 본 보고서는 서울시 출산·양육 대시보드(UKKKK)에서 실시간 데이터 및 AI 우선순위 모델을 융합하여 자동 생성한 공식 초안 문서입니다.`;
    return text;
  }, [selectedDept, reportType, includeAI, includeStats, includeGaps, includeAcademic, includeLogs, deptCategories, deptProposals, customActions]);

  if (!isOpen) return null;

  // 텍스트 파일(HWP 대응) 다운로드
  const handleDownloadText = () => {
    if (format === 'excel') {
      // CSV 다운로드로 변환
      let csvContent = '\uFEFF'; // UTF-8 BOM
      csvContent += '제안ID,제목,카테고리,소속부서,공감수,등록일,답변여부\n';
      deptProposals.forEach(p => {
        csvContent += `"${p.id}","${p.title.replace(/"/g, '""')}","${p.category}","${selectedDept || '통합'}","${p.vote_score}","${p.reg_date || ''}","${p.reply_yn}"\n`;
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `[${selectedDept || '여성가족실'}]_정책수요_raw_data_${new Date().toISOString().substring(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    // HWP/PDF 텍스트 형식 다운로드
    const element = document.createElement('a');
    const file = new Blob([generatedReportText], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    const extension = format === 'hwp' ? 'hwp.txt' : 'report.txt';
    element.download = `[${selectedDept || '여성가족실'}]_의사결정_보고서_${new Date().toISOString().substring(0, 10)}.${extension}`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // 클립보드 복사
  const handleCopyClipboard = () => {
    navigator.clipboard.writeText(generatedReportText);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-4xl shadow-2xl flex flex-col h-[90vh] max-h-[750px] overflow-hidden animate-scale-up">
        {/* 모달 헤더 */}
        <div className="bg-[#0A2351] text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white/10 rounded-lg">
              <FileText className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold">맞춤형 기안·결재 보고서 자동 생성기</h2>
              <p className="text-[10px] text-slate-300 mt-0.5">
                {selectedDept ? `🏢 ${selectedDept} 소관 전담` : '🏢 전체 부서 R&R 통합'} 공문 양식 보고서 설계 및 다운로드
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/15 text-slate-300 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 모달 바디 (좌측 컨트롤 패널 + 우측 실시간 미리보기) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* 좌측 설정 컨트롤 */}
          <div className="w-full md:w-80 bg-slate-50 border-r border-slate-200 p-4 overflow-y-auto space-y-4 text-xs">
            {/* 1. 보고서 유형 선택 */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 block">1. 보고서 유형</label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => setReportType('detailed')}
                  className={`py-2 px-2.5 rounded-lg border font-bold text-center transition cursor-pointer ${
                    reportType === 'detailed'
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  실무자 상세용
                </button>
                <button
                  onClick={() => setReportType('executive')}
                  className={`py-2 px-2.5 rounded-lg border font-bold text-center transition cursor-pointer ${
                    reportType === 'executive'
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  간부 보고용
                </button>
              </div>
            </div>

            {/* 2. 출력 포맷 */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 block">2. 파일 포맷 선택</label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => setFormat('hwp')}
                  className={`py-1.5 px-2 rounded-lg border font-bold text-center transition cursor-pointer flex flex-col items-center gap-1 ${
                    format === 'hwp'
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-[10px]">한글 HWP</span>
                  <span className="text-[8px] opacity-75">(텍스트)</span>
                </button>
                <button
                  onClick={() => setFormat('pdf')}
                  className={`py-1.5 px-2 rounded-lg border font-bold text-center transition cursor-pointer flex flex-col items-center gap-1 ${
                    format === 'pdf'
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-[10px]">PDF 요약</span>
                  <span className="text-[8px] opacity-75">(줄글문서)</span>
                </button>
                <button
                  onClick={() => setFormat('excel')}
                  className={`py-1.5 px-2 rounded-lg border font-bold text-center transition cursor-pointer flex flex-col items-center gap-1 ${
                    format === 'excel'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-[10px]">Excel CSV</span>
                  <span className="text-[8px] opacity-75">(생데이터)</span>
                </button>
              </div>
            </div>

            {/* 3. 포함할 콘텐츠 섹션 선택 */}
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <label className="font-bold text-slate-700 block">3. 보고서 포함 섹션</label>
              <div className="space-y-2 bg-white p-2.5 rounded-lg border border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={includeStats}
                    onChange={(e) => setIncludeStats(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>1. 부서 소관 제안/민원 통계</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={includeGaps}
                    onChange={(e) => setIncludeGaps(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>2. 정책 만족도 및 Gap 진단표</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={includeAI}
                    onChange={(e) => setIncludeAI(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>3. AI 기반 행정 종합의견</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={includeAcademic}
                    onChange={(e) => setIncludeAcademic(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>4. 학술 연구 및 통계 근거 대조</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={includeLogs}
                    onChange={(e) => setIncludeLogs(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>5. 행정 조치 피드백 로그</span>
                </label>
              </div>
            </div>

            {/* 안내 팁 박스 */}
            <div className="bg-amber-50 border border-amber-100 p-2.5 rounded-lg text-amber-900 leading-relaxed flex gap-1.5 items-start">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <p className="text-[10px]">
                <strong>공공기관 템플릿 안내:</strong><br />
                선택하신 소속 부서의 R&R 카테고리와 AI 분석 점수가 자동으로 기안서 양식 표제어(`가, 나, 다, ◈`) 형식에 맞춰 완성됩니다. 다운로드 후 내부 기안기에 복사하여 활용해 주십시오.
              </p>
            </div>
          </div>

          {/* 우측 실시간 보고서 문서 프리뷰 */}
          <div className="flex-1 bg-slate-900 p-4 flex flex-col overflow-hidden relative">
            <div className="flex items-center justify-between text-slate-400 text-[10px] pb-2 border-b border-slate-800">
              <span className="font-mono flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                {format === 'excel' ? 'csv_preview.csv' : format === 'hwp' ? 'official_report_draft.hwp.txt' : 'document_summary.txt'}
              </span>
              <button 
                onClick={handleCopyClipboard}
                className="hover:text-white transition px-2 py-0.5 rounded border border-slate-800 hover:border-slate-700 bg-slate-800 text-[9px] font-bold cursor-pointer"
              >
                {copySuccess ? '✓ 복사완료' : '본문 전체복사'}
              </button>
            </div>

            {format === 'excel' ? (
              <div className="flex-1 overflow-auto bg-slate-950 font-mono text-[9.5px] p-4 text-emerald-400 leading-relaxed whitespace-pre rounded-lg mt-3">
                {`"제안ID","제목","카테고리","소속부서","공감수","등록일","답변여부"\n`}
                {deptProposals.slice(0, 15).map(p => (
                  `"${p.id}","${p.title.substring(0, 30)}${p.title.length > 30 ? '...' : ''}","${p.category}","${selectedDept || '통합'}","${p.vote_score}","${p.reg_date || ''}","${p.reply_yn}"\n`
                ))}
                {deptProposals.length > 15 && `...외 ${deptProposals.length - 15}건의 데이터행 추가 포함`}
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto bg-slate-950 font-mono text-[10px] p-4 text-slate-300 leading-relaxed whitespace-pre-wrap rounded-lg mt-3 select-text selection:bg-blue-600 selection:text-white">
                {generatedReportText}
              </div>
            )}
          </div>
        </div>

        {/* 모달 푸터 */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between text-xs">
          <div className="text-slate-500 font-bold">
            {format === 'excel' ? (
              <span className="text-emerald-700">✓ Excel CSV 테이블 데이터로 내보냅니다.</span>
            ) : (
              <span>✓ 공공기관 개조식 문체 표준 규격이 적용되어 있습니다.</span>
            )}
          </div>
          <button
            onClick={handleDownloadText}
            className={`px-4 py-2 text-white font-extrabold rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-sm ${
              format === 'excel'
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {format === 'excel' ? (
              <>
                <FileSpreadsheet className="w-4 h-4" />
                <span>Excel CSV 파일 다운로드</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>보고서 파일 다운로드</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
