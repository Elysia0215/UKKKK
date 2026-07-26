import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  BarChart3,
  Building2,
  CalendarRange,
  CircleHelp,
  Download,
  FileText,
  Layers3,
  MapPinned,
  Newspaper,
  Scale,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react';
import type { PolicyProposal } from '../types';
import civilRequestsRaw from '../data/civil_requests_all.json';
import newsRaw from '../data/news_all.json';
import { SEOUL_DISTRICTS_DATA } from '../data/seoulData';
import { exportToCsv } from '../utils/exportCsv';

type TaxonomyRecord = {
  id?: string;
  title: string;
  content?: string;
  snippet?: string;
  category?: string;
  sub_category?: string;
  micro_category?: string;
  strength?: string;
  type?: string;
  status?: string;
  url?: string;
};

type ViewKey = 'home' | 'trends' | 'taxonomy' | 'sources' | 'districts' | 'gaps';
type TaxonomySortKey = 'category' | 'subCategory' | 'microCategory' | 'proposals' | 'civil' | 'news' | 'unanswered' | 'votes';
type SortDirection = 'asc' | 'desc';

type Props = {
  proposals: PolicyProposal[];
  selectedCategory?: string | null;
  selectedTeam?: string | null;
  onClearTeam?: () => void;
};

const civilRequests = civilRequestsRaw as TaxonomyRecord[];
const news = newsRaw as TaxonomyRecord[];

const taxonomyKey = (item: Pick<TaxonomyRecord, 'category' | 'sub_category' | 'micro_category'>) => (
  [item.category || '', item.sub_category || '', item.micro_category || ''].join('|||')
);

const formatNumber = (value: number) => value.toLocaleString('ko-KR');

function HelpTip({ label }: { label: string }) {
  return (
    <span className="group/help relative inline-flex align-middle">
      <span
        role="img"
        aria-label={label}
        className="inline-flex rounded-full text-slate-400 transition group-hover/help:text-blue-600"
      >
        <CircleHelp className="h-3.5 w-3.5" />
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-64 -translate-x-1/2 rounded-lg bg-slate-900 px-3 py-2 text-left text-[10px] font-medium leading-relaxed text-white shadow-xl group-hover/help:block"
      >
        {label}
      </span>
    </span>
  );
}

