/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { 
  FileText, 
  ThumbsUp, 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  TrendingUp, 
  AlertTriangle,
  Building2,
  PieChart as PieIcon,
  ChevronRight
} from 'lucide-react';
import { PolicyProposal, DashboardStats } from '../types';
import { extractTopKeywords, getDepartmentStats } from '../data/mockData';
import { KeywordDetailModal } from './KeywordDetailModal';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from 'recharts';

interface Props {
  proposals: PolicyProposal[];
  stats: DashboardStats;
  onNavigateToTab: (tabIndex: number) => void;
  onSelectCategory: (category: string) => void;
}

export const DashboardOverview: React.FC<Props> = ({ 
  proposals, 
  stats, 
  onNavigateToTab,
  onSelectCategory
}) => {
  const [selectedKeywordModal, setSelectedKeywordModal] = React.useState<string | null>(null);
  const [keywordLimit, setKeywordLimit] = React.useState<number>(10);
  const topKeywords = extractTopKeywords(proposals, keywordLimit);
  const deptStats = getDepartmentStats(proposals);

  // 카테고리별 데이터 산출
  const categoryCount = proposals.reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData: { name: string; value: number }[] = Object.entries(categoryCount)
    .map(([name, value]) => ({
      name: name || '기타',
      value: value as number
    }))
    .sort((a, b) => b.value - a.value);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#6366f1', '#64748b'];

  // 공감수가 높은 미답변 핵심 현안 (정책 공백 3건 간략 요약)
  const keyGaps = [...proposals]
    .filter(p => p.reply_yn === 'N')
    .sort((a, b) => b.vote_score - a.vote_score)
    .slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Top 4 KPI 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 총 수집 제안 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-xs text-slate-500 font-bold">총 분석 제안</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1 font-mono">{stats.totalCount.toLocaleString()} <span className="text-xs font-normal text-slate-500">건</span></h3>
            </div>
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">상상대로 서울 출산·육아 정밀 제안</p>
        </div>

        {/* 평균 시민 공감수 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-xs text-slate-500 font-bold">평균 시민 공감도</p>
              <h3 className="text-2xl font-black text-[#0A2351] mt-1 font-mono">{stats.avgVoteScore} <span className="text-xs font-normal text-slate-500">표</span></h3>
            </div>
            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center font-bold">
              <ThumbsUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">제안당 평균 공감도 산출</p>
        </div>

        {/* 총 댓글 수 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-xs text-slate-500 font-bold">미답변 행정 건수</p>
              <h3 className="text-2xl font-black text-rose-600 mt-1 font-mono">{stats.unansweredCount.toLocaleString()} <span className="text-xs font-normal text-slate-500">건</span></h3>
            </div>
            <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-rose-500 font-bold">전체 제안의 {stats.unansweredRate}% 검토 대기중</p>
        </div>

        {/* 답변 완료율 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-xs text-slate-500 font-bold">행정 답변율</p>
              <h3 className="text-2xl font-black text-emerald-600 mt-1 font-mono">{(100 - stats.unansweredRate).toFixed(1)} <span className="text-xs font-normal text-slate-500">%</span></h3>
            </div>
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">공식 수용 및 답변 처리 완료 비율</p>
        </div>
      </div>

      {/* 키워드 분석 및 카테고리 분포 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 최근 급증 키워드 TOP 10 / TOP 30 */}
        <div className="lg:col-span-5 bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between hover:shadow-sm transition">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200/80">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="text-rose-500 w-5 h-5" />
                최근 급증 키워드 TOP {keywordLimit}
              </h4>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setKeywordLimit(keywordLimit === 10 ? 30 : 10)}
                  className="text-[10px] bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold px-2 py-0.5 rounded border border-blue-200 cursor-pointer transition"
                >
                  {keywordLimit === 10 ? '🔍 TOP 30개까지 크게 보기' : '접기 (TOP 10)'}
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              시민들이 작성한 제안에서 핵심 단어를 정규화 추출한 빈도 순위입니다. (키워드 클릭 시 원문 견본 팝업)
            </p>
            <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
              {topKeywords.map((item, index) => {
                const maxVal = topKeywords[0]?.count || 1;
                const percentage = (item.count / maxVal) * 100;
                return (
                  <div
                    key={item.keyword}
                    onClick={() => setSelectedKeywordModal(item.keyword)}
                    className="space-y-1 p-1.5 rounded-lg hover:bg-blue-50/70 border border-transparent hover:border-blue-200 cursor-pointer transition-all"
                    title={`클릭하여 '${item.keyword}' 관련 제안 원문 보기`}
                  >
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 font-bold rounded text-[10px] flex items-center justify-center ${
                          index < 3 ? 'bg-rose-500 text-white' : 'bg-[#0A2351]'
                        }`}>
                          {index + 1}
                        </span>
                        <span className="font-bold text-slate-800 hover:text-blue-600">#{item.keyword}</span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono font-semibold">
                        <b className="text-blue-700 font-bold">{item.proposalCount}건</b> ({item.count}회 감지) ↗
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className={`h-full rounded-full ${
                          index < 3 ? 'bg-rose-500' : 'bg-[#0A2351]'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#0A2351]">
            <button 
              onClick={() => setSelectedKeywordModal(topKeywords[0]?.keyword || '보육/돌봄')}
              className="hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              상세 원문 분석 ↗
            </button>
            <button 
              onClick={() => onNavigateToTab(2)} // 3번 탭 (인덱스 2): 키워드 분석
              className="bg-blue-50 hover:bg-blue-100 text-blue-800 px-2.5 py-1 rounded-md border border-blue-200 inline-flex items-center gap-1 cursor-pointer"
            >
              🏷️ 30개 태그 클라우드 대형 뷰 (3번 탭) ›
            </button>
          </div>
        </div>

        {/* 분야별 제안 비중 */}
        <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-slate-200 shadow-xs hover:shadow-sm transition">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200/80">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <PieIcon className="text-indigo-600 w-5 h-5" />
              정책 분야별 제안 비중
            </h4>
            <span className="text-[11px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded font-mono">카테고리별 누적</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            <div className="md:col-span-7 h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [`${value}건`, '제안 수']}
                    contentStyle={{ borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="md:col-span-5 space-y-2">
              {pieData.map((entry, index) => {
                const total = proposals.length;
                const ratio = ((entry.value / total) * 100).toFixed(1);
                return (
                  <div 
                    key={entry.name} 
                    onClick={() => onSelectCategory(entry.name)}
                    className="flex items-center justify-between p-1.5 hover:bg-slate-100 border border-transparent hover:border-slate-200 rounded-lg cursor-pointer transition"
                    title="클릭 시 해당 분야 필터링"
                  >
                    <div className="flex items-center gap-2 text-xs">
                      <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="font-bold text-slate-700">{entry.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-[#0A2351]">{entry.value}건</span>
                      <span className="text-[10px] text-slate-400 ml-1.5 font-mono">({ratio}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 핵심 정책 공백 알림 및 부서별 현황 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 정책 공백 경보 보드 */}
        <div className="bg-gradient-to-br from-rose-50/65 to-amber-50/40 p-6 rounded-xl border border-rose-200/80 shadow-xs hover:shadow-sm transition">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-rose-950 flex items-center gap-2">
              <AlertTriangle className="text-rose-600 w-5 h-5" />
              긴급: 주요 정책 공백 (미답변 고공감 민원)
            </h4>
            <span className="text-[11px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full border border-rose-200 animate-pulse">
              우선 검토 필요
            </span>
          </div>
          <p className="text-xs text-rose-800 mb-4 leading-relaxed">
            공감수(시민 호응도)가 매우 높으나 아직 부서의 공식 답변이 등록되지 않은(reply_yn = N) 주요 시민 목소리입니다.
          </p>
          <div className="space-y-3">
            {keyGaps.map(gap => (
              <div 
                key={gap.id}
                onClick={() => onNavigateToTab(3)} // 4번 탭 (인덱스 3): 우선순위 상세
                className="bg-white p-4 rounded-xl border border-rose-100 hover:border-rose-300 hover:shadow-md cursor-pointer transition"
              >
                <div className="flex justify-between items-start gap-2 mb-1.5">
                  <span className="text-[10px] font-black bg-rose-50 text-rose-700 px-2 py-0.5 rounded border border-rose-200">
                    공감 {gap.vote_score}표
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold font-mono bg-slate-100 px-1.5 py-0.5 rounded">{gap.district} · {gap.category}</span>
                </div>
                <h5 className="text-xs font-bold text-slate-900 line-clamp-1 mb-1">{gap.title}</h5>
                <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">{gap.content}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {gap.department.map(dept => (
                    <span key={dept} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded flex items-center gap-1 font-semibold">
                      <Building2 className="w-2.5 h-2.5 text-slate-400" />
                      {dept}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 부서별 접수 및 답변 현황 */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs hover:shadow-sm transition flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200/80">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="text-slate-600 w-5 h-5" />
                부서별 제안 접수 현황
              </h4>
              <span className="text-[11px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded font-mono">부서 매칭 카운트</span>
            </div>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptStats} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}
                    formatter={(value, name) => [
                      `${value}건`, 
                      name === 'count' ? '총 접수' : '미답변'
                    ]}
                  />
                  <Bar dataKey="count" name="총 접수" fill="#6366f1" radius={[4, 4, 0, 0]}>
                    {deptStats.map((entry, index) => (
                      <Cell key={`cell-total-${index}`} fill={entry.unanswered > 0 ? '#818cf8' : '#cbd5e1'} />
                    ))}
                  </Bar>
                  <Bar dataKey="unanswered" name="미답변" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-[10px] font-bold">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 bg-slate-300 rounded-xs" />
                <span className="text-slate-500">답변 완료</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 bg-[#818cf8] rounded-xs" />
                <span className="text-slate-500">미답변 포함 (검토 중)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 bg-[#f43f5e] rounded-xs" />
                <span className="text-slate-500">긴급 미답변</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <KeywordDetailModal
        isOpen={!!selectedKeywordModal}
        keyword={selectedKeywordModal}
        proposals={proposals}
        onClose={() => setSelectedKeywordModal(null)}
      />
    </div>
  );
};
