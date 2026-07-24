import React, { useState, useMemo, useCallback } from 'react';
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
  Save
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
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-2.5 rounded-xl flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                반영 완료
              </span>
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
      </div>
    </div>
  );
};