export function IntegratedEvidenceDashboard({
  proposals,
  selectedCategory,
  selectedTeam,
  onClearTeam,
}: Props) {
  const [activeView, setActiveView] = useState<ViewKey>('home');
  const [selectedPeriod, setSelectedPeriod] = useState('전체');
  const [taxonomySort, setTaxonomySort] = useState<{ key: TaxonomySortKey; direction: SortDirection }>({
    key: 'proposals',
    direction: 'desc',
  });

  const allowedTaxonomy = useMemo(
    () => new Set(proposals.map(taxonomyKey)),
    [proposals],
  );

  const matchesScope = (item: TaxonomyRecord) => {
    if (selectedCategory && item.category !== selectedCategory) return false;
    if (selectedTeam && !allowedTaxonomy.has(taxonomyKey(item))) return false;
    return true;
  };

  const scopedCivil = useMemo(
    () => civilRequests.filter(matchesScope),
    [allowedTaxonomy, selectedCategory, selectedTeam],
  );
  const scopedNews = useMemo(
    () => news.filter(matchesScope),
    [allowedTaxonomy, selectedCategory, selectedTeam],
  );
  const periodProposals = useMemo(() => (
    selectedPeriod === '전체'
      ? proposals
      : proposals.filter((item) => item.reg_date?.startsWith(selectedPeriod))
  ), [proposals, selectedPeriod]);
  const periodCivil = useMemo(() => (
    selectedPeriod === '전체'
      ? scopedCivil
      : scopedCivil.filter((item) => item.reg_date?.includes(selectedPeriod))
  ), [scopedCivil, selectedPeriod]);

  const policyNames = useMemo(() => new Set(
    proposals.flatMap((proposal) => (
      (proposal.matched_policies || []).map((policy) => policy.policy_name)
    )),
  ), [proposals]);

  const taxonomyRows = useMemo(() => {
    const rows = new Map<string, {
      category: string;
      subCategory: string;
      microCategory: string;
      proposals: number;
      civil: number;
      news: number;
      unanswered: number;
      votes: number;
    }>();
    const ensure = (item: TaxonomyRecord) => {
      const key = taxonomyKey(item);
      if (!rows.has(key)) {
        rows.set(key, {
          category: item.category || '미분류',
          subCategory: item.sub_category || '미분류',
          microCategory: item.micro_category || '미분류',
          proposals: 0,
          civil: 0,
          news: 0,
          unanswered: 0,
          votes: 0,
        });
      }
      return rows.get(key)!;
    };
    periodProposals.forEach((proposal) => {
      const row = ensure(proposal);
      row.proposals += 1;
      row.votes += proposal.vote_score || 0;
      if (proposal.reply_yn === 'N') row.unanswered += 1;
    });
    periodCivil.forEach((item) => { ensure(item).civil += 1; });
    scopedNews.forEach((item) => { ensure(item).news += 1; });
    return [...rows.values()].sort((a, b) => (
      (b.proposals + b.civil + b.news) - (a.proposals + a.civil + a.news)
    ));
  }, [periodProposals, periodCivil, scopedNews]);

  const districtRows = useMemo(() => SEOUL_DISTRICTS_DATA.map((district) => {
    const count = periodProposals.filter((proposal) => proposal.district === district.name).length;
    return {
      ...district,
      scopedProposalCount: count,
      pressure: count / Math.max(district.daycare2025, 1),
    };
  }).sort((a, b) => b.pressure - a.pressure), [periodProposals]);

  const unanswered = periodProposals.filter((proposal) => proposal.reply_yn === 'N').length;
  const highStrengthNews = scopedNews.filter((item) => item.strength === '상').length;
  const totalEvidence = periodProposals.length + periodCivil.length + scopedNews.length;
  const activeSourceCount = [
    periodProposals.length,
    periodCivil.length,
    scopedNews.length,
    policyNames.size,
  ].filter((count) => count > 0).length;
  const isSparseScope = totalEvidence < 5 || activeSourceCount < 2;
  const showSparseGate = isSparseScope && activeView !== 'sources';
  const scopeLabel = [
    selectedCategory || '전체 대분류',
    selectedTeam || '전체 R&R 팀',
  ].join(' · ');
  const civilCollectedYears = useMemo(() => {
    return new Set(
      scopedCivil
        .map((item) => String(item.reg_date || '').match(/\d{4}/)?.[0])
        .filter((year): year is string => Boolean(year))
    );
  }, [scopedCivil]);
  const yearlyTrend = useMemo(() => ['2022', '2023', '2024', '2025', '2026'].map((year) => ({
    year,
    proposals: proposals.filter((item) => item.reg_date?.startsWith(year)).length,
    civil: scopedCivil.filter((item) => item.reg_date?.includes(year)).length,
    civilCollected: civilCollectedYears.has(year),
  })), [proposals, scopedCivil, civilCollectedYears]);
  const sortedTaxonomyRows = useMemo(() => {
    const direction = taxonomySort.direction === 'asc' ? 1 : -1;
    return [...taxonomyRows].sort((a, b) => {
      const aValue = a[taxonomySort.key];
      const bValue = b[taxonomySort.key];
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return (aValue - bValue) * direction;
      }
      return String(aValue).localeCompare(String(bValue), 'ko') * direction;
    });
  }, [taxonomyRows, taxonomySort]);
  const handleTaxonomySort = (key: TaxonomySortKey) => {
    setTaxonomySort((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };
  const renderSortLabel = (key: TaxonomySortKey, label: string) => (
    <button
      type="button"
      onClick={() => handleTaxonomySort(key)}
      className="inline-flex items-center gap-1 rounded px-1 py-0.5 transition hover:bg-white/10"
    >
      <span>{label}</span>
      <ArrowUpDown className="h-3 w-3 opacity-70" />
      {taxonomySort.key === key && (
        <span className="text-[9px] text-blue-200">{taxonomySort.direction === 'desc' ? '↓' : '↑'}</span>
      )}
    </button>
  );
  const exportDate = new Date().toISOString().slice(0, 10);

  const exportCurrentView = () => {
    if (activeView === 'trends') {
      exportToCsv(`통합근거_기간별트렌드_${exportDate}`, yearlyTrend.map((row) => ({
        연도: row.year,
        시민제안수: row.proposals,
        국민민원수: row.civil,
        뉴스수집누계: scopedNews.length,
        강한뉴스신호수: highStrengthNews,
        연결정책수: policyNames.size,
        필터범위: scopeLabel,
      })));
      return;
    }
    if (activeView === 'taxonomy') {
      exportToCsv(`통합근거_대중소분류_${exportDate}`, taxonomyRows.map((row) => ({
        대분류: row.category,
        중분류: row.subCategory,
        소분류: row.microCategory,
        시민제안수: row.proposals,
        국민민원수: row.civil,
        뉴스수: row.news,
        미답변제안수: row.unanswered,
        총공감수: row.votes,
        필터범위: scopeLabel,
      })));
      return;
    }
    if (activeView === 'districts') {
      exportToCsv(`통합근거_자치구비교_${exportDate}`, districtRows.map((row) => ({
        자치구: row.name,
        선택범위제안수: row.scopedProposalCount,
        보육시설수: row.daycare2025,
        출생아수: row.births2025,
        합계출산율: row.fertilityRate,
        시설당제안비율: row.pressure.toFixed(4),
        필터범위: scopeLabel,
      })));
      return;
    }
    if (activeView === 'gaps') {
      exportToCsv(`통합근거_정책공백_${exportDate}`, taxonomyRows.map((row) => ({
        대분류: row.category,
        중분류: row.subCategory,
        소분류: row.microCategory,
        미답변제안수: row.unanswered,
        시민제안수: row.proposals,
        국민민원수: row.civil,
        뉴스수: row.news,
        연결정책전체수: policyNames.size,
        필터범위: scopeLabel,
      })));
      return;
    }
    exportToCsv(`통합근거_요약_${exportDate}`, [{
      필터범위: scopeLabel,
      시민제안수: periodProposals.length,
      국민민원수: periodCivil.length,
      뉴스수: scopedNews.length,
      연결정책수: policyNames.size,
      미답변제안수: unanswered,
      강한뉴스신호수: highStrengthNews,
      세부분류수: taxonomyRows.length,
    }]);
  };

  const cards: Array<{
    key: Exclude<ViewKey, 'home'>;
    title: string;
    description: string;
    icon: typeof Layers3;
    color: string;
    preview: string;
  }> = [
    {
      key: 'trends',
      title: '기간별 수요·이슈 트렌드',
      description: '연도별 제안·민원 변화와 누적 뉴스 신호를 함께 봅니다.',
      icon: TrendingUp,
      color: 'text-cyan-600 bg-cyan-50',
      preview: '2022–2026 기간 비교',
    },
    {
      key: 'taxonomy',
      title: '대·중·소분류 통합 검토',
      description: '동일 세부 태그의 제안·민원·뉴스를 한 행에서 비교합니다.',
      icon: Layers3,
      color: 'text-indigo-600 bg-indigo-50',
      preview: `${formatNumber(taxonomyRows.length)}개 세부 분류`,
    },
    {
      key: 'sources',
      title: '제안·민원·뉴스 근거 비교',
      description: '세 출처의 규모와 최신 원문 근거를 나란히 검토합니다.',
      icon: Scale,
      color: 'text-blue-600 bg-blue-50',
      preview: `${formatNumber(totalEvidence)}건 통합 근거`,
    },
    {
      key: 'districts',
      title: '자치구 수요·인프라 비교',
      description: '선택 분류의 제안 수요를 출생·보육시설 통계와 대조합니다.',
      icon: MapPinned,
      color: 'text-emerald-600 bg-emerald-50',
      preview: '서울시 25개 자치구',
    },
    {
      key: 'gaps',
      title: '정책 공백·R&R 검토',
      description: '미답변 수요, 강한 뉴스 신호와 연결 정책 부족을 점검합니다.',
      icon: ShieldAlert,
      color: 'text-rose-600 bg-rose-50',
      preview: `${formatNumber(unanswered)}건 미답변`,
    },
  ];

  return (
    <section className="space-y-5">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-[#0A2351] p-2 text-white"><BarChart3 className="h-5 w-5" /></div>
              <div>
                <h2 className="flex items-center gap-1.5 text-lg font-black text-slate-900">
                  통합 정책 근거 분석
                  <HelpTip label="시민 제안·국민 민원·뉴스·연결 정책을 같은 대·중·소분류로 묶어 수요와 정책 공급의 관계를 확인하는 화면입니다." />
                </h2>
                <p className="text-xs text-slate-500">제안 단독 통계가 아니라 국민민원·뉴스·정책 공급까지 묶어 교차 근거를 검토합니다.</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <p className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600">
                현재 범위: {scopeLabel}
              </p>
              <p className="inline-flex rounded-full bg-violet-50 px-3 py-1 text-[11px] font-bold text-violet-700">
                제안 분포·필터 검증은 10번 탭에서 확인
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-bold text-slate-600">
              <CalendarRange className="h-4 w-4 text-blue-600" />
              <select
                value={selectedPeriod}
                onChange={(event) => setSelectedPeriod(event.target.value)}
                className="bg-transparent outline-none"
                aria-label="통합 근거 분석 기간"
              >
                <option value="전체">전체 기간</option>
                <option value="2026">2026년</option>
                <option value="2025">2025년</option>
                <option value="2024">2024년</option>
                <option value="2023">2023년</option>
                <option value="2022">2022년</option>
              </select>
              <HelpTip label="선택 연도는 제안과 민원에 적용됩니다. 현재 뉴스 원본에는 발행일이 없어 뉴스는 선택 기간과 관계없이 누적 건수로 표시됩니다." />
            </label>
            <button
              type="button"
              onClick={exportCurrentView}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-700"
            >
              <Download className="h-4 w-4" /> 현재 화면 CSV
              <HelpTip label="현재 선택한 대분류·팀·기간과 현재 분석 화면의 데이터를 CSV 파일로 내려받습니다." />
            </button>
            {activeView !== 'home' && (
              <button
                type="button"
                onClick={() => setActiveView('home')}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" /> 분석 홈
              </button>
            )}
          </div>
        </div>
        <nav className="mt-4 flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1" aria-label="통합 근거 분석 화면">
          {[
            ['home', '교차근거 개요', '제안·민원·뉴스·정책 공급이 함께 있는지 먼저 봅니다.'],
            ['trends', '기간별 트렌드', '연도별 제안·민원 증감을 비교해 수요가 커진 시점을 찾습니다.'],
            ['taxonomy', '분류별 교차근거', '대·중·소분류마다 제안·민원·뉴스가 얼마나 모였는지 비교합니다.'],
            ['sources', '출처 원문', '집계 숫자의 근거가 된 제안·민원·뉴스 원문을 직접 확인합니다.'],
            ['districts', '자치구·인프라', '자치구별 제안 수요를 출생아·보육시설 통계와 대조합니다.'],
            ['gaps', '정책 공백', '수요는 있지만 미답변이거나 연결 정책이 부족한 분류를 찾습니다.'],
          ].map(([key, label, help]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveView(key as ViewKey)}
              className={`rounded-lg px-3 py-2 text-[11px] font-black transition ${
                activeView === key
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-500 hover:bg-white/70 hover:text-slate-800'
              }`}
            >
              <span className="inline-flex items-center gap-1">{label}<HelpTip label={help} /></span>
            </button>
          ))}
        </nav>
      </header>

      {showSparseGate ? (
        <div className="rounded-2xl border border-amber-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black text-amber-800">
                교차 분석 근거 부족
                <HelpTip label="전체 근거가 5건 미만이거나 제안·민원·뉴스·정책 중 값이 있는 출처가 2종 미만이면 관계를 비교할 수 없어 차트를 자동으로 숨깁니다." />
              </span>
              <h3 className="mt-4 text-xl font-black text-slate-900">
                현재 범위는 차트로 관계를 판단하기에 데이터가 부족합니다.
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {scopeLabel}에서 확인된 직접 근거는 제안 {periodProposals.length}건,
                민원 {periodCivil.length}건, 뉴스 {scopedNews.length}건, 연결 정책 {policyNames.size}건입니다.
                0값 차트와 단일 막대는 관계를 설명하지 못하므로 자동으로 숨겼습니다.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {selectedTeam && onClearTeam && (
                  <button
                    type="button"
                    onClick={onClearTeam}
                    className="rounded-lg bg-[#0A2351] px-4 py-2.5 text-xs font-black text-white hover:bg-blue-900"
                  >
                    팀 필터 해제하고 대분류 기준으로 확장
                    <span className="ml-1 inline-flex"><HelpTip label="현재 팀만 해제하고 선택한 대분류는 유지합니다. 같은 대분류에 속한 여러 팀의 근거가 합쳐져 비교 가능한 데이터 범위가 넓어집니다." /></span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveView('sources')}
                  disabled={!periodProposals.length && !periodCivil.length && !scopedNews.length}
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  남아 있는 원문 근거 확인
                  <span className="ml-1 inline-flex"><HelpTip label="차트 대신 현재 필터에 실제로 남아 있는 제안·민원·뉴스의 제목, 분류, 원문 링크를 확인합니다." /></span>
                </button>
              </div>
            </div>
            <div className="grid min-w-[280px] grid-cols-2 gap-2">
              {[
                ['시민 제안', periodProposals.length, 'text-blue-700 bg-blue-50', '서울시 시민 제안 중 현재 대분류·팀·기간에 해당하는 건수입니다.'],
                ['국민 민원', periodCivil.length, 'text-violet-700 bg-violet-50', '현재 제안과 동일한 대·중·소분류에 연결된 국민 민원 건수입니다.'],
                ['뉴스 근거', scopedNews.length, 'text-amber-700 bg-amber-50', '현재 제안과 동일한 대·중·소분류에 연결된 뉴스 건수이며, 날짜 필드가 없어 누적 기준입니다.'],
                ['연결 정책', policyNames.size, 'text-emerald-700 bg-emerald-50', '현재 범위의 제안에 매칭된 중복 제거 정책 수입니다.'],
              ].map(([label, value, color, help]) => (
                <div key={String(label)} className={`rounded-xl p-4 ${color}`}>
                  <strong className="block text-2xl font-black">{Number(value)}</strong>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold">
                    {String(label)} <HelpTip label={String(help)} />
                  </span>
                </div>
              ))}
            </div>
          </div>
          {!!periodProposals.length && (
            <div className="mt-6 border-t border-slate-100 pt-5">
              <p className="text-xs font-black text-slate-700">현재 확인 가능한 제안</p>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                {periodProposals.slice(0, 4).map((proposal) => (
                  <a
                    key={proposal.id}
                    href={proposal.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-slate-200 p-3 hover:bg-slate-50"
                  >
                    <p className="text-xs font-bold text-slate-900">{proposal.title}</p>
                    <p className="mt-1 text-[10px] text-slate-500">
                      {proposal.sub_category || '미분류'} · {proposal.micro_category || '미분류'}
                    </p>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
      {activeView === 'home' && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ['시민 제안', periodProposals.length, FileText, 'text-blue-600'],
              ['국민 민원', periodCivil.length, Building2, 'text-violet-600'],
              ['뉴스 근거', scopedNews.length, Newspaper, 'text-amber-600'],
              ['연결 정책', policyNames.size, Layers3, 'text-emerald-600'],
              ['미답변 제안', unanswered, ShieldAlert, 'text-rose-600'],
            ].map(([label, value, Icon, color]) => (
              <div key={String(label)} className="rounded-xl border border-slate-200 bg-white p-4">
                <Icon className={`h-4 w-4 ${color}`} />
                <p className="mt-3 text-[10px] font-bold text-slate-500">{String(label)}</p>
                <strong className="mt-1 block text-2xl font-black text-slate-900">{formatNumber(Number(value))}</strong>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-black text-slate-900">교차근거 기반 분석 및 트렌드</h3>
                <p className="mt-1 text-xs text-slate-500">제안만 보지 않고 민원·뉴스·정책 공급이 같은 주제를 뒷받침하는지 확인합니다.</p>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black text-blue-700">
                {selectedPeriod === '전체' ? '전체 기간' : `${selectedPeriod}년`} · 뉴스는 날짜 필드가 없어 누적 기준
              </span>
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              <button type="button" onClick={() => setActiveView('trends')} className="rounded-xl border border-slate-200 p-4 text-left hover:border-blue-300">
                <div className="flex items-center justify-between"><strong className="inline-flex items-center gap-1 text-xs">📈 제안·민원 기간 추이 <HelpTip label="같은 분류에 속한 시민 제안과 국민 민원이 연도별로 함께 늘거나 줄었는지 비교합니다. 막대가 함께 커지면 반복 수요 신호로 볼 수 있습니다." /></strong><span className="text-[9px] font-black text-blue-600">Zoom-in ↗</span></div>
                <div className="mt-6 flex h-24 items-end gap-2">
                  {yearlyTrend.map((row) => {
                    const max = Math.max(...yearlyTrend.flatMap((item) => [item.proposals, item.civil]), 1);
                    return (
                      <div key={row.year} className="flex h-full flex-1 items-end justify-center gap-0.5">
                        <div className="w-2/5 rounded-t bg-blue-500" style={{ height: `${Math.max((row.proposals / max) * 100, 2)}%` }} />
                        <div className="w-2/5 rounded-t bg-violet-400" style={{ height: `${Math.max((row.civil / max) * 100, 2)}%` }} />
                      </div>
                    );
                  })}
                </div>
                <div className="mt-1 flex justify-between text-[8px] text-slate-400">{yearlyTrend.map((row) => <span key={row.year}>{row.year.slice(2)}</span>)}</div>
              </button>
              <button type="button" onClick={() => setActiveView('taxonomy')} className="rounded-xl border border-slate-200 p-4 text-left hover:border-blue-300">
                <div className="flex items-center justify-between"><strong className="inline-flex items-center gap-1 text-xs">🧩 분류별 근거 분포 <HelpTip label="현재 범위 안에서 제안·민원·뉴스가 많이 모인 소분류를 순서대로 보여줍니다. 긴 막대일수록 여러 근거가 집중된 주제입니다." /></strong><span className="text-[9px] font-black text-blue-600">Zoom-in ↗</span></div>
                <div className="mt-6 space-y-3">
                  {taxonomyRows.slice(0, 4).map((row) => {
                    const total = row.proposals + row.civil + row.news;
                    const max = Math.max(...taxonomyRows.slice(0, 4).map((item) => item.proposals + item.civil + item.news), 1);
                    return (
                      <div key={`${row.subCategory}-${row.microCategory}`}>
                        <div className="mb-1 flex justify-between text-[8px]"><span className="max-w-[75%] truncate">{row.microCategory}</span><b>{total}</b></div>
                        <div className="h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${(total / max) * 100}%` }} /></div>
                      </div>
                    );
                  })}
                </div>
              </button>
              <button type="button" onClick={() => setActiveView('gaps')} className="rounded-xl border border-slate-200 p-4 text-left hover:border-blue-300">
                <div className="flex items-center justify-between"><strong className="inline-flex items-center gap-1 text-xs">⚠️ 수요 대비 정책 공급 <HelpTip label="제안과 민원을 합친 수요 규모를 연결 정책 수 및 미답변 제안과 나란히 봅니다. 수요·미답변은 큰데 정책이 적으면 우선 검토 후보입니다." /></strong><span className="text-[9px] font-black text-blue-600">Zoom-in ↗</span></div>
                <div className="mt-7 grid grid-cols-3 gap-2 text-center">
                  {[['통합 수요', periodProposals.length + periodCivil.length], ['연결 정책', policyNames.size], ['미답변', unanswered]].map(([label, value], index) => (
                    <div key={String(label)} className={`rounded-lg p-3 ${index === 2 ? 'bg-rose-50 text-rose-700' : 'bg-slate-50 text-slate-700'}`}>
                      <strong className="block text-xl">{formatNumber(Number(value))}</strong>
                      <span className="text-[8px] font-bold">{String(label)}</span>
                    </div>
                  ))}
                </div>
              </button>
              <button type="button" onClick={() => setActiveView('districts')} className="rounded-xl border border-slate-200 p-4 text-left hover:border-blue-300">
                <div className="flex items-center justify-between"><strong className="inline-flex items-center gap-1 text-xs">🗺️ 수요·보육시설 상관 <HelpTip label="점 하나가 자치구 하나입니다. 오른쪽일수록 보육시설이 많고 위쪽일수록 현재 분류의 제안이 많아, 수요와 인프라가 함께 움직이는지 봅니다." /></strong><span className="text-[9px] font-black text-blue-600">Zoom-in ↗</span></div>
                <div className="relative mt-5 h-28 rounded-lg bg-gradient-to-br from-emerald-50 to-blue-50">
                  {districtRows.filter((row) => row.scopedProposalCount > 0).slice(0, 12).map((row, index) => (
                    <span
                      key={row.name}
                      title={`${row.name}: 제안 ${row.scopedProposalCount}건`}
                      className="absolute h-2.5 w-2.5 rounded-full bg-emerald-500"
                      style={{ left: `${8 + (row.daycare2025 / 300) * 78}%`, bottom: `${8 + Math.min(row.scopedProposalCount * 6, 78)}%`, opacity: 0.55 + (index % 4) * 0.1 }}
                    />
                  ))}
                  {!districtRows.some((row) => row.scopedProposalCount > 0) && (
                    <span className="absolute inset-0 flex items-center justify-center px-5 text-center text-[9px] font-bold text-slate-400">
                      현재 범위에는 자치구가 확인된 제안이 없습니다.
                    </span>
                  )}
                </div>
              </button>
              <button type="button" onClick={() => setActiveView('sources')} className="rounded-xl border border-slate-200 p-4 text-left hover:border-blue-300">
                <div className="flex items-center justify-between"><strong className="inline-flex items-center gap-1 text-xs">📰 출처 구성 현황 <HelpTip label="파랑은 시민 제안, 보라는 국민 민원, 주황은 뉴스입니다. 한 색만 보이면 교차 확인보다 해당 출처의 원문 검토가 우선입니다." /></strong><span className="text-[9px] font-black text-blue-600">Zoom-in ↗</span></div>
                <div className="mt-7 flex h-12 overflow-hidden rounded-lg">
                  {[
                    ['bg-blue-500', periodProposals.length],
                    ['bg-violet-500', periodCivil.length],
                    ['bg-amber-500', scopedNews.length],
                  ].map(([color, value], index) => {
                    const total = Math.max(periodProposals.length + periodCivil.length + scopedNews.length, 1);
                    return <div key={index} className={String(color)} style={{ width: `${(Number(value) / total) * 100}%` }} />;
                  })}
                </div>
                <p className="mt-2 text-[9px] text-slate-500">제안 {periodProposals.length} · 민원 {periodCivil.length} · 뉴스 {scopedNews.length}</p>
              </button>
              <div className="rounded-xl bg-[#25245f] p-5 text-white">
                <p className="inline-flex items-center gap-1 text-xs font-black">💡 통합 분석 활용 <HelpTip label="추천 검토 순서입니다. 급증 시점에서 시작해 세부 주제와 원문을 확인한 뒤 지역 인프라와 기존 정책의 공백까지 좁혀갑니다." /></p>
                <p className="mt-4 text-[11px] leading-relaxed text-indigo-100">기간 급증 → 세부 분류 → 원문 근거 → 자치구 인프라 → 정책 공백 순으로 연결해 검토합니다.</p>
                <div className="mt-8 border-t border-indigo-400/30 pt-3 text-[9px] font-bold text-indigo-200">각 카드를 눌러 상세 분석과 CSV를 확인하세요.</div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {cards.map((card) => (
              <button
                key={card.key}
                type="button"
                onClick={() => setActiveView(card.key)}
                className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className={`rounded-xl p-2.5 ${card.color}`}><card.icon className="h-5 w-5" /></div>
                  <span className="flex items-center gap-1 text-[10px] font-black text-blue-600">
                    상세 분석 <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                  </span>
                </div>
                <h3 className="mt-5 text-base font-black text-slate-900">{card.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{card.description}</p>
                <p className="mt-5 border-t border-slate-100 pt-3 text-[11px] font-black text-slate-700">{card.preview}</p>
              </button>
            ))}
          </div>
        </>
      )}

      {activeView === 'trends' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="space-y-3">
              <div>
                <h3 className="font-black">기간별 제안·민원 수요 트렌드</h3>
                <p className="mt-1 text-xs text-slate-500">동일 대·중·소분류 범위에서 연도별 시민 제안과 국민 민원의 변화를 비교합니다.</p>
              </div>
              <div className="flex flex-wrap gap-3 text-[10px] font-bold">
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-blue-600">
                  <span className="h-2 w-2 rounded-full bg-blue-500" /> 시민 제안
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-violet-600">
                  <span className="h-2 w-2 rounded-full bg-violet-500" /> 국민 민원
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-slate-500">
                  국민민원 2022~2024는 현재 로컬 원천 미수집
                </span>
              </div>
            </div>
            <div className="mt-8 grid h-72 grid-cols-5 items-end gap-5 border-b border-l border-slate-200 px-5">
              {yearlyTrend.map((row) => {
                const max = Math.max(...yearlyTrend.flatMap((item) => [item.proposals, item.civil]), 1);
                return (
                  <div key={row.year} className="flex h-full flex-col justify-end">
                    <div className="flex flex-1 items-end justify-center gap-2">
                      <div className="group relative w-8 rounded-t bg-blue-500" style={{ height: `${Math.max((row.proposals / max) * 100, 1)}%` }}>
                        <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-black text-blue-700">{row.proposals}</span>
                      </div>
                      {row.civilCollected ? (
                        <div className="group relative w-8 rounded-t bg-violet-500" style={{ height: `${Math.max((row.civil / max) * 100, 1)}%` }}>
                          <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-black text-violet-700">{row.civil}</span>
                        </div>
                      ) : (
                        <div className="group relative flex h-5 w-8 items-end justify-center rounded-t border border-dashed border-slate-300 bg-slate-50">
                          <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] font-black text-slate-400">미수집</span>
                        </div>
                      )}
                    </div>
                    <strong className="py-2 text-center text-[10px]">{row.year}</strong>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-black">뉴스 이슈 신호</p>
              <strong className="mt-3 block text-3xl font-black text-amber-600">{scopedNews.length}</strong>
              <p className="mt-2 text-[10px] leading-relaxed text-slate-500">현재 뉴스 데이터에는 발행일 필드가 없어 기간 추이가 아닌 누적 근거로 표시합니다.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-black">강한 뉴스 신호</p>
              <strong className="mt-3 block text-3xl font-black text-rose-600">{highStrengthNews}</strong>
              <p className="mt-2 text-[10px] text-slate-500">이슈 강도 ‘상’으로 분류된 기사 수입니다.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-black">정책 공급 연결</p>
              <strong className="mt-3 block text-3xl font-black text-emerald-600">{policyNames.size}</strong>
              <p className="mt-2 text-[10px] text-slate-500">현재 범위 제안에 매칭된 고유 정책 수입니다.</p>
            </div>
          </div>
        </div>
      )}

      {activeView === 'taxonomy' && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 p-4">
            <h3 className="font-black">대·중·소분류 통합 검토표</h3>
            <p className="mt-1 text-xs text-slate-500">상단 대분류·팀 범위에 해당하는 세부 태그별 실제 근거 건수입니다.</p>
          </div>
          <div className="max-h-[620px] overflow-auto">
            <table className="w-full min-w-[900px] text-left text-[11px]">
              <thead className="sticky top-0 bg-slate-900 text-white">
                <tr>
                  <th className="px-3 py-2.5">{renderSortLabel('category', '대분류')}</th>
                  <th className="px-3 py-2.5">{renderSortLabel('subCategory', '중분류')}</th>
                  <th className="px-3 py-2.5">{renderSortLabel('microCategory', '소분류')}</th>
                  <th className="px-3 py-2.5">{renderSortLabel('proposals', '제안')}</th>
                  <th className="px-3 py-2.5">{renderSortLabel('civil', '민원')}</th>
                  <th className="px-3 py-2.5">{renderSortLabel('news', '뉴스')}</th>
                  <th className="px-3 py-2.5">{renderSortLabel('unanswered', '미답변')}</th>
                  <th className="px-3 py-2.5">{renderSortLabel('votes', '공감')}</th>
                </tr>
              </thead>
              <tbody>
                {sortedTaxonomyRows.map((row) => (
                  <tr key={`${row.category}-${row.subCategory}-${row.microCategory}`} className="border-b border-slate-100 hover:bg-blue-50/50">
                    <td className="px-3 py-2.5 font-bold">{row.category}</td>
                    <td className="px-3 py-2.5">{row.subCategory}</td>
                    <td className="px-3 py-2.5">{row.microCategory}</td>
                    <td className="px-3 py-2.5 font-black text-blue-700">{row.proposals}</td>
                    <td className="px-3 py-2.5 font-black text-violet-700">{row.civil}</td>
                    <td className="px-3 py-2.5 font-black text-amber-700">{row.news}</td>
                    <td className="px-3 py-2.5 text-rose-700">{row.unanswered}</td>
                    <td className="px-3 py-2.5">{formatNumber(row.votes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeView === 'sources' && (
        <div className="grid gap-4 lg:grid-cols-3">
          {[
            {
              title: '시민 제안',
              items: periodProposals.slice(0, 12).map((item) => ({ title: item.title, subtitle: `${item.sub_category || '미분류'} · 공감 ${item.vote_score || 0}`, url: item.url })),
              exportRows: periodProposals.map((item) => ({ ID: item.id, 대분류: item.category, 중분류: item.sub_category, 소분류: item.micro_category, 제목: item.title, 본문: item.content, 공감수: item.vote_score, 댓글수: item.comment_cnt, 답변여부: item.reply_yn, 자치구: item.district, URL: item.url })),
            },
            {
              title: '국민 민원',
              items: periodCivil.slice(0, 12).map((item) => ({ title: item.title, subtitle: `${item.sub_category || '미분류'} · ${item.status || '상태 미상'}`, url: item.url })),
              exportRows: periodCivil.map((item) => ({ ID: item.id, 대분류: item.category, 중분류: item.sub_category, 소분류: item.micro_category, 제목: item.title, 본문: item.content, 상태: item.status, URL: item.url })),
            },
            {
              title: '뉴스 근거',
              items: scopedNews.slice(0, 12).map((item) => ({ title: item.title, subtitle: `${item.sub_category || '미분류'} · 이슈 ${item.strength || '미상'}`, url: item.url })),
              exportRows: scopedNews.map((item) => ({ 대분류: item.category, 중분류: item.sub_category, 소분류: item.micro_category, 제목: item.title, 요약: item.snippet, 이슈강도: item.strength, 활용유형: item.type, URL: item.url })),
            },
          ].map((column) => (
            <div key={column.title} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-black">{column.title}</h3>
                <button
                  type="button"
                  onClick={() => exportToCsv(`통합근거_${column.title}_${exportDate}`, column.exportRows)}
                  className="flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700 hover:bg-emerald-100"
                >
                  <Download className="h-3 w-3" /> CSV
                </button>
              </div>
              <div className="mt-3 space-y-2">
                {column.items.map((item, index) => (
                  <a key={`${item.title}-${index}`} href={item.url || '#'} target="_blank" rel="noreferrer" className="block rounded-lg border border-slate-100 p-3 hover:bg-slate-50">
                    <p className="line-clamp-2 text-xs font-bold">{item.title}</p>
                    <p className="mt-1 text-[10px] text-slate-500">{item.subtitle}</p>
                  </a>
                ))}
                {!column.items.length && <p className="py-10 text-center text-xs text-slate-400">현재 범위의 근거가 없습니다.</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeView === 'districts' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="font-black">자치구 수요·인프라 비교</h3>
          <p className="mt-1 text-xs text-slate-500">선택 범위 제안 수를 보육시설 수와 비교한 상위 자치구입니다.</p>
          <div className="mt-5 space-y-3">
            {districtRows.slice(0, 15).map((district) => {
              const max = Math.max(...districtRows.map((item) => item.pressure), 0.001);
              return (
                <div key={district.name} className="grid grid-cols-[72px_1fr_180px] items-center gap-3 text-[11px]">
                  <strong>{district.name}</strong>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.max((district.pressure / max) * 100, 1)}%` }} />
                  </div>
                  <span className="text-right text-slate-500">제안 {district.scopedProposalCount} · 시설 {district.daycare2025} · 출생 {formatNumber(district.births2025)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeView === 'gaps' && (
        <div className="grid gap-4 md:grid-cols-2">
          {[
            ['미답변 시민 수요', unanswered, '선택 범위에서 아직 답변되지 않은 제안', 'bg-rose-50 text-rose-700'],
            ['강한 뉴스 신호', highStrengthNews, '이슈 강도가 ‘상’으로 분류된 뉴스 근거', 'bg-amber-50 text-amber-700'],
            ['연결 정책', policyNames.size, '현재 제안들에 실제 매칭된 기존 정책', 'bg-emerald-50 text-emerald-700'],
            ['세부 분류', taxonomyRows.length, '교차 검토 가능한 대·중·소분류 조합', 'bg-indigo-50 text-indigo-700'],
          ].map(([title, value, description, color]) => (
            <div key={String(title)} className={`rounded-2xl p-5 ${color}`}>
              <p className="text-xs font-black">{String(title)}</p>
              <strong className="mt-3 block text-4xl font-black">{formatNumber(Number(value))}</strong>
              <p className="mt-2 text-xs opacity-80">{String(description)}</p>
            </div>
          ))}
        </div>
      )}
        </>
      )}
    </section>
  );
}
