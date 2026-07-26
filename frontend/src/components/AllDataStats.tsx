/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowLeft,
  BarChart3,
  Building2,
  CheckCircle,
  Database,
  ExternalLink,
  HelpCircle,
  Layers,
  Maximize2,
  ShieldAlert,
  ThumbsUp,
  X,
} from 'lucide-react';
import { PolicyProposal } from '../types';
import { getProposalDepartmentNames, getSortedDepartmentRankings } from '../utils/departments';

interface Props {
  proposals: PolicyProposal[];
  totalCount: number;
  selectedCategory?: string | null;
  selectedRrDept?: string | null;
}

type PanelId = 'category' | 'rr' | 'year' | 'answer' | 'subcategory' | 'quality';
type CountRow = { name: string; count: number };
type Drilldown = {
  title: string;
  items: PolicyProposal[];
};
type ChartClickEntry = CountRow & { payload?: CountRow };

const CATEGORY_COLORS = ['#0A2351', '#2563eb', '#059669', '#d97706', '#7c3aed', '#e11d48', '#0f766e', '#64748b'];
const STATUS_COLORS = ['#10b981', '#f59e0b'];
const CONTENT_APPROVAL_STORAGE_KEY = 'ukkkk-content-quality-approved-ids';

const loadApprovedContentIds = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(CONTENT_APPROVAL_STORAGE_KEY) || '[]');
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
};

const getYear = (proposal: PolicyProposal): string => {
  const year = proposal.reg_date?.slice(0, 4);
  return /^\d{4}$/.test(year || '') ? year as string : '미상';
};

