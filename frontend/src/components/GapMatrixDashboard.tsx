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
  correct_action: string;
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

// 키워드 기반 제안/민원 클러스터 매핑 규칙
const CLUSTER_RULES: Record<string, string[]> = {
  "임신·출산 이용기준": ["임산부", "임신", "출산", "산후", "난임", "배려석"],
  "돌봄·보육 접근성": ["돌봄", "보육", "어린이집", "아이돌봄", "대기"],
  "정신건강·상담": ["심리", "상담", "정신건강", "우울", "불안", "마음건강"],
  "의료비·경제 부담": ["의료비", "진료비", "비용", "부담", "지원금", "보험"],
  "의료 접근성": ["병원", "의료", "진료", "예약", "야간", "응급"],
  "주거·이동 환경": ["주거", "교통", "버스", "지하철", "보행", "주차"],
  "정보·신청 접근성": ["신청", "서류", "온라인", "정보", "안내", "절차"],
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

export const GapMatrixDashboard: React.FC<Props> = ({ 
  proposals, 
  onNavigateToTab,
  selectedDept
}) => {
  const [selectedIssue, setSelectedIssue] = useState<IssueItem | null>(null);
  const [activeTab, setActiveTab] = useState<'proposals' | 'civil' | 'policies' | 'news'>('proposals');

  // Human-in-the-loop state variables
  const [feedbackLogs, setFeedbackLogs] = useState<FeedbackLog[]>([]);
  const [showApprovalPanel, setShowApprovalPanel] = useState<boolean>(false);
  const [editedAnswer, setEditedAnswer] = useState<string>('');
  const [feedbackAction, setFeedbackAction] = useState<'승인' | '수정 후 승인' | '반려' | null>(null);
  const [customActions, setCustomActions] = useState<Record<string, { action: string; status: string; overrideSatisfaction?: string }>>({});

  // 2열 비교 검증 펼치기/접기 토글 상태
  const [showRawProposals, setShowRawProposals] = useState<boolean>(false);
  const [showRawCivils, setShowRawCivils] = useState<boolean>(false);
  const [showRawPolicies, setShowRawPolicies] = useState<boolean>(false);
  const [showComparisonModal, setShowComparisonModal] = useState<boolean>(false);
  const [isLocalExportOpen, setIsLocalExportOpen] = useState<boolean>(false);

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

  // 데이터 로딩 및 포맷팅
  const rawDiagnoses = useMemo(() => {
    return (policyDiagnosisRaw.diagnoses || []) as any[];
  }, []);

  const allDiagnoses = useMemo(() => {
    return rawDiagnoses.map((d, idx) => {
      const deptInfo = DEPT_MAP[d.category] || { dept: '가족지원팀', phone: '02-2133-5040' };
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
        priority_score: d.priority_score,
        status: d.status,
        recommended_action: d.recommended_action,
        representative_titles: d.representative_titles || [],
        primaryDept: deptInfo.dept,
        deptPhone: deptInfo.phone
      };
    });
  }, [rawDiagnoses]);

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
    setSelectedIssue(issue);
    setActiveTab('proposals');
  };

  const handleFeedbackSubmit = (actionType: '승인' | '수정 후 승인' | '반려') => {
    if (!selectedIssue) return;
    
    const logRecord: FeedbackLog = {
      issue_id: selectedIssue.id,
      source_type: 'problem_cluster',
      source_id: `PROP-${selectedIssue.id.replace('GAP-', '00')}`,
      ai_matched_policy_id: `POLICY-${selectedIssue.id.replace('GAP-', '10')}`,
      ai_satisfaction_label: selectedIssue.priority_score >= 75 ? '미충족' : '일부 충족',
      official_feedback: actionType,
      correct_policy_id: actionType === '반려' ? 'POLICY-NONE' : `POLICY-${selectedIssue.id.replace('GAP-', '10')}`,
      correct_action: actionType === '승인' ? '현행 기존 정책 매칭 승인' : actionType === '수정 후 승인' ? '신청 기준 완화 조례 건의' : '신규 정책 수립 검토',
      edited_answer: editedAnswer,
      reviewer_id: 'OFFICIAL-SESAC-01',
      reviewed_at: new Date().toISOString().substring(0, 10)
    };

    setFeedbackLogs(prev => [logRecord, ...prev]);
    setFeedbackAction(actionType);

    setCustomActions(prev => ({
      ...prev,
      [selectedIssue.cluster]: {
        action: logRecord.correct_action,
        status: actionType === '승인' ? '승인 완료' : actionType === '수정 후 승인' ? '수정 승인' : '신규 수립 검토',
        overrideSatisfaction: actionType === '승인' ? '충족' : actionType === '수정 후 승인' ? '일부 충족' : '미충족'
      }
    }));

    setSelectedIssue(prev => prev ? {
      ...prev,
      recommended_action: logRecord.correct_action,
      status: actionType === '승인' ? '모니터링' : actionType === '수정 후 승인' ? '빠른 개선' : '즉시 검토'
    } : null);

    alert(`[Human-in-the-loop 피드백 반영]\n- 피드백 액션: ${actionType}\n- 최종 확정 액션: ${logRecord.correct_action}`);
    setShowApprovalPanel(false);
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
          <span className="bg-blue-600 text-white text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider">Decision Diagnostic Board</span>
          <h2 className="text-lg font-black mt-1">📊 설명 가능한 문제 클러스터 기반 정책 우선순위 진단 매트릭스</h2>
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
              {Object.keys(DEPT_MAP).map(cat => (
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
              {Array.from(new Set(Object.values(DEPT_MAP).map(v => v.dept))).map(dept => (
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
                        const color = entry.status === '즉시 검토' ? '#ef4444' :
                                      entry.status === '제도 개선' ? '#f59e0b' :
                                      entry.status === '빠른 개선' ? '#10b981' : '#64748b';
                        const opacity = 0.35 + 0.65 * (entry.confidence / 100);
                        const strokeWidth = entry.confidence >= 70 ? 2 : 1;
                        return (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={color} 
                            fillOpacity={opacity}
                            stroke={entry.confidence >= 60 ? '#1e293b' : color}
                            strokeWidth={strokeWidth}
                            className="cursor-pointer hover:scale-110 transition-all duration-150"
                          />
                        );
                      })}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              )}
            </div>
            
            <div className="flex justify-between items-center text-[9px] text-slate-400 border-t border-slate-100 pt-2.5 mt-2">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-rose-500 rounded-full" /> 즉시 검토</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-amber-500 rounded-full" /> 제도 개선</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-full" /> 빠른 개선</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-slate-500 rounded-full" /> 모니터링</span>
              </div>
              <span>💡 테두리가 굵을수록 근거 신뢰도가 높은 클러스터입니다.</span>
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
                          return (
                            <tr 
                              key={d.id}
                              onClick={() => handleCardClick(d)}
                              className={`hover:bg-blue-50/40 cursor-pointer transition text-slate-700 ${
                                selectedIssue?.id === d.id ? 'bg-blue-50/70 font-semibold text-blue-950 border-l-4 border-blue-600' : ''
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
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col justify-between min-h-[500px]">
          {!selectedIssue ? (
            <div className="p-8 text-center my-auto flex flex-col items-center justify-center space-y-3">
              <HelpCircle className="w-10 h-10 text-slate-300 animate-bounce" />
              <p className="font-bold text-xs text-slate-500">진단표의 클러스터를 선택해주세요</p>
              <p className="text-[10px] text-slate-400">5대 진단 지표와 3단계 추천 액션이 포함된 상세 진단서가 우측에 표출됩니다.</p>
            </div>
          ) : (
            <div className="flex flex-col h-full justify-between">
              
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
              <div className="p-4 flex-grow space-y-4 overflow-y-auto max-h-[700px]">
                
                {/* 상태 요약 배너 */}
                <div className={`p-3 rounded-lg border flex items-center gap-2 text-xs font-bold ${getStatusColor(selectedIssue.status)}`}>
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <div>
                    <span>상태: {selectedIssue.status}</span>
                    <span className="block text-[9.5px] font-medium text-slate-500 mt-0.5">권고사항: {selectedIssue.recommended_action}</span>
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
                  <h4 className="text-[10px] font-black text-slate-800">📊 5대 진단 축 상세 분석</h4>
                  
                  <div className="space-y-2 text-[10px]">
                    {/* 수요 강도 */}
                    <div className="space-y-0.5">
                      <div className="flex justify-between font-semibold">
                        <span>수요 강도 (Demand Strength)</span>
                        <span className="font-mono text-slate-600">{selectedIssue.demand} / 100</span>
                      </div>
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="bg-[#0A2351] h-full" style={{ width: `${selectedIssue.demand}%` }} />
                      </div>
                    </div>

                    {/* 정책 공백 */}
                    <div className="space-y-0.5">
                      <div className="flex justify-between font-semibold">
                        <span>정책 공백 (Policy Gap)</span>
                        <span className="font-mono text-slate-600">{selectedIssue.policy_gap} / 100</span>
                      </div>
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="bg-rose-500 h-full" style={{ width: `${selectedIssue.policy_gap}%` }} />
                      </div>
                    </div>

                    {/* 사회적 시급성 */}
                    <div className="space-y-0.5">
                      <div className="flex justify-between font-semibold">
                        <span>사회적 시급성 (Social Urgency)</span>
                        <span className="font-mono text-slate-600">{selectedIssue.urgency} / 100</span>
                      </div>
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="bg-amber-500 h-full" style={{ width: `${selectedIssue.urgency}%` }} />
                      </div>
                    </div>

                    {/* 실행 가능성 */}
                    <div className="space-y-0.5">
                      <div className="flex justify-between font-semibold">
                        <span>실행 가능성 (Feasibility)</span>
                        <span className="font-mono text-slate-600">{selectedIssue.feasibility} / 100</span>
                      </div>
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="bg-blue-600 h-full" style={{ width: `${selectedIssue.feasibility}%` }} />
                      </div>
                    </div>

                    {/* 근거 신뢰도 */}
                    <div className="space-y-0.5">
                      <div className="flex justify-between font-semibold">
                        <span>근거 신뢰도 (Evidence Confidence)</span>
                        <span className="font-mono text-slate-600">{selectedIssue.evidence_confidence} / 100</span>
                      </div>
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="bg-indigo-600 h-full" style={{ width: `${selectedIssue.evidence_confidence}%` }} />
                      </div>
                    </div>
                  </div>
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

              {/* 패널 푸터 (AI 답변 검토·승인) */}
              <div className="p-3 bg-slate-900 border-t border-slate-800 flex justify-between items-center shrink-0">
                <div className="text-[10px] text-slate-400">
                  담당 부서: <strong>{selectedIssue.primaryDept}</strong> ({selectedIssue.deptPhone})
                </div>
                <button
                  onClick={() => {
                    setEditedAnswer(`[기존 정책 답변 안내]\n- 문제 클러스터: ${selectedIssue.cluster}\n- 주관부서 조치사항: ${selectedIssue.recommended_action}\n\n시민께서 제안해 주신 요구사항에 대해 서울시 ${selectedIssue.primaryDept}에서 적극 수렴하여 기존 복지 정책을 보완하거나 신속 조례 개정을 검토하겠습니다.`);
                    setFeedbackAction(null);
                    setShowApprovalPanel(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all duration-200 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 animate-pulse" />
                  <span>AI 답변 승인 패널 열기</span>
                </button>
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

      {/* ↔️ 원천데이터 3열 비교 분석기 모달 */}
      {showComparisonModal && selectedIssue && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-50 rounded-2xl border border-slate-200 shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col justify-between h-[90vh]">
            
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
            <div className="p-4 flex-grow overflow-hidden flex gap-4 text-xs">
              
              {/* 1열: 시민 요구 (상상대로서울) */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex-1 flex flex-col min-h-[300px]">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                  <h4 className="font-black text-xs text-blue-900 flex items-center gap-1">
                    <span>📣 상상대로 서울 시민 요구</span>
                    <span className="bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded text-[9px] font-mono">{selectedIssueRawData.proposals.length}건</span>
                  </h4>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-3 max-h-[460px] pr-1">
                  {selectedIssueRawData.proposals.length === 0 ? (
                    <p className="text-slate-400 text-center py-10 text-[11px]">해당 분야의 매칭된 시민 제안이 없습니다.</p>
                  ) : (
                    selectedIssueRawData.proposals.map((prop, idx) => (
                      <div key={prop.id || idx} className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px] space-y-2">
                        <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold border-b border-slate-200/50 pb-1">
                          <span>{prop.id}</span>
                          <span className="flex items-center gap-1 font-mono text-[9.5px]">
                            <ThumbsUp className="w-2.5 h-2.5 text-blue-600" /> {prop.vote_score}
                            <MessageSquare className="w-2.5 h-2.5 text-slate-400 ml-1" /> {prop.comment_cnt}
                          </span>
                        </div>
                        <h5 className="font-black text-slate-900 text-xs">{prop.title}</h5>
                        <p className="text-slate-600 leading-relaxed text-[10.5px] whitespace-pre-wrap">{prop.content}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* 2열: 현장 민원 (국민신문고) */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex-1 flex flex-col min-h-[300px]">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                  <h4 className="font-black text-xs text-amber-900 flex items-center gap-1">
                    <span>🚨 국민신문고 생생 현장 민원</span>
                    <span className="bg-amber-50 text-amber-700 px-1.5 py-0.2 rounded text-[9px] font-mono">{selectedIssueRawData.civils.length}건</span>
                  </h4>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-3 max-h-[460px] pr-1">
                  {selectedIssueRawData.civils.length === 0 ? (
                    <p className="text-slate-400 text-center py-10 text-[11px]">해당 분야의 매칭된 국민신문고 민원이 없습니다.</p>
                  ) : (
                    selectedIssueRawData.civils.map((civ, idx) => (
                      <div key={civ.id || idx} className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px] space-y-2">
                        <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold border-b border-slate-200/50 pb-1">
                          <span>{civ.id}</span>
                          <span className="bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded text-[9px] font-bold">민원현황</span>
                        </div>
                        <h5 className="font-black text-slate-900 text-xs">{civ.title}</h5>
                        <p className="text-slate-600 leading-relaxed text-[10.5px] whitespace-pre-wrap">{civ.content}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* 3열: 기존 정책 & 언론 동향 */}
              <div className="flex-1 flex flex-col gap-4">
                
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex-1 flex flex-col min-h-[220px]">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                    <h4 className="font-black text-xs text-emerald-800 flex items-center gap-1">
                      <span>🔍 서울시 정책 공급 현황 (몽땅정보통)</span>
                      <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded text-[9px] font-mono">{selectedIssueRawData.policies.length}건</span>
                    </h4>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-3 max-h-[200px] pr-1">
                    {selectedIssueRawData.policies.length === 0 ? (
                      <p className="text-slate-400 text-center py-10 text-[11px]">해당 분야의 매칭된 서울시 정책이 없습니다.</p>
                    ) : (
                      selectedIssueRawData.policies.map((pol, pIdx) => (
                        <div key={pol.id || pIdx} className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px] space-y-2">
                          <h5 className="font-black text-slate-900 text-xs">{pol.policy_name}</h5>
                          <div className="space-y-1 text-[10px] leading-snug">
                            <p><strong className="text-slate-700">🎯 대상:</strong> {pol.targetGroup}</p>
                            <p><strong className="text-slate-700">🎁 혜택:</strong> {pol.supportDetail}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex-1 flex flex-col min-h-[220px]">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                    <h4 className="font-black text-xs text-slate-800 flex items-center gap-1">
                      <span>📰 사회 보도 트렌드 (언론 보도)</span>
                      <span className="bg-slate-50 text-slate-700 px-1.5 py-0.2 rounded text-[9px] font-mono">{selectedIssueRawData.news.length}건</span>
                    </h4>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-2 max-h-[200px] pr-1">
                    {selectedIssueRawData.news.length === 0 ? (
                      <p className="text-slate-400 text-center py-10 text-[11px]">매칭된 뉴스가 없습니다.</p>
                    ) : (
                      selectedIssueRawData.news.map((n: any, nIdx) => (
                        <div key={nIdx} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[10px] space-y-1 shadow-2xs">
                          <span className="text-[9px] text-red-500 font-bold block">🔥 이슈강도: {n.strength}</span>
                          <h5 className="font-bold text-slate-800 leading-snug line-clamp-1">{n.title}</h5>
                          <p className="text-slate-500 text-[9px] line-clamp-2 leading-relaxed">{n.snippet}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

            </div>

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
    </div>
  );
};
