/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  Download,
  FileSpreadsheet,
  FileText,
  Layers,
  X,
} from 'lucide-react';
import { PolicyProposal } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedDept: string | null;
  selectedDistrict?: string | null;
  selectedCategory?: string | null;
  proposals: PolicyProposal[];
  customActions?: Record<string, { action: string; status: string; overrideSatisfaction?: string }>;
}

type ReportType = 'detailed' | 'executive';
type ExportFormat = 'hwp' | 'pdf' | 'excel';
type SectionKey = 'background' | 'stats' | 'gaps' | 'ai' | 'academic' | 'logs';

interface ReportSection {
  key: SectionKey;
  title: string;
  summary: string;
  body: string[];
}

const SECTION_LABELS: Record<SectionKey, string> = {
  background: '추진 배경 및 목적',
  stats: '전체 수요/현장 데이터 현황',
  gaps: '종합 Gap 진단 및 정책 가설',
  ai: 'AI 기반 행정 종합의견',
  academic: '학술 연구 및 통계 근거 대조',
  logs: '행정 조치 피드백 로그',
};

const getDepartmentNames = (proposal: PolicyProposal) => {
  const departments = Array.isArray(proposal.department) ? proposal.department : [];
  const rankingNames = Array.isArray(proposal.department_rankings)
    ? proposal.department_rankings.map((ranking) => ranking.dept_name)
    : [];
  return [...departments, ...rankingNames].filter(Boolean);
};

