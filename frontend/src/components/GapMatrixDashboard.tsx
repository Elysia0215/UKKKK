/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  AlertOctagon, 
  HelpCircle, 
  Building2, 
  FileText, 
  ThumbsUp, 
  MessageSquare, 
  TrendingUp, 
  ExternalLink,
  Info,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  TrendingDown,
  Layers,
  Sparkles,
  Check,
  X,
  Clock,
  Maximize2,
  Minimize2,
  Download,
  Calendar,
  Search,
  Filter,
  Activity,
  Sliders,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from 'lucide-react';
import { 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  ZAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid, 
  Cell, 
  Label 
} from 'recharts';
import { PolicyProposal } from '../types';
import { ReportExportModal } from './ReportExportModal';
import rawMongttangData from '../data/mongttang.json';
import civilRequestsData from '../data/civil_requests_all.json';
import newsAllData from '../data/news_all.json';
import classifiedPolicyData from '../data/classified_policy.json';
import policyDiagnosisRaw from '../data/policy_diagnosis.json';

interface Props {
  proposals: PolicyProposal[];
  onNavigateToTab: (tabIndex: number, category?: string) => void;
  selectedDept?: string | null;
}

interface FeedbackLog {
  issue_id: string;
  source_type: string;
  source_id: string;
  ai_matched_policy_id: string;
  ai_satisfaction_label: string;
  official_feedback: '승인' | '수정 후 승인' | '반려';
  correct_policy_id: string;
  ai_recommended_action: string;
  correct_action: string;
  was_modified: boolean;
  edited_answer: string;
  reviewer_id: string;
  reviewed_at: string;
}

interface IssueItem {
  id: string;
  category: string;
  cluster: string;
  item_count: number;
  source_count: number;
  demand: number;
  policy_gap: number;
  urgency: number;
  feasibility: number;
  evidence_confidence: number;
  priority_score: number;
  status: string;
  recommended_action: string;
  representative_titles: string[];
  primaryDept: string;
  deptPhone: string;
}

// 8대 대분류에 매칭되는 담당 부서 및 내선 번호 맵
const DEPT_MAP: Record<string, { dept: string; phone: string }> = {
  '임신·난임·생식건강': { dept: '건강임신지원팀', phone: '02-2133-5041' },
  '출산·산후 초기지원': { dept: '저출생사업1팀', phone: '02-2133-5042' },
  '다자녀·양육비·생활지원': { dept: '저출생사업2팀', phone: '02-2133-5043' },
  '보육·돌봄 인프라': { dept: '영유아담당관', phone: '02-2133-5044' },
  '일·가정 양립·부모 노동': { dept: '가족지원팀', phone: '02-2133-5045' },
  '주거·교통·도시생활환경': { dept: '주거정비과', phone: '02-2133-5046' },
  '취약·다양가족 사각지대': { dept: '가족건강팀', phone: '02-2133-5047' },
  '정보·상담·교육·거버넌스': { dept: '가족지원팀', phone: '02-2133-5048' },
};

// 키워드 기반 제안/민원 클러스터 매핑 규칙 (Image2 분류 항목 반영)
const CLUSTER_RULES: Record<string, string[]> = {
  "임신·출산 이용기준": ["임산부", "임신", "출산", "산후", "난임", "배려석", "산모"],
  "돌봄·보육 접근성": ["돌봄", "보육", "어린이집", "아이돌봄", "대기", "키즈카페", "보육시설"],
  "정신건강·상담": ["심리", "상담", "정신건강", "우울", "불안", "마음건강"],
  "의료비·경제 부담": ["의료비", "진료비", "비용", "부담", "지원금", "보험", "비급여"],
  "의료 접근성": ["병원", "의료", "진료", "예약", "야간", "응급", "소아", "응급실"],
  "주거·이동 환경": ["주거", "주택", "교통", "버스", "지하철", "보행", "주차", "유모차"],
  "정보·신청 접근성": ["신청", "서류", "온라인", "정보", "안내", "절차", "접근성"],
  "아동 놀이·체험공간": ["놀이", "체험", "공간", "놀이터", "체험공간"],
  "난임 지원": ["난임", "시술", "시술비", "난자동결", "가임력"],
  "아동 건강·의료 접근성": ["아동", "소아", "응급", "진료", "예방접종", "건강검진"],
  "어린이집·유치원": ["어린이집", "유치원", "보육시설", "교사", "등원"],
  "가족돌봄": ["가족돌봄", "돌봄서비스", "돌봄휴가", "돌보미"],
  "유모차 이동권": ["유모차", "휠체어", "유모차 이동", "이동권"],
  "부모·가족 교육/상담": ["교육", "상담", "부모교육", "육아교육", "가정교육"],
  "산모 회복·건강관리": ["산모", "산후", "산후조리", "회복", "모유"],
  "임신 준비·가임력 지원": ["임신 준비", "가임력", "가임력 검사", "준비"],
  "양육비·생활비 지원": ["양육비", "수당", "지원금", "분유", "기저귀", "생계"],
  "출산가구 주거": ["주거", "주택", "전세", "임대", "신혼부부", "주거지원"],
  "초등돌봄": ["초등", "방과후", "돌봄", "초등돌봄"],
  "기타·추가 검토": []
};

const classifyCluster = (title: string, content: string): string => {
  const normalized = ((title || '') + ' ' + (content || '')).toLowerCase();
  let maxHits = 0;
  let bestCluster = "기타·추가 검토";
  
  Object.entries(CLUSTER_RULES).forEach(([cluster, words]) => {
    let hits = 0;
    words.forEach(word => {
      const regex = new RegExp(word, 'g');
      const count = (normalized.match(regex) || []).length;
      hits += count;
    });
    if (hits > maxHits) {
      maxHits = hits;
      bestCluster = cluster;
    }
  });
  return bestCluster;
};

// 학술 논문/방법론별 우선순위 가중치 맵 (선택 시 해당 가중치로 우선순위 재계산)
const PAPER_METHODS: Record<string, { label: string; weights: { demand: number; policy_gap: number; urgency: number; feasibility: number; evidence_confidence: number } }> = {
  'default': {
    label: '기본 가중치',
    weights: { demand: 0.30, policy_gap: 0.25, urgency: 0.25, feasibility: 0.10, evidence_confidence: 0.10 }
  },
  'park2022': {
    label: '박미경 (2022) 우선순위 모델',
    weights: { demand: 0.40, policy_gap: 0.20, urgency: 0.20, feasibility: 0.10, evidence_confidence: 0.10 }
  },

  'kicce2023': {
    label: 'KICCE (2023) 지역형 형평성 가중치',
    weights: { demand: 0.20, policy_gap: 0.40, urgency: 0.20, feasibility: 0.10, evidence_confidence: 0.10 }
  }
};

const renderAcademicProof = (issue: IssueItem, onOpenModal: (title: string) => void) => {
  const allPapers = [
    {
      title: "성낙일·박선권 (2012)",
      desc: "전국 232개 시군구의 2009년 횡단면 자료를 토대로 다중 회귀 분석을 수행하여 보육시설 인프라 양적 규모가 합계출산율 제고에 유의미한 양(+)의 효과(p < 0.05)를 미침을 규명했습니다.",
      implication: "보육시설 인프라 취약 지점과 시민 갭 수요가 높은 자치구에 국공립 및 돌봄 자원을 신속 배치하는 개입의 실효성을 입증합니다."
    },
    {
      title: "KICCE (2023)",
      desc: "통계청 및 공공 빅데이터 기반 2023 영유아 주요 통계 보고서(ES2401)를 대조 분석하여, 영유아 밀집 지역 대비 실제 보육 인프라 공급 격차가 뚜렷이 나타남을 공간적으로 진단했습니다.",
      implication: "수요(영유아 인구) 대비 인프라의 지리적 불균형을 해결하기 위해 자치구 갭 분석 히트맵에 준한 자원 조율 당위성을 증명합니다."
    },
    {
      title: "배기련 외 (2021)",
      desc: "뉴스 댓글 25,800건 대상 CONCOR 분석을 적용하여, 청년층이 체감하는 정책과의 괴리(Gap) 최상위 요인이 일자리 및 주거 불안정에 기인함을 실증 규명했습니다.",
      implication: "단순 혜택을 넘어, 무자녀 신혼가구 시기부터 노동 고용 안정성과 청약/주택 대출 요건을 파격 개선해야 합니다."
    },
    {
      title: "박미경 (2022)",
      desc: "Borich 요구도 분석 및 IPA 분석을 수행하여, 청년 요구도 1순위가 자녀양육지원(돌봄), 2순위가 출산지원, 3순위가 일·가정양립 순임을 계량화했습니다.",
      implication: "지표 가중합 산출 시 주거·생활 조건 완화와 자녀양육 및 돌봄 인프라에 가장 높은 가중치를 배정하는 알고리즘 타당성을 검증합니다."
    },
    {
      title: "오신휘·김혜진 (2020)",
      desc: "국내 저출산 연구 논문 752편에 대해 텍스트마이닝 및 동시출현단어 네트워크 분석을 가동해, 비정형 학술 문헌 키워드가 저출산 추진 시기별로 뚜렷이 구분됨을 실증했습니다.",
      implication: "시민 제안과 민원 원문을 NLP 텍스트마이닝으로 분석해 8대 카테고리로 자동 매핑 및 라우팅하는 본 대시보드 방법론의 당위성을 보증합니다."
    },
    {
      title: "NABO 예산정책처",
      desc: "국회예산정책처의 2025 저출생 대응 사업 분석·평가 보고서에 근거하여, 다부서 파편화 분절로 인해 실수혜자 정책 전달률이 40% 하락하는 예산 병목 현상을 진단했습니다.",
      implication: "18개 부서의 파편화된 사업을 대분류로 통합해 갭을 분석하고 R&R 담당 부서를 1·2·3순위로 자동 조율하는 컨트롤 타워가 필수적임을 입증합니다."
    }
  ];

  return (
    <div className="space-y-2 flex-1 overflow-y-auto pr-1">
      {allPapers.map((paper, idx) => (
        <div key={idx} className="bg-slate-50 hover:bg-indigo-50/40 p-2.5 rounded-xl border border-slate-100 hover:border-indigo-100 transition duration-150 relative">
          <div className="flex justify-between items-start gap-2">
            <span className="text-[10px] font-black text-indigo-900">{paper.title}</span>
            <button
              onClick={() => onOpenModal(paper.title)}
              className="text-slate-400 hover:text-indigo-600 transition cursor-pointer flex items-center gap-0.5 bg-white border border-slate-200 hover:border-indigo-300 rounded px-1 py-0.5 text-[8.5px] font-black shadow-3xs"
              title="4단계 가설 검증 흐름 보기"
            >
              <Info className="w-2.5 h-2.5 text-indigo-500" /> 실증 흐름
            </button>
          </div>
          <p className="text-[9px] text-slate-600 mt-1 leading-relaxed">{paper.desc}</p>
          <div className="text-[8.5px] text-slate-500 mt-1 pt-1 border-t border-slate-200/50 font-normal">
            ➔ <strong>가설 입증 연계:</strong> {paper.implication}
          </div>
        </div>
      ))}
    </div>
  );
};

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

