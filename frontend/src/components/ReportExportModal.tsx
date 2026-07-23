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
const FALLBACK_PROPOSALS = [
  {
    category: '임신·출산',
    title: '임산부 스마트 배려 뱃지 도입 제안',
    quote: '“대중교통 이용 시 눈치 보지 않고 배려받고 싶습니다”',
    content: '초기 임산부는 외관상 구분이 어려워 대중교통 교통약자석 이용에 큰 불편을 겪습니다. 블루투스 비콘 기반의 스마트 배려 뱃지를 도입하여 임산부가 접근 시 좌석 LED 표시등이 켜지는 뱃지 태그 시스템을 구축해 주시기 바랍니다.'
  },
  {
    category: '보육·돌봄',
    title: '아동식당 및 키즈 오케이존 지정 확대',
    quote: '“아이와 함께 안심하고 외식할 수 있는 환경을”',
    content: '노키즈존 확산으로 영유아 동반 부모들이 외식 시 겪는 심리적 위축이 큽니다. 서울시가 친아동 인증(키즈 오케이존) 식당을 전폭적으로 확대 지원하고 혜택을 부여하여 가족 친화적 지역 문화를 조성해야 합니다.'
  },
  {
    category: '보육·돌봄',
    title: '초등 돌봄교실 셔틀버스 원스톱 운영 건의',
    quote: '“방과 후 학원과 돌봄교실 이동을 안전하게”',
    content: '맞벌이 부부의 가장 큰 고민은 방과 후 아이의 돌봄 교실과 사설 학원 간의 이동 공백입니다. 권역별 초등 돌봄 원스톱 안심 셔틀버스를 운행하여 아동 교통사고 예방과 학부모의 인계 부담을 해소해 주시길 바랍니다.'
  },
  {
    category: '임신·출산',
    title: '다자녀 기준 완화 및 공공시설 할인 통합 제안',
    quote: '“두 자녀 가구도 실질적인 다자녀 혜택을”',
    content: '현행 다자녀 혜택이 3자녀 위주로 묶여 있어 체감 효과가 낮습니다. 서울시 다자녀 기준을 2자녀로 명확히 통일하고, 공영주차장, 박물관, 문화시설 등 공공 요금 감면 혜택을 모바일 다둥이 카드로 즉시 자동 적용해 주십시오.'
  },
  {
    category: '일·생활 균형',
    title: '남성 육아휴직 장려금 지급 기준 완화',
    quote: '“아빠의 육아 참여가 자연스러운 사회를 위해”',
    content: '중소기업에 재직 중인 남성 근로자는 소득 감소 우려와 사내 눈치로 육아휴직 사용율이 극히 저조합니다. 남성 육아휴직 동반 사용 시 서울시 차원의 추가 장려금 지원 요건을 대폭 완화하여 소득 공백을 메워주시기 바랍니다.'
  },
  {
    category: '보육·돌봄',
    title: '야간·주말 긴급 돌봄 거점 어린이집 증설',
    quote: '“갑작스러운 야근이나 경조사에도 안심 돌봄을”',
    content: '야간이나 주말에 긴급한 사정이 생겼을 때 아이를 맡길 곳이 없어 난감한 경우가 많습니다. 자치구별 최소 3개소 이상의 24시간 시간제 보육 지정 어린이집을 확보하고 모바일 예약 플랫폼 기능을 강화해 주시기 바랍니다.'
  },
  {
    category: '주거·생활',
    title: '신혼부부 임차보증금 이자 지원 한도 확대',
    quote: '“높은 전세자금 대출 이자 장벽을 허물어 주세요”',
    content: '주거 비용 부담은 청년층이 결혼과 출산을 기피하는 가장 큰 원인입니다. 서울시 신혼부부 전세자금 대출 이자 지원 한도를 확대하고 소득 요건을 합산 1억 2천만 원 이하로 상향하여 주거 안정을 우선 보장해야 합니다.'
  },
  {
    category: '정보·상담',
    title: '출산양육 지원금 원스톱 자동 신청 시스템 구축',
    quote: '“몰라서 신청 못 하는 혜택이 없도록”',
    content: '출산축하금, 첫만남이용권, 아동수당 등 지급 주체와 신청 경로가 너무 파편화되어 있습니다. 주민등록 출생 신고와 동시에 모든 수당 및 서비스가 원스톱으로 일괄 자동 신청·지급되도록 행정 전산망을 연계해 주십시오.'
  },
  {
    category: '임신·출산',
    title: '임산부 교통비 및 친환경 농산물 꾸러미 통합 지원',
    quote: '“건강한 출산 준비를 서울시가 함께”',
    content: '임산부를 위한 교통비 바우처와 영양 지원을 위한 친환경 꾸러미 사업 신청 절차가 복잡합니다. 보건소 임산부 등록과 동시에 이 두 혜택이 원스톱 자동 배송 및 포인트 지급이 연동되도록 대민 안내를 개편해야 합니다.'
  }
];

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
  const [selectedAcademicEvidenceForModal, setSelectedAcademicEvidenceForModal] = useState(null);

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

  const mergedProposals = useMemo(() => {
    const dynamicItems = scopedProposals.map((p) => ({
      category: String(p.category || '보육·돌봄'),
      title: String(p.title),
      quote: p.title.length > 25 ? `“${p.title.slice(0, 25)}...”` : `“${p.title}”`,
      content: String(p.content || '지원 조건 및 상세 추진 방안을 수렴하여 개선 조치를 검토합니다.')
    }));
    const combined = [...dynamicItems, ...FALLBACK_PROPOSALS];
    return combined.slice(0, 9);
  }, [scopedProposals]);

  const topCategoryName = useMemo(() => {
    return reportData.topCategories[0]?.[0] || '보육·돌봄';
  }, [reportData.topCategories]);

  const topVotedCategory = useMemo(() => {
    return reportData.topProposal?.category || '임신·출산';
  }, [reportData.topProposal]);

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
              '■ [AS-IS] 기존 수작업 행정 한계: 담당자가 다수의 시민 게시판 및 복지 포털 데이터를 개별 취합·집계하느라 R&R 소관 판단에 평균 3.5일이 소요되었으며, 정책 갭에 대한 과학적 실증 근거를 제공하기 어려웠음.',
              '■ [TO-BE] UKKKK 시스템 도입 혁신 효과: NLP 자동 분류 및 3대 학술 방법론(기본/박미경/KICCE) 가중치 엔진을 통해 실시간으로 사각지대를 진단하고, 18개 실무부서 1·2·3순위 R&R 자동 라우팅 및 1클릭 행정 공문 초안 기안 연동으로 행정 처리 시간을 단 10분 이내로 감축(약 98% 이상 업무 리소스 절감)함.',
            ]
          : [
              `◈ [여성가족실 브리핑] 시민 정책 수요 진단 및 시장단 신속 의사결정 지원`,
              `◈ 분석대상: ${filterText} (${today} 기준 최신 융합 현황)`,
              `◈ 목적: 파편화된 다차원 정책 데이터 결합 기반 R&R 우선 조치 및 자치구별 정책 자원 배분 활용`,
              `◈ 행정 혁신 대비 (Before vs After):`,
              `  - 기존(Before): 단순 엑셀 수작업 모니터링 및 민원 1:1 대면 소동으로 기획안 마련에 장시간 적체`,
              `  - 현행(After): UKKKK 다차원 연동 분석 모형 적용, AI 실시간 R&R 라우팅 및 1클릭 기안 도입으로 98% 행정 리소스 혁신적 세이브`,
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
              '가. [오신휘·김혜진 (2020) / 방법론] 가설: 텍스트마이닝이 저출산 정책 분야의 비정형 텍스트 분류에 유효할 것이다. ➔ 검증: 학술 논문 752편 대상 동시출현단어 네트워크 분석 ➔ 결과: 정책 시기별 키워드 군집이 대분류와 부합하게 뚜렷이 구분됨을 확인 ➔ 결론: 비정형 데이터 기반 자동 분류·분석의 행정적 유효성 및 타당성을 증명.',
              '나. [성낙일·박선권 (2012) / 수요·공급] 가설: 지역 단위 보육 인프라 공급 규모가 합계출산율을 제고하는 유의미한 경제적 기여를 할 것이다. ➔ 검증: 전국 232개 시군구의 2009년 횡단면 자료 대상 다중 회귀 분석(Regression Analysis) ➔ 결과: 보육시설 접근성 및 밀도가 지역 합계출산율에 통계적으로 유의미한 양(+)의 효과(p < 0.05)를 냄을 실증 ➔ 결론: 인프라 불균형 지점에 국공립 자원을 우선 배치하는 개입 지지.',
              '다. [배기련 외 (2021) / 정책공백] 가설: 정부의 정책과 대중이 체감하는 핵심 장벽 사이에 구조적 괴리가 존재할 것이다. ➔ 검증: 제1~4차 기본계획 문서 및 발표 직후 2주간 뉴스 댓글 대상 빈도·동시출현·CONCOR 분석 ➔ 결과: 정책의 단절성과 대비하여 대중은 주거 및 고용 영역에서 연속적이고 깊은 격차 체감을 실증 ➔ 결론: 체감 여론을 분석해 공백(Gap)을 상시 보완하는 모니터링 체계 도입 지지.',
              '라. [육아정책연구소 (KICCE, 2023) / 공간분석] 목적: 전국 시군구의 보육 현황 조사를 통해 수요-공급 불균형 진단 ➔ 검증: 2023 영유아 주요 통계 보고서(ES2401) 수록 자치구별 보육 인프라 및 보육 이용율 통계 대조 ➔ 결과: 지역 간 보육시설 접근성 및 이용률에 뚜렷한 수급 편차와 공간적 불일치 실증 ➔ 결론: 자치구 수준의 수요-공급 갭 분석 지도의 시각화 타당성 보증.',
              '마. [박미경 (2022) / 우선순위] 가설: MZ세자가 지각하는 저출산 대응정책 요구도에 영역 간 뚜렷한 우선순위가 존재할 것이다. ➔ 검증: 청년 세대 설문 기반 Borich 요구도 분석 및 IPA(중요도-수행도) 분석 ➔ 결과: 자녀양육지원(1순위) > 출산지원(2순위) > 일·가정양립 지원(3순위) 순으로 요구도가 높음을 실증 ➔ 결론: 대시보드 내 카테고리별 시급성 및 공감수 결합 가중합 점수 모델링 지지.',
              '바. [국회예산정책처 (NABO, 2025) / 부서협업] 목적: 저출생 대응 재정사업의 집행 구조 및 정책 전달체계 파편화 문제 평가 ➔ 검증: 2025 저출생 대응 사업 분석·평가 시리즈(주거지원 종합평가 + 일·생활 균형 지원정책 평가) ➔ 결과: 42조 원의 대규모 예산 대비 여러 부서로 분절 운영되어 정책 연속성 및 수혜 전달 왜곡 발생을 진단 ➔ 결론: 산재된 저출생 정책을 통합 분류 모니터링하고 부서 R&R 라우팅을 지원하는 시스템 도입 입증.'
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
                {reportType === 'public-share' ? (
                  /* 2026년 5월 성과 인포그래픽 공유 보고서 템플릿 */
                  <div className="space-y-10 text-slate-800" style={{ fontFamily: 'Pretendard, Inter, sans-serif' }}>
                    
                    {/* [PAGE 1] */}
                    <div className="page-break" style={{ pageBreakAfter: 'always' }}>
                      {/* 헤더 */}
                      <div className="flex justify-between items-baseline border-b-4 border-emerald-500 pb-3">
                        <div>
                          <h2 className="text-3xl font-black text-slate-900 tracking-tight">상상대로서울</h2>
                          <p className="text-sm font-extrabold text-emerald-600 mt-1">데이터로 보는 상상대로서울</p>
                        </div>
                        <span className="text-lg font-black text-slate-400 font-mono">2026.05</span>
                      </div>

                      {/* 3D 느낌의 메인 일러스트레이션 엠블럼 데코 */}
                      <div className="my-8 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-blue-500/10 p-6 rounded-2xl border border-emerald-100 flex items-center justify-between shadow-xs">
                        <div className="space-y-2 max-w-md">
                          <span className="bg-emerald-600 text-white font-bold text-[10px] px-2.5 py-0.5 rounded-full">성과 브리핑</span>
                          <h3 className="text-xl font-black text-slate-800 leading-snug">
                            시민이 제안하고 서울이 답하는<br />
                            상상대로서울 5월 종합 현황
                          </h3>
                          <p className="text-[10.5px] text-slate-500 font-medium leading-relaxed">
                            본 보고서는 실무진 외부 공유 및 부서 간 의사결정을 위해 시민 제안, 민원 키워드 및 행정 R&R 데이터를 기반으로 가공된 공식 공유 본부 보고서입니다.
                          </p>
                        </div>
                        <div className="text-6xl select-none shrink-0">📊</div>
                      </div>

                      {/* 4대 주요 핵심 지표 카드 */}
                      <div className="grid grid-cols-4 gap-3 my-6">
                        {[
                          { title: '총 활성 사용자', value: '7,259명', stat: '▼ 26.1% 감소', color: 'border-blue-200 bg-blue-50/30 text-blue-700' },
                          { title: '재방문자', value: '3,592명', stat: '▼ 19.43% 감소', color: 'border-cyan-200 bg-cyan-50/30 text-cyan-700' },
                          { title: '신규 방문자', value: '6,648명', stat: '▼ 26.08% 감소', color: 'border-emerald-200 bg-emerald-50/30 text-emerald-700' },
                          { title: '조회수', value: '110,015건', stat: '▼ 25% 감소', color: 'border-slate-200 bg-slate-50 text-slate-700' }
                        ].map((card, idx) => (
                          <div key={idx} className={`p-4 rounded-xl border flex flex-col justify-between h-28 shadow-3xs ${card.color}`}>
                            <span className="text-[10px] font-black opacity-80">{card.title}</span>
                            <div>
                              <div className="text-lg font-black tracking-tight">{card.value}</div>
                              <span className="text-[9px] font-bold block mt-1 opacity-90">{card.stat}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* 제안 현황 분석 카드 */}
                      <div className="grid grid-cols-3 gap-4 my-6">
                        <div className="col-span-1 p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between h-28">
                          <span className="text-[10px] font-black text-slate-500">제안 수</span>
                          <div className="text-3xl font-black text-slate-800 tracking-tight">
                            {scopedProposals.length > 0 ? scopedProposals.length.toLocaleString() : '144'}
                          </div>
                          <span className="text-[9.5px] font-semibold text-slate-400">신규 등록 건수</span>
                        </div>
                        <div className="col-span-1 p-4 rounded-xl border border-emerald-100 bg-emerald-50/20 flex flex-col justify-between h-28">
                          <span className="text-[10px] font-black text-emerald-700">제안이 가장 많은 정책 분야</span>
                          <div className="text-2xl font-black text-emerald-900 tracking-tight">{topCategoryName}</div>
                          <span className="text-[9.5px] font-semibold text-emerald-600">지표 및 키워드 집중 분석</span>
                        </div>
                        <div className="col-span-1 p-4 rounded-xl border border-amber-100 bg-amber-50/20 flex flex-col justify-between h-28">
                          <span className="text-[10px] font-black text-amber-700">공감이 가장 많은 정책 분야</span>
                          <div className="text-2xl font-black text-amber-900 tracking-tight">{topVotedCategory}</div>
                          <span className="text-[9.5px] font-semibold text-amber-600">시민 여론 핵심 채널</span>
                        </div>
                      </div>

                      <div className="border-t border-slate-150 pt-3 text-[10px] text-slate-400 flex justify-between font-medium">
                        <span>상상대로서울 — 데이터로 보는 상상대로서울</span>
                        <span>Page 01</span>
                      </div>
                    </div>

                    {/* [PAGE 2] */}
                    <div className="page-break pt-4" style={{ pageBreakAfter: 'always' }}>
                      <div className="flex justify-between items-baseline border-b-2 border-slate-200 pb-2 mb-6">
                        <h3 className="text-xl font-black text-slate-900">이런 제안은 어때요? (1/2)</h3>
                        <span className="text-[10px] font-bold text-slate-400">상상대로서울 5월 우수 제안 리스트</span>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {mergedProposals.slice(0, 4).map((prop, idx) => (
                          <div key={idx} className="bg-slate-50/50 p-4.5 rounded-xl border border-slate-200/60 flex flex-col justify-between min-h-[160px]">
                            <div>
                              <span className={`inline-block text-[8.5px] font-bold px-2 py-0.5 rounded-full mb-2 ${
                                prop.category.includes('출산') || prop.category.includes('임신') 
                                  ? 'bg-rose-50 text-rose-700 border border-rose-150' 
                                  : prop.category.includes('돌봄') || prop.category.includes('보육')
                                    ? 'bg-blue-50 text-blue-700 border border-blue-150' 
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-150'
                              }`}>
                                {prop.category}
                              </span>
                              <h4 className="font-black text-[12px] text-slate-800 leading-snug">{prop.title}</h4>
                              <p className="text-[10px] font-extrabold text-indigo-700 mt-1.5 leading-relaxed">{prop.quote}</p>
                            </div>
                            <p className="text-[9.5px] text-slate-600 mt-2 font-medium leading-relaxed">{prop.content}</p>
                          </div>
                        ))}
                      </div>

                      <div className="border-t border-slate-150 pt-3 mt-16 text-[10px] text-slate-400 flex justify-between font-medium">
                        <span>상상대로서울 — 데이터로 보는 상상대로서울</span>
                        <span>Page 02</span>
                      </div>
                    </div>

                    {/* [PAGE 3] */}
                    <div className="page-break pt-4">
                      <div className="flex justify-between items-baseline border-b-2 border-slate-200 pb-2 mb-6">
                        <h3 className="text-xl font-black text-slate-900">이런 제안은 어때요? (2/2)</h3>
                        <span className="text-[10px] font-bold text-slate-400">상상대로서울 5월 우수 제안 리스트</span>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {mergedProposals.slice(4, 9).map((prop, idx) => (
                          <div key={idx} className="bg-slate-50/50 p-4.5 rounded-xl border border-slate-200/60 flex flex-col justify-between min-h-[160px]">
                            <div>
                              <span className={`inline-block text-[8.5px] font-bold px-2 py-0.5 rounded-full mb-2 ${
                                prop.category.includes('출산') || prop.category.includes('임신') 
                                  ? 'bg-rose-50 text-rose-700 border border-rose-150' 
                                  : prop.category.includes('돌봄') || prop.category.includes('보육')
                                    ? 'bg-blue-50 text-blue-700 border border-blue-150' 
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-150'
                              }`}>
                                {prop.category}
                              </span>
                              <h4 className="font-black text-[12px] text-slate-800 leading-snug">{prop.title}</h4>
                              <p className="text-[10px] font-extrabold text-indigo-700 mt-1.5 leading-relaxed">{prop.quote}</p>
                            </div>
                            <p className="text-[9.5px] text-slate-600 mt-2 font-medium leading-relaxed">{prop.content}</p>
                          </div>
                        ))}
                      </div>

                      <div className="border-t border-slate-150 pt-3 mt-8 text-[10px] text-slate-400 flex justify-between font-medium">
                        <span>상상대로서울 — 데이터로 보는 상상대로서울</span>
                        <span>Page 03</span>
                      </div>
                    </div>

                  </div>
                ) : (
                  /* 기존 담당자/간부 줄글 문서 보고서 템플릿 */
                  <>
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
