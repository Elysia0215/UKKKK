import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Database,
  Sparkles,
  MapPin,
  Search,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  Layers,
  ArrowRight,
  Zap,
  Play,
  Globe,
  ChevronDown,
  ChevronUp,
  Filter,
  ExternalLink,
  CheckSquare,
  Square,
  Save,
  FileText,
  Trash2,
  Clock
} from 'lucide-react';
import { PolicyProposal } from '../types';
import { DISTRICT_KEYWORDS, AMBIGUOUS_DISTRICT_KEYWORDS, inferDistrict } from '../utils/textMining';

// 카테고리 키워드 매핑
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  '임신·난임·생식건강': ['난임', '임신', '산전', '생식', '불임', '시험관', '인공수정', '착상', '배란', '정자', '난자', '산부인과', '임산부'],
  '출산·산후 초기지원': ['출산', '산후', '산모', '분만', '출생', '신생아', '첫만남', '축하금', '출산장려', '출산휴가'],
  '보육·돌봄 인프라': ['어린이집', '유치원', '돌봄', '보육', '유아', '영아', '아이돌봄', '키즈카페', '놀이터', '야간돌봄', '긴급돌봄', '방과후'],
  '다자녀·양육비·생활지원': ['다자녀', '다둥이', '양육', '아동수당', '육아', '양육비', '생활비', '급식비', '교육비'],
  '주거·교통·도시생활환경': ['주거', '아파트', '임대', '전세', '월세', '교통', '지하철', '버스', '주차', '통학', '안전', '놀이시설', 'CCTV'],
  '일·가정 양립·부모 노동': ['육아휴직', '출산휴가', '재택', '유연근무', '맞벌이', '워킹맘', '경력단절', '일가정', '돌봄휴가'],
  '취약·다양가족 사각지대': ['한부모', '다문화', '미혼모', '장애', '저소득', '기초생활', '위기임산부', '긴급복지', '학대'],
  '정보·상담·교육·거버넌스': ['정보', '상담', '교육', '부모교육', '임산부교실', '온라인', '앱', '플랫폼', '통합', '원스톱'],
};