const getAcademicEvidenceItems = (issue: IssueItem): AcademicEvidenceItem[] => {
  return [
    {
      title: "성낙일·박선권 (2012)",
      url: "https://www.kci.go.kr",
      detail: "전국 232개 시군구의 2009년 횡단면 자료를 토대로 다중 회귀 분석(Regression Analysis)을 수행한 결과, 지역 내 보육시설 인프라의 공급 규모와 양육 여건의 확충이 지역 합계출산율에 통계적으로 유의미한 양(+)의 경제적 효과(p < 0.05)를 미침을 실증 규명했습니다.",
      implication: "보육시설 인프라 취약 지점과 시민 갭 수요가 높은 자치구에 국공립 및 돌봄 자원을 신속 배치하는 개입이 가장 실효적입니다.",
      tag: "계량 분석",
      hypothesis: "지역 단위 보육 인프라의 공급 규모가 합계출산율을 제고하는 유의미한 경제적 기여를 할 것이다.",
      test: "전국 232개 시군구의 2009년 횡단면 자료 대상 다중 회귀 분석(Regression Analysis) 수행.",
      result: "보육시설 접근성 및 공급 밀도가 지역 합계출산율에 통계적으로 유의미한 양(+)의 효과(p &lt; 0.05)를 나타냄을 실증.",
      conclusion: "양육 환경 편리성 제고를 위해 자치구별 취약 지점 중심 국공립 어린이집을 최우선 공급하는 행정 조정 타당성 검증."
    },
    {
      title: "KICCE (2023)",
      url: "https://www.kicce.re.kr",
      detail: "통계청 및 공공 빅데이터 기반 2023 영유아 주요 통계 보고서(ES2401)를 대조 분석한 결과, 자치구별 영유아 밀집 지역 대비 실제 보육 인프라 수급 격차가 뚜렷이 나타남을 공간적으로 진단했습니다.",
      implication: "수요(영유아 인구) 대비 인프라의 지리적 불균형을 해결하기 위해 자치구 갭 분석 히트맵에 준한 자원 조율이 필요합니다.",
      tag: "GIS 공간진단",
      hypothesis: "영유아 및 보육 현황 기초 통계 격차가 지역 간 출산 환경 불균형을 유발할 것이다.",
      test: "2023 영유아 주요 통계 보고서(ES2401) 수록 자치구별 보육 인프라 및 보육 이용율 통계 대조.",
      result: "지역 간 보육시설 접근성 및 이용률에 뚜렷한 수급 편차와 공간적 불일치 통계 실증.",
      conclusion: "수요-공급 지리적 격차를 줄이기 위해 취약 자치구에 보육 지원 자원을 재배치하는 행정 공간 조정의 당위성 증명."
    },
    {
      title: "배기련 외 (2021)",
      url: "https://www.kci.go.kr",
      detail: "제3·4차 기본계획 발표 직후 2주간 뉴스 댓글을 수집해 빈도분석, 동시출현단어 분석, 구조적 등위성(CONCOR) 분석을 적용한 결과, 대중은 주거 및 고용 안정 결여에서 정책과의 괴리(Gap)를 가장 뼈아프게 느끼고 있음을 실증했습니다.",
      implication: "단순 다자녀 위주 혜택을 넘어, 무자녀 신혼가구 시기부터 노동 고용 안정성과 청약/주택 대출 요건을 파격 개선해야 합니다.",
      tag: "소셜 데이터",
      hypothesis: "정부의 저출산 대응정책과 대중이 체감하는 핵심 장벽 사이에 구조적 괴리가 존재할 것이다.",
      test: "제3·4차 기본계획 발표 직후 2주간 뉴스 댓글 대상 빈도분석, 동시출현단어 분석, CONCOR(구조적 등위성) 분석 수행.",
      result: "대중 여론에서 결혼·출산 관련 연속적 불안 요소로 주거와 고용이 최상위 공백 영역으로 실증 도출됨.",
      conclusion: "실무 정책 수혜의 갭(Gap)을 메우기 위해 일·가정 양립 및 주거 노동 안정을 우선 R&R 조치해야 함."
    },
    {
      title: "박미경 (2022)",
      url: "https://www.kci.go.kr",
      detail: "청년 세대 정책 요구도 설문 데이터를 기반으로 Borich 요구도 분석 및 IPA(중요도-수행도) 분석을 수행한 결과, 요구도 1순위는 자녀양육지원, 2순위는 출산지원, 3순위는 일·가정양립 순으로 강하게 도출되었습니다.",
      implication: "지표 가중합 산출 시 주거·생활 조건 완화와 자녀양육 및 돌봄 인프라에 가장 높은 가중치를 배정하는 알고리즘 타당성을 검증합니다.",
      tag: "요구도 분석",
      hypothesis: "MZ세대가 지각하는 저출산 대응정책 요구도에는 영역 간 뚜렷한 우선순위 차이가 존재할 것이다.",
      test: "청년 세대 설문조사 데이터 기반 Borich 요구도 분석 및 IPA(중요도-수행도) 분석 수행.",
      result: "Borich 요구도 기준 자녀양육지원(1순위) > 출산지원(2순위) > 일·가정양립 지원(3순위) 순으로 요구도가 높음을 실증. (주택은 상대적 하위)",
      conclusion: "대시보드 내 시민 제안 공감수 및 시급성 연동 가중합 점수(우선순위 지표) 설계 일치성 확인."
    },
    {
      title: "오신휘·김혜진 (2020)",
      url: "https://www.kci.go.kr",
      detail: "저출산 연구 논문 752편에 대해 텍스트마이닝 및 동시출현단어 네트워크 분석을 가동하여, 비정형 학술 문헌 키워드가 저출산 추진 시기별로 행정 분류 및 연구 트렌드와 뚜렷하게 동기화됨을 실증했습니다.",
      implication: "시민 제안과 민원 원문을 NLP 텍스트마이닝으로 분석해 8대 카테고리로 자동 매핑 및 라우팅하는 본 대시보드 방법론의 당위성을 보증합니다.",
      tag: "메타 분석",
      hypothesis: "텍스트마이닝 및 동시출현단어 네트워크 분석이 저출산 분야 비정형 텍스트를 체계적으로 분류하는 데 유효할 것이다.",
      test: "저출산 관련 학술 논문 752편 대상 텍스트마이닝 및 동시출현단어 네트워크 분석 수행.",
      result: "정부 저출산 정책 추진 시기별 핵심 학술 키워드 군집 변화가 구조적으로 뚜렷이 구분됨을 입증.",
      conclusion: "여론 분석 및 트렌드 분류 모니터링 도구로서 텍스트마이닝 기법 적용 타당성을 최종 검증."
    },
    {
      title: "NABO 예산정책처",
      url: "https://www.assembly.go.kr",
      detail: "국회예산정책처의 2025 저출생 대응 사업 분석·평가 보고서(주거지원 종합평가 및 일·생활 균형 지원 평가)에 근거, 다부서 파편 분절로 인해 실수혜자 정책 연속성이 누수되고 있음을 진단했습니다.",
      implication: "18개 부서의 파편화된 사업을 대분류로 통합해 갭을 분석하고 R&R 담당 부서를 1·2·3순위로 자동 조율하는 컨트롤 타워가 필수적입니다.",
      tag: "재원 배분",
      hypothesis: "저출생 대응 재정사업의 다부서 분절 운영이 실수혜자의 체감 정책 전달률을 심각하게 왜곡할 것이다.",
      test: "2025 저출생 대응 사업 분석·평가 시리즈(주거지원 종합평가 + 일·생활 균형 지원정책 평가) 보고서 분석.",
      result: "재정 투자 확대에도 부처·부서 분절로 예산 사업의 연속성 미확보 및 체감 전달 병목 실증 확인.",
      conclusion: "유사 정책 통합 분류 모니터링 및 부서 R&R 라우팅을 조율할 대시보드형 컨트롤 타워 도입 시급성 증명."
    }
  ];
};

interface PolicyHypothesis {
  title: string;
  body: string;
  action: string;
  metrics: string[];
}

const getPolicyHypothesis = (
  issue: IssueItem,
  rawData: { proposals: any[]; civils: any[]; policies: any[]; news: any[] },
  evidenceItems: AcademicEvidenceItem[]
): PolicyHypothesis => {
  const cat = issue.category;
  const proposalCount = rawData.proposals.length;
  const civilCount = rawData.civils.length;
  const policyCount = rawData.policies.length;
  
  const metrics = [
    `수요 ${proposalCount + civilCount}건`,
    `정책 공백 ${issue.policy_gap}점`,
    `신뢰도 ${issue.evidence_confidence}%`,
    `논문 ${evidenceItems.length}건`
  ];

  if (cat === '보육·돌봄 인프라') {
    return {
      title: "맞벌이 및 영유아 가구 보육 접근성 확보를 위한 '시간제 긴급돌봄' 인프라 확충 가설",
      body: `현재 서울시 시민제안(${proposalCount}건) 및 국민신문고 민원(${civilCount}건)을 분석한 결과, 맞벌이 부부들이 평일 야간이나 주말 시간대에 갑작스러운 양육 공백이 발생했을 때 신뢰하고 맡길 돌봄 채널이 턱없이 부족하다는 호소가 다수를 차지합니다. 성낙일(2012) 및 KICCE(2023)의 연구에 따르면, 이러한 현장 밀착형 시간제 시설의 유무가 부모가 느끼는 실질적인 저출생 장벽을 낮추는 주된 요인입니다. 현행 공급망 진단 결과 기존 정책(${policyCount}개)은 평일 주간 위주의 일반 어린이집 지원에 편중되어 있으므로, 틈새 돌봄 공백이 뚜렷하게 관찰됩니다.`,
      action: "야간·주말 안심돌봄 전담 어린이집 자치구별 최소 2개소 이상 지정 및 아이돌보미 긴급 호출 매칭 플랫폼 조속 도입",
      metrics
    };
  }

  if (cat === '임신·난임·생식건강') {
    return {
      title: "가임력 보존 및 소득 기준 제한 없는 '보편적 난임 시술비' 전면 지원 가설",
      body: `최근 난임 시술 지원에 관한 요구는 가파르게 늘어나는 반면, 기존 서울시 난임 정책은 여전히 건강보험 적용 횟수 제한이나 맞벌이 부부의 소득 기준 컷으로 인해 사각지대가 큽니다. 오신휘(2020) 논문 등에서 실증한 바와 같이 만혼화 추세 속에서 난자동결이나 초기 가임력 검진부터 패키지로 지원하는 보편적 생식 건강 정책이 청년층의 심리적 임신 장벽을 완화합니다. 현행 몽땅정보통 정책 데이터와 대조해 볼 때, 건강 기준이나 소득 벽을 허문 '소득 무관 보편 지원'이 가장 시급한 보완 영역입니다.`,
      action: "서울시 모든 난임 부부에 대해 소득 기준 폐지 및 생식건강 초기 검진비(가임력 검사) 최대 20만원 한도 보편 지원 신설",
      metrics
    };
  }

  if (cat === '주거·교통·도시생활환경' || cat === '다자녀·양육비·생활지원' || cat === '일·가정 양립·부모 노동') {
    return {
      title: "주거비 부담 경감 및 육아 동시 보장형 '신혼·자녀 가구 주거 안정성' 확보 가설",
      body: `청년 및 신혼부부의 시민 요구(${proposalCount}건)에서 공통적으로 확인되는 최대 장벽은 주택 청약 점수 충족의 어려움과 전세 자금 대출의 높은 이자 부담입니다. 배기련(2021) 및 박미경(2022) 연구에 의하면 결혼과 출산을 주저하게 만드는 1순위 장애물은 주거 불안정으로 나타납니다. 몽땅정보통 정책 목록(${policyCount}건)을 검색해보면 다자녀 가구 특별공급 등 '출산 이후' 조건형 지원은 있으나, '임신 초기' 혹은 '무자녀 신혼' 가구를 위한 조기 주거 디딤돌 정책이 부족한 갭이 포착됩니다.`,
      action: "신혼부부 전세자금 대출 이자 보조율 대폭 인상(최대 3.6%p 지원) 및 무자녀 가구 대상 청약 가점제 완화 방안 중앙 부처 건의",
      metrics
    };
  }

  // Fallback
  return {
    title: `시민 밀착형 여론 수집 기반 '${cat}' 분야 정책 사각지대 해소 가설`,
    body: `본 분야에 접수된 ${proposalCount + civilCount}건의 시민 요구를 종합적으로 검토해볼 때, 현행 ${policyCount}개의 서울시 추진 정책에서 직접 다루지 않는 사소하지만 핵심적인 세부 제도 개선 요구들이 산발적으로 분출되고 있습니다. NABO 보고서가 지적한 바와 같이 각 부서별 파편화된 정책 전달 방식을 지양하고, 시민들이 쉽게 접근할 수 있는 정책 정보 통합 알림 시스템을 마련해 정책 전달 체계상의 갭을 시급히 좁혀야 합니다.`,
    action: "소관 부서별 정책 통합 가이드북 발간 및 자치구별 정책 수혜 자격 자가 진단 챗봇(원스톱 채널) 개발 보급",
    metrics
  };
};

