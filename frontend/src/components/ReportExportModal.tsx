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
  HelpCircle,
} from 'lucide-react';
import { PolicyProposal } from '../types';
import { PublicShareReport } from './PublicShareReport';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedDept: string | null;
  selectedDistrict?: string | null;
  selectedCategory?: string | null;
  proposals: PolicyProposal[];
  customActions?: Record<string, { action: string; status: string; overrideSatisfaction?: string }>;
}

type ReportType = 'detailed' | 'executive' | 'public-share';
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
  gaps: '검토 우선순위 및 판단 근거',
  ai: '행정 검토 제안',
  academic: '분석 방법 및 근거 사용 범위',
  logs: '행정 조치 피드백 로그',
};

const getDepartmentNames = (proposal: PolicyProposal) => {
  const departments = Array.isArray(proposal.department) ? proposal.department : [];
  const rankingNames = Array.isArray(proposal.department_rankings)
    ? proposal.department_rankings.map((ranking) => ranking.dept_name)
    : [];
  return [...departments, ...rankingNames].filter(Boolean);
};

const getDepartmentRank = (proposal: PolicyProposal, department: string | null) => {
  if (!department || !Array.isArray(proposal.department_rankings)) return null;
  return proposal.department_rankings.find((ranking) => ranking.dept_name === department)?.rank ?? null;
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
  const [selectedAcademicEvidenceForModal, setSelectedAcademicEvidenceForModal] = useState(null);

  const { scopedProposals, isDistrictFallback, districtDirectCount } = useMemo(() => {
    const scopeMatches = proposals.filter((proposal) => {
      if (selectedDept && !getDepartmentNames(proposal).includes(selectedDept)) return false;
      if (selectedCategory && proposal.category !== selectedCategory) return false;
      return true;
    });

    if (selectedDistrict) {
      const directMatches = scopeMatches.filter((proposal) => proposal.district === selectedDistrict);
      if (directMatches.length > 0) {
        return {
          scopedProposals: directMatches,
          isDistrictFallback: false,
          districtDirectCount: directMatches.length,
        };
      }
      const fallbackMatches = scopeMatches.filter((proposal) => proposal.district === '미상');
      return {
        scopedProposals: fallbackMatches,
        isDistrictFallback: true,
        districtDirectCount: 0,
      };
    }

    return {
      scopedProposals: scopeMatches,
      isDistrictFallback: false,
      districtDirectCount: scopeMatches.length,
    };
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
    const topProposals = [...scopedProposals]
      .sort((a, b) => (b.vote_score || 0) - (a.vote_score || 0))
      .slice(0, 3);
    const topProposal = topProposals[0];
    const scopeLabel = selectedDept
      ? `${selectedDept} R&R 후보`
      : selectedDistrict || selectedCategory
        ? '선택 조건'
        : '여성가족실 전체';
    const unansweredRate = scopedProposals.length > 0 ? unansweredCount / scopedProposals.length : 0;
    const urgentRate = scopedProposals.length > 0 ? urgentCount / scopedProposals.length : 0;
    const negativeRate = scopedProposals.length > 0 ? negativeCount / scopedProposals.length : 0;
    const reviewScore = scopedProposals.length > 0
      ? Math.min(100, Math.round(unansweredRate * 70 + urgentRate * 20 + negativeRate * 10))
      : 0;
    const primaryCount = selectedDept
      ? scopedProposals.filter((proposal) => getDepartmentRank(proposal, selectedDept) === 1).length
      : 0;
    const collaborationCount = selectedDept
      ? scopedProposals.filter((proposal) => {
          const rank = getDepartmentRank(proposal, selectedDept);
          return rank === 2 || rank === 3;
        }).length
      : 0;
    const confidenceLabel = scopedProposals.length < 10 ? '소표본·해석 주의' : '탐색적 검토';

    return {
      totalVotes,
      unansweredCount,
      replyRate,
      urgentCount,
      negativeCount,
      topCategories,
      topProposals,
      topProposal,
      scopeLabel,
      reviewScore,
      primaryCount,
      collaborationCount,
      confidenceLabel,
    };
  }, [scopedProposals, selectedCategory, selectedDept, selectedDistrict]);

  const publicShareProposals = useMemo(() => {
    return scopedProposals.slice(0, 12).map((p) => ({
      category: String(p.category || '보육·돌봄'),
      title: String(p.title),
      quote: p.title.length > 25 ? `“${p.title.slice(0, 25)}...”` : `“${p.title}”`,
      content: p.content && p.content.trim() !== p.title.trim()
        ? String(p.content)
        : '상세 원문이 현재 화면 데이터에 연결되지 않아 원문 링크 확인이 필요합니다.',
    }));
  }, [scopedProposals]);

  const topCategoryName = useMemo(() => {
    return reportData.topCategories[0]?.[0] || '자료 없음';
  }, [reportData.topCategories]);

  const topVotedCategory = useMemo(() => {
    return reportData.topProposal?.category || '자료 없음';
  }, [reportData.topProposal]);

  const sections = useMemo<ReportSection[]>(() => {
    const today = new Date().toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const baseFilterText = [
      selectedDept ? `부서: ${selectedDept}` : '부서: 전체',
      selectedCategory ? `분야: ${selectedCategory}` : null,
    ]
      .filter(Boolean)
      .join(' / ');
    const districtScopeText = selectedDistrict
      ? isDistrictFallback
        ? `선택 지역: ${selectedDistrict} / 직접 확인: 0건 / 참고자료: 지역 미상 ${scopedProposals.length.toLocaleString()}건`
        : `지역: ${selectedDistrict} / 직접 확인: ${districtDirectCount.toLocaleString()}건`
      : null;
    const filterText = [baseFilterText, districtScopeText].filter(Boolean).join(' / ');
    const actualProposalLines = reportData.topProposals.length > 0
      ? reportData.topProposals.map(
          (proposal, index) =>
            `${index + 1}순위 검토 안건: "${proposal.title}" / 공감 ${(proposal.vote_score || 0).toLocaleString()}표 / ${
              proposal.reply_yn === 'Y' ? '답변완료' : '미답변'
            }`,
        )
      : ['검토 안건: 현재 선택 조건에 해당하는 제안이 없습니다.'];
    const rrSummary = selectedDept
      ? `R&R 구성: 주관 1순위 ${reportData.primaryCount.toLocaleString()}건 / 협조 2·3순위 ${reportData.collaborationCount.toLocaleString()}건`
      : 'R&R 구성: 실제 팀을 선택하면 주관 1순위와 협조 2·3순위를 구분해 표시합니다.';
    const dataLimitNote = isDistrictFallback
      ? `${selectedDistrict} 직접 확인 자료는 0건입니다. 아래 ${scopedProposals.length.toLocaleString()}건은 지역 미상 참고자료이며 ${selectedDistrict} 발생 건으로 해석할 수 없습니다.`
      : scopedProposals.length < 10
        ? `현재 표본은 ${scopedProposals.length.toLocaleString()}건으로 작아 정책 효과나 지역 전체 수요를 일반화할 수 없습니다.`
        : '본 결과는 현재 화면에 적재된 시민 제안의 탐색적 집계이며 최종 정책 판단 전 원문과 업무분장 확인이 필요합니다.';

    return [
      {
        key: 'background',
        title: SECTION_LABELS.background,
        summary: '보고서 목적과 분석 범위를 정리합니다.',
        body: reportType === 'detailed'
          ? [
              `보고일자: ${today}`,
              `분석범위: ${filterText}`,
              '본 보고서는 현재 화면에서 선택된 실제 시민 제안을 기준으로 수요·답변 상태·공감·R&R 후보를 정리한 행정 검토 초안입니다.',
              '정책 공급·뉴스·통계의 직접 매칭 결과는 이 보고서 점수에 포함하지 않았으며, 현행 정책 검색과 자치구 통계 화면에서 별도 대조해야 합니다.',
              rrSummary,
              `데이터 해석 주의: ${dataLimitNote}`,
            ]
          : [
              `◈ 보고 목적: 선택 범위의 시민 제안과 R&R 후보를 간부 검토용으로 요약`,
              `◈ 분석 범위: ${filterText} (${today} 기준)`,
              `◈ 핵심 판단: ${rrSummary}`,
              `◈ 데이터 한계: ${dataLimitNote}`,
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
              ...actualProposalLines,
            ]
          : [
              `◈ 시민 제안: ${scopedProposals.length.toLocaleString()}건 / 누적 공감 ${reportData.totalVotes.toLocaleString()}표`,
              `◈ 미해결 사각지대: 미답변 안건 ${reportData.unansweredCount.toLocaleString()}건 확인 (답변 진행률 ${reportData.replyRate}%)`,
              `◈ 고공감 미답변: 공감 100표 이상이면서 미답변인 안건 ${reportData.urgentCount.toLocaleString()}건`,
              `◈ 우선 확인: ${reportData.topProposal ? `"${reportData.topProposal.title}" (${reportData.topProposal.vote_score || 0}표)` : '해당 없음'}`,
            ],
      },
      {
        key: 'gaps',
        title: '검토 우선순위 및 판단 근거',
        summary: '실제 제안의 미답변·공감·부정 신호를 기준으로 검토 순서를 제시합니다.',
        body: reportType === 'detailed'
          ? [
              `미답변 중심 검토 경고점수: ${reportData.reviewScore}점 / 신뢰 수준: ${reportData.confidenceLabel}`,
              '산식: 미답변 비율 70% + 공감 100표 이상 미답변 비율 20% + 부정 신호 비율 10%. 이 점수에는 정책 공급량이 포함되지 않습니다.',
              ...actualProposalLines,
              '권고 절차: 원문 확인 → 주관·협조 순위 검토 → 현행 정책 직접 매칭 → 미답변 사유 기록 → 답변 또는 이관 결정.',
              `해석 제한: ${dataLimitNote}`,
            ]
          : [
              `◈ 검토 경고점수: ${reportData.reviewScore}점 (${reportData.confidenceLabel})`,
              '◈ 점수 성격: 미답변·고공감·부정 신호 기반 참고값이며 공급 Gap 확정값이 아님',
              `◈ 우선 조치: ${reportData.topProposal ? `"${reportData.topProposal.title}" 원문과 R&R 후보 우선 확인` : '추가 데이터 확보 후 판단'}`,
            ],
      },
      {
        key: 'ai',
        title: '행정 검토 제안',
        summary: '선택된 실제 제안에 대해 담당자가 확인할 다음 절차를 정리합니다.',
        body: reportType === 'detailed'
          ? [
              `검토 대상은 ${reportData.scopeLabel} 시민 제안 ${scopedProposals.length.toLocaleString()}건입니다.`,
              rrSummary,
              '시스템은 정책을 자동 확정하지 않습니다. 담당자는 각 제안의 원문, 주관·협조 후보, 현행 정책 검색 결과를 확인한 뒤 답변·이관·추가 검토 여부를 결정해야 합니다.',
              reportData.unansweredCount > 0
                ? `미답변 ${reportData.unansweredCount.toLocaleString()}건은 답변 지연 사유와 담당 이관 이력을 우선 기록해야 합니다.`
                : '현재 선택 범위에는 미답변 제안이 없습니다.',
            ]
          : [
              `◈ 결재 요청사항: 상위 제안 원문 및 ${selectedDept ? `${selectedDept} R&R 순위` : '주관·협조 후보'} 검토`,
              `◈ 후속 조치: 미답변 ${reportData.unansweredCount.toLocaleString()}건의 답변·이관·보류 사유 기록`,
              '◈ 유의사항: 신규 사업·조례 개정·예산 편성은 현행 정책과 통계 대조 후 별도 판단',
            ],
      },
      {
        key: 'academic',
        title: '분석 방법 및 근거 사용 범위',
        summary: '연구 문헌은 분류·진단 방법의 참고 근거이며 개별 정책 효과를 확정하지 않습니다.',
        body: reportType === 'detailed'
          ? [
              '텍스트마이닝·공간통계·요구도 분석 관련 선행 연구는 분류 체계와 검토 지표를 설계할 때 참고했습니다.',
              '해당 연구가 현재 선택된 제안의 정책 효과, 예산 편익 또는 특정 사업의 필요성을 직접 입증하는 것은 아닙니다.',
              '개별 정책 판단에는 원문, 공식 통계, 현행 사업 지침, 예산·법령 자료를 별도로 대조해야 합니다.',
              `현재 보고서의 직접 근거는 선택된 시민 제안 ${scopedProposals.length.toLocaleString()}건과 화면에 저장된 R&R 후보입니다.`,
            ]
          : [
              '◈ 근거 범위: 연구 문헌은 분석 방법 참고용이며 개별 정책 효과를 확정하지 않음',
              '◈ 추가 확인: 현행 사업·예산·법령·공식 통계를 결재 전 별도 대조',
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
    districtDirectCount,
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
      selectedDistrict
        ? isDistrictFallback
          ? `${selectedDistrict} 직접 0건·지역 미상 참고`
          : selectedDistrict
        : null,
    ]
      .filter(Boolean)
      .join(' / ');
    const title = `[${subtitle}] 출산·양육 정책 수요 및 R&R 검토보고서`;
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
      '본 문서는 현재 화면에서 선택한 시민 제안과 R&R 후보를 정리한 행정 검토 초안입니다. 현행 정책·통계·예산·법령은 결재 전 별도 대조가 필요합니다.',
    ];

    return [...header, ...body, ...footer].join('\n');
  }, [reportType, selectedCategory, selectedDept, selectedDistrict, selectedSections, isDistrictFallback]);

  if (!isOpen) return null;

  const csvPreview = createCsv(scopedProposals.slice(0, 15), selectedDept);
  const enabledCount = selectedSections.length;

  const toggleSection = (key: SectionKey) => {
    setEnabledSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const printPdfReport = () => {
    const printableArea = document.getElementById('printable-report-area');
    if (!printableArea) return;

    // 앱의 fixed 모달·flex·overflow·transform 스타일이 인쇄 레이아웃에 섞이지 않도록
    // 보고서 DOM만 숨김 iframe에 복제해 A4 문서로 인쇄한다.
    const printFrame = document.createElement('iframe');
    printFrame.setAttribute('aria-hidden', 'true');
    printFrame.style.position = 'fixed';
    printFrame.style.left = '-10000px';
    printFrame.style.top = '0';
    printFrame.style.width = '1px';
    printFrame.style.height = '1px';
    printFrame.style.border = '0';
    printFrame.style.opacity = '0';
    printFrame.style.pointerEvents = 'none';
    document.body.appendChild(printFrame);

    const printWindow = printFrame.contentWindow;
    if (!printWindow) {
      printFrame.remove();
      return;
    }

    const sharedStyles = Array.from(
      document.head.querySelectorAll('link[rel="stylesheet"], style'),
    )
      .map((node) => node.outerHTML)
      .join('\n');

    const titleScope = selectedDept || selectedCategory || selectedDistrict || '여성가족실';
    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
      <html lang="ko">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <base href="${document.baseURI}" />
          <title>[${titleScope}] 출산·양육 정책 보고서</title>
          ${sharedStyles}
          <style>
            @page { size: A4 portrait; margin: 0; }
            * { box-sizing: border-box !important; }
            html, body {
              width: auto !important;
              min-height: auto !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow: visible !important;
              background: white !important;
            }
            #printable-report-area {
              width: 100% !important;
              height: auto !important;
              min-height: 0 !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow: visible !important;
              border: 0 !important;
              border-radius: 0 !important;
              box-shadow: none !important;
              background: white !important;
              color: black !important;
            }
            .document-print #printable-report-area {
              width: 210mm !important;
              padding: 12mm !important;
            }
            #printable-report-area > div:not(.public-share-report) > section,
            #printable-report-area > section,
            #printable-report-area li {
              break-inside: avoid-page !important;
              page-break-inside: avoid !important;
            }
            #printable-report-area .public-share-report {
              display: block !important;
              width: 210mm !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .public-print #printable-report-area {
              width: 210mm !important;
              padding: 0 !important;
            }
            .report-print-page {
              width: 210mm !important;
              max-width: none !important;
              min-height: 297mm !important;
              height: 297mm !important;
              margin: 0 !important;
              overflow: hidden !important;
              box-shadow: none !important;
              break-after: page !important;
              page-break-after: always !important;
              break-inside: avoid-page !important;
              page-break-inside: avoid !important;
              print-color-adjust: exact !important;
              -webkit-print-color-adjust: exact !important;
            }
            .report-print-page:last-child {
              break-after: auto !important;
              page-break-after: auto !important;
            }
            @media print {
              @page { size: A4 portrait; margin: 0; }
              @page :first { size: A4 portrait; }
              .public-print #printable-report-area {
                position: relative !important;
                left: auto !important;
                top: auto !important;
                width: 210mm !important;
                padding: 0 !important;
              }
              .public-print {
                width: 210mm !important;
              }
            }
          </style>
        </head>
        <body class="${reportType === 'public-share' ? 'public-print' : 'document-print'}">${printableArea.outerHTML}</body>
      </html>`);
    printWindow.document.close();

    const openPrintDialog = async () => {
      const images = Array.from(printWindow.document.images);
      await Promise.all(images.map((image) => (
        image.complete
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              image.addEventListener('load', () => resolve(), { once: true });
              image.addEventListener('error', () => resolve(), { once: true });
            })
      )));
      printWindow.focus();
      printWindow.print();
    };

    printWindow.addEventListener('afterprint', () => {
      window.setTimeout(() => printFrame.remove(), 500);
    }, { once: true });

    if (printWindow.document.readyState === 'complete') {
      window.setTimeout(openPrintDialog, 300);
    } else {
      printWindow.addEventListener('load', () => {
        window.setTimeout(openPrintDialog, 300);
      }, { once: true });
    }
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
      printPdfReport();
      return;
    }

    const blob = new Blob([generatedReportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `[${selectedDept || '여성가족실'}]_정책수요_RR_검토보고서_${new Date().toISOString().slice(0, 10)}.hwp.txt`;
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
          @page {
            size: A4;
            margin: 0;
          }
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
          #printable-report-area:has(.public-share-report) {
            padding: 0 !important;
            background: white !important;
          }
          .public-share-report {
            display: block !important;
            width: 210mm !important;
            margin: 0 !important;
          }
          .report-print-page {
            width: 210mm !important;
            max-width: none !important;
            min-height: 297mm !important;
            height: 297mm !important;
            margin: 0 !important;
            box-shadow: none !important;
            break-after: page !important;
            page-break-after: always !important;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
          .report-print-page:last-child {
            break-after: auto !important;
            page-break-after: auto !important;
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
              <div className="flex flex-col gap-2">
                {[
                  { id: 'detailed' as const, label: '담당자 상세용 (한글/줄글)' },
                  { id: 'executive' as const, label: '간부 브리핑용 (요약형)' },
                  { id: 'public-share' as const, label: '외부 공유용 (PDF 인포그래픽)' },
                ].map((item) => {
                  const isSelected = reportType === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setReportType(item.id);
                        if (item.id === 'public-share') {
                          setFormat('pdf'); // 외부 공유용은 PDF 출력이 강제됩니다.
                        }
                      }}
                      className={`w-full rounded-xl border px-3 py-2.5 text-left font-black transition cursor-pointer text-xs flex justify-between items-center ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-3xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span>{item.label}</span>
                      {isSelected && <span className="bg-blue-600 text-white rounded-full p-0.5 text-[8px] font-bold">✓</span>}
                    </button>
                  );
                })}
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
                    disabled={reportType === 'public-share' && item.id !== 'pdf'}
                    className={`rounded-xl border px-2 py-3 text-center transition ${
                      format === item.id
                        ? item.id === 'excel'
                          ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                          : 'border-blue-400 bg-blue-50 text-blue-700'
                        : reportType === 'public-share' && item.id !== 'pdf'
                          ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-300'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="block text-xs font-extrabold">
                      {reportType === 'public-share' && item.id === 'pdf' ? 'PDF 인포그래픽' : item.title}
                    </span>
                    <span className="mt-1 block text-[10px] font-bold opacity-70">
                      {reportType === 'public-share' && item.id === 'pdf' ? 'A4 보고서' : item.sub}
                    </span>
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
                선택한 섹션만 오른쪽 미리보기와 다운로드 본문에 반영됩니다. 모든 수치와 제안 문구는 현재 화면의 실제 선택 데이터만 사용합니다.
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
                    : reportType === 'public-share'
                      ? 'sangsang_public_report.pdf'
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
                {reportType === 'public-share' ? (
                  <PublicShareReport
                    proposalCount={scopedProposals.length}
                    proposalLabel={isDistrictFallback ? '지역 미상 참고' : '선택 범위 제안'}
                    unansweredCount={reportData.unansweredCount}
                    totalVotes={reportData.totalVotes}
                    replyRate={reportData.replyRate}
                    topCategoryName={topCategoryName}
                    topVotedCategory={String(topVotedCategory)}
                    proposals={publicShareProposals}
                  />
                ) : (
                  /* 기존 담당자/간부 줄글 문서 보고서 템플릿 */
                  <>
                    <div className="border-b border-slate-200 pb-4">
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">
                        {reportType === 'detailed' ? '실무자 상세 보고용' : '간부 브리핑용'}
                      </p>
                      <h3 className="mt-2 text-xl font-black leading-snug text-slate-950">
                        [{selectedDept || selectedCategory || (selectedDistrict ? `${selectedDistrict}${isDistrictFallback ? ' 직접 0건·지역 미상 참고' : ''}` : '여성가족실 전체')}] 출산·양육 정책 수요 및 R&R 검토보고서
                      </h3>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-slate-100 px-3 py-1 font-bold text-slate-700">
                          {isDistrictFallback ? '지역 미상 참고' : '수요'} {scopedProposals.length.toLocaleString()}건
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 font-bold text-slate-700">
                          미답변 {reportData.unansweredCount.toLocaleString()}건
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 font-bold text-slate-700">
                          검토경고 {reportData.reviewScore}점
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
                              {section.body.map((line, lineIndex) => {
                                const isAcademic = section.key === 'academic';
                                let paperTitle = "";
                                if (isAcademic) {
                                  if (line.includes("오신휘")) paperTitle = "오신휘·김혜진 (2020)";
                                  else if (line.includes("성낙일")) paperTitle = "성낙일·박선권 (2012)";
                                  else if (line.includes("배기련")) paperTitle = "배기련 외 (2021)";
                                  else if (line.includes("육아정책")) paperTitle = "KICCE (2023)";
                                  else if (line.includes("박미경")) paperTitle = "박미경 (2022)";
                                  else if (line.includes("예산정책처")) paperTitle = "NABO 예산정책처";
                                }

                                return (
                                  <li key={`${section.key}-${lineIndex}`} className="flex gap-2 items-start">
                                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                                    <div className="flex-1">
                                      <span>{line}</span>
                                      {isAcademic && paperTitle && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const matchedEvidence = getAcademicEvidenceItemsForModal(paperTitle);
                                            if (matchedEvidence) {
                                              setSelectedAcademicEvidenceForModal(matchedEvidence);
                                            }
                                          }}
                                          className="text-slate-400 hover:text-blue-600 cursor-pointer inline-flex items-center justify-center p-0.5 rounded-full hover:bg-slate-100 transition align-middle ml-1.5"
                                          title={`${paperTitle} 가설 검증 4단계 흐름 보기`}
                                        >
                                          <HelpCircle className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          </section>
                        ))
                      ) : (
                        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-bold text-slate-500">
                          추천 섹션을 하나 이상 선택하면 보고서 미리보기가 생성됩니다.
                        </div>
                      )}
                    </div>
                  </>
                )}
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
      
      {/* 💡 학술 가설 검증 4단계 상세 도움말 모달 */}
      {selectedAcademicEvidenceForModal && (
        <AcademicProofDetailModal
          evidence={selectedAcademicEvidenceForModal}
          onClose={() => setSelectedAcademicEvidenceForModal(null)}
        />
      )}
    </div>
  );
};

// 🎓 학술 가설 검증 4단계 상세 팝업 모달 컴포넌트
interface AcademicEvidenceItem {
  title: string;
  url: string;
  detail: string;
  implication: string;
  tag: string;
  hypothesis: string;
  test: string;
  result: string;
  conclusion: string;
}

interface AcademicModalProps {
  evidence: AcademicEvidenceItem;
  onClose: () => void;
}

const AcademicProofDetailModal: React.FC<AcademicModalProps> = ({ evidence, onClose }) => {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full flex flex-col overflow-hidden max-h-[85vh] animate-in fade-in zoom-in-95 duration-200 text-xs">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-blue-950 to-blue-900 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-blue-300" />
            <h3 className="font-black text-sm">💡 실증적 가설 입증(Hypothesis Proof) 상세</h3>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg p-1 transition cursor-pointer"
            aria-label="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 본문 */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-700">
          <div>
            <span className="bg-blue-100 text-blue-800 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
              {evidence.tag}
            </span>
            <h4 className="font-black text-sm text-slate-900 mt-1.5">
              {evidence.title}
            </h4>
            <a
              href={evidence.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-[10px] font-semibold block mt-1"
            >
              논문 공식 출처 (새 창 열기) ↗
            </a>
          </div>

          <div className="border-t border-slate-100 pt-3 space-y-3.5">
            {/* 1단계: 가설 */}
            <div className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-5 h-5 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center font-bold text-[9px] text-blue-800 shrink-0">
                  1
                </div>
                <div className="w-0.5 flex-1 bg-slate-100 my-1"></div>
              </div>
              <div className="flex-1">
                <h5 className="font-black text-slate-800 text-[10.5px]">연구 가설 (Hypothesis)</h5>
                <p className="text-slate-600 mt-1 leading-relaxed font-semibold">{evidence.hypothesis}</p>
              </div>
            </div>

            {/* 2단계: 검증/테스트 */}
            <div className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-5 h-5 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center font-bold text-[9px] text-blue-800 shrink-0">
                  2
                </div>
                <div className="w-0.5 flex-1 bg-slate-100 my-1"></div>
              </div>
              <div className="flex-1">
                <h5 className="font-black text-slate-800 text-[10.5px]">검증 및 테스트 (Empirical Test)</h5>
                <p className="text-slate-600 mt-1 leading-relaxed font-semibold">{evidence.test}</p>
              </div>
            </div>

            {/* 3단계: 결과 */}
            <div className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-5 h-5 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center font-bold text-[9px] text-blue-800 shrink-0">
                  3
                </div>
                <div className="w-0.5 flex-1 bg-slate-100 my-1"></div>
              </div>
              <div className="flex-1">
                <h5 className="font-black text-slate-800 text-[10.5px]">분석 결과 (Statistical Results)</h5>
                <p className="text-slate-600 mt-1 leading-relaxed font-semibold">{evidence.result}</p>
              </div>
            </div>

            {/* 4단계: 결론 */}
            <div className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-5 h-5 rounded-full bg-blue-600 border border-blue-700 flex items-center justify-center font-bold text-[9px] text-white shrink-0 shadow-2xs">
                  4
                </div>
              </div>
              <div className="flex-1">
                <h5 className="font-black text-blue-900 text-[10.5px]">최종 결론 및 대시보드 반영 (Conclusion)</h5>
                <p className="text-blue-950 font-black mt-1 leading-relaxed">{evidence.conclusion}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-3.5 py-1.5 rounded-lg transition cursor-pointer text-[10.5px]"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
};

// 7대 논문 4단계 매칭 데이터셋 헬퍼 함수
const getAcademicEvidenceItemsForModal = (title: string): AcademicEvidenceItem | null => {

  if (title.includes("성낙일")) {
    return {
      title: "성낙일·박선권 (2012)",
      tag: "계량 분석",
      hypothesis: "지역 단위 보육 인프라의 공급 규모가 합계출산율을 제고하는 유의미한 경제적 기여를 할 것이다.",
      test: "전국 232개 시군구의 2009년 횡단면 자료 대상 다중 회귀 분석(Regression Analysis) 수행.",
      result: "보육시설 접근성 및 공급 밀도가 지역 합계출산율에 통계적으로 유의미한 양(+)의 효과(p < 0.05)를 나타냄을 실증.",
      conclusion: "양육 환경 편리성 제고를 위해 자치구별 취약 지점 중심 국공립 어린이집을 최우선 공급하는 행정 조정 타당성 검증.",
      url: "https://www.kci.go.kr",
      detail: "", implication: ""
    };
  }
  if (title.includes("KICCE") || title.includes("육아정책")) {
    return {
      title: "육아정책연구소 (KICCE, 2023)",
      tag: "GIS 공간진단",
      hypothesis: "영유아 및 보육 현황 기초 통계 격차가 지역 간 출산 환경 불균형을 유발할 것이다.",
      test: "2023 영유아 주요 통계 보고서(ES2401) 수록 자치구별 보육 인프라 및 보육 이용율 통계 대조.",
      result: "지역 간 보육시설 접근성 및 이용률에 뚜렷한 수급 편차와 공간적 불일치 통계 실증.",
      conclusion: "수요-공급 지리적 격차를 줄이기 위해 취약 자치구에 보육 지원 자원을 재배치하는 행정 공간 조정의 당위성 증명.",
      url: "https://www.kicce.re.kr",
      detail: "", implication: ""
    };
  }
  if (title.includes("배기련")) {
    return {
      title: "배기련 외 (2021)",
      tag: "소셜 데이터",
      hypothesis: "정부의 저출산 대응정책과 대중이 체감하는 핵심 장벽 사이에 구조적 괴리가 존재할 것이다.",
      test: "제3·4차 기본계획 발표 직후 2주간 뉴스 댓글 대상 빈도분석, 동시출현단어 분석, CONCOR(구조적 등위성) 분석 수행.",
      result: "대중 여론에서 결혼·출산 관련 연속적 불안 요소로 주거와 고용이 최상위 공백 영역으로 실증 도출됨.",
      conclusion: "실무 정책 수혜의 갭(Gap)을 메우기 위해 일·가정 양립 및 주거 노동 안정을 우선 R&R 조치해야 함.",
      url: "https://www.kci.go.kr",
      detail: "", implication: ""
    };
  }
  if (title.includes("박미경")) {
    return {
      title: "박미경 (2022)",
      tag: "요구도 분석",
      hypothesis: "MZ세대가 지각하는 저출산 대응정책 요구도에는 영역 간 뚜렷한 우선순위 차이가 존재할 것이다.",
      test: "청년 세대 설문조사 데이터 기반 Borich 요구도 분석 및 IPA(중요도-수행도) 분석 수행.",
      result: "Borich 요구도 기준 자녀양육지원(1순위) > 출산지원(2순위) > 일·가정양립 지원(3순위) 순으로 요구도가 높음을 실증.",
      conclusion: "대시보드 내 시민 제안 공감수 및 시급성 연동 가중합 점수(우선순위 지표) 설계 일치성 확인.",
      url: "https://www.kci.go.kr",
      detail: "", implication: ""
    };
  }
  if (title.includes("오신휘")) {
    return {
      title: "오신휘·김혜진 (2020)",
      tag: "메타 분석",
      hypothesis: "텍스트마이닝 및 동시출현단어 네트워크 분석이 저출산 분야 비정형 텍스트를 체계적으로 분류하는 데 유효할 것이다.",
      test: "저출산 관련 학술 논문 752편 대상 텍스트마이닝 및 동시출현단어 네트워크 분석 수행.",
      result: "정부 저출산 정책 추진 시기별 핵심 학술 키워드 군집 변화가 구조적으로 뚜렷이 구분됨을 입증.",
      conclusion: "여론 분석 및 트렌드 분류 모니터링 도구로서 텍스트마이닝 기법 적용 타당성을 최종 검증.",
      url: "https://www.kci.go.kr",
      detail: "", implication: ""
    };
  }
  if (title.includes("예산정책처") || title.includes("NABO")) {
    return {
      title: "국회예산정책처 (NABO, 2025)",
      tag: "재원 배분",
      hypothesis: "저출생 대응 재정사업의 다부서 분절 운영이 실수혜자의 체감 정책 전달률을 심각하게 왜곡할 것이다.",
      test: "2025 저출생 대응 사업 분석·평가 시리즈(주거지원 종합평가 + 일·생활 균형 지원정책 평가) 보고서 분석.",
      result: "재정 투자 확대에도 부처·부서 분절로 예산 사업의 연속성 미확보 및 체감 전달 병목 실증 확인.",
      conclusion: "유사 정책 통합 분류 모니터링 및 부서 R&R 라우팅을 조율할 대시보드형 컨트롤 타워 도입 시급성 증명.",
      url: "https://www.assembly.go.kr",
      detail: "", implication: ""
    };
  }
  return null;
};