// 데이터 소스 정보
const DATA_SOURCES = [
  { name: '상상대로 서울', icon: '📣', count: '824건', desc: '시민 정책 제안', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { name: '몽땅정보통', icon: '🏛️', count: '322건', desc: '서울시 공식 정책', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { name: '국민신문고', icon: '📋', count: '582건', desc: '시민 민원 데이터', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { name: '네이버 뉴스', icon: '📰', count: '1,145건', desc: '출산·보육 뉴스', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { name: 'KOSIS 통계', icon: '📊', count: '25개구', desc: '인구동향 공공 통계', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
];

interface Props {
  proposals: PolicyProposal[];
  onApply?: (updates: Array<{ id: string; district: string; category: string }>) => void;
}

interface BatchResult {
  proposal: PolicyProposal;
  district: string;
  category: string;
  confidence: number;
  keywords: string[];
  status: '복원 성공' | '복원 불가';
  matchedSources: string[];
}

// 로컬 규칙 기반 추정 엔진 (공통 유틸 사용)
const localImpute = (text: string): { district: string; category: string; confidence: number; keywords: string[]; matchedSources: string[]; status: '복원 성공' | '복원 불가' } => {
  // 자치구 추정 (공통 유틸)
  const distResult = inferDistrict(text);
  const foundKeywords = [...distResult.keywords];

  // 카테고리 추정
  let bestCategory = '보육·돌봄 인프라';
  let bestCatScore = 0;

  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      if (text.includes(kw)) {
        score += 1;
        if (!foundKeywords.includes(kw)) foundKeywords.push(kw);
      }
    }
    if (score > bestCatScore) {
      bestCatScore = score;
      bestCategory = cat;
    }
  }

  const confidence = distResult.score > 0 ? Math.min(0.98, 0.6 + (distResult.score * 0.05) + (bestCatScore * 0.08)) : 0;
  const matchedSources: string[] = ['상상대로 서울 텍스트 추출'];
  if (distResult.district) matchedSources.push('KOSIS 인구동향 교차검증');
  if (bestCatScore > 0) matchedSources.push('몽땅정보통 정책 매핑');

  // 복원 불가 판정: 확실한 지명 키워드가 없으면 → 서울시 전체(공통)
  if (!distResult.district || distResult.solidCount === 0) {
    return {
      district: '서울시 전체(공통)',
      category: bestCategory,
      confidence: 0,
      keywords: foundKeywords.slice(0, 6),
      matchedSources: ['상상대로 서울 텍스트 추출'],
      status: '복원 불가'
    };
  }

  return {
    district: distResult.district,
    category: bestCategory,
    confidence,
    keywords: foundKeywords.slice(0, 6),
    matchedSources,
    status: '복원 성공'
  };
};

// ═══════════════ 통합 로그 뷰어 컴포넌트 ═══════════════
type LogEntry = {
  id: string;
  type: 'policy_mismatch' | 'district_feedback' | 'data_apply' | 'approval';
  timestamp: string;
  proposalId?: string;
  proposalTitle?: string;
  // policy mismatch
  matchedPolicy?: string;
  // district feedback
  feedbackType?: string;
  memo?: string;
  originalDistrict?: string;
  // data apply
  appliedCount?: number;
  districts?: string[];
  // approval
  cluster?: string;
  actionType?: string;
  aiOriginal?: string;
  finalAction?: string;
  wasModified?: boolean;
};

const LOG_TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
  policy_mismatch: { label: '정책 오매칭 신고', color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200', icon: '🚩' },
  district_feedback: { label: '복원 피드백', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', icon: '📝' },
  data_apply: { label: '데이터 반영', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: '✅' },
  approval: { label: '검토·승인', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', icon: '📋' },
};

const UnifiedLogViewer: React.FC = () => {
  const [activeLogTab, setActiveLogTab] = useState<'all' | 'policy_mismatch' | 'district_feedback' | 'data_apply' | 'approval'>('all');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  // localStorage에서 모든 로그 수집
  const loadLogs = useCallback(() => {
    const allLogs: LogEntry[] = [];

    // 1. 정책 오매칭 신고 로그
    try {
      const policyLogs = JSON.parse(localStorage.getItem('policy_mismatch_log') || '[]');
      policyLogs.forEach((l: { id?: string; proposalId?: string; proposalTitle?: string; matchedPolicy?: string; timestamp?: string }) => {
        allLogs.push({
          id: l.id || `PML-${Math.random().toString(36).slice(2, 8)}`,
          type: 'policy_mismatch',
          timestamp: l.timestamp || new Date().toISOString(),
          proposalId: l.proposalId,
          proposalTitle: l.proposalTitle,
          matchedPolicy: l.matchedPolicy,
        });
      });
    } catch { /* empty */ }

    // 2. 결측치 복원 피드백 로그
    try {
      const districtLogs = JSON.parse(localStorage.getItem('district_feedback_log') || '[]');
      districtLogs.forEach((l: { id?: string; proposalId?: string; title?: string; type?: string; memo?: string; originalDistrict?: string; timestamp?: string }) => {
        allLogs.push({
          id: l.id || `DFL-${Math.random().toString(36).slice(2, 8)}`,
          type: 'district_feedback',
          timestamp: l.timestamp || new Date().toISOString(),
          proposalId: l.proposalId,
          proposalTitle: l.title,
          feedbackType: l.type,
          memo: l.memo,
          originalDistrict: l.originalDistrict,
        });
      });
    } catch { /* empty */ }

    // 3. 데이터 반영 이력 로그
    try {
      const applyLogs = JSON.parse(localStorage.getItem('data_apply_log') || '[]');
      applyLogs.forEach((l: { id?: string; appliedCount?: number; districts?: string[]; timestamp?: string }) => {
        allLogs.push({
          id: l.id || `DAL-${Math.random().toString(36).slice(2, 8)}`,
          type: 'data_apply',
          timestamp: l.timestamp || new Date().toISOString(),
          appliedCount: l.appliedCount,
          districts: l.districts,
        });
      });
    } catch { /* empty */ }

    // 4. 갭 진단 검토·승인 로그
    try {
      const approvalLogs = JSON.parse(localStorage.getItem('approval_log') || '[]');
      approvalLogs.forEach((l: { id?: string; cluster?: string; actionType?: string; aiOriginal?: string; finalAction?: string; wasModified?: boolean; timestamp?: string }) => {
        allLogs.push({
          id: l.id || `APR-${Math.random().toString(36).slice(2, 8)}`,
          type: 'approval',
          timestamp: l.timestamp || new Date().toISOString(),
          cluster: l.cluster,
          actionType: l.actionType,
          aiOriginal: l.aiOriginal,
          finalAction: l.finalAction,
          wasModified: l.wasModified,
        });
      });
    } catch { /* empty */ }

    // 시간순 정렬 (최신 먼저)
    allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setLogs(allLogs);
  }, []);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const filteredLogs = activeLogTab === 'all' ? logs : logs.filter(l => l.type === activeLogTab);

  // 개별 로그 철회 (해당 건만 삭제)
  const handleRevokeLog = (log: LogEntry) => {
    if (log.type === 'policy_mismatch') {
      try {
        const existing = JSON.parse(localStorage.getItem('policy_mismatch_log') || '[]');
        const filtered = existing.filter((l: { id?: string }) => l.id !== log.id);
        localStorage.setItem('policy_mismatch_log', JSON.stringify(filtered));
      } catch { /* empty */ }
    } else if (log.type === 'district_feedback') {
      try {
        const existing = JSON.parse(localStorage.getItem('district_feedback_log') || '[]');
        const filtered = existing.filter((l: { id?: string }) => l.id !== log.id);
        localStorage.setItem('district_feedback_log', JSON.stringify(filtered));
      } catch { /* empty */ }
    } else if (log.type === 'data_apply') {
      try {
        const existing = JSON.parse(localStorage.getItem('data_apply_log') || '[]');
        const filtered = existing.filter((l: { id?: string }) => l.id !== log.id);
        localStorage.setItem('data_apply_log', JSON.stringify(filtered));
      } catch { /* empty */ }
    } else if (log.type === 'approval') {
      try {
        const existing = JSON.parse(localStorage.getItem('approval_log') || '[]');
        const filtered = existing.filter((l: { id?: string }) => l.id !== log.id);
        localStorage.setItem('approval_log', JSON.stringify(filtered));
      } catch { /* empty */ }
    }
    loadLogs();
  };

  const handleClearLogs = (type: string) => {
    if (type === 'all') {
      localStorage.removeItem('policy_mismatch_log');
      localStorage.removeItem('district_feedback_log');
      localStorage.removeItem('data_apply_log');
      localStorage.removeItem('approval_log');
    } else if (type === 'policy_mismatch') {
      localStorage.removeItem('policy_mismatch_log');
    } else if (type === 'district_feedback') {
      localStorage.removeItem('district_feedback_log');
    } else if (type === 'data_apply') {
      localStorage.removeItem('data_apply_log');
    } else if (type === 'approval') {
      localStorage.removeItem('approval_log');
    }
    loadLogs();
  };

  const tabCounts = {
    all: logs.length,
    policy_mismatch: logs.filter(l => l.type === 'policy_mismatch').length,
    district_feedback: logs.filter(l => l.type === 'district_feedback').length,
    data_apply: logs.filter(l => l.type === 'data_apply').length,
    approval: logs.filter(l => l.type === 'approval').length,
  };

  const formatTime = (ts: string) => {
    try {
      const d = new Date(ts);
      return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    } catch { return ts; }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* 탭 헤더 */}
      <div className="flex items-center gap-1 p-2 bg-slate-50 border-b border-slate-100 overflow-x-auto">
        {([
          { key: 'all' as const, label: '전체', icon: '📋' },
          { key: 'policy_mismatch' as const, label: '정책 오매칭', icon: '🚩' },
          { key: 'district_feedback' as const, label: '복원 피드백', icon: '📝' },
          { key: 'data_apply' as const, label: '데이터 반영', icon: '✅' },
          { key: 'approval' as const, label: '승인 이력', icon: '🔏' },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveLogTab(tab.key)}
            className={`flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold rounded-lg transition cursor-pointer whitespace-nowrap ${
              activeLogTab === tab.key
                ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                : 'text-slate-500 hover:bg-slate-100 border border-transparent'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-black ${
              activeLogTab === tab.key ? 'bg-indigo-200 text-indigo-900' : 'bg-slate-200 text-slate-600'
            }`}>
              {tabCounts[tab.key]}
            </span>
          </button>
        ))}
        <div className="flex-1" />
        {filteredLogs.length > 0 && (
          <button
            onClick={() => handleClearLogs(activeLogTab)}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded transition cursor-pointer"
            title="현재 탭 로그 초기화"
          >
            <Trash2 className="w-3 h-3" />
            초기화
          </button>
        )}
      </div>

      {/* 로그 리스트 */}
      <div className="max-h-[400px] overflow-y-auto">
        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-2xl mb-2">📭</div>
            <div className="text-xs text-slate-400 font-bold">아직 기록된 로그가 없습니다</div>
            <div className="text-[10px] text-slate-300 mt-1">
              대시보드에서 피드백·신고·승인을 수행하면 여기에 자동 기록됩니다
            </div>
          </div>
        ) : (
          <>
            {(isExpanded ? filteredLogs : filteredLogs.slice(0, 10)).map(log => {
              const config = LOG_TYPE_CONFIG[log.type];
              return (
                <div key={log.id} className="flex items-start gap-3 px-4 py-3 border-b border-slate-50 hover:bg-slate-50/50 transition text-xs">
                  {/* 타입 뱃지 */}
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-black ${config.bg} ${config.color} border ${config.border}`}>
                    {config.icon} {config.label}
                  </span>
                  {/* 내용 */}
                  <div className="flex-1 min-w-0">
                    {log.type === 'policy_mismatch' && (
                      <>
                        <div className="font-bold text-slate-800 truncate">{log.proposalTitle || log.proposalId}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          오매칭 정책: <span className="line-through text-rose-400">{log.matchedPolicy}</span>
                        </div>
                      </>
                    )}
                    {log.type === 'district_feedback' && (
                      <>
                        <div className="font-bold text-slate-800 truncate">{log.proposalTitle || log.proposalId}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          유형: <span className="font-bold text-amber-600">{log.feedbackType}</span>
                          {log.originalDistrict && <> · 복원구: {log.originalDistrict}</>}
                          {log.memo && <> · 메모: "{log.memo}"</>}
                        </div>
                      </>
                    )}
                    {log.type === 'data_apply' && (
                      <>
                        <div className="font-bold text-slate-800">복원 데이터 {log.appliedCount}건 반영</div>
                        {log.districts && log.districts.length > 0 && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            반영 자치구: {log.districts.slice(0, 5).join(', ')}{log.districts.length > 5 ? ` 외 ${log.districts.length - 5}개` : ''}
                          </div>
                        )}
                      </>
                    )}
                    {log.type === 'approval' && (
                      <>
                        <div className="font-bold text-slate-800">
                          {log.wasModified ? '🔧 수정 후 승인' : '✅ 답변 승인'} — {log.cluster || log.issueId || '이슈'}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {log.actionType && <span>조치: {log.actionType}</span>}
                          {log.wasModified && log.aiOriginal && (
                            <span className="ml-2 text-amber-600">AI 원본 → 수정됨</span>
                          )}
                          {log.reviewerId && <span className="ml-2">검토자: {log.reviewerId}</span>}
                        </div>
                        {log.wasModified && log.editedAnswer && (
                          <div className="text-[10px] text-blue-500 mt-0.5 truncate max-w-xs">
                            수정 내용: "{log.editedAnswer.slice(0, 60)}{log.editedAnswer.length > 60 ? '…' : ''}"
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  {/* 시간 + 철회 */}
                  <div className="shrink-0 flex items-center gap-2">
                    <span className="flex items-center gap-1 text-[10px] text-slate-300">
                      <Clock className="w-3 h-3" />
                      {formatTime(log.timestamp)}
                    </span>
                    <button
                      onClick={() => handleRevokeLog(log)}
                      className="text-[9px] px-1.5 py-0.5 rounded font-bold text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition cursor-pointer"
                      title="이 신고/피드백을 철회합니다 (원래 상태로 복원)"
                    >
                      철회
                    </button>
                  </div>
                </div>
              );
            })}
            {filteredLogs.length > 10 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full py-2.5 text-[11px] font-bold text-indigo-500 hover:bg-indigo-50 transition cursor-pointer flex items-center justify-center gap-1"
              >
                {isExpanded ? (
                  <><ChevronUp className="w-3.5 h-3.5" /> 접기</>
                ) : (
                  <><ChevronDown className="w-3.5 h-3.5" /> 나머지 {filteredLogs.length - 10}건 더보기</>
                )}
              </button>
            )}
          </>
        )}
      </div>

      {/* 하단 안내 */}
      <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 leading-relaxed">
        💡 모든 로그는 localStorage 기반으로 영구 저장됩니다. 정책 갭 진단 탭에서의 승인·수정 이력도 <b>승인 이력</b> 탭에서 통합 조회 가능합니다.
      </div>
    </div>
  );
};

export const MissingDataSimulator: React.FC<Props> = ({ proposals, onApply }) => {
  const [batchResults, setBatchResults] = useState<BatchResult[]>([]);
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [batchCompleted, setBatchCompleted] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'전체' | '복원 성공' | '복원 불가'>('전체');
  const [showDistrictBreakdown, setShowDistrictBreakdown] = useState(false);

  // 선택 상태 (체크박스)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isApplied, setIsApplied] = useState(false);

  // 원문 펼치기 상태
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // 단건 테스트 모드 (접이식)
  const [showSingleTest, setShowSingleTest] = useState(false);
  const [sampleText, setSampleText] = useState('');
  const [singleResult, setSingleResult] = useState<ReturnType<typeof localImpute> | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // 담당자 피드백 시스템
  const [feedbackTarget, setFeedbackTarget] = useState<BatchResult | null>(null);
  const [feedbackType, setFeedbackType] = useState<string>('district_wrong');
  const [feedbackMemo, setFeedbackMemo] = useState('');
  const [feedbackLogs, setFeedbackLogs] = useState<Array<{
    id: string; proposalId: string; title: string; type: string; memo: string;
    originalDistrict: string; timestamp: string;
  }>>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('district_feedback_log') || '[]');
      if (saved.length > 0) return saved;
      // 목업: "구의" 오매칭 예시 피드백 1건 (데모용)
      return [{
        id: 'FB-DEMO-001',
        proposalId: 'PROP-DEMO',
        title: '보건소 난임당담파트를 따로 해주세요',
        type: 'district_wrong',
        memo: '"각 구의 보건소"에서 "구의"가 광진구(구의동)로 오매칭됨. 실제로는 "각 구(區)의"라는 조사 용법.',
        originalDistrict: '광진구',
        timestamp: '2026-07-24T09:30:00.000Z',
      }];
    }
    catch { return []; }
  });

  const handleFeedbackSubmit = () => {
    if (!feedbackTarget) return;
    const newLog = {
      id: `FB-${Date.now()}`,
      proposalId: feedbackTarget.proposal.id,
      title: feedbackTarget.proposal.title,
      type: feedbackType,
      memo: feedbackMemo,
      originalDistrict: feedbackTarget.district,
      timestamp: new Date().toISOString(),
    };
    const updated = [...feedbackLogs, newLog];
    setFeedbackLogs(updated);
    localStorage.setItem('district_feedback_log', JSON.stringify(updated));
    setFeedbackTarget(null);
    setFeedbackMemo('');
  };

  // 구 미상 제안 목록
  const missingProposals = useMemo(() =>
    proposals.filter(p => !p.district || p.district === '구 미상' || p.district === '미상' || p.district === ''),
    [proposals]
  );

  const missingStats = useMemo(() => {
    const total = proposals.length;
    const missing = missingProposals.length;
    return { total, missing };
  }, [proposals, missingProposals]);

  // 배치 결과 통계
  const batchStats = useMemo(() => {
    if (batchResults.length === 0) return null;
    const restored = batchResults.filter(r => r.status === '복원 성공').length;
    const failed = batchResults.filter(r => r.status === '복원 불가').length;
    const avgConfidence = restored > 0
      ? batchResults.filter(r => r.status === '복원 성공').reduce((sum, r) => sum + r.confidence, 0) / restored
      : 0;

    // 자치구별 분포
    const districtCounts: Record<string, number> = {};
    batchResults.forEach(r => {
      districtCounts[r.district] = (districtCounts[r.district] || 0) + 1;
    });

    return { restored, failed, avgConfidence, districtCounts, total: batchResults.length };
  }, [batchResults]);

  // 일괄 배치 복원 실행
  const handleBatchRun = useCallback(async () => {
    setIsBatchRunning(true);
    setBatchResults([]);
    setBatchCompleted(false);

    // 소량씩 비동기 처리로 UI 블로킹 방지
    const results: BatchResult[] = [];
    const batchSize = 20;

    for (let i = 0; i < missingProposals.length; i += batchSize) {
      const chunk = missingProposals.slice(i, i + batchSize);
      for (const p of chunk) {
        const text = (p.title || '') + ' ' + (p.content || '');
        const imputed = localImpute(text);
        results.push({
          proposal: p,
          ...imputed
        });
      }
      // 중간 결과 업데이트 (진행률 표시용)
      setBatchResults([...results]);
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    setBatchResults(results);
    setIsBatchRunning(false);
    setBatchCompleted(true);
  }, [missingProposals]);

  // 필터된 결과
  const filteredResults = useMemo(() => {
    if (filterStatus === '전체') return batchResults;
    return batchResults.filter(r => r.status === filterStatus);
  }, [batchResults, filterStatus]);

  // 복원 성공 건만 선택 대상
  const selectableResults = useMemo(() =>
    batchResults.filter(r => r.status === '복원 성공'),
    [batchResults]
  );

  // 전체 선택/해제
  const handleToggleAll = useCallback(() => {
    if (selectedIds.size === selectableResults.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableResults.map(r => r.proposal.id)));
    }
  }, [selectedIds, selectableResults]);

  // 개별 선택/해제
  const handleToggleOne = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // 데이터베이스 반영
  const handleApply = useCallback(() => {
    if (selectedIds.size === 0) return;
    const updates = batchResults
      .filter(r => selectedIds.has(r.proposal.id) && r.status === '복원 성공')
      .map(r => ({ id: r.proposal.id, district: r.district, category: r.category }));

    if (onApply) {
      onApply(updates);
    }

    // 데이터 반영 이력 로그 저장
    try {
      const applyLogs = JSON.parse(localStorage.getItem('data_apply_log') || '[]');
      const districts = [...new Set(updates.map(u => u.district))];
      applyLogs.push({
        id: `DAL-${Date.now()}`,
        appliedCount: updates.length,
        districts,
        timestamp: new Date().toISOString(),
      });
      localStorage.setItem('data_apply_log', JSON.stringify(applyLogs));
    } catch { /* empty */ }

    setIsApplied(true);
  }, [selectedIds, batchResults, onApply]);

  // 단건 테스트
  const handleSingleTest = async () => {
    if (!sampleText.trim()) return;
    setIsAnalyzing(true);
    setSingleResult(null);
    await new Promise(resolve => setTimeout(resolve, 500));
    const res = localImpute(sampleText);
    setSingleResult(res);
    setIsAnalyzing(false);
  };

  // 샘플 프리셋
  const samplePresets = [
    { label: '노원 야간돌봄', text: '노원역 4번 출구 및 상계동 인근에 맞벌이 부부를 위한 야간 돌봄 연장 어린이집이 절대적으로 부족합니다.' },
    { label: '강남 난임지원', text: '강남구 역삼동에 거주하는 난임 부부입니다. 보건소 난임 시술비 지원 횟수가 너무 적습니다.' },
    { label: '구 미상 (전체)', text: '출산 축하금을 더 올려주세요. 현재 지원금이 너무 적어서 실질적 도움이 안 됩니다.' },
  ];

  return (
    <div className="space-y-6">
      {/* 상단 배너 */}
      <div className="bg-[#0A2351] text-white p-5 rounded-2xl border border-slate-800 shadow-lg">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-blue-300 text-xs font-bold uppercase tracking-wider mb-1.5">
              <Database className="w-4 h-4" />
              <span>5-Source Data Fusion Engine</span>
            </div>
            <h2 className="text-lg font-black text-white leading-tight">
              '구 미상' 결측치 일괄 복원 시뮬레이터
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              상상대로 시민제안의 원천 한계인 <b className="text-blue-200">자치구 미입력(구 미상) 결측치 {missingStats.missing}건</b>을
              텍스트마이닝으로 <b className="text-blue-200">일괄 자동 복원</b>합니다. 지명 키워드가 없는 안건은 <b className="text-amber-300">서울시 전체(공통)</b>로 분류합니다.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 text-center min-w-[80px]">
              <AlertTriangle className="w-5 h-5 text-rose-400 mx-auto mb-1" />
              <div className="text-white font-black text-lg">{missingStats.missing}</div>
              <div className="text-slate-400 text-[10px] font-bold">구 미상 건수</div>
            </div>
            {batchStats && (
              <>
                <div className="bg-emerald-900/50 p-3 rounded-xl border border-emerald-700/50 text-center min-w-[80px]">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                  <div className="text-emerald-300 font-black text-lg">{batchStats.restored}</div>
                  <div className="text-emerald-500/80 text-[10px] font-bold">복원 성공</div>
                </div>
                <div className="bg-amber-900/40 p-3 rounded-xl border border-amber-700/50 text-center min-w-[80px]">
                  <Globe className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                  <div className="text-amber-300 font-black text-lg">{batchStats.failed}</div>
                  <div className="text-amber-500/80 text-[10px] font-bold">서울시 전체</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 5원 데이터 소스 뱃지 */}
        <div className="mt-4 flex flex-wrap gap-2">
          {DATA_SOURCES.map(src => (
            <div key={src.name} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold ${src.color}`}>
              <span>{src.icon}</span>
              <span>{src.name}</span>
              <span className="opacity-60">({src.count})</span>
            </div>
          ))}
        </div>
      </div>

      <hr className="border-slate-200/60" />

      {/* 일괄 배치 실행 버튼 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <div>
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              일괄 배치 복원 시뮬레이션
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              '구 미상' 제안 <b>{missingStats.missing}건</b> 전체를 텍스트마이닝하여 자치구를 일괄 추정합니다.
              지명 키워드가 없는 안건은 <b className="text-amber-600">복원 불가 → 서울시 전체(공통)</b>로 분류됩니다.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {batchCompleted && selectedIds.size > 0 && !isApplied && (
              <button
                onClick={handleApply}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-3 rounded-xl transition cursor-pointer flex items-center gap-2 shadow-sm"
              >
                <Save className="w-4 h-4" />
                <span>데이터 반영 ({selectedIds.size}건)</span>
              </button>
            )}
            {isApplied && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-2.5 rounded-xl flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  반영 완료
                </span>
                <span className="text-[9px] text-slate-400 leading-tight max-w-[140px]">
                  목업 데이터 시뮬레이션으로 새로고침 시 원상복귀됩니다
                </span>
              </div>
            )}
            <button
              onClick={() => { handleBatchRun(); setSelectedIds(new Set()); setIsApplied(false); }}
              disabled={isBatchRunning || missingProposals.length === 0}
              className="bg-[#0A2351] hover:bg-[#0D2D6B] disabled:bg-slate-300 text-white font-bold text-xs px-5 py-3 rounded-xl transition cursor-pointer flex items-center gap-2 shadow-sm"
            >
              {isBatchRunning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>분석 중... ({batchResults.length}/{missingStats.missing}건)</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>{batchCompleted ? '다시 실행' : `${missingStats.missing}건 일괄 복원 실행`}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 배치 진행률 바 */}
        {isBatchRunning && (
          <div className="mb-4">
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${missingStats.missing > 0 ? (batchResults.length / missingStats.missing) * 100 : 0}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-500 mt-1 text-right font-mono">
              {batchResults.length} / {missingStats.missing} 처리 완료
            </div>
          </div>
        )}

        {/* 배치 결과 요약 */}
        {batchStats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-center">
              <div className="text-xl font-black text-slate-800">{batchStats.total}</div>
              <div className="text-[10px] text-slate-500 font-bold">분석 대상</div>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200 text-center">
              <div className="text-xl font-black text-emerald-700">{batchStats.restored}</div>
              <div className="text-[10px] text-emerald-600 font-bold">복원 성공 ({batchStats.total > 0 ? ((batchStats.restored / batchStats.total) * 100).toFixed(1) : 0}%)</div>
            </div>
            <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 text-center">
              <div className="text-xl font-black text-amber-700">{batchStats.failed}</div>
              <div className="text-[10px] text-amber-600 font-bold">서울시 전체 ({batchStats.total > 0 ? ((batchStats.failed / batchStats.total) * 100).toFixed(1) : 0}%)</div>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 border border-blue-200 text-center">
              <div className="text-xl font-black text-blue-700">{(batchStats.avgConfidence * 100).toFixed(1)}%</div>
              <div className="text-[10px] text-blue-600 font-bold">평균 신뢰도</div>
            </div>
          </div>
        )}

        {/* 자치구별 복원 분포 */}
        {batchStats && (
          <div className="mb-4">
            <button
              onClick={() => setShowDistrictBreakdown(!showDistrictBreakdown)}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer mb-2"
            >
              {showDistrictBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              자치구별 복원 분포 보기
            </button>
            {showDistrictBreakdown && (
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div className="flex flex-wrap gap-1.5">
                  {(Object.entries(batchStats.districtCounts) as [string, number][])
                    .sort((a, b) => b[1] - a[1])
                    .map(([district, count]) => (
                      <div
                        key={district}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1 ${
                          district === '서울시 전체(공통)'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}
                      >
                        {district === '서울시 전체(공통)' ? <Globe className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                        {district} <span className="text-[9px] opacity-60">{count}건</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 필터 탭 + 결과 리스트 */}
        {batchCompleted && (
          <>
            <div className="flex items-center gap-2 mb-3 border-b border-slate-200 pb-2 flex-wrap">
              {/* 전체 선택 체크박스 */}
              <button
                onClick={handleToggleAll}
                className="text-[11px] font-bold text-slate-600 hover:text-blue-600 flex items-center gap-1 cursor-pointer mr-1 border border-slate-200 rounded-lg px-2.5 py-1 hover:bg-blue-50 transition"
                title={selectedIds.size === selectableResults.length ? '전체 해제' : '복원 성공 전체 선택'}
              >
                {selectedIds.size > 0 && selectedIds.size === selectableResults.length
                  ? <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                  : <Square className="w-3.5 h-3.5" />
                }
                {selectedIds.size > 0 ? `${selectedIds.size}건 선택` : '전체 선택'}
              </button>
              <div className="w-px h-5 bg-slate-200" />
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              {(['전체', '복원 성공', '복원 불가'] as const).map(status => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`text-[11px] font-bold px-3 py-1 rounded-lg border transition cursor-pointer ${
                    filterStatus === status
                      ? status === '복원 성공'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : status === '복원 불가'
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-slate-800 text-white border-slate-800'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {status}
                  <span className="ml-1 opacity-70">
                    ({status === '전체'
                      ? batchResults.length
                      : batchResults.filter(r => r.status === status).length})
                  </span>
                </button>
              ))}
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {filteredResults.slice(0, 50).map((r, idx) => (
                <div key={r.proposal.id || idx} className={`p-3 border rounded-xl text-xs transition ${
                  selectedIds.has(r.proposal.id)
                    ? 'bg-blue-50/60 border-blue-300 ring-1 ring-blue-200'
                    : isApplied && r.status === '복원 성공' ? 'bg-emerald-50/40 border-emerald-200' : 'bg-slate-50 border-slate-200 hover:bg-blue-50/30'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    {/* 체크박스 (복원 성공만) */}
                    {r.status === '복원 성공' && !isApplied && (
                      <button
                        onClick={() => handleToggleOne(r.proposal.id)}
                        className="mt-0.5 shrink-0 cursor-pointer text-slate-400 hover:text-blue-600 transition"
                      >
                        {selectedIds.has(r.proposal.id)
                          ? <CheckSquare className="w-4 h-4 text-blue-600" />
                          : <Square className="w-4 h-4" />
                        }
                      </button>
                    )}
                    {isApplied && r.status === '복원 성공' && selectedIds.has(r.proposal.id) && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[10px] font-bold bg-rose-50 text-rose-600 px-2 py-0.5 rounded border border-rose-100">
                        원천: 구 미상
                      </span>
                      {r.status === '복원 성공' ? (
                        <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100 flex items-center gap-1">
                          <ArrowRight className="w-2.5 h-2.5" />
                          복원: {r.district} ({(r.confidence * 100).toFixed(0)}%)
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold bg-amber-50 text-amber-600 px-2 py-0.5 rounded border border-amber-100 flex items-center gap-1">
                          <Globe className="w-2.5 h-2.5" />
                          서울시 전체(공통)
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 font-bold">{r.category}</span>
                    </div>
                    <div className="font-bold text-slate-800 truncate">{r.proposal.title}</div>
                    {r.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {r.keywords.slice(0, 4).map((kw, i) => (
                          <span key={i} className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">#{kw}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    <span className="text-xs text-blue-600 font-bold">👍 {r.proposal.vote_score} 공감</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setExpandedIds(prev => {
                          const next = new Set(prev);
                          if (next.has(r.proposal.id)) next.delete(r.proposal.id);
                          else next.add(r.proposal.id);
                          return next;
                        })}
                        className="text-[10px] text-slate-400 hover:text-blue-500 font-bold inline-flex items-center gap-0.5 transition cursor-pointer"
                      >
                        {expandedIds.has(r.proposal.id)
                          ? <><ChevronUp className="w-3 h-3" />접기</>
                          : <><ChevronDown className="w-3 h-3" />원문 펼치기</>
                        }
                      </button>
                      {r.proposal.url && (
                        <a
                          href={r.proposal.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-slate-400 hover:text-blue-500 font-bold inline-flex items-center gap-0.5 transition"
                          title="원본 제안 보기"
                        >
                          <ExternalLink className="w-3 h-3" />
                          원문
                        </a>
                      )}
                      {r.status === '복원 성공' && (
                        <button
                          onClick={() => { setFeedbackTarget(r); setFeedbackType('district_wrong'); setFeedbackMemo(''); }}
                          className={`text-[10px] font-bold inline-flex items-center gap-0.5 transition cursor-pointer ${
                            feedbackLogs.some(l => l.proposalId === r.proposal.id)
                              ? 'text-amber-500'
                              : 'text-slate-400 hover:text-amber-500'
                          }`}
                          title="복원 결과 피드백"
                        >
                          <AlertTriangle className="w-3 h-3" />
                          {feedbackLogs.some(l => l.proposalId === r.proposal.id) ? '피드백 완료' : '🚩 피드백'}
                        </button>
                      )}
                    </div>
                  </div>
                  </div>
                  {expandedIds.has(r.proposal.id) && r.proposal.content && (
                    <div className="mt-2 pt-2 border-t border-slate-200 text-[11px] text-slate-600 leading-relaxed whitespace-pre-wrap max-h-[200px] overflow-y-auto bg-white/50 rounded-lg p-2.5">
                      {r.proposal.content}
                    </div>
                  )}
                </div>
              ))}
              {filteredResults.length > 50 && (
                <div className="text-center py-2 text-[11px] text-slate-400 font-bold">
                  ... 외 {filteredResults.length - 50}건 (스크롤하여 확인)
                </div>
              )}
              {filteredResults.length === 0 && (
                <div className="text-center py-6 text-slate-400 text-xs">
                  해당 조건의 결과가 없습니다.
                </div>
              )}
            </div>
          </>
        )}

        {/* 배치 미실행 시 안내 */}
        {!batchCompleted && !isBatchRunning && (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400 text-xs gap-2">
            <Database className="w-10 h-10 text-slate-300" />
            <span className="font-bold text-sm text-slate-500">상단 '일괄 복원 실행' 버튼을 클릭하세요</span>
            <span className="text-slate-400">구 미상 {missingStats.missing}건을 텍스트마이닝하여 자치구를 자동 추정합니다.</span>
          </div>
        )}
      </div>

      <hr className="border-slate-200/60" />

      {/* 단건 테스트 (접이식) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <button
          onClick={() => setShowSingleTest(!showSingleTest)}
          className="w-full p-4 flex items-center justify-between text-left cursor-pointer hover:bg-slate-50 transition rounded-2xl"
        >
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-bold text-slate-700">개별 텍스트 테스트</span>
            <span className="text-[11px] text-slate-400">임의 텍스트로 복원 엔진을 직접 테스트해볼 수 있습니다</span>
          </div>
          {showSingleTest ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {showSingleTest && (
          <div className="px-5 pb-5 border-t border-slate-100 pt-4">
            {/* 프리셋 */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              <span className="text-[10px] text-slate-400 font-bold uppercase self-center mr-1">Preset:</span>
              {samplePresets.map(preset => (
                <button
                  key={preset.label}
                  onClick={() => { setSampleText(preset.text); setSingleResult(null); }}
                  className="text-[11px] bg-slate-50 text-slate-600 border border-slate-200 px-2.5 py-1 rounded-lg font-bold hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-3">
                <textarea
                  rows={4}
                  value={sampleText}
                  onChange={(e) => { setSampleText(e.target.value); setSingleResult(null); }}
                  className="w-full p-3 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-slate-50 leading-relaxed text-slate-700 font-medium resize-none"
                  placeholder="자치구 정보가 없는 시민 제안 텍스트를 입력하세요..."
                />
                <button
                  onClick={handleSingleTest}
                  disabled={isAnalyzing || !sampleText.trim()}
                  className="w-full bg-[#0A2351] hover:bg-[#0D2D6B] disabled:bg-slate-300 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
                >
                  {isAnalyzing ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> 분석 중...</> : <><Search className="w-3.5 h-3.5" /> 복원 테스트</>}
                </button>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
                {singleResult ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200">
                      <span className="text-slate-500 font-bold">추정 결과:</span>
                      <span className={`font-black flex items-center gap-1 ${singleResult.status === '복원 성공' ? 'text-blue-700' : 'text-amber-700'}`}>
                        {singleResult.status === '복원 성공' ? <MapPin className="w-3.5 h-3.5 text-rose-500" /> : <Globe className="w-3.5 h-3.5 text-amber-500" />}
                        {singleResult.district}
                      </span>
                    </div>
                    <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200">
                      <span className="text-slate-500 font-bold">정책 대분류:</span>
                      <span className="font-bold text-slate-800 text-right max-w-[55%]">{singleResult.category}</span>
                    </div>
                    <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200">
                      <span className="text-slate-500 font-bold">상태:</span>
                      <span className={`font-bold px-2 py-0.5 rounded ${
                        singleResult.status === '복원 성공' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {singleResult.status} {singleResult.status === '복원 성공' && `(${(singleResult.confidence * 100).toFixed(0)}%)`}
                      </span>
                    </div>
                    {singleResult.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {singleResult.keywords.map((kw, i) => (
                          <span key={i} className="text-[9px] bg-blue-50 text-blue-700 font-bold px-1.5 py-0.5 rounded border border-blue-100">#{kw}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-slate-400 gap-1">
                    <Database className="w-6 h-6 text-slate-300" />
                    <span className="font-bold text-[11px]">텍스트를 입력하고 테스트하세요</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 담당자 피드백 로그 요약 */}
        {feedbackLogs.length > 0 && (
          <>
            <hr className="border-slate-200/60" />
            <div className="bg-amber-50/50 border border-amber-200/60 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-black text-amber-900">🚩 담당자 피드백 로그 ({feedbackLogs.length}건)</span>
                </div>
                <span className="text-[9px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-bold border border-amber-200">
                  Human-in-the-loop 품질 개선
                </span>
              </div>
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                {feedbackLogs.slice().reverse().map(log => (
                  <div key={log.id} className="bg-white rounded-lg p-2.5 border border-amber-100 flex items-start gap-2 text-[10px]">
                    <span className="shrink-0 mt-0.5">
                      {log.type === 'district_wrong' ? '📍' : log.type === 'category_wrong' ? '🏷️' : '📝'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-800 truncate">{log.title}</div>
                      <div className="text-slate-500 mt-0.5">
                        {log.type === 'district_wrong' && `지역 오매칭: "${log.originalDistrict}" 수정 필요`}
                        {log.type === 'category_wrong' && `분류 오매칭 수정 필요`}
                        {log.type === 'other' && `기타 피드백`}
                        {log.memo && ` — ${log.memo}`}
                      </div>
                    </div>
                    <span className="text-[8px] text-slate-400 shrink-0">{new Date(log.timestamp).toLocaleDateString('ko')}</span>
                  </div>
                ))}
              </div>
              <div className="text-[9px] text-amber-600 bg-amber-100/50 p-2 rounded-lg border border-amber-200/50">
                💡 피드백 로그는 API 연동 시 동음이의어 사전 및 복원 알고리즘 자동 업데이트에 활용됩니다.
              </div>
            </div>
          </>
        )}
      </div>

      {/* ═══════════════ 통합 품질 관리 로그 ═══════════════ */}
      <div className="mt-8 border-t-2 border-dashed border-slate-200 pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-500" />
            <h3 className="text-sm font-black text-slate-800">📋 통합 품질 관리 로그</h3>
            <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-bold border border-indigo-100">
              Human-in-the-loop
            </span>
          </div>
        </div>
        <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
          대시보드 전체에서 담당자가 기록한 피드백·신고·승인 이력을 한곳에서 조회합니다.
          로그는 브라우저 localStorage에 저장되며, API 연동 시 서버 DB로 자동 마이그레이션됩니다.
        </p>

        <UnifiedLogViewer />
      </div>

      {/* 피드백 모달 */}
      {feedbackTarget && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-4 bg-amber-50 border-b border-amber-100 flex justify-between items-center">
              <span className="text-xs font-black text-amber-900">🚩 복원 결과 피드백</span>
              <button onClick={() => setFeedbackTarget(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
            </div>
            <div className="p-4 space-y-3 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <div className="font-bold text-slate-800 truncate">{feedbackTarget.proposal.title}</div>
                <div className="text-[10px] text-slate-500 mt-1">
                  현재 복원: <strong>{feedbackTarget.district}</strong> ({(feedbackTarget.confidence * 100).toFixed(0)}%) · {feedbackTarget.category}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-700 block">오류 유형</label>
                <div className="flex gap-2">
                  {[
                    { value: 'district_wrong', label: '📍 지역 오매칭', desc: '다른 구로 잡혔거나 조사 용법' },
                    { value: 'category_wrong', label: '🏷️ 분류 오매칭', desc: '카테고리가 맞지 않음' },
                    { value: 'other', label: '📝 기타', desc: '기타 데이터 품질 이슈' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setFeedbackType(opt.value)}
                      className={`flex-1 p-2 rounded-lg border text-[10px] font-bold text-center transition cursor-pointer ${
                        feedbackType === opt.value
                          ? 'border-amber-400 bg-amber-50 text-amber-800'
                          : 'border-slate-200 bg-white text-slate-500 hover:border-amber-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-700 block">맥락 메모 (선택)</label>
                <textarea
                  value={feedbackMemo}
                  onChange={e => setFeedbackMemo(e.target.value)}
                  className="w-full h-16 p-2 rounded-lg border border-slate-200 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 bg-slate-50 text-[11px]"
                  placeholder="예: '각 구의 보건소'에서 '구의'가 지명으로 잡힘"
                />
              </div>
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => setFeedbackTarget(null)} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer">취소</button>
              <button
                onClick={handleFeedbackSubmit}
                className="px-4 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition cursor-pointer"
              >
                피드백 제출
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