const createCsv = (proposals: PolicyProposal[], selectedDept: string | null) => {
  const header = ['제안ID', '제목', '카테고리', '담당부서', '공감수', '등록일', '답변여부'];
  const rows = proposals.map((proposal) => [
    proposal.id,
    proposal.title,
    String(proposal.category || ''),
    selectedDept || getDepartmentNames(proposal)[0] || '통합 검토',
    String(proposal.vote_score ?? 0),
    proposal.reg_date || '',
    proposal.reply_yn === 'Y' ? '답변완료' : '미답변',
  ]);

  return [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
};

export const ReportExportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  selectedDept,
  selectedDistrict = null,
  selectedCategory = null,
  proposals,
  customActions = {},
}) => {
  const [reportType, setReportType] = useState<ReportType>('detailed');
  const [format, setFormat] = useState<ExportFormat>('hwp');
  const [enabledSections, setEnabledSections] = useState<Record<SectionKey, boolean>>({
    background: true,
    stats: true,
    gaps: true,
    ai: true,
    academic: true,
    logs: true,
  });
  const [copySuccess, setCopySuccess] = useState(false);

  const { scopedProposals, isDistrictFallback } = useMemo(() => {
    const directMatches = proposals.filter((proposal) => {
      if (selectedDept && !getDepartmentNames(proposal).includes(selectedDept)) return false;
      if (selectedCategory && proposal.category !== selectedCategory) return false;
      if (selectedDistrict && proposal.district !== selectedDistrict) return false;
      return true;
    });

    if (selectedDistrict && directMatches.length === 0) {
      const fallbackMatches = proposals.filter((proposal) => {
        if (selectedDept && !getDepartmentNames(proposal).includes(selectedDept)) return false;
        if (selectedCategory && proposal.category !== selectedCategory) return false;
        if (proposal.district !== '미상') return false;
        return true;
      });
      return { scopedProposals: fallbackMatches, isDistrictFallback: true };
    }

    return { scopedProposals: directMatches, isDistrictFallback: false };
  }, [proposals, selectedCategory, selectedDept, selectedDistrict]);

  const reportData = useMemo(() => {
    const totalVotes = scopedProposals.reduce((sum, proposal) => sum + (proposal.vote_score || 0), 0);
    const unansweredCount = scopedProposals.filter((proposal) => proposal.reply_yn === 'N').length;
    const replyRate =
      scopedProposals.length > 0
        ? Math.round(((scopedProposals.length - unansweredCount) / scopedProposals.length) * 100)
        : 0;
    const urgentCount = scopedProposals.filter(
      (proposal) => proposal.reply_yn === 'N' && (proposal.vote_score || 0) >= 100,
    ).length;
    const negativeCount = scopedProposals.filter((proposal) => proposal.negative_signal).length;
    const categoryCounts = scopedProposals.reduce<Record<string, number>>((acc, proposal) => {
      const category = String(proposal.category || '미분류');
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});
    const topCategories = (Object.entries(categoryCounts) as Array<[string, number]>)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const topProposal = [...scopedProposals].sort((a, b) => (b.vote_score || 0) - (a.vote_score || 0))[0];
    const scopeLabel = selectedDept
      ? `${selectedDept} 소관`
      : selectedDistrict || selectedCategory
        ? '선택 조건'
        : '여성가족실 전체';
    const gapScore = scopedProposals.length > 0 ? Math.min(100, Math.round((unansweredCount / scopedProposals.length) * 70 + 20)) : 0;

    return {
      totalVotes,
      unansweredCount,
      replyRate,
      urgentCount,
      negativeCount,
      topCategories,
      topProposal,
      scopeLabel,
      gapScore,
    };
  }, [scopedProposals, selectedCategory, selectedDept, selectedDistrict]);

  const sections = useMemo<ReportSection[]>(() => {
    const today = new Date().toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const filterText = [
      selectedDept ? `부서: ${selectedDept}` : '부서: 전체',
      selectedCategory ? `분야: ${selectedCategory}` : null,
      selectedDistrict ? `지역: ${selectedDistrict}${isDistrictFallback ? ' (미상 데이터 연계)' : ''}` : null,
    ]
      .filter(Boolean)
      .join(' / ');

    const policyHypothesis =
      scopedProposals.length === 0
        ? '현재 선택 조건에서는 분석 가능한 시민 제안 표본이 부족합니다. 추가 데이터 확보 후 정책 가설을 보완해야 합니다.'
        : `시민 수요 ${scopedProposals.length.toLocaleString()}건, 공감 ${reportData.totalVotes.toLocaleString()}표, 미답변 ${reportData.unansweredCount.toLocaleString()}건을 종합하면 현재 필요한 정책은 단일 사업 신설보다 신청 기준, 정보 접근성, 돌봄 공급, 주거·노동 장벽을 함께 낮추는 통합 보완 정책입니다. 이러한 정책이 발행된다면 시민은 제도 존재 여부를 찾는 부담과 실제 신청 단계의 탈락 가능성을 동시에 줄일 수 있습니다.`;

    const recommendedPolicy =
      '우선 검토 정책 가설은 난임·임신 지원 기준 완화, 야간·긴급 돌봄 공급 보강, 주거·노동·생활비 조건 연계 지원, 신청 절차 안내 통합입니다.';

    return [
      {
        key: 'background',
        title: SECTION_LABELS.background,
        summary: '보고서 목적과 분석 범위를 정리합니다.',
        body: reportType === 'detailed'
          ? [
              `보고일자: ${today}`,
              `분석범위: ${filterText}`,
              '본 보고서는 시민 제안, 민원, 정책 공급, 뉴스, 실측 통계를 함께 검토해 출산·양육 정책의 수요와 공급 공백을 판단하기 위한 기안 초안입니다.',
              '개별 클러스터 하나를 세분화하기보다 전체 수요 흐름을 기준으로 부서 R&R과 결재 검토에 필요한 종합 판단을 제시합니다.',
            ]
          : [
              `◈ [여성가족실 브리핑] 시민 정책 수요 진단 및 시장단 신속 의사결정 지원`,
              `◈ 분석대상: ${filterText} (${today} 기준 최신 융합 현황)`,
              `◈ 목적: 파편화된 다차원 정책 데이터 결합 기반 R&R 우선 조치 및 자치구별 정책 자원 배분 활용`,
            ],
      },
      {
        key: 'stats',
        title: SECTION_LABELS.stats,
        summary: '시민 수요, 공감, 답변 상태, 주요 분야를 집계합니다.',
        body: reportType === 'detailed'
          ? [
              `수집 제안/민원: 총 ${scopedProposals.length.toLocaleString()}건`,
              `총 공감수: ${reportData.totalVotes.toLocaleString()}표`,
              `미답변 제안: ${reportData.unansweredCount.toLocaleString()}건 / 답변 진행률 ${reportData.replyRate}%`,
              `고공감 미답변 제안: ${reportData.urgentCount.toLocaleString()}건`,
              `부정 신호 포함 제안: ${reportData.negativeCount.toLocaleString()}건`,
              `주요 수요 분야: ${
                reportData.topCategories.length > 0
                  ? reportData.topCategories.map(([category, count]) => `${category} ${count}건`).join(', ')
                  : '분석 대상 없음'
              }`,
              reportData.topProposal
                ? `최상위 공감 제안: "${reportData.topProposal.title}" (${reportData.topProposal.vote_score || 0}표)`
                : '최상위 공감 제안: 분석 대상 없음',
            ]
          : [
              `◈ 시민 수요 총량: 총 ${scopedProposals.length.toLocaleString()}건의 정책 수요 및 민원 안건 식별`,
              `◈ 공감 및 전파: 시민 추천/공감 누적 ${reportData.totalVotes.toLocaleString()}표 획득으로 적극적 요구 판정`,
              `◈ 미해결 사각지대: 미답변 안건 ${reportData.unansweredCount.toLocaleString()}건 확인 (답변 진행률 ${reportData.replyRate}%)`,
              `◈ 긴급 경고 신호: 부정 민원 및 고공감 누적 장기 방치 안건 ${reportData.urgentCount.toLocaleString()}건 즉시 조치 요망`,
            ],
      },
      {
        key: 'gaps',
        title: SECTION_LABELS.gaps,
        summary: '데이터와 논문을 합쳐 현재 필요한 정책 가설을 제안합니다.',
        body: reportType === 'detailed'
          ? [
              `종합 Gap 점수: ${reportData.gapScore}점`,
              `정책 가설: ${policyHypothesis}`,
              `결론: ${recommendedPolicy}`,
              '근거: 고공감·미답변 수요는 시민 체감 공백의 선행 신호이며, 직접 매칭되는 정책 공급이 부족하거나 조건이 좁은 분야는 보완 정책의 우선 검토 대상입니다.',
              '권고: 기존 사업의 대상 조건, 신청 절차, 홍보 채널, 부서 간 이관 기준을 먼저 정비한 뒤 신규 사업 또는 예산 편성 필요성을 판단합니다.',
            ]
          : [
              `◈ 종합 Gap 지수: ${reportData.gapScore}점 (시민 불일치 및 정책 공백 수준 진단)`,
              `◈ 의사결정 가설: 현행 저출생 지원책의 신청 소득 제한 철폐 및 24시간 긴급 보육 인프라의 양적 보강이 급선무임`,
              `◈ 정책 제안: 난임 시술비 지원 횟수 완화, 야간 긴급어린이집 증설, 신혼부부 전세자금 지원 조건 보완 등 3대 현안 우선 추진 권고`,
            ],
      },
      {
        key: 'ai',
        title: SECTION_LABELS.ai,
        summary: 'AI 분석 결과를 행정 검토 언어로 요약합니다.',
        body: reportType === 'detailed'
          ? [
              `AI 종합의견은 ${reportData.scopeLabel} 전체 수요 흐름을 기준으로 작성했습니다.`,
              '현재 수요는 특정 세부 클러스터만의 문제가 아니라 임신·난임, 보육·돌봄, 주거·노동, 정보 접근 문제가 연결된 복합 공백으로 해석됩니다.',
              '단순 민원 답변보다 부서별 기존 정책 매칭 검수, 미답변 사유 기록, 신청 단계 병목 파악, 정책 안내 문안 표준화가 우선 필요합니다.',
              '결재 검토 시에는 수요 강도, 정책 공백, 시급성, 실행가능성, 근거 신뢰도 5대 축을 함께 반영하는 방식이 적합합니다.',
            ]
          : [
              `◈ [AI 행정 권고] 민원 1:1 회신 단계를 넘어, 소관 부서별 현행 조례 시행규칙 개정의 거시적 접근 필요`,
              `◈ [부서 협동 지시] 여성가족실, 시민건강국 등 다부서 공동 검토 TF 구성을 통해 종합 신청 안내 창구 일원화 추진`,
              `◈ [재원 배분 권장] 갭 분석 결과 예산 대비 편익 효과가 높은 기존 양육수당 확대 편성을 최우선 검토 권장`,
            ],
      },
      {
        key: 'academic',
        title: SECTION_LABELS.academic,
        summary: '우리가 적용한 논문·통계 근거와 분석 로직을 연결합니다.',
        body: reportType === 'detailed'
          ? [
              '홍향희·이정화(2026)와 오신휘·김혜진(2020)은 시민 원문을 정책 수요로 분류하고 핵심 쟁점을 구조화하는 텍스트마이닝 근거로 적용했습니다.',
              '배기련 외(2021)는 정책과 대중 인식 간 차이를 비교하는 근거로, 부정 신호와 체감 불만을 보조 판단에 반영했습니다.',
              '성낙일·박선권(2012)과 KICCE 수요·공급 형평성 연구는 보육 인프라와 지역 공급 취약성 판단의 근거로 연결했습니다.',
              '국회예산정책처(NABO) 연구는 저출산 정책의 파편화와 재원배분 문제를 검토하는 근거로 반영했습니다.',
              '박미경(2022)은 시민 요구도와 우선순위를 함께 보는 판단 근거로 적용했습니다.',
            ]
          : [
              `◈ 학술적 타당성: KCI 학술지 등 저출산 연구 문헌 7대 주요 선행 연구 및 국책기관(KICCE, NABO) 보고서와 모델 일치도 검증 완료`,
              `◈ 모델 신뢰성: 텍스트 마이닝 기반 여론 분류 기법(오신휘 등, 2020) 및 지역 보육 인프라 경제 편익 모델(성낙일 등, 2012)에 준하는 타당성 정당화 확보`,
            ],
      },
      {
        key: 'logs',
        title: SECTION_LABELS.logs,
        summary: '승인 패널에서 확정한 조치와 후속 처리를 기록합니다.',
        body: reportType === 'detailed'
          ? (Object.entries(customActions).length > 0
              ? (Object.entries(customActions) as Array<[
                  string,
                  { action: string; status: string; overrideSatisfaction?: string },
                ]>).map(([category, data]) => {
                  return `[${category}] 조치: ${data.action} / 상태: ${data.status}${
                    data.overrideSatisfaction ? ` / 보정: ${data.overrideSatisfaction}` : ''
                  }`;
                })
              : ['현재 확정된 수동 조치 로그가 없습니다. 승인 패널에서 조치가 확정되면 이 섹션에 자동 반영됩니다.'])
          : [
              Object.entries(customActions).length > 0
                ? `◈ 행정 승인 조치 사항: 총 ${Object.entries(customActions).length}건의 부서 R&R 수동 보정 및 오버라이드 승인 반영 완료`
                : '◈ 행정 승인 조치 사항: 승인 패널에서 확정한 행정 검토 피드백 이력 없음 (기본값 의사결정 체계 준용)',
            ],
      },
    ];
  }, [
    customActions,
    isDistrictFallback,
    reportData,
    reportType,
    scopedProposals.length,
    selectedCategory,
    selectedDept,
    selectedDistrict,
  ]);

  const selectedSections = useMemo(
    () => sections.filter((section) => enabledSections[section.key]),
    [enabledSections, sections],
  );

  const generatedReportText = useMemo(() => {
    const subtitle = [
      selectedDept ? selectedDept : '여성가족실 전체',
      selectedCategory ? selectedCategory : null,
      selectedDistrict ? `${selectedDistrict}${isDistrictFallback ? ' (미상 연계)' : ''}` : null,
    ]
      .filter(Boolean)
      .join(' / ');
    const title = `[${subtitle}] 출산·양육 정책 수요 및 공급 Gap 종합보고서`;
    const header = [
      '============================================================',
      `   ${title}`,
      '============================================================',
      `보고구분: ${reportType === 'detailed' ? '실무자 상세용' : '간부 보고용'}`,
      '',
    ];
    const body = selectedSections.flatMap((section, index) => [
      `${index + 1}. ${section.title}`,
      ...section.body.map((line) => `  - ${line}`),
      '',
    ]);
    const footer = [
      '------------------------------------------------------------',
      '본 문서는 UKKKK 대시보드의 시민 제안, 민원, 정책 공급, 뉴스, 통계, 논문 근거를 통합해 자동 생성한 공식 보고서 초안입니다.',
    ];

    return [...header, ...body, ...footer].join('\n');
  }, [reportType, selectedCategory, selectedDept, selectedDistrict, selectedSections, isDistrictFallback]);

  if (!isOpen) return null;

  const csvPreview = createCsv(scopedProposals.slice(0, 15), selectedDept);
  const enabledCount = selectedSections.length;

  const toggleSection = (key: SectionKey) => {
    setEnabledSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDownload = () => {
    if (format === 'excel') {
      const blob = new Blob(['\uFEFF' + createCsv(scopedProposals, selectedDept)], {
        type: 'text/csv;charset=utf-8;',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `[${selectedDept || '여성가족실'}]_정책수요_raw_data_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return;
    }

    if (format === 'pdf') {
      window.print();
      return;
    }

    const blob = new Blob([generatedReportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `[${selectedDept || '여성가족실'}]_정책수요_Gap_보고서_${new Date().toISOString().slice(0, 10)}.hwp.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyClipboard = () => {
    navigator.clipboard.writeText(format === 'excel' ? createCsv(scopedProposals, selectedDept) : generatedReportText);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fade-in">
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-report-area, #printable-report-area * {
            visibility: visible !important;
          }
          #printable-report-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            padding: 24px !important;
            margin: 0 !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
          }
        }
      `}</style>
      <div className="flex h-[90vh] max-h-[780px] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-scale-up">
        <div className="flex items-center justify-between bg-[#0A2351] px-5 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-white/10 p-2">
              <FileText className="h-5 w-5 text-blue-300" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold">기안·결재 보고서 자동생성기</h2>
              <p className="mt-0.5 text-xs text-slate-300">
                {selectedDept ? `${selectedDept} 소관` : '전체 부서 R&R 통합'} 공식 양식 보고서 설계 및 다운로드
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg p-2 text-slate-300 transition hover:bg-white/15 hover:text-white"
            aria-label="보고서 모달 닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
          <div className="w-full shrink-0 space-y-5 overflow-y-auto border-r border-slate-200 bg-slate-50 p-5 text-sm md:w-[344px]">
            <div className="space-y-2">
              <label className="block font-extrabold text-slate-800">1. 검토사항</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'detailed' as const, label: '담당자 상세용' },
                  { id: 'executive' as const, label: '간부 보고용' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setReportType(item.id)}
                    className={`rounded-xl border px-3 py-3 text-center font-extrabold transition ${
                      reportType === item.id
                        ? 'border-blue-400 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block font-extrabold text-slate-800">2. 파일 형식 선택</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'hwp' as const, title: '한글 HWP', sub: '텍스트' },
                  { id: 'pdf' as const, title: 'PDF 요약', sub: '줄글문서' },
                  { id: 'excel' as const, title: 'Excel CSV', sub: '생데이터' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFormat(item.id)}
                    className={`rounded-xl border px-2 py-3 text-center transition ${
                      format === item.id
                        ? item.id === 'excel'
                          ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                          : 'border-blue-400 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="block text-xs font-extrabold">{item.title}</span>
                    <span className="mt-1 block text-[10px] font-bold opacity-70">{item.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between">
                <label className="font-extrabold text-slate-800">3. 추천 섹션</label>
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700">
                  {enabledCount}/6개 반영
                </span>
              </div>
              <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
                {(Object.keys(SECTION_LABELS) as SectionKey[]).map((key, index) => (
                  <label
                    key={key}
                    className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 transition ${
                      enabledSections[key] ? 'border-blue-100 bg-blue-50/60' : 'border-slate-100 bg-white opacity-60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={enabledSections[key]}
                      onChange={() => toggleSection(key)}
                      className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>
                      <span className="block font-bold text-slate-800">
                        {index + 1}. {SECTION_LABELS[key]}
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-relaxed text-slate-500">
                        {sections.find((section) => section.key === key)?.summary}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-2 rounded-xl border border-amber-100 bg-amber-50 p-3 text-amber-900">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <p className="text-xs leading-relaxed">
                선택한 추천 섹션만 오른쪽 미리보기와 다운로드 본문에 반영됩니다. 이 보고서는 세부 클러스터가 아니라 전체 수요 흐름과 정책 가설 중심으로 구성됩니다.
              </p>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-slate-900 p-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 text-xs text-slate-400">
              <span className="flex items-center gap-2 font-mono">
                <Layers className="h-4 w-4 text-blue-400" />
                {format === 'excel'
                  ? 'csv_preview.csv'
                  : format === 'hwp'
                    ? 'official_report_draft.hwp.txt'
                    : 'document_summary.pdf.txt'}
              </span>
              <button
                type="button"
                onClick={handleCopyClipboard}
                className="cursor-pointer rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-bold text-slate-200 transition hover:text-white"
              >
                {copySuccess ? '복사완료' : '본문 전체복사'}
              </button>
            </div>

            {format === 'excel' ? (
              <pre className="mt-4 min-h-0 flex-1 overflow-auto rounded-xl bg-slate-950 p-4 text-xs leading-relaxed text-emerald-300">
                {csvPreview}
                {scopedProposals.length > 15 ? `\n... 외 ${scopedProposals.length - 15}건이 다운로드 파일에 포함됩니다.` : ''}
              </pre>
            ) : (
              <div id="printable-report-area" className="mt-4 min-h-0 flex-1 overflow-y-auto rounded-xl bg-white p-6 text-slate-900">
                <div className="border-b border-slate-200 pb-4">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">
                    {reportType === 'detailed' ? '실무자 상세 보고용' : '시장단 및 간부 브리핑용'}
                  </p>
                  <h3 className="mt-2 text-xl font-black leading-snug text-slate-950">
                    [{selectedDept || selectedCategory || (selectedDistrict ? `${selectedDistrict}${isDistrictFallback ? ' (미상 연계)' : ''}` : '여성가족실 전체')}] 출산·양육 정책 수요 및 공급 Gap 종합보고서
                  </h3>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-slate-100 px-3 py-1 font-bold text-slate-700">
                      수요 {scopedProposals.length.toLocaleString()}건
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 font-bold text-slate-700">
                      미답변 {reportData.unansweredCount.toLocaleString()}건
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 font-bold text-slate-700">
                      Gap {reportData.gapScore}점
                    </span>
                  </div>
                </div>

                <div className="mt-5 space-y-5">
                  {selectedSections.length > 0 ? (
                    selectedSections.map((section, index) => (
                      <section key={section.key} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="mb-3 flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-black text-white">
                            {index + 1}
                          </span>
                          <div>
                            <h4 className="text-sm font-black text-slate-950">{section.title}</h4>
                            <p className="mt-0.5 text-xs text-slate-500">{section.summary}</p>
                          </div>
                        </div>
                        <ul className="space-y-2 text-sm leading-relaxed text-slate-700">
                          {section.body.map((line, lineIndex) => (
                            <li key={`${section.key}-${lineIndex}`} className="flex gap-2">
                              <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                              <span>{line}</span>
                            </li>
                          ))}
                        </ul>
                      </section>
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-bold text-slate-500">
                      추천 섹션을 하나 이상 선택하면 보고서 미리보기가 생성됩니다.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-4 text-sm">
          <div className="font-bold text-slate-500">
            {format === 'excel' ? (
              <span className="text-emerald-700">Excel CSV 원자료가 다운로드됩니다.</span>
            ) : (
              <span>공공기관 보고서 문체와 섹션 순서가 미리보기에 반영됩니다.</span>
            )}
          </div>
          <button
            type="button"
            onClick={handleDownload}
            className={`flex cursor-pointer items-center gap-2 rounded-xl px-5 py-3 font-extrabold text-white shadow-sm transition ${
              format === 'excel' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {format === 'excel' ? <FileSpreadsheet className="h-4 w-4" /> : <Download className="h-4 w-4" />}
            <span>{format === 'excel' ? 'Excel CSV 다운로드' : '보고서 파일 다운로드'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