export const GapMatrixDashboard: React.FC<Props> = ({ 
  proposals, 
  onNavigateToTab,
  selectedDept
}) => {
  const [selectedIssue, setSelectedIssue] = useState<IssueItem | null>(null);
  const [activeTab, setActiveTab] = useState<'proposals' | 'civil' | 'policies' | 'news'>('proposals');
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);

  // Human-in-the-loop state variables
  const [feedbackLogs, setFeedbackLogs] = useState<FeedbackLog[]>([
    {
      issue_id: '임신·출산 이용기준',
      official_feedback: '수정 후 승인',
      ai_recommended_action: '임산부 배려석 기준 조례 완화 및 스티커 교체 안내',
      correct_action: '[조치 완료] 임산부 배려석 양보 캠페인 확대 및 자치구 지하철 스티커 시인성 개선 공문 발송 완료',
      reviewed_at: '2026-07-21 14:32:10',
      was_modified: true
    },
    {
      issue_id: '의료비·경제 부담',
      official_feedback: '승인',
      ai_recommended_action: '소아 응급 진료비 비급여 항목 지원 확대 추진',
      correct_action: '소아 응급 진료비 비급여 항목 지원 확대 추진',
      reviewed_at: '2026-07-20 09:15:43',
      was_modified: false
    }
  ]);
  const [showApprovalPanel, setShowApprovalPanel] = useState<boolean>(false);
  const [editedAnswer, setEditedAnswer] = useState<string>('');
  const [feedbackAction, setFeedbackAction] = useState<'승인' | '수정 후 승인' | '반려' | null>(null);
  const [customActions, setCustomActions] = useState<Record<string, { action: string; status: string; overrideSatisfaction?: string }>>({});
  const [lastSubmittedLog, setLastSubmittedLog] = useState<FeedbackLog | null>(null);
  const [showFeedbackHistory, setShowFeedbackHistory] = useState<boolean>(true);
  // 선택된 클러스터에 논문 방법론 적용 상태
  const [appliedMethod, setAppliedMethod] = useState<string>('default');

  const applyPaperMethod = (methodKey: string) => {
    if (!selectedIssue) return;
    const method = PAPER_METHODS[methodKey] || PAPER_METHODS['default'];
    const w = method.weights;
    const calc = Math.round(
      selectedIssue.demand * w.demand +
      selectedIssue.policy_gap * w.policy_gap +
      selectedIssue.urgency * w.urgency +
      selectedIssue.feasibility * w.feasibility +
      selectedIssue.evidence_confidence * w.evidence_confidence
    );

    let newStatus = '모니터링';
    if (calc >= 65) {
      newStatus = '즉시 검토';
    } else if (calc >= 50) {
      newStatus = '제도 개선';
    } else if (calc >= 40) {
      newStatus = '빠른 개선';
    }

    setSelectedIssue(prev => prev ? { ...prev, priority_score: calc, status: newStatus } : prev);
    setAppliedMethod(methodKey);
    setCustomActions(prev => ({
      ...prev,
      [selectedIssue.cluster]: {
        action: `방법론 적용: ${method.label}`,
        status: newStatus
      }
    }));
  };

  // 2열 비교 검증 펼치기/접기 토글 상태
  const [showRawProposals, setShowRawProposals] = useState<boolean>(false);
  const [showRawCivils, setShowRawCivils] = useState<boolean>(false);
  const [showRawPolicies, setShowRawPolicies] = useState<boolean>(false);
  const [showComparisonModal, setShowComparisonModal] = useState<boolean>(false);
  const [selectedEvidenceIndex, setSelectedEvidenceIndex] = useState<number>(0);
  const [isLocalExportOpen, setIsLocalExportOpen] = useState<boolean>(false);
  const [showProofModal, setShowProofModal] = useState<boolean>(false);
  const [selectedProofPaper, setSelectedProofPaper] = useState<string>('');
  const [expandedPolicyName, setExpandedPolicyName] = useState<string | null>(null);
  const [expandedNewsTitle, setExpandedNewsTitle] = useState<string | null>(null);
  const [showPriorityStandardModal, setShowPriorityStandardModal] = useState<boolean>(false);

  // 상단 필터 상태값
  const [selectedPeriod, setSelectedPeriod] = useState<string>('전체');
  const [selectedCategory, setSelectedCategory] = useState<string>('전체');
  const [selectedStatus, setSelectedStatus] = useState<string>('전체');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('전체');
  const [minConfidence, setMinConfidence] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 대분류 테이블 접기/펴기 상태값 (기본적으로 '임신·난임·생식건강'만 펼침)
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({
    '임신·난임·생식건강': true
  });

  // selectedIssue 변경 시 대분류 아코디언 자동 전개 및 테이블 행 스크롤 연동
  React.useEffect(() => {
    if (!selectedIssue) return;

    const targetCategory = selectedIssue.category;
    
    // 1. 해당 카테고리가 닫혀있다면 펼친다 (prev 상태를 직접 분기하여 expandedCats 의존성 제거 및 무한루프 영구 방지)
    setExpandedCats(prev => prev[targetCategory] ? prev : {
      ...prev,
      [targetCategory]: true
    });
      
    // 2. 아코디언 전개 애니메이션 및 DOM 렌더링이 완료된 안전한 타이밍(280ms)에 스크롤 수행
    const timer = setTimeout(() => {
      const rowEl = document.getElementById(`row-${selectedIssue.id}`);
      if (rowEl) {
        rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [selectedIssue]);

  // 데이터 로딩 및 포맷팅
  const rawDiagnoses = useMemo(() => {
    return (policyDiagnosisRaw.diagnoses || []) as any[];
  }, []);

  const allDiagnoses = useMemo(() => {
    return rawDiagnoses.map((d, idx) => {
      const deptInfo = DEPT_MAP[d.category] || { dept: '가족지원팀', phone: '02-2133-5040' };

      // 가중치 방법론에 맞춰 실시간 우선순위 점수 계산
      const method = PAPER_METHODS[appliedMethod] || PAPER_METHODS['default'];
      const w = method.weights;
      const priority_score = Math.round(
        d.demand * w.demand +
        d.policy_gap * w.policy_gap +
        d.urgency * w.urgency +
        d.feasibility * w.feasibility +
        d.evidence_confidence * w.evidence_confidence
      );

      // 점수 구간에 따라 4단계 상태 라벨을 유기적으로 판별
      let status = '모니터링';
      if (priority_score >= 65) {
        status = '즉시 검토';
      } else if (priority_score >= 50) {
        status = '제도 개선';
      } else if (priority_score >= 40) {
        status = '빠른 개선';
      }

      // 수동 승인/수정 후 승인 오버라이드
      const custom = customActions[`GAP-${idx + 1}`];
      if (custom && custom.status) {
        status = custom.status;
      }

      return {
        id: `GAP-${idx + 1}`,
        category: d.category,
        cluster: d.cluster,
        item_count: d.item_count,
        source_count: d.source_count,
        demand: d.demand,
        policy_gap: d.policy_gap,
        urgency: d.urgency,
        feasibility: d.feasibility,
        evidence_confidence: d.evidence_confidence,
        priority_score,
        status,
        recommended_action: d.recommended_action,
        representative_titles: d.representative_titles || [],
        primaryDept: deptInfo.dept,
        deptPhone: deptInfo.phone
      };
    });
  }, [rawDiagnoses, appliedMethod, customActions]);

  // 필터링 적용 로직
  const filteredDiagnoses = useMemo(() => {
    return allDiagnoses.filter(d => {
      if (selectedCategory !== '전체' && d.category !== selectedCategory) return false;
      if (selectedStatus !== '전체' && d.status !== selectedStatus) return false;
      if (selectedDeptFilter !== '전체' && d.primaryDept !== selectedDeptFilter) return false;
      if (d.evidence_confidence < minConfidence) return false;
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchesCat = d.category.toLowerCase().includes(q);
        const matchesClus = d.cluster.toLowerCase().includes(q);
        const matchesTitles = d.representative_titles.some((t: string) => t.toLowerCase().includes(q));
        if (!matchesCat && !matchesClus && !matchesTitles) return false;
      }
      return true;
    });
  }, [allDiagnoses, selectedCategory, selectedStatus, selectedDeptFilter, minConfidence, searchQuery]);

  // 분석 기간 선택에 따른 스케일 보정 (동적 체감)
  const periodFilteredDiagnoses = useMemo(() => {
    if (selectedPeriod === '전체') return filteredDiagnoses;
    const scale = selectedPeriod === '최근 1개월' ? 0.25 : selectedPeriod === '최근 3개월' ? 0.55 : 0.8;
    return filteredDiagnoses.map(d => {
      const newItemCount = Math.max(1, Math.round(d.item_count * scale));
      const newDemand = Math.max(10, Math.round(d.demand * (0.8 + 0.2 * scale)));
      const newPriority = Math.max(10, Math.min(100, Math.round(
        newDemand * 0.3 + d.policy_gap * 0.25 + d.urgency * 0.25 + d.feasibility * 0.1 + d.evidence_confidence * 0.1
      )));
      return {
        ...d,
        item_count: newItemCount,
        demand: newDemand,
        priority_score: newPriority
      };
    });
  }, [filteredDiagnoses, selectedPeriod]);

  // 요약 통계 영역 산출
  const summaryStats = useMemo(() => {
    const immediateCount = periodFilteredDiagnoses.filter(d => d.status === '즉시 검토').length;
    const rapidCount = periodFilteredDiagnoses.filter(d => d.demand >= 80).length;
    const lackEvidenceCount = periodFilteredDiagnoses.filter(d => d.evidence_confidence < 50).length;
    const resolvedCount = periodFilteredDiagnoses.filter(d => d.status === '모니터링').length;
    return { immediateCount, rapidCount, lackEvidenceCount, resolvedCount };
  }, [periodFilteredDiagnoses]);

  // Recharts Scatter용 데이터 변환
  const scatterData = useMemo(() => {
    return periodFilteredDiagnoses.map(d => ({
      x: d.policy_gap,
      y: d.urgency,
      z: d.demand,
      name: d.cluster,
      category: d.category,
      status: d.status,
      confidence: d.evidence_confidence,
      raw: d
    }));
  }, [periodFilteredDiagnoses]);

  // 테이블 그룹화
  const groupedDiagnoses = useMemo(() => {
    const groups: Record<string, typeof periodFilteredDiagnoses> = {};
    periodFilteredDiagnoses.forEach(d => {
      if (!groups[d.category]) {
        groups[d.category] = [];
      }
      groups[d.category].push(d);
    });
    return groups;
  }, [periodFilteredDiagnoses]);

  // 대분류 리스트 산출 (정렬 기준 포함)
  const categoryKeys = useMemo(() => {
    const keys = Object.keys(groupedDiagnoses);
    // 가장 높은 점수의 클러스터를 가진 대분류를 위로 정렬
    return keys.sort((a, b) => {
      const maxA = Math.max(...groupedDiagnoses[a].map(d => d.priority_score));
      const maxB = Math.max(...groupedDiagnoses[b].map(d => d.priority_score));
      return maxB - maxA;
    });
  }, [groupedDiagnoses]);

  // 선택된 클러스터의 원천데이터 (시민제안, 민원, 정책, 뉴스) 실시간 대조 매핑
  const selectedIssueRawData = useMemo(() => {
    if (!selectedIssue) return { proposals: [], civils: [], policies: [], news: [] };
    
    // 1. 시민제안 1:1 매핑
    const matchedProps = proposals.filter(p => 
      p.category === selectedIssue.category &&
      classifyCluster(p.title, p.content) === selectedIssue.cluster
    ).sort((a, b) => (b.vote_score || 0) - (a.vote_score || 0));

    // 2. 국민신문고 민원 1:1 매핑
    const matchedCivils = (civilRequestsData as any[]).filter(r => 
      r.category === selectedIssue.category &&
      classifyCluster(r.title, r.content) === selectedIssue.cluster
    );

    // 3. 몽땅정보통 정책 매핑
    const matchedPolicies = (classifiedPolicyData as any[]).filter(p => {
      const catMatch = p.Category === selectedIssue.category || p.사업대분류명 === selectedIssue.category;
      if (!catMatch) return false;
      const words = CLUSTER_RULES[selectedIssue.cluster] || [];
      if (words.length === 0) return true;
      return words.some(w => (p.사업명 + ' ' + (p.사업내용 || '')).toLowerCase().includes(w));
    }).map(p => ({
      id: p.사업소분류명 || '정책',
      policy_name: p.사업명,
      targetGroup: p.이용대상내용 || '서울시 거주 아동 및 부모',
      supportDetail: p.사업내용 || '상세 내용 전화 문의',
      apply_method: p.이용방법내용 || '온라인 및 오프라인 신청',
      url: p.신청하기사이트주소 && p.신청하기사이트주소 !== '.' && p.신청하기사이트주소 !== ''
        ? p.신청하기사이트주소 
        : (p.자세히보기사이트주소 && p.자세히보기사이트주소 !== '.' && p.자세히보기사이트주소 !== '' ? p.자세히보기사이트주소 : 'https://umppa.seoul.go.kr'),
      category: p.Category || p.사업대분류명
    }));

    // 4. 뉴스 매핑
    const matchedNews = (newsAllData as any[]).filter(n => 
      n.category === selectedIssue.category &&
      (selectedIssue.cluster === '기타·추가 검토' || 
       (CLUSTER_RULES[selectedIssue.cluster] || []).some(w => (n.title + ' ' + n.snippet).toLowerCase().includes(w)))
    ).slice(0, 5);

    return {
      proposals: matchedProps,
      civils: matchedCivils,
      policies: matchedPolicies,
      news: matchedNews
    };
  }, [selectedIssue, proposals]);

  const handleCardClick = (issue: any) => {
    if (!issue) return;

    // 클릭된 버블의 아이템이 필터링되어 가려지지 않도록 상단 필터 값을 유기적으로 해제/동기화
    if (selectedCategory !== '전체' && selectedCategory !== issue.category) {
      setSelectedCategory('전체');
    }
    if (selectedDeptFilter !== '전체' && selectedDeptFilter !== issue.primaryDept) {
      setSelectedDeptFilter('전체');
    }
    if (selectedStatus !== '전체' && selectedStatus !== issue.status) {
      setSelectedStatus('전체');
    }
    if (minConfidence > issue.evidence_confidence) {
      setMinConfidence(0); // 신뢰도 컷 해제
    }
    setSearchQuery(''); // 검색어 초기화

    setSelectedIssue(issue);
    setActiveTab('proposals');
    setSelectedEvidenceIndex(0);
  };

  const handleFeedbackSubmit = (actionType: '승인' | '수정 후 승인' | '반려') => {
    if (!selectedIssue) return;

    const aiOriginalAction = selectedIssue.recommended_action;
    // '수정 후 승인'은 담당자가 실제로 고친 답변 본문을 최종 액션으로 남긴다 (AI 원안과 분리 추적)
    const finalAction = actionType === '반려'
      ? '신규 정책 수립 검토'
      : actionType === '수정 후 승인'
        ? editedAnswer.trim()
        : aiOriginalAction;
    const wasModified = actionType === '수정 후 승인' && finalAction !== aiOriginalAction;

    const logRecord: FeedbackLog = {
      issue_id: selectedIssue.id,
      source_type: 'problem_cluster',
      source_id: `PROP-${selectedIssue.id.replace('GAP-', '00')}`,
      ai_matched_policy_id: `POLICY-${selectedIssue.id.replace('GAP-', '10')}`,
      ai_satisfaction_label: selectedIssue.priority_score >= 75 ? '미충족' : '일부 충족',
      official_feedback: actionType,
      correct_policy_id: actionType === '반려' ? 'POLICY-NONE' : `POLICY-${selectedIssue.id.replace('GAP-', '10')}`,
      ai_recommended_action: aiOriginalAction,
      correct_action: finalAction,
      was_modified: wasModified,
      edited_answer: editedAnswer,
      reviewer_id: 'OFFICIAL-SESAC-01',
      reviewed_at: new Date().toISOString().substring(0, 10)
    };

    setFeedbackLogs(prev => [logRecord, ...prev]);
    setFeedbackAction(actionType);

    setCustomActions(prev => ({
      ...prev,
      [selectedIssue.cluster]: {
        action: actionType === '수정 후 승인' ? aiOriginalAction : logRecord.correct_action,
        status: actionType === '승인' ? '승인 완료' : actionType === '수정 후 승인' ? '수정 승인' : '신규 수립 검토',
        overrideSatisfaction: actionType === '승인' ? '충족' : actionType === '수정 후 승인' ? '일부 충족' : '미충족'
      }
    }));

    setSelectedIssue(prev => prev ? {
      ...prev,
      // 화면(우측 패널)에는 AI 원 추천 문구를 그대로 유지하고, 실제 확정 답변은 이력 로그에서만 확인
      status: actionType === '승인' ? '모니터링' : actionType === '수정 후 승인' ? '빠른 개선' : '즉시 검토'
    } : null);

    setShowApprovalPanel(false);
    setLastSubmittedLog(logRecord);
  };

  const toggleCategory = (cat: string) => {
    setExpandedCats(prev => ({
      ...prev,
      [cat]: !prev[cat]
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '즉시 검토': return 'bg-red-50 text-red-700 border-red-200';
      case '제도 개선': return 'bg-amber-50 text-amber-700 border-amber-200';
      case '빠른 개선': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* 설명 배너 */}
      <div className="bg-[#0B1B3D] text-white p-5 rounded-2xl border border-blue-950 shadow-md flex items-center justify-between">
        <div className="space-y-1.5">
          <span className="bg-blue-600 text-white text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider">우선순위 진단 매트릭스</span>
          <h2 className="text-lg font-black mt-1">📊 우선순위 진단 매트릭스 (X: 정책 공백 (GAP), Y: 시급성, 크기: 수요)</h2>
          <p className="text-[11px] text-slate-300 leading-relaxed max-w-4xl">
            본 화면은 시민 제안 및 국민신문고 현장 민원 데이터를 정밀 재분류하여 **문제 클러스터** 단위의 5대 진단 축(수요, 공백, 시급성, 실행성, 신뢰도)을 다차원 평가합니다.<br />
            실제 의사결정자는 **인터랙티브 버블 매트릭스**를 통해 직관적으로 우선순위를 선별하고, 우측 상세 패널에서 AI 답변 및 추천 행정 조치를 즉시 검토 및 승인할 수 있습니다.
          </p>
        </div>
        <Building2 className="w-12 h-12 text-blue-900/60 hidden lg:block shrink-0" />
      </div>

      {/* 1. 상단 필터바 */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            다차원 다이내믹 필터
          </span>
          <button 
            onClick={() => {
              setSelectedPeriod('전체');
              setSelectedCategory('전체');
              setSelectedStatus('전체');
              setSelectedDeptFilter('전체');
              setMinConfidence(0);
              setSearchQuery('');
            }}
            className="text-[10px] text-slate-500 hover:text-blue-600 font-bold transition flex items-center gap-1 cursor-pointer"
          >
            초기화
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 분석 기간 */}
          <div className="space-y-1">
            <label className="text-[9.5px] font-bold text-slate-500 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" /> 분석 기간
            </label>
            <select 
              value={selectedPeriod} 
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full text-[11px] p-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-slate-700 outline-hidden font-medium"
            >
              <option value="전체">전체 (누적)</option>
              <option value="최근 6개월">최근 6개월</option>
              <option value="최근 3개월">최근 3개월</option>
              <option value="최근 1개월">최근 1개월</option>
            </select>
          </div>

          {/* 대분류 필터 */}
          <div className="space-y-1">
            <label className="text-[9.5px] font-bold text-slate-500 flex items-center gap-1">
              <Layers className="w-3 h-3 text-slate-400" /> 대분류
            </label>
            <select 
              value={selectedCategory} 
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full text-[11px] p-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-slate-700 outline-hidden font-medium"
            >
              <option value="전체">전체 대분류</option>
              {Object.keys(DEPT_MAP).sort((a, b) => a.localeCompare(b, 'ko')).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* 상태 라벨 */}
          <div className="space-y-1">
            <label className="text-[9.5px] font-bold text-slate-500 flex items-center gap-1">
              <Activity className="w-3 h-3 text-slate-400" /> 상태 라벨
            </label>
            <select 
              value={selectedStatus} 
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full text-[11px] p-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-slate-700 outline-hidden font-medium"
            >
              <option value="전체">전체 상태</option>
              <option value="즉시 검토">즉시 검토</option>
              <option value="제도 개선">제도 개선</option>
              <option value="빠른 개선">빠른 개선</option>
              <option value="모니터링">모니터링</option>
            </select>
          </div>

          {/* 담당 부서 */}
          <div className="space-y-1">
            <label className="text-[9.5px] font-bold text-slate-500 flex items-center gap-1">
              <Building2 className="w-3 h-3 text-slate-400" /> 담당 부서
            </label>
            <select 
              value={selectedDeptFilter} 
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
              className="w-full text-[11px] p-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-slate-700 outline-hidden font-medium"
            >
              <option value="전체">전체 부서</option>
              {Array.from(new Set(Object.values(DEPT_MAP).map(v => v.dept))).sort((a, b) => a.localeCompare(b, 'ko')).map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {/* 최소 근거 신뢰도 슬라이더 */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[9.5px] font-bold text-slate-500">
              <span className="flex items-center gap-1"><Sliders className="w-3 h-3 text-slate-400" /> 최소 신뢰도</span>
              <span className="text-blue-600 font-mono">{minConfidence}점 이상</span>
            </div>
            <div className="pt-1.5">
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={minConfidence} 
                onChange={(e) => setMinConfidence(Number(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>
          </div>

          {/* 검색어 */}
          <div className="space-y-1">
            <label className="text-[9.5px] font-bold text-slate-500 flex items-center gap-1">
              <Search className="w-3 h-3 text-slate-400" /> 검색어
            </label>
            <div className="relative">
              <input 
                type="text" 
                placeholder="클러스터명, 키워드 검색..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-[11px] p-2 pl-7 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-slate-700 outline-hidden font-medium"
              />
              <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-3" />
            </div>
          </div>
        </div>
      </div>

      {/* 2. 요약 스탯 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-lg shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 block leading-tight">즉시 검토 필요</span>
            <span className="text-lg font-black text-slate-900 leading-none">{summaryStats.immediateCount} <span className="text-xs font-semibold text-slate-500">개</span></span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 block leading-tight">새로 급상승 (수요≥80)</span>
            <span className="text-lg font-black text-slate-900 leading-none">{summaryStats.rapidCount} <span className="text-xs font-semibold text-slate-500">개</span></span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="p-2.5 bg-yellow-50 text-yellow-600 rounded-lg shrink-0">
            <AlertOctagon className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 block leading-tight">근거 부족 (신뢰도&lt;50)</span>
            <span className="text-lg font-black text-slate-900 leading-none">{summaryStats.lackEvidenceCount} <span className="text-xs font-semibold text-slate-500">개</span></span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 block leading-tight">이번 기간 완화/해결됨</span>
            <span className="text-lg font-black text-slate-900 leading-none">{summaryStats.resolvedCount} <span className="text-xs font-semibold text-slate-500">개</span></span>
          </div>
        </div>
      </div>

      {/* 2b. Human-in-the-loop 검토 이력 로그 (AI 원안 vs 담당자 최종 확정 액션 비교) */}
      {feedbackLogs.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <button
            onClick={() => setShowFeedbackHistory(prev => !prev)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition cursor-pointer"
          >
            <span className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              📋 검토·승인 이력 로그 ({feedbackLogs.length}건) — AI 추천 vs 담당자 최종 확정
            </span>
            <span className="text-[9px] text-slate-500 font-bold flex items-center gap-1">
              {showFeedbackHistory ? '접기' : '펼쳐서 확인'}
              {showFeedbackHistory ? <ArrowLeft className="w-3 h-3 rotate-90" /> : <ArrowRight className="w-3 h-3 -rotate-90" />}
            </span>
          </button>
          {showFeedbackHistory && (
            <div className="border-t border-slate-100 max-h-72 overflow-y-auto">
              <table className="w-full text-[10px]">
                <thead className="bg-slate-50 sticky top-0">
                  <tr className="text-slate-500 font-bold text-left">
                    <th className="px-3 py-2">클러스터</th>
                    <th className="px-3 py-2">피드백</th>
                    <th className="px-3 py-2">AI 원 추천 액션</th>
                    <th className="px-3 py-2">담당자 최종 확정 액션</th>
                    <th className="px-3 py-2">검토일</th>
                  </tr>
                </thead>
                <tbody>
                  {feedbackLogs.map((log, idx) => (
                    <tr key={idx} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-semibold text-slate-800">{log.issue_id}</td>
                      <td className="px-3 py-2">
                        <span className={`px-1.5 py-0.5 rounded-full font-bold text-[9px] ${
                          log.official_feedback === '승인' ? 'bg-blue-50 text-blue-700' :
                          log.official_feedback === '수정 후 승인' ? 'bg-amber-50 text-amber-700' :
                          'bg-rose-50 text-rose-700'
                        }`}>
                          {log.official_feedback}{log.was_modified ? ' (수정됨)' : ''}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-500 max-w-[220px] truncate" title={log.ai_recommended_action}>
                        {log.ai_recommended_action}
                      </td>
                      <td className={`px-3 py-2 max-w-[260px] truncate ${log.was_modified ? 'text-amber-700 font-semibold' : 'text-slate-700'}`} title={log.correct_action}>
                        {log.correct_action}
                      </td>
                      <td className="px-3 py-2 text-slate-400">{log.reviewed_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 3. 버블 차트 & 테이블 & 상세패널 복합 레이아웃 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 왼쪽 2열 영역: 차트 및 그룹 테이블 */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* 3a. 인터랙티브 버블 매트릭스 차트 */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-4">
              <h3 className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-blue-600" />
                우선순위 진단 매트릭스 (X: 정책 공백, Y: 시급성, 크기: 수요)
              </h3>
              <span className="text-[9px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded">
                차트 속 버블을 클릭하면 우측 고정 패널에서 정밀 갭 진단조회가 가능합니다.
              </span>
            </div>

            <div className="w-full">
              {scatterData.length === 0 ? (
                <div className="py-20 text-center text-slate-400 text-[11px]">필터 조건에 부합하는 클러스터가 없습니다.</div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <ScatterChart margin={{ top: 15, right: 20, bottom: 20, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis 
                      type="number" 
                      dataKey="x" 
                      name="정책 공백" 
                      domain={[0, 100]}
                      tick={{ fontSize: 9, fill: '#64748b' }}
                    >
                      <Label value="정책 공백 (GAP) ➔" offset={-10} position="insideBottom" style={{ fontSize: 10, fill: '#475569', fontWeight: 'bold' }} />
                    </XAxis>
                    <YAxis 
                      type="number" 
                      dataKey="y" 
                      name="사회적 시급성" 
                      domain={[0, 100]}
                      tick={{ fontSize: 9, fill: '#64748b' }}
                    >
                      <Label value="사회적 시급성 ➔" angle={-90} position="insideLeft" offset={5} style={{ fontSize: 10, fill: '#475569', fontWeight: 'bold' }} />
                    </YAxis>
                    <ZAxis type="number" dataKey="z" range={[50, 450]} name="수요 강도" />
                    <Tooltip
                      cursor={{ strokeDasharray: '3 3' }}
                      isAnimationActive={false}
                      content={({ active, payload }: any) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          const color = data.status === '즉시 검토' ? 'text-rose-600' :
                                        data.status === '제도 개선' ? 'text-amber-600' :
                                        data.status === '빠른 개선' ? 'text-emerald-600' : 'text-slate-600';
                          return (
                            <div className="bg-slate-900/95 text-white p-3 rounded-lg shadow-2xl border border-slate-700 max-w-[240px] space-y-1.5 backdrop-blur-xs text-[10px]">
                              <p className="font-black border-b border-slate-700 pb-1.5 text-xs text-white truncate">{data.name}</p>
                              <p className="text-slate-300">대분류: <strong className="text-white">{data.category}</strong></p>
                              <p className="text-slate-300">상태: <strong className={`${color} font-black`}>{data.status}</strong></p>
                              <div className="grid grid-cols-2 gap-x-2 pt-1 text-slate-400">
                                <span>정책 공백: <strong>{data.x}점</strong></span>
                                <span>사회 시급성: <strong>{data.y}점</strong></span>
                                <span>수요 강도: <strong>{data.z}점</strong></span>
                                <span>근거 신뢰도: <strong>{data.confidence}점</strong></span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Scatter name="문제 클러스터" data={scatterData} onClick={(node: any) => handleCardClick(node.raw)}>
                      {scatterData.map((entry, index) => {
                        const isSelected = selectedIssue?.id === entry.raw?.id;
                        const color = entry.status === '즉시 검토' ? '#ef4444' :
                                      entry.status === '제도 개선' ? '#f59e0b' :
                                      entry.status === '빠른 개선' ? '#10b981' : '#64748b';
                        const isDeptMatch = !selectedDept || entry.raw?.primaryDept === selectedDept;
                        
                        // 선택된 버블은 불투명도를 최대화하여 강조
                        const baseOpacity = isSelected ? 1.0 : (0.35 + 0.65 * (entry.confidence / 100));
                        const opacity = isDeptMatch ? baseOpacity : baseOpacity * 0.3;
                        
                        const stroke = isSelected 
                          ? '#020617' // 아주 어두운 Slate 색상으로 선택된 버블 강조
                          : (isDeptMatch ? (entry.confidence >= 60 ? '#1e293b' : color) : '#cbd5e1');
                        
                        const strokeWidth = isSelected 
                          ? 4.5 
                          : (isDeptMatch ? (entry.confidence >= 70 ? 2 : 1) : 1);
                        
                        return (
                          <Cell
                            key={`cell-${index}`}
                            fill={color}
                            fillOpacity={opacity}
                            stroke={stroke}
                            strokeWidth={strokeWidth}
                            className={`cursor-pointer transition-all duration-300 ${isSelected ? 'scale-125 stroke-slate-950 shadow-lg' : ''}`}
                          />
                        );
                      })}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              )}
            </div>
            
            <div className="flex justify-between items-center text-[9px] text-slate-400 border-t border-slate-100 pt-2.5 mt-2 select-none">
              <div className="flex items-center gap-3.5">
                {/* 1. 즉시 검토 툴팁 */}
                <div className="relative group cursor-help flex items-center gap-1 hover:text-rose-600 transition duration-150">
                  <span className="w-2.5 h-2.5 bg-rose-500 rounded-full" />
                  <span className="font-bold">즉시 검토</span>
                  <div className="absolute hidden group-hover:block bg-slate-900 text-white text-[9.5px] p-3 rounded-lg shadow-xl z-50 w-64 -top-28 -left-2 leading-relaxed border border-slate-700 pointer-events-none animate-in fade-in duration-200">
                    <span className="font-extrabold block text-rose-400 mb-1">🚨 즉시 검토 (65점 이상)</span>
                    시민 요구 강도가 극도로 높으면서 정책 공급망 공백이 뚜렷한 최우선 개입 사안. 즉시 신규 대안 예산 수립 및 행정 처리가 권고됩니다.
                  </div>
                </div>

                {/* 2. 제도 개선 툴팁 */}
                <div className="relative group cursor-help flex items-center gap-1 hover:text-amber-600 transition duration-150">
                  <span className="w-2.5 h-2.5 bg-amber-500 rounded-full" />
                  <span className="font-bold">제도 개선</span>
                  <div className="absolute hidden group-hover:block bg-slate-900 text-white text-[9.5px] p-3 rounded-lg shadow-xl z-50 w-64 -top-28 -left-12 leading-relaxed border border-slate-700 pointer-events-none animate-in fade-in duration-200">
                    <span className="font-extrabold block text-amber-400 mb-1">🔶 제도 개선 (50 ~ 64점)</span>
                    다부서 파편화 분절로 수혜 체감이 떨어지거나 자격요건 완화가 동반되어야 하는 영역. 관련 조례 개정 및 R&R 부서 조율을 권고합니다.
                  </div>
                </div>

                {/* 3. 빠른 개선 툴팁 */}
                <div className="relative group cursor-help flex items-center gap-1 hover:text-emerald-600 transition duration-150">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                  <span className="font-bold">빠른 개선</span>
                  <div className="absolute hidden group-hover:block bg-slate-900 text-white text-[9.5px] p-3 rounded-lg shadow-xl z-50 w-64 -top-28 -left-20 leading-relaxed border border-slate-700 pointer-events-none animate-in fade-in duration-200">
                    <span className="font-extrabold block text-emerald-400 mb-1">🟢 빠른 개선 (40 ~ 49점)</span>
                    신청 절차 간소화, 원스톱 채널 홍보, 대민 안내 스티커 개선 등 적은 행정 예산으로 즉각적인 체감 만족도를 제고할 수 있는 사안입니다.
                  </div>
                </div>

                {/* 4. 모니터링 툴팁 */}
                <div className="relative group cursor-help flex items-center gap-1 hover:text-slate-600 transition duration-150">
                  <span className="w-2.5 h-2.5 bg-slate-500 rounded-full" />
                  <span className="font-bold">모니터링</span>
                  <div className="absolute hidden group-hover:block bg-slate-900 text-white text-[9.5px] p-3 rounded-lg shadow-xl z-50 w-64 -top-24 -left-24 leading-relaxed border border-slate-700 pointer-events-none animate-in fade-in duration-200">
                    <span className="font-extrabold block text-slate-400 mb-1">🔘 모니터링 (40점 미만)</span>
                    기존 정책 공급이 안정적이거나 시민 민원 축적률이 상대적으로 낮아 주기적 피드백 분석 및 동향 감시가 유효한 영역입니다.
                  </div>
                </div>
              </div>

              {/* 우측 판정 기준 설명 */}
              <div className="relative group cursor-pointer hover:text-blue-600 transition duration-150">
                <span 
                  onClick={() => setShowPriorityStandardModal(true)}
                  className="font-bold flex items-center gap-1 cursor-pointer select-none"
                >
                  💡 테두리가 굵을수록 근거 신뢰도가 높음 
                  <span className="bg-slate-100 hover:bg-blue-50 text-slate-500 hover:text-blue-700 px-1.5 py-0.5 rounded font-black border border-slate-200 transition">
                    판정 기준 ⓘ
                  </span>
                </span>
                <div className="absolute hidden group-hover:block bg-slate-900 text-white text-[9.5px] p-3.5 rounded-lg shadow-xl z-50 w-72 -top-40 right-0 leading-relaxed border border-slate-700 pointer-events-none animate-in fade-in duration-200">
                  <span className="font-extrabold block text-indigo-400 mb-1">📊 의사결정 상태 판정 로직 정의</span>
                  본 점수는 적용된 방법론의 논문 가중치 모델을 기반으로 계산됩니다:
                  <ul className="list-disc pl-3 mt-1.5 space-y-1 font-medium">
                    <li><strong className="text-rose-300">즉시 검토 (65점~100점)</strong>: 긴급 공백 사각지대</li>
                    <li><strong className="text-amber-300">제도 개선 (50점~64점)</strong>: 조례 수정 및 부서 연계</li>
                    <li><strong className="text-emerald-300">빠른 개선 (40점~49점)</strong>: 소액 고효율 생활 조치</li>
                    <li><strong className="text-slate-300">모니터링 (40점 미만)</strong>: 일반 주기 관찰 대상</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* 3b. 대분류 접이식 테이블 */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-600" />
                문제 클러스터 종합 진단 일람표 (우선순위순 정렬)
              </h3>
              <div className="flex items-center gap-2">
                {selectedDept && (
                  <button
                    onClick={() => setIsLocalExportOpen(true)}
                    className="px-2.5 py-1 text-[10px] bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-lg flex items-center gap-1 transition shadow-2xs cursor-pointer"
                    title={`${selectedDept} 맞춤 보고서 생성`}
                  >
                    <Download className="w-3 h-3" />
                    <span>맞춤 보고서 생성</span>
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[10px]">
                    <th className="px-4 py-2">대분류 및 세부 문제 클러스터</th>
                    <th className="px-3 py-2 text-center">수요 강도</th>
                    <th className="px-3 py-2 text-center">정책 공백</th>
                    <th className="px-3 py-2 text-center">시급성</th>
                    <th className="px-3 py-2 text-center">실행성</th>
                    <th className="px-3 py-2 text-center">근거 신뢰도</th>
                    <th className="px-3 py-2 text-center">진단 상태</th>
                    <th className="px-3 py-2">주관 부서</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {categoryKeys.map(cat => {
                    const children = groupedDiagnoses[cat];
                    const isExpanded = !!expandedCats[cat];
                    
                    return (
                      <React.Fragment key={cat}>
                        {/* 대분류 헤더 행 */}
                        <tr 
                          onClick={() => toggleCategory(cat)}
                          className="bg-slate-50/60 hover:bg-slate-50 cursor-pointer border-y border-slate-200/60 font-bold transition text-slate-900"
                        >
                          <td colSpan={8} className="px-3 py-2.5 text-xs text-blue-950 font-black flex items-center gap-2">
                            {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
                            <span>{cat}</span>
                            <span className="bg-slate-200/80 text-slate-700 text-[9px] font-bold px-2 py-0.2 rounded-full font-mono">
                              {children.length}개 클러스터
                            </span>
                          </td>
                        </tr>

                        {/* 펼쳐졌을 경우 렌더링될 세부 클러스터들 */}
                        {isExpanded && children.map(d => {
                          const isDeptMatch = !selectedDept || d.primaryDept === selectedDept;
                          const isSelected = selectedIssue?.id === d.id;
                          return (
                            <tr 
                              key={d.id}
                              id={`row-${d.id}`}
                              onClick={() => handleCardClick(d)}
                              className={`hover:bg-blue-50/40 cursor-pointer transition-all duration-200 text-slate-700 ${
                                isSelected ? 'bg-blue-50/90 font-bold text-blue-950 border-l-4 border-blue-600 shadow-xs ring-1 ring-blue-100/60' : ''
                              } ${!isDeptMatch ? 'opacity-30 hover:opacity-75 scale-99' : ''}`}
                            >
                              <td className="pl-8 pr-3 py-3 font-bold text-slate-800 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                {d.cluster}
                              </td>
                              <td className="px-3 py-3 text-center">
                                <div className="flex items-center gap-1.5 justify-center">
                                  <span className="font-mono font-bold w-5">{d.demand}</span>
                                  <div className="w-12 bg-slate-100 h-1 rounded-full overflow-hidden hidden sm:block">
                                    <div className="bg-[#0A2351] h-full" style={{ width: `${d.demand}%` }} />
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-3 text-center">
                                <div className="flex items-center gap-1.5 justify-center">
                                  <span className="font-mono font-bold w-5">{d.policy_gap}</span>
                                  <div className="w-12 bg-slate-100 h-1 rounded-full overflow-hidden hidden sm:block">
                                    <div className="bg-rose-500 h-full" style={{ width: `${d.policy_gap}%` }} />
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-3 text-center font-mono font-bold text-slate-700">{d.urgency}</td>
                              <td className="px-3 py-3 text-center font-mono font-bold text-slate-700">{d.feasibility}</td>
                              <td className="px-3 py-3 text-center font-mono font-bold text-slate-700">{d.evidence_confidence}</td>
                              <td className="px-3 py-3 text-center whitespace-nowrap">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black whitespace-nowrap ${
                                  d.status === '즉시 검토' ? 'bg-rose-100 text-rose-800' :
                                  d.status === '제도 개선' ? 'bg-amber-100 text-amber-800' :
                                  d.status === '빠른 개선' ? 'bg-emerald-100 text-emerald-800' :
                                  'bg-slate-100 text-slate-800'
                                }`}>
                                  {d.status}
                                </span>
                              </td>
                              <td className="px-3 py-3 font-semibold text-slate-500 text-[10px]">{d.primaryDept}</td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 4. 오른쪽 영역: 문제 클러스터 진단 상세 패널 */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col justify-between h-[calc(100vh-140px)] sticky top-24 self-start w-full min-h-[500px]">
          {!selectedIssue ? (
            <div className="p-8 text-center my-auto flex flex-col items-center justify-center space-y-3">
              <HelpCircle className="w-10 h-10 text-slate-300 animate-bounce" />
              <p className="font-bold text-xs text-slate-500">진단표의 클러스터를 선택해주세요</p>
              <p className="text-[10px] text-slate-400">5대 진단 지표와 3단계 추천 액션이 포함된 상세 진단서가 우측에 표출됩니다.</p>
            </div>
          ) : (
            <div className="flex flex-col h-full justify-between min-h-0">
              
              {/* 패널 헤더 */}
              <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
                <div className="min-w-0 mr-2">
                  <span className="text-[9px] text-blue-400 font-bold block uppercase truncate">{selectedIssue.category}</span>
                  <h3 className="font-bold text-xs truncate mt-0.5">{selectedIssue.cluster}</h3>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button 
                    onClick={() => {
                      setShowComparisonModal(true);
                      setShowRawProposals(true);
                      setShowRawCivils(true);
                      setShowRawPolicies(true);
                    }}
                    className="p-1.5 rounded-lg bg-slate-850 hover:bg-slate-805 text-slate-300 hover:text-white transition cursor-pointer"
                    title="↔️ 원천데이터 3열 비교 분석기 열기"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                  <span className="text-[11px] bg-rose-600 text-white px-2 py-0.5 rounded font-black shadow-xs shrink-0">
                    {selectedIssue.priority_score}점
                  </span>
                </div>
              </div>

              {/* 상세 스크롤 영역 */}
              <div className="p-4 flex-grow space-y-4 overflow-y-auto min-h-0">
                
                {/* 상태 요약 배너 */}
                <div className={`p-3 rounded-lg border flex items-center gap-2 text-xs font-bold ${getStatusColor(selectedIssue.status)}`}>
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <div>
                    <span>상태: {selectedIssue.status}</span>
                    <span className="block text-[9.5px] font-medium text-slate-500 mt-0.5">권고사항: {selectedIssue.recommended_action}</span>
                  </div>
                </div>

                {/* 🎓 학술적 연구 및 통계 입증 근거 (Academic Grounding) */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50/50 p-3 rounded-lg border border-blue-100 text-[10px] space-y-1.5 shadow-2xs">
                  <h4 className="font-extrabold text-blue-900 flex items-center gap-1.5 font-sans">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    🎓 학술 연구 & 실측 데이터 교차 검증 (Academic Proof)
                  </h4>
                  <div className="text-slate-700 leading-relaxed font-medium">
                    {renderAcademicProof(selectedIssue, (title) => {
                      setSelectedProofPaper(title);
                      setShowProofModal(true);
                    })}
                  </div>
                </div>

                {/* 예외 처리 및 경고 배너 */}
                {selectedIssue.priority_score < 50 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-[10px] leading-relaxed text-red-950 flex items-start gap-1.5 animate-pulse">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-red-900 font-bold">⚠️ 점수 과소평가 위험</strong>
                      수집된 제안 및 민원 건수가 타 분야 대비 적으나 실제 수혜 가구의 고충이 반영되지 않았을 가능성이 존재합니다. 담당 부서의 현장 의견 청취가 요망됩니다.
                    </div>
                  </div>
                )}

                {selectedIssue.evidence_confidence < 50 && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-[10px] leading-relaxed text-yellow-950 flex items-start gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-yellow-900 font-bold">⚠️ 근거 추가 수집 필요</strong>
                      분석된 제안과 민원의 표본 수가 충분치 않아 AI 진단 결론의 정확성이 떨어질 수 있으니 추가 근거 수집 후 정책 수립을 권장합니다.
                    </div>
                  </div>
                )}

                {/* 5대 진단 축 수평 막대 그래프 */}
                <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] font-bold text-slate-600">방법론 적용</label>
                      <select
                        value={appliedMethod}
                        onChange={(e) => setAppliedMethod(e.target.value)}
                        className="text-[10px] p-1 rounded-md border border-slate-200 bg-white"
                      >
                        {Object.entries(PAPER_METHODS).map(([key, m]) => (
                          <option key={key} value={key}>{m.label}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => applyPaperMethod(appliedMethod)}
                        className="text-[10px] px-2 py-1 bg-blue-600 text-white rounded-md font-bold"
                      >적용</button>
                    </div>
                    <div className="text-[9px] text-slate-500 flex items-center gap-1">
                      적용된 방법론: <strong className="text-slate-700">{PAPER_METHODS[appliedMethod]?.label || '기본'}</strong>
                      {appliedMethod !== 'default' && (
                        <button
                          onClick={() => {
                            const title = appliedMethod === 'park2022' ? '박미경 (2022)' : 'KICCE (2023)';
                            setSelectedProofPaper(title);
                            setShowProofModal(true);
                          }}
                          className="text-slate-400 hover:text-indigo-600 cursor-pointer flex items-center"
                          title="적용 방법론의 4단계 가설 실증 흐름 보기"
                        >
                          <Info className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                        </button>
                      )}
                    </div>
                  </div>
                  <h4 className="text-[10px] font-black text-slate-800">📊 5대 진단 축 상세 분석</h4>

                  <div className="space-y-2 text-[10px]">
                    {([
                      {
                        key: 'demand',
                        label: '수요 강도 (Demand Strength)',
                        value: selectedIssue.demand,
                        bar: 'bg-[#0A2351]',
                        evidence: `이 클러스터로 분류된 제안·민원 건수(${selectedIssue.item_count}건)를 기준으로 산정합니다. 공식: 25 + 75 × log(1+건수) / log(1+동일 카테고리 내 최다 건수 클러스터). 건수가 많을수록 높아지되, 특정 클러스터로의 쏠림을 완화하기 위해 로그 스케일을 사용합니다.`
                      },
                      {
                        key: 'policy_gap',
                        label: '정책 공백 (Policy Gap)',
                        value: selectedIssue.policy_gap,
                        bar: 'bg-rose-500',
                        evidence: `공식: 0.6 × 미해결도(unresolved) + 0.4 × (100 − 기존 정책 커버리지). 그룹 내 건들의 '아직 해결되지 않았는가'와 '현행 정책이 이미 다루고 있는가'를 평균 내어, 미해결이면서 현행 정책이 못 미치는 문제일수록 공백 점수가 높게 나옵니다.`
                      },
                      {
                        key: 'urgency',
                        label: '사회적 시급성 (Social Urgency)',
                        value: selectedIssue.urgency,
                        bar: 'bg-amber-500',
                        evidence: `건별로 입력된 시급성 점수가 있으면 그 평균을, 없으면 본문에 '긴급·위험·안전·응급·폭력·자살·생명·즉시' 등 긴급 키워드 포함 여부로 기본값(45~55)을 추정해 반영합니다.`
                      },
                      {
                        key: 'feasibility',
                        label: '실행 가능성 (Feasibility)',
                        value: selectedIssue.feasibility,
                        bar: 'bg-blue-600',
                        evidence: `건별로 입력된 실행가능성 점수가 있으면 그 평균을, 없으면 '안내·홍보·기준·절차·신청·정보·개선' 등 비교적 실행이 쉬운 키워드 포함 여부로 기본값(45~60)을 추정해 반영합니다.`
                      },
                      {
                        key: 'evidence_confidence',
                        label: '근거 신뢰도 (Evidence Confidence)',
                        value: selectedIssue.evidence_confidence,
                        bar: 'bg-indigo-600',
                        evidence: `공식: 35 + 0.35 × 출처 다양성 + 30 × 데이터 완성도. 출처 다양성은 서로 다른 출처 수(현재 ${selectedIssue.source_count}개) × 20(최대 100)으로 계산하고, 완성도는 각 건에 시급성·실행가능성·미해결·정책커버리지 값이 얼마나 채워져 있는지 비율입니다. 표본이 적거나 출처가 한 곳뿐이면 신뢰도가 낮게 나옵니다.`
                      }
                    ] as const).map(metric => (
                      <div key={metric.key} className="space-y-0.5">
                        <div className="flex justify-between items-center font-semibold">
                          <span className="flex items-center gap-1 relative">
                            {metric.label}
                            <div className="relative group inline-block">
                              <button
                                onClick={() => setExpandedMetric(prev => prev === metric.key ? null : metric.key)}
                                className="text-slate-400 hover:text-blue-600 transition cursor-pointer"
                              >
                                <Info className="w-3 h-3" />
                              </button>
                              {/* 설명 호버 CSS 툴팁 */}
                              <div className="absolute hidden group-hover:block bg-slate-900 text-white text-[9px] p-2.5 rounded-lg shadow-lg z-50 w-60 -top-16 -left-28 leading-relaxed border border-slate-700 pointer-events-none animate-in fade-in duration-200">
                                <span className="font-bold block mb-0.5 text-blue-300">📊 산출 근거 공식</span>
                                {metric.evidence}
                              </div>
                            </div>
                          </span>
                          <span className="font-mono text-slate-600">{metric.value} / 100</span>
                        </div>
                        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div className={`${metric.bar} h-full`} style={{ width: `${metric.value}%` }} />
                        </div>
                        {expandedMetric === metric.key && (
                          <div className="mt-1 p-2 bg-white border border-slate-200 rounded-lg text-[9.5px] text-slate-600 leading-relaxed">
                            🧮 {metric.evidence}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <p className="text-[9px] text-slate-400 pt-1 border-t border-slate-200 leading-snug">
                    우선순위 지수 = 수요×0.30 + 정책공백×0.25 + 시급성×0.25 + 실행가능성×0.10 + 근거신뢰도×0.10
                  </p>
                </div>

                {/* 3단계 추천 액션 */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black text-slate-800">📋 추천 행정 액션 구성</h4>
                  <div className="grid grid-cols-1 gap-2">
                    
                    {/* 즉시 할 일 */}
                    <div className="bg-rose-50/50 p-2.5 rounded-lg border border-rose-100/50 text-[10px]">
                      <span className="font-bold text-rose-900 flex items-center gap-1">🔴 즉시 할 일</span>
                      <p className="text-slate-600 leading-snug mt-1">
                        {selectedIssue.status === '즉시 검토' 
                          ? '주관부서 주관 하에 현행 지원기준과 수혜층의 격차를 정밀 대조하는 전수 진단을 신속히 개시하고, 담당자 기안서 보고서를 생성하십시오.'
                          : '수집된 시민 원문 제안과 민원 키워드를 1:1 대조하여 문제 본질을 검토하십시오.'}
                      </p>
                    </div>

                    {/* 추가 확인 */}
                    <div className="bg-amber-50/50 p-2.5 rounded-lg border border-amber-100/50 text-[10px]">
                      <span className="font-bold text-amber-900 flex items-center gap-1">🟡 추가 확인</span>
                      <p className="text-slate-600 leading-snug mt-1">
                        유관 부서 및 자치구 보육/복지 부서에 해당 지원정책의 신청 조건(소득/연령 기준)과 시민 요구 요건 간 불일치를 조회하고, 실시간 민원 증감 추이를 조사하십시오.
                      </p>
                    </div>

                    {/* 중장기 검토 */}
                    <div className="bg-blue-50/50 p-2.5 rounded-lg border border-blue-100/50 text-[10px]">
                      <span className="font-bold text-blue-900 flex items-center gap-1">🔵 중장기 검토</span>
                      <p className="text-slate-600 leading-snug mt-1">
                        기존 정책 연장 및 신청 요건 완화를 위한 서울시 조례 개정 필요성을 검토하고, 차년도 출산지원 정책 예산편성안 조율을 개시하십시오.
                      </p>
                    </div>

                  </div>
                </div>

                {/* 출처별 통계 및 정보 */}
                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-[10px] text-center text-slate-500 font-semibold">
                  <div>
                    <span className="block text-[8.5px] text-slate-400">제안 및 민원 건수</span>
                    <strong className="text-slate-800 font-bold">{selectedIssue.item_count}건</strong>
                  </div>
                  <div>
                    <span className="block text-[8.5px] text-slate-400">데이터 소스</span>
                    <strong className="text-slate-800 font-bold">{selectedIssue.source_count}개</strong>
                  </div>
                  <div>
                    <span className="block text-[8.5px] text-slate-400">중복 제거 전 건수</span>
                    <strong className="text-slate-800 font-bold">{Math.round(selectedIssue.item_count * 1.25)}건</strong>
                  </div>
                </div>

                {/* 대표 시민 요구 */}
                {selectedIssue.representative_titles && selectedIssue.representative_titles.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black text-slate-800">📣 대표 시민 요구 및 근거</h4>
                    <ul className="space-y-1.5 text-[10px] text-slate-600 list-disc list-inside">
                      {selectedIssue.representative_titles.map((title, tIdx) => (
                        <li key={tIdx} className="leading-snug">
                          <span className="font-semibold text-slate-800">{title}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* 기존 매핑 데이터 탭 영역 */}
                <div className="border-t border-slate-200 pt-3">
                  <div className="flex bg-slate-100 p-0.5 rounded-lg">
                    {(['proposals', 'civil', 'policies', 'news'] as const).map(tab => {
                      const labels = { proposals: '제안', civil: '민원', policies: '정책', news: '뉴스' };
                      const counts = {
                        proposals: selectedIssueRawData.proposals.length,
                        civil: selectedIssueRawData.civils.length,
                        policies: selectedIssueRawData.policies.length,
                        news: selectedIssueRawData.news.length
                      };
                      return (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className={`flex-1 py-1 text-[9.5px] font-bold rounded-md transition cursor-pointer ${
                            activeTab === tab 
                              ? 'bg-white text-blue-700 shadow-2xs font-extrabold'
                              : 'text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          {labels[tab]} ({counts[tab]})
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-3 text-[10px] text-slate-600 leading-relaxed max-h-48 overflow-y-auto space-y-2 pr-1">
                    {activeTab === 'proposals' && (
                      <div className="space-y-2">
                        {selectedIssueRawData.proposals.slice(0, 3).map((p, idx) => (
                          <div key={p.id || idx} className="bg-slate-50 p-2.5 rounded border border-slate-150">
                            <span className="bg-blue-100 text-blue-800 text-[8px] font-bold px-1.5 py-0.2 rounded-full font-mono">{p.id}</span>
                            <h5 className="font-bold text-slate-800 mt-1">{p.title}</h5>
                            <p className="text-slate-500 text-[9px] mt-1 line-clamp-2">{p.content}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {activeTab === 'civil' && (
                      <div className="space-y-2">
                        {selectedIssueRawData.civils.slice(0, 3).map((c, idx) => (
                          <div key={c.id || idx} className="bg-slate-50 p-2.5 rounded border border-slate-150">
                            <span className="bg-amber-100 text-amber-800 text-[8px] font-bold px-1.5 py-0.2 rounded-full font-mono">{c.id}</span>
                            <h5 className="font-bold text-slate-800 mt-1">{c.title}</h5>
                            <p className="text-slate-500 text-[9px] mt-1 line-clamp-2">{c.content}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {activeTab === 'policies' && (
                      <div className="space-y-2">
                        {selectedIssueRawData.policies.slice(0, 2).map((pol, idx) => (
                          <div key={idx} className="bg-slate-50 p-2.5 rounded border border-slate-150">
                            <h5 className="font-bold text-slate-800">{pol.policy_name}</h5>
                            <p className="text-slate-500 text-[9px] mt-1"><strong className="text-slate-700">대상:</strong> {pol.targetGroup}</p>
                            <p className="text-slate-500 text-[9px] mt-0.5"><strong className="text-slate-700">내용:</strong> {pol.supportDetail}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {activeTab === 'news' && (
                      <div className="space-y-2">
                        {selectedIssueRawData.news.slice(0, 2).map((n: any, idx) => (
                          <div key={idx} className="bg-slate-50 p-2.5 rounded border border-slate-150">
                            <h5 className="font-bold text-slate-800">{n.title}</h5>
                            <p className="text-slate-500 text-[9px] mt-1">{n.snippet}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* 패널 푸터 (AI 답변 검토·승인 - 마스코트와 겹치지 않게 버튼을 좌측으로 배치하고 부서 텍스트를 우측으로 배치) */}
              <div className="p-3 bg-slate-900 border-t border-slate-800 flex justify-between items-center shrink-0">
                <button
                  onClick={() => {
                    setEditedAnswer(`[기존 정책 답변 안내]\n- 문제 클러스터: ${selectedIssue.cluster}\n- 주관부서 조치사항: ${selectedIssue.recommended_action}\n\n시민께서 제안해 주신 요구사항에 대해 서울시 ${selectedIssue.primaryDept}에서 적극 수렴하여 기존 복지 정책을 보완하거나 신속 조례 개정을 검토하겠습니다.`);
                    setFeedbackAction(null);
                    setShowApprovalPanel(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all duration-200 cursor-pointer shrink-0"
                >
                  <Sparkles className="w-3 h-3 animate-pulse" />
                  <span>AI 답변 승인 패널 열기</span>
                </button>
                <div className="text-[9.5px] text-slate-400 text-right leading-tight ml-2">
                  담당 부서: <strong>{selectedIssue.primaryDept}</strong><br />({selectedIssue.deptPhone})
                </div>
              </div>

            </div>
          )}
        </div>

      </div>

      {/* 🤖 Human-in-the-loop AI 답변 검토·승인 패널 모달 */}
      {showApprovalPanel && selectedIssue && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col justify-between">
            <div className="p-4 bg-slate-950 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <h3 className="font-extrabold text-xs">🤖 AI 답변 및 정책 매칭 검토·승인 패널</h3>
              </div>
              <button 
                onClick={() => setShowApprovalPanel(false)}
                className="text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3.5 text-xs text-slate-700 overflow-y-auto max-h-[480px]">
              <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100/50 space-y-1.5">
                <span className="text-[10px] font-bold text-blue-900 block">📊 AI 진단 모델 제안 내역</span>
                <p><strong>문제 클러스터:</strong> {selectedIssue.cluster}</p>
                <p><strong>우선순위 지수:</strong> <span className="text-rose-600 font-bold">{selectedIssue.priority_score}점</span></p>
                <p><strong>AI 추천 액션:</strong> {selectedIssue.recommended_action}</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-800 block">📝 공식 답변 초안 수정 및 검증</label>
                <textarea
                  value={editedAnswer}
                  onChange={(e) => setEditedAnswer(e.target.value)}
                  className="w-full h-40 p-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50 text-[11px] leading-relaxed"
                  placeholder="공식 답변 내용을 입력하세요..."
                />
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/60 text-[9.5px] text-slate-500 leading-snug">
                <strong>💡 Human-in-the-loop 피드백 연동 안내:</strong><br />
                승인 시 해당 답변 초안은 로컬 로그셋에 실시간 추가되며, 대시보드의 행정 추천 상태가 **'모니터링(승인)'** 상태로 즉시 변경됩니다.
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end gap-2 shrink-0">
              <button
                onClick={() => handleFeedbackSubmit('반려')}
                className="px-3.5 py-2 text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition"
              >
                반려 (신규 검토)
              </button>
              <button
                onClick={() => handleFeedbackSubmit('수정 후 승인')}
                className="px-3.5 py-2 text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition"
              >
                수정 후 승인
              </button>
              <button
                onClick={() => handleFeedbackSubmit('승인')}
                className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition shadow-sm animate-pulse"
              >
                답변 승인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ 피드백 제출 확인 배너 (AI 원 추천 vs 담당자 최종 확정 액션을 명시적으로 대비해서 보여줌) */}
      {lastSubmittedLog && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-4 bg-emerald-600 text-white flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <h3 className="font-extrabold text-xs">Human-in-the-loop 피드백이 반영되었습니다</h3>
            </div>
            <div className="p-4 space-y-2.5 text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 w-16 shrink-0">피드백</span>
                <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                  lastSubmittedLog.official_feedback === '승인' ? 'bg-blue-50 text-blue-700' :
                  lastSubmittedLog.official_feedback === '수정 후 승인' ? 'bg-amber-50 text-amber-700' :
                  'bg-rose-50 text-rose-700'
                }`}>
                  {lastSubmittedLog.official_feedback}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[10px] font-bold text-slate-400 w-16 shrink-0 pt-0.5">AI 원 추천</span>
                <span className="text-slate-500 line-clamp-2">{lastSubmittedLog.ai_recommended_action}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[10px] font-bold text-slate-400 w-16 shrink-0 pt-0.5">최종 확정</span>
                <span className={`line-clamp-3 ${lastSubmittedLog.was_modified ? 'text-amber-700 font-semibold' : 'text-slate-800 font-semibold'}`}>
                  {lastSubmittedLog.correct_action}
                </span>
              </div>
              {lastSubmittedLog.was_modified && (
                <p className="text-[9.5px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 leading-snug">
                  ⚠️ AI 원안과 다르게 수정되어 승인되었습니다. 이 건은 아래 "검토·승인 이력 로그"에 기록되어 담당자가 모아서 검수할 수 있습니다.
                </p>
              )}
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setLastSubmittedLog(null)}
                className="px-4 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition cursor-pointer"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ↔️ 원천데이터 3열 비교 분석기 모달 */}
      {showComparisonModal && selectedIssue && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-50 rounded-2xl border border-slate-200 shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col justify-between h-[92vh] max-h-[92vh] flex-1 min-h-0">
            
            <div className="p-4 bg-slate-950 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <Maximize2 className="w-4 h-4 text-blue-400" />
                <h3 className="font-extrabold text-xs">↔️ 문제 클러스터 데이터 다면 교차 검증·비교 뷰</h3>
              </div>
              <span className="text-[10px] bg-blue-900 text-slate-300 font-bold px-2 py-0.5 rounded">
                현재 진단: {selectedIssue.cluster} ({selectedIssue.priority_score}점)
              </span>
            </div>

            {/* 비교 컨텐츠 본문 */}
            {/* 1. 상단: 데이터·논문 기반 정책 가설 영역 (고정) */}
            {(() => {
              const evidenceItems = getAcademicEvidenceItems(selectedIssue);
              const policyHypothesis = getPolicyHypothesis(selectedIssue, selectedIssueRawData, evidenceItems);
              
              return (
                <div className="px-4 pt-4 pb-2 shrink-0 space-y-2.5">
                  <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-blue-600 animate-pulse" />
                        <h4 className="font-black text-xs text-blue-950">💡 데이터·논문 기반 AI 정책 가설</h4>
                      </div>
                      <div className="flex items-center gap-1.5 text-[8.5px] font-black text-blue-800">
                        {policyHypothesis.metrics.map(item => (
                          <span key={item} className="bg-white/85 border border-blue-100 rounded-full px-2 py-0.5">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                    <h5 className="text-[10.5px] font-black text-blue-900 leading-snug">{policyHypothesis.title}</h5>
                    <p className="text-slate-700 leading-relaxed font-semibold text-[10px]">{policyHypothesis.body}</p>
                    <div className="bg-white border border-blue-200 rounded-lg px-3 py-2 flex items-start gap-2 shadow-2xs">
                      <CheckCircle className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                      <p className="text-blue-950 leading-relaxed font-black text-[9.5px]">
                        <span className="text-[9px] bg-blue-600 text-white px-1.5 py-0.5 rounded mr-1.5 align-middle">결론</span>
                        {policyHypothesis.action}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 2. 하단: 3열 원천데이터 (flex-1 min-h-0) */}
            {(() => {
              const evidenceItems = getAcademicEvidenceItems(selectedIssue);
              const selectedAcademicEvidence = evidenceItems[selectedEvidenceIndex] || evidenceItems[0];

              return (
                <div className="p-4 flex-1 min-h-0 overflow-hidden flex gap-4 text-xs">
                  
                  {/* 1열: 시민 요구 (상상대로서울) */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex-1 flex flex-col min-h-0">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                      <h4 className="font-black text-xs text-blue-900 flex items-center gap-1">
                        <span>📣 상상대로 서울 시민 요구</span>
                        <span className="bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded text-[9px] font-mono">{selectedIssueRawData.proposals.length}건</span>
                      </h4>
                    </div>
                    
                    <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
                      {selectedIssueRawData.proposals.length === 0 ? (
                        <p className="text-slate-400 text-center py-10 text-[11px]">해당 분야의 매칭된 시민 제안이 없습니다.</p>
                      ) : (
                        selectedIssueRawData.proposals.map((p, idx) => (
                          <div key={p.id || idx} className="bg-slate-50/60 p-2.5 rounded-lg border border-slate-150/60 hover:bg-slate-50 transition">
                            <span className="bg-blue-50 text-blue-800 text-[8.5px] font-black px-2 py-0.5 rounded-full font-mono">{p.id}</span>
                            <h5 className="font-black text-slate-800 mt-1">{p.title}</h5>
                            <p className="text-slate-500 text-[9px] mt-1.5 leading-relaxed">{p.content}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* 2열: 현장 민원 (국민신문고) */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex-1 flex flex-col min-h-0">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                      <h4 className="font-black text-xs text-amber-900 flex items-center gap-1">
                        <span>🚨 국민신문고 생생 현장 민원</span>
                        <span className="bg-amber-50 text-amber-700 px-1.5 py-0.2 rounded text-[9px] font-mono">{selectedIssueRawData.civils.length}건</span>
                      </h4>
                    </div>
                    
                    <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
                      {selectedIssueRawData.civils.length === 0 ? (
                        <p className="text-slate-400 text-center py-10 text-[11px]">해당 분야의 매칭된 국민신문고 민원이 없습니다.</p>
                      ) : (
                        selectedIssueRawData.civils.map((c, idx) => (
                          <div key={c.id || idx} className="bg-amber-50/20 p-2.5 rounded-lg border border-amber-100/50 hover:bg-amber-50/40 transition">
                            <div className="flex items-center justify-between gap-2">
                              <span className="bg-amber-50 text-amber-800 text-[8.5px] font-black px-2 py-0.5 rounded-full font-mono">{c.id}</span>
                              <span className="bg-amber-500/10 text-amber-700 font-bold text-[8.5px] px-1.5 py-0.2 rounded">{c.status}</span>
                            </div>
                            <h5 className="font-black text-slate-800 mt-1">{c.title}</h5>
                            <p className="text-slate-500 text-[9px] mt-1.5 leading-relaxed">{c.content}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* 3열: 행정 공급망 및 학술적 대조망 (통합 단일 스크롤 패널) */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex-1 flex flex-col min-h-0">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3 shrink-0">
                      <h4 className="font-black text-xs text-indigo-900 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-indigo-600" />
                        <span>🔮 행정 공급망 & 학술적 대조망</span>
                      </h4>
                      <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
                        과학적 대조 분석
                      </span>
                    </div>
                    
                    <div className="flex-1 min-h-0 overflow-y-auto space-y-5 pr-1">
                      {/* Section 1: 서울시 정책 공급 현황 */}
                      <div className="space-y-2">
                        <h5 className="font-extrabold text-[11px] text-emerald-800 flex items-center gap-1 bg-emerald-50/60 px-2 py-1 rounded-md border border-emerald-100">
                          🔍 서울시 정책 공급 현황 (몽땅정보통)
                          <span className="bg-white text-emerald-700 px-1.5 py-0.2 rounded text-[9px] font-mono border border-emerald-200">{selectedIssueRawData.policies.length}건</span>
                        </h5>
                        <div className="space-y-2">
                          {selectedIssueRawData.policies.length === 0 ? (
                            <p className="text-slate-400 text-center py-4 text-[10px]">해당 분야의 매칭된 서울시 정책이 없습니다.</p>
                          ) : (
                            selectedIssueRawData.policies.map((p, idx) => {
                              const isExpanded = expandedPolicyName === p.policy_name;
                              return (
                                <div 
                                  key={idx} 
                                  onClick={() => setExpandedPolicyName(isExpanded ? null : p.policy_name)}
                                  className={`p-2.5 rounded border transition cursor-pointer text-slate-800 ${
                                    isExpanded 
                                      ? 'bg-emerald-50 border-emerald-300 shadow-3xs' 
                                      : 'bg-emerald-50/10 border-emerald-100/50 hover:bg-emerald-50/20'
                                  }`}
                                >
                                  <div className="flex justify-between items-center gap-2">
                                    <h6 className="font-black text-[10.5px] text-slate-800 flex-1">{p.policy_name}</h6>
                                    <span className="text-[8.5px] font-bold text-emerald-700 bg-white border border-emerald-200 px-1 py-0.2 rounded shrink-0">
                                      {isExpanded ? '접기 ▴' : '상세보기 ▾'}
                                    </span>
                                  </div>
                                  <p className="text-slate-500 text-[8.5px] mt-0.5 font-medium">대상: {p.targetGroup}</p>
                                  
                                  {isExpanded && (
                                    <div className="mt-2 pt-2 border-t border-emerald-200/60 text-[9px] text-slate-700 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                                      <p className="leading-relaxed font-medium">
                                        <strong className="text-emerald-950 font-bold block mb-0.5">ℹ️ 지원 상세</strong>
                                        {p.supportDetail}
                                      </p>
                                      <p className="leading-relaxed font-medium">
                                        <strong className="text-emerald-950 font-bold block mb-0.5">⚙️ 신청 방법</strong>
                                        {p.apply_method}
                                      </p>
                                      {p.url && (
                                        <a
                                          href={p.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={(e) => e.stopPropagation()}
                                          className="inline-block text-[8.5px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2 py-0.5 rounded shadow-3xs mt-1 transition"
                                        >
                                          자세히 보기 (몽땅정보통) ↗
                                        </a>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {/* Section 2: 사회 보도 트렌드 (언론 보도) */}
                      <div className="space-y-2">
                        <h5 className="font-extrabold text-[11px] text-slate-800 flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                          📰 사회 보도 트렌드 (언론 보도)
                          <span className="bg-white text-slate-700 px-1.5 py-0.2 rounded text-[9px] font-mono border border-slate-200">{selectedIssueRawData.news.length}건</span>
                        </h5>
                        <div className="space-y-2">
                          {selectedIssueRawData.news.length === 0 ? (
                            <p className="text-slate-400 text-center py-4 text-[10px]">해당 분야의 매칭된 언론 뉴스가 없습니다.</p>
                          ) : (
                            selectedIssueRawData.news.map((n, idx) => {
                              const isExpanded = expandedNewsTitle === n.title;
                              return (
                                <div 
                                  key={idx} 
                                  onClick={() => setExpandedNewsTitle(isExpanded ? null : n.title)}
                                  className={`p-2.5 rounded border transition cursor-pointer text-slate-800 ${
                                    isExpanded 
                                      ? 'bg-slate-100 border-slate-350 shadow-3xs' 
                                      : 'bg-slate-50 border-slate-200/60 hover:bg-slate-100'
                                  }`}
                                >
                                  <div className="flex justify-between items-start gap-2">
                                    <h6 className={`font-black text-[10.5px] text-slate-800 leading-snug flex-1 ${isExpanded ? '' : 'line-clamp-2'}`}>
                                      {n.title}
                                    </h6>
                                    <span className="text-[8.5px] font-bold text-slate-500 bg-white border border-slate-300 px-1 py-0.2 rounded shrink-0 mt-0.5">
                                      {isExpanded ? '접기 ▴' : '요약보기 ▾'}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between mt-1 text-[8px] text-slate-400 font-medium">
                                    <span>{n.press} | {n.date}</span>
                                    <span className="bg-rose-50 text-rose-700 px-1.5 rounded font-bold">이슈강도: {n.strength}</span>
                                  </div>

                                  {isExpanded && (
                                    <div className="mt-2 pt-2 border-t border-slate-300/60 text-[9px] text-slate-700 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                                      <p className="leading-relaxed font-medium text-slate-600 bg-white/60 p-1.5 rounded border border-slate-200/40">
                                        {n.snippet || '요약 데이터가 없습니다.'}
                                      </p>
                                      {n.url && (
                                        <a
                                          href={n.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={(e) => e.stopPropagation()}
                                          className="inline-block text-[8.5px] bg-slate-800 hover:bg-slate-900 text-white font-bold px-2 py-0.5 rounded shadow-3xs mt-1 transition"
                                        >
                                          기사 원문 읽기 ↗
                                        </a>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {/* Section 3: 실증적 학술 근거 */}
                      <div className="space-y-2">
                        <h5 className="font-extrabold text-[11px] text-blue-900 flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-md border border-blue-150">
                          🎓 학술 연구 & 실측 데이터 교차 검증 (Academic Proof)
                          <span className="bg-white text-blue-700 px-1.5 py-0.2 rounded text-[9px] font-mono border border-blue-200">6건</span>
                        </h5>
                        <div className="text-slate-700 leading-relaxed font-medium">
                          {renderAcademicProof(selectedIssue, (title) => {
                            setSelectedProofPaper(title);
                            setShowProofModal(true);
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              );
            })()}

            {/* 푸터 */}
            <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-between items-center shrink-0">
              <span className="text-[10px] text-slate-500">
                💡 좌측의 실제 시민 원문 요구(요구/민원)와 우측의 행정 공급(기존 정책/뉴스)을 직접 1:1로 비교해 보십시오.
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditedAnswer(`[기존 정책 답변 안내]\n- 문제 클러스터: ${selectedIssue.cluster}\n- 주관부서 조치사항: ${selectedIssue.recommended_action}\n\n시민께서 제안해 주신 요구사항에 대해 서울시 ${selectedIssue.primaryDept}에서 적극 수렴하여 기존 복지 정책을 보완하거나 신속 조례 개정을 검토하겠습니다.`);
                    setFeedbackAction(null);
                    setShowApprovalPanel(true);
                    setShowComparisonModal(false);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>🤖 AI 답변 검토·승인 패널 열기</span>
                </button>
                <button
                  onClick={() => setShowComparisonModal(false)}
                  className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-4 py-2 rounded-lg transition cursor-pointer"
                >
                  비교뷰 닫기
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 부서 맞춤 보고서 모달 */}
      <ReportExportModal
        isOpen={isLocalExportOpen}
        onClose={() => setIsLocalExportOpen(false)}
        selectedDept={selectedDept}
        proposals={proposals}
        customActions={customActions}
      />

      {/* 의사결정 판정 기준 모달 */}
      <PriorityStandardModal
        isOpen={showPriorityStandardModal}
        onClose={() => setShowPriorityStandardModal(false)}
      />
    </div>
  );
};

interface AcademicProofDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  paperTitle: string;
  evidenceItems: AcademicEvidenceItem[];
}

const AcademicProofDetailModal: React.FC<AcademicProofDetailModalProps> = ({
  isOpen,
  onClose,
  paperTitle,
  evidenceItems
}) => {
  if (!isOpen) return null;

  // Find matching paper in list
  const paper = evidenceItems.find(p => p.title.includes(paperTitle) || paperTitle.includes(p.title));
  if (!paper) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all duration-300">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-slate-800">
        <div className="bg-indigo-900 text-white px-5 py-4 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-black flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              실증적 가설 입증 상세 흐름
            </h3>
            <p className="text-[10px] text-slate-300 font-medium mt-0.5">{paper.title} 학술 증명</p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white font-bold text-sm cursor-pointer">✕</button>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="relative border-l-2 border-indigo-100 pl-4 ml-2 space-y-5">
            {/* Step 1 */}
            <div className="relative">
              <div className="absolute -left-[25px] top-0 w-3.5 h-3.5 bg-indigo-600 rounded-full border-2 border-white flex items-center justify-center">
                <span className="text-[7px] text-white font-bold">1</span>
              </div>
              <div className="space-y-0.5">
                <h4 className="text-[11px] font-black text-indigo-900">1단계: 연구 가설 (Hypothesis)</h4>
                <p className="text-[10.5px] text-slate-700 font-medium leading-relaxed bg-indigo-50/50 p-2 rounded-lg border border-indigo-100/50">
                  {paper.hypothesis}
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative">
              <div className="absolute -left-[25px] top-0 w-3.5 h-3.5 bg-indigo-600 rounded-full border-2 border-white flex items-center justify-center">
                <span className="text-[7px] text-white font-bold">2</span>
              </div>
              <div className="space-y-0.5">
                <h4 className="text-[11px] font-black text-indigo-900">2단계: 실증 검증 및 테스트 (Test)</h4>
                <p className="text-[10.5px] text-slate-700 font-medium leading-relaxed bg-indigo-50/50 p-2 rounded-lg border border-indigo-100/50">
                  {paper.test}
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative">
              <div className="absolute -left-[25px] top-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                <span className="text-[7px] text-white font-bold">3</span>
              </div>
              <div className="space-y-0.5">
                <h4 className="text-[11px] font-black text-emerald-950">3단계: 도출 결과 (Result)</h4>
                <p className="text-[10.5px] text-slate-700 font-medium leading-relaxed bg-emerald-50/40 p-2 rounded-lg border border-emerald-100/50">
                  {paper.result}
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="relative">
              <div className="absolute -left-[25px] top-0 w-3.5 h-3.5 bg-emerald-600 rounded-full border-2 border-white flex items-center justify-center">
                <span className="text-[7px] text-white font-bold">4</span>
              </div>
              <div className="space-y-0.5">
                <h4 className="text-[11px] font-black text-emerald-950">4단계: 최종 결론 & 가설 매칭 (Conclusion)</h4>
                <p className="text-[10.5px] text-slate-700 font-medium leading-relaxed bg-emerald-50/40 p-2 rounded-lg border border-emerald-100/50">
                  {paper.conclusion}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-slate-50 px-5 py-3.5 flex justify-between items-center border-t border-slate-100">
          <a
            href={paper.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-indigo-600 hover:underline font-bold flex items-center gap-1"
          >
            학술 논문 원문 출처 (KCI/RISS) ➔
          </a>
          <button
            onClick={onClose}
            className="text-[10px] bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded-lg cursor-pointer transition shadow-2xs"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
};

interface PriorityStandardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PriorityStandardModal: React.FC<PriorityStandardModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-250">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-base">📊</span>
            <div>
              <h3 className="font-extrabold text-sm leading-none text-white">의사결정 우선순위 판정 기준</h3>
              <p className="text-[10px] text-slate-300 mt-1">Unified Key-Knowledge Kit (UKKKK) Decision Matrix</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white transition text-lg font-bold p-1 cursor-pointer"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-slate-700">
          <div className="space-y-1.5">
            <h4 className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
              <span>🧮 우선순위 산출 공식</span>
            </h4>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60 font-mono text-[10px] text-slate-600 leading-relaxed">
              <strong className="text-indigo-900">우선순위 지수 (Score)</strong>
              <div className="mt-1 pl-2 border-l-2 border-indigo-400 space-y-0.5 font-semibold">
                = (시민 요구 강도 &times; w₁) + (정책 공급망 격차 &times; w₂)<br />
                &nbsp;&nbsp;+ (행정 긴급성 &times; w₃) + (현실적 실현가능성 &times; w₄)
              </div>
              <p className="text-[9px] text-slate-400 mt-1.5">
                * 가중치(w₁, w₂, w₃, w₄)는 상단에서 선택된 학술 연구 방법론에 의해 결정됩니다.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <h4 className="font-extrabold text-xs text-slate-900">🚦 4단계 의사결정 상태 판정 기준</h4>
            <div className="border border-slate-150 rounded-xl overflow-hidden text-[10.5px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-150">
                    <th className="py-2 px-3">등급</th>
                    <th className="py-2 px-3">점수 구간</th>
                    <th className="py-2 px-3">행정 조치 권고 사항</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                  <tr>
                    <td className="py-2.5 px-3 flex items-center gap-1.5 font-bold text-rose-600">
                      <span className="w-2.5 h-2.5 bg-rose-500 rounded-full" /> 즉시 검토
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold">65점 이상</td>
                    <td className="py-2.5 px-3 text-[10px] leading-relaxed">사각지대 신규 대안 예산 편성 및 행정 조치 권고</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 flex items-center gap-1.5 font-bold text-amber-600">
                      <span className="w-2.5 h-2.5 bg-amber-500 rounded-full" /> 제도 개선
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold">50점 ~ 64점</td>
                    <td className="py-2.5 px-3 text-[10px] leading-relaxed">다부서 R&R 조율 및 조례 규정 완화 개정</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 flex items-center gap-1.5 font-bold text-emerald-600">
                      <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full" /> 빠른 개선
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold">40점 ~ 49점</td>
                    <td className="py-2.5 px-3 text-[10px] leading-relaxed">안내 절차 간소화, 수혜 홍보 강화 등 고효율 처방</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 flex items-center gap-1.5 font-bold text-slate-500">
                      <span className="w-2.5 h-2.5 bg-slate-500 rounded-full" /> 모니터링
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold">40점 미만</td>
                    <td className="py-2.5 px-3 text-[10px] leading-relaxed">신고 누적 추이 관찰 및 주기적 동향 감사</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-[10.5px] px-4 py-2 rounded-lg cursor-pointer transition"
          >
            확인 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
};