const toCountRows = (counter: Map<string, number>, limit = 12) => (
  Array.from(counter.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ko'))
    .slice(0, limit)
);

const TopLegend = ({
  row,
  color,
  label = 'TOP',
}: {
  row?: { name: string; count: number };
  color: string;
  label?: string;
}) => {
  if (!row) return null;
  return (
    <div className="mt-2 flex min-h-6 items-center justify-between gap-2 rounded-md border border-slate-200 bg-white/90 px-2 py-1 text-[10px] font-black text-slate-600">
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <span className="shrink-0 text-slate-400">{label}</span>
        <span className="truncate text-slate-800">{row.name}</span>
      </span>
      <span className="shrink-0 font-mono text-slate-900">{row.count}건</span>
    </div>
  );
};

export const AllDataStats: React.FC<Props> = ({
  proposals,
  totalCount,
  selectedCategory,
  selectedRrDept,
}) => {
  const [activePanel, setActivePanel] = useState<PanelId | null>(null);
  const [drilldown, setDrilldown] = useState<Drilldown | null>(null);
  const [approvedContentIds, setApprovedContentIds] = useState<string[]>(loadApprovedContentIds);
  const approvedContentIdSet = useMemo(() => new Set(approvedContentIds), [approvedContentIds]);

  const needsContentReview = (proposal: PolicyProposal) => (
    proposal.connection_status === 'source_missing' && !approvedContentIdSet.has(proposal.id)
  );

  const updateContentApproval = (proposalId: string, approved: boolean) => {
    setApprovedContentIds((current) => {
      const next = approved
        ? Array.from(new Set([...current, proposalId]))
        : current.filter((id) => id !== proposalId);
      window.localStorage.setItem(CONTENT_APPROVAL_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const summary = useMemo(() => {
    const categoryCounter = new Map<string, number>();
    const subCategoryCounter = new Map<string, number>();
    const yearCounter = new Map<string, number>();
    const rrCounter = new Map<string, number>();
    const primaryCounter = new Map<string, number>();
    let unanswered = 0;
    let totalVotes = 0;
    let highVoteNoReply = 0;
    let policyMatched = 0;
    let sourceMissing = 0;

    proposals.forEach((proposal) => {
      categoryCounter.set(proposal.category, (categoryCounter.get(proposal.category) || 0) + 1);
      if (proposal.sub_category) {
        subCategoryCounter.set(proposal.sub_category, (subCategoryCounter.get(proposal.sub_category) || 0) + 1);
      }
      const year = getYear(proposal);
      yearCounter.set(year, (yearCounter.get(year) || 0) + 1);
      getProposalDepartmentNames(proposal).forEach((dept) => {
        rrCounter.set(dept, (rrCounter.get(dept) || 0) + 1);
      });
      const primary = getSortedDepartmentRankings(proposal)[0]?.dept_name;
      if (primary) {
        primaryCounter.set(primary, (primaryCounter.get(primary) || 0) + 1);
      }
      if (proposal.reply_yn === 'N') unanswered += 1;
      if (proposal.reply_yn === 'N' && proposal.vote_score >= 150) highVoteNoReply += 1;
      if (proposal.matched_policies?.length) policyMatched += 1;
      if (needsContentReview(proposal)) sourceMissing += 1;
      totalVotes += proposal.vote_score || 0;
    });

    return {
      categoryRows: toCountRows(categoryCounter, 12),
      subCategoryRows: toCountRows(subCategoryCounter, 12),
      yearRows: toCountRows(yearCounter, 12).sort((a, b) => b.name.localeCompare(a.name)),
      rrRows: toCountRows(rrCounter, 12),
      primaryRows: toCountRows(primaryCounter, 12),
      unanswered,
      answered: proposals.length - unanswered,
      avgVotes: proposals.length ? totalVotes / proposals.length : 0,
      highVoteNoReply,
      policyMatched,
      policyMatchedRate: proposals.length ? (policyMatched / proposals.length) * 100 : 0,
      sourceMissing,
    };
  }, [proposals, approvedContentIdSet]);

  const answerRows = [
    { name: '답변완료', count: summary.answered },
    { name: '미답변', count: summary.unanswered },
  ];
  const qualityRows = [
    { name: '유사 정책 후보 있음', count: summary.policyMatched },
    { name: '원문 확인 필요', count: summary.sourceMissing },
    { name: '고공감 미답변', count: summary.highVoteNoReply },
  ];
  const qualityTopRow = [...qualityRows].sort((a, b) => b.count - a.count)[0];
  const yearTopRow = [...summary.yearRows].sort((a, b) => b.count - a.count || b.name.localeCompare(a.name))[0];
  const qualityTopIndex = Math.max(0, qualityRows.findIndex((row) => row.name === qualityTopRow?.name));
  const scopeLabel = [
    selectedCategory || '전체 대분류',
    selectedRrDept || '전체 관련 R&R 팀',
  ].join(' / ');

  const openDrilldown = (title: string, predicate: (proposal: PolicyProposal) => boolean) => {
    setDrilldown({
      title,
      items: proposals.filter(predicate),
    });
  };

  const handleRowClick = (panelId: PanelId, row?: CountRow) => {
    if (!row) return;

    const predicates: Record<PanelId, (proposal: PolicyProposal) => boolean> = {
      category: (proposal) => proposal.category === row.name,
      rr: (proposal) => getProposalDepartmentNames(proposal).includes(row.name),
      year: (proposal) => getYear(proposal) === row.name,
      answer: (proposal) => row.name === '답변완료' ? proposal.reply_yn === 'Y' : proposal.reply_yn === 'N',
      subcategory: (proposal) => proposal.sub_category === row.name,
      quality: (proposal) => {
        if (row.name === '유사 정책 후보 있음') return Boolean(proposal.matched_policies?.length);
        if (row.name === '원문 확인 필요') return needsContentReview(proposal);
        return proposal.reply_yn === 'N' && proposal.vote_score >= 150;
      },
    };

    openDrilldown(`${row.name} · ${row.count.toLocaleString()}건`, predicates[panelId]);
  };

  const getClickedRow = (entry: ChartClickEntry): CountRow => entry.payload || entry;

  const renderBarHorizontal = (
    panelId: PanelId,
    data: CountRow[],
    color = '#0A2351',
  ) => (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ left: 12, right: 18, top: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
        <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} />
        <YAxis type="category" dataKey="name" width={148} tick={{ fontSize: 10, fill: '#334155', fontWeight: 700 }} />
        <Tooltip />
        <Bar
          dataKey="count"
          fill={color}
          radius={[0, 5, 5, 0]}
          cursor="pointer"
          onClick={(entry) => handleRowClick(panelId, getClickedRow(entry as ChartClickEntry))}
        />
      </BarChart>
    </ResponsiveContainer>
  );

  const panelContent: Record<PanelId, {
    title: string;
    description: string;
    preview: React.ReactNode;
    detail: React.ReactNode;
  }> = {
    category: {
      title: '대분류 분포',
      description: '현재 상단 필터 범위의 8대 정책 대분류별 제안 수입니다.',
      preview: (
        <div className="flex h-full flex-col">
          <div className="min-h-0 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.categoryRows.slice(0, 7)}>
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {summary.categoryRows.slice(0, 7).map((_, index) => (
                    <Cell key={index} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <TopLegend row={summary.categoryRows[0]} color={CATEGORY_COLORS[0]} />
        </div>
      ),
      detail: renderBarHorizontal('category', summary.categoryRows),
    },
    rr: {
      title: '관련 R&R 팀 분포',
      description: '1·2·3순위에 걸쳐 연결된 관련 R&R 팀별 제안 수입니다.',
      preview: (
        <div className="flex h-full flex-col">
          <div className="min-h-0 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.rrRows.slice(0, 7)}>
                <Bar dataKey="count" fill="#0891b2" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <TopLegend row={summary.rrRows[0]} color="#0891b2" />
        </div>
      ),
      detail: renderBarHorizontal('rr', summary.rrRows, '#0891b2'),
    },
    year: {
      title: '연도별 제안 분포',
      description: '현재 범위의 등록 연도별 제안 추이를 확인합니다.',
      preview: (
        <div className="flex h-full flex-col">
          <div className="min-h-0 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.yearRows}>
                <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <TopLegend row={yearTopRow} color="#2563eb" label="최다" />
        </div>
      ),
      detail: (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={summary.yearRows}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }} />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
            <Tooltip />
            <Bar
              dataKey="count"
              fill="#2563eb"
              radius={[6, 6, 0, 0]}
              cursor="pointer"
              onClick={(entry) => handleRowClick('year', getClickedRow(entry as ChartClickEntry))}
            />
          </BarChart>
        </ResponsiveContainer>
      ),
    },
    answer: {
      title: '답변 상태',
      description: '답변완료와 미답변 비중을 바로 확인합니다.',
      preview: (
        <div className="flex h-full flex-col">
          <div className="min-h-0 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={answerRows} dataKey="count" nameKey="name" innerRadius={34} outerRadius={62} paddingAngle={3}>
                  {answerRows.map((_, index) => (
                    <Cell key={index} fill={STATUS_COLORS[index]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <TopLegend
            row={[...answerRows].sort((a, b) => b.count - a.count)[0]}
            color={STATUS_COLORS[answerRows[0].count >= answerRows[1].count ? 0 : 1]}
            label="다수"
          />
        </div>
      ),
      detail: (
        <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={answerRows}
                dataKey="count"
                nameKey="name"
                innerRadius={72}
                outerRadius={118}
                paddingAngle={4}
                cursor="pointer"
                onClick={(entry) => handleRowClick('answer', getClickedRow(entry as ChartClickEntry))}
              >
                {answerRows.map((_, index) => (
                  <Cell key={index} fill={STATUS_COLORS[index]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col justify-center gap-3">
            {answerRows.map((row, index) => (
              <div key={row.name} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <span className="text-xs font-black text-slate-500">{row.name}</span>
                <div className="mt-2 text-3xl font-black" style={{ color: STATUS_COLORS[index] }}>{row.count}건</div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    subcategory: {
      title: '2차 중분류 TOP',
      description: '중분류 기준으로 어떤 세부 수요가 많은지 봅니다.',
      preview: (
        <div className="space-y-2 pt-3">
          {summary.subCategoryRows.slice(0, 5).map((row) => (
            <div key={row.name} className="flex items-center gap-2 text-[10px] font-bold text-slate-600">
              <span className="w-24 truncate">{row.name}</span>
              <div className="h-2 flex-1 rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-[#0A2351]" style={{ width: `${Math.max(6, (row.count / Math.max(1, proposals.length)) * 100)}%` }} />
              </div>
              <span>{row.count}</span>
            </div>
          ))}
        </div>
      ),
      detail: renderBarHorizontal('subcategory', summary.subCategoryRows, '#7c3aed'),
    },
    quality: {
      title: '검토 필요 데이터',
      description: '원문 확인 필요, 고공감 미답변, 정책 후보 연결 상태를 같이 봅니다.',
      preview: (
        <div className="flex h-full flex-col">
          <div className="grid min-h-0 flex-1 grid-cols-3 items-end gap-3 px-3 pb-1">
            {qualityRows.map((row, index) => (
              <div key={row.name} className="flex flex-col items-center gap-2">
                <div
                  className="w-full rounded-t-md"
                  style={{
                    height: `${Math.max(18, (row.count / Math.max(1, proposals.length)) * 120)}px`,
                    backgroundColor: ['#10b981', '#64748b', '#e11d48'][index],
                  }}
                />
                <span className="text-center text-[9px] font-black text-slate-500">{row.count}건</span>
              </div>
            ))}
          </div>
          <TopLegend
            row={qualityTopRow}
            color={['#10b981', '#64748b', '#e11d48'][qualityTopIndex]}
            label="최다"
          />
        </div>
      ),
      detail: renderBarHorizontal('quality', qualityRows, '#e11d48'),
    },
  };

  const statCards = [
    { label: '현재 표시 건수', value: proposals.length.toLocaleString(), note: `전체 ${totalCount.toLocaleString()}건 중`, icon: Database, tone: 'bg-blue-50 text-blue-700' },
    { label: '미답변', value: summary.unanswered.toLocaleString(), note: `${proposals.length ? ((summary.unanswered / proposals.length) * 100).toFixed(1) : '0.0'}%`, icon: HelpCircle, tone: 'bg-amber-50 text-amber-700' },
    { label: '고공감 미답변', value: summary.highVoteNoReply.toLocaleString(), note: '150+ 공감', icon: ThumbsUp, tone: 'bg-rose-50 text-rose-700' },
    { label: '평균 공감', value: summary.avgVotes.toFixed(1), note: '표 / 건', icon: BarChart3, tone: 'bg-emerald-50 text-emerald-700' },
    { label: '유사 정책 후보', value: `${summary.policyMatchedRate.toFixed(1)}%`, note: `${summary.policyMatched.toLocaleString()}건`, icon: CheckCircle, tone: 'bg-violet-50 text-violet-700' },
    { label: '원문 확인 필요', value: summary.sourceMissing.toLocaleString(), note: '원문 대조 후 승인', icon: ShieldAlert, tone: 'bg-slate-100 text-slate-700' },
  ];

  const panelOrder: PanelId[] = ['category', 'rr', 'year', 'answer', 'subcategory', 'quality'];
  const active = activePanel ? panelContent[activePanel] : null;

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2 text-[#0A2351]">
              <Database className="h-5 w-5" />
              <h2 className="text-lg font-black">필터 검증 통계</h2>
            </div>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              상단 대분류와 관련 R&R 팀 필터가 실제 제안 데이터에 어떻게 적용됐는지 확인합니다.
            </p>
          </div>
          <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-black text-blue-800">
            현재 범위: {scopeLabel}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-6">
          {statCards.map((metric) => {
            const Icon = metric.icon;
            return (
              <div key={metric.label} className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-black text-slate-500">{metric.label}</span>
                  <span className={`rounded-md p-1.5 ${metric.tone}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                </div>
                <div className="mt-3 text-2xl font-black text-slate-950">{metric.value}</div>
                <div className="mt-1 text-[11px] font-bold text-slate-400">{metric.note}</div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-base font-black text-slate-900">
              <Layers className="h-4 w-4 text-blue-600" />
              제안 데이터 검증 카드
            </h3>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              제안 원본만 기준으로 분류·연도·답변·R&R·품질 상태를 점검합니다.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          {panelOrder.map((panelId) => {
            const panel = panelContent[panelId];
            return (
              <button
                key={panelId}
                type="button"
                onClick={() => {
                  setDrilldown(null);
                  setActivePanel(panelId);
                }}
                className="group min-h-[230px] rounded-lg border border-slate-200 bg-white p-4 text-left shadow-xs transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-black text-slate-900">{panel.title}</h4>
                    <p className="mt-1 line-clamp-2 text-[11px] font-semibold leading-relaxed text-slate-500">
                      {panel.description}
                    </p>
                  </div>
                  <span className="flex shrink-0 items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 text-[10px] font-black text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white">
                    Zoom-in <Maximize2 className="h-3 w-3" />
                  </span>
                </div>
                <div className="h-36 rounded-lg bg-slate-50/70 p-2">
                  {panel.preview}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
        <div className="mb-4 flex items-center gap-2 text-slate-800">
          <Building2 className="h-4 w-4 text-blue-600" />
          <h3 className="text-sm font-black">주관부서 TOP 목록</h3>
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
          {summary.primaryRows.map((row, index) => (
            <div key={row.name} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <span className="text-xs font-black text-slate-700">
                {index + 1}. {row.name}
              </span>
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-black text-blue-700">
                {row.count}건
              </span>
            </div>
          ))}
        </div>
      </section>

      {active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-5 backdrop-blur-xs">
          <div className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-[#0A2351] px-5 py-4 text-white">
              <div>
                <h3 className="text-lg font-black">{active.title}</h3>
                <p className="mt-1 text-xs font-semibold text-blue-100">{active.description}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDrilldown(null);
                  setActivePanel(null);
                }}
                className="rounded-lg bg-white/10 p-2 text-white transition hover:bg-white/20"
                aria-label="확대 보기 닫기"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="h-[560px] overflow-y-auto p-5">
              {drilldown ? (
                <div className="space-y-4">
                  <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-200 bg-white pb-3">
                    <button
                      type="button"
                      onClick={() => setDrilldown(null)}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      차트로 돌아가기
                    </button>
                    <strong className="text-sm font-black text-slate-900">{drilldown.title}</strong>
                  </div>
                  {drilldown.items.length ? drilldown.items.map((proposal) => (
                    <article key={proposal.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-black text-slate-500">
                        <span>{proposal.id}</span>
                        <span>·</span>
                        <span>{getYear(proposal)}</span>
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">{proposal.category}</span>
                        <span className={proposal.reply_yn === 'Y' ? 'text-emerald-700' : 'text-amber-700'}>
                          {proposal.reply_yn === 'Y' ? '답변완료' : '미답변'}
                        </span>
                      </div>
                      <h4 className="mt-2 text-sm font-black text-slate-950">{proposal.title}</h4>
                      <p className="mt-2 line-clamp-3 whitespace-pre-line text-xs font-semibold leading-relaxed text-slate-600">
                        {proposal.content || '원문 보강 필요'}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-slate-500">
                          공감 {(proposal.vote_score || 0).toLocaleString()} · 댓글 {(proposal.comment_cnt || 0).toLocaleString()}
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                          {proposal.url && (
                            <a
                              href={proposal.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 rounded-md border border-blue-200 bg-white px-2.5 py-1.5 text-[11px] font-black text-blue-700 hover:bg-blue-50"
                            >
                              원문 대조 <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                          {proposal.connection_status === 'source_missing' && (
                            approvedContentIdSet.has(proposal.id) ? (
                              <button
                                type="button"
                                onClick={() => updateContentApproval(proposal.id, false)}
                                className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-black text-slate-600 hover:bg-slate-100"
                              >
                                정상 승인 취소
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => updateContentApproval(proposal.id, true)}
                                className="rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-black text-emerald-700 hover:bg-emerald-100"
                              >
                                원문과 동일 · 정상 승인
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    </article>
                  )) : (
                    <div className="rounded-lg border border-dashed border-slate-300 p-10 text-center text-sm font-bold text-slate-500">
                      해당 조건의 제안이 없습니다.
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full">
                  <p className="mb-2 text-right text-[11px] font-bold text-blue-600">
                    막대 또는 원형 조각을 누르면 해당 제안 목록을 확인할 수 있습니다.
                  </p>
                  <div className="h-[500px]">{active.detail}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
