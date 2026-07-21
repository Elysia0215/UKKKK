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
  const topKeywords = extractTopKeywords(proposals);
  const deptStats = getDepartmentStats(proposals);

  // 카테고리별 데이터 산출
  const categoryCount = proposals.reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData: { name: string; value: number }[] = Object.entries(categoryCount).map(([name, value]) => ({
    name,
    value: value as number
  }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  // 공감수가 높은 미답변 핵심 현안 (정책 공백 3건 간략 요약)
  const keyGaps = [...proposals]
    .filter(p => p.reply_yn === 'N')
    .sort((a, b) => b.vote_score - a.vote_score)
    .slice(0, 3);

  return (
    <div className="space-y-6">
      {/* 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between hover:shadow-md transition"
        >
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">전체 제안 수</p>
            <h3 className="text-3xl font-black text-slate-900 mt-1">{stats.totalCount} <span className="text-sm font-normal text-slate-500">건</span></h3>
            <p className="text-[11px] text-blue-600 font-bold mt-1.5 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>전월 대비 +12% 증가</span>
            </p>
          </div>
          <div className="p-3 bg-blue-50/80 text-blue-700 rounded-lg border border-blue-100">
            <FileText className="w-6 h-6" />
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between hover:shadow-md transition"
        >
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">평균 공감수</p>
            <h3 className="text-3xl font-black text-slate-900 mt-1">{stats.avgVoteScore.toFixed(1)} <span className="text-sm font-normal text-slate-500">표</span></h3>
            <p className="text-[11px] text-emerald-600 font-bold mt-1.5 flex items-center gap-1">
              <ThumbsUp className="w-3.5 h-3.5" />
              <span>시민 참여도 상승 중</span>
            </p>
          </div>
          <div className="p-3 bg-emerald-50/80 text-emerald-700 rounded-lg border border-emerald-100">
            <ThumbsUp className="w-6 h-6" />
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between hover:shadow-md transition"
        >
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">미답변 제안 수</p>
            <h3 className="text-3xl font-black text-amber-600 mt-1">{stats.unansweredCount} <span className="text-sm font-normal text-slate-500">건</span></h3>
            <p className="text-[11px] text-amber-600 font-bold mt-1.5 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>검토 및 부서 배정 완료</span>
            </p>
          </div>
          <div className="p-3 bg-amber-50/80 text-amber-700 rounded-lg border border-amber-100">
            <Clock className="w-6 h-6" />
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between hover:shadow-md transition"
        >
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">미답변 비율</p>
            <h3 className="text-3xl font-black text-rose-600 mt-1">{stats.unansweredRate.toFixed(1)}<span className="text-sm font-normal text-slate-500">%</span></h3>
            <p className="text-[11px] text-rose-600 font-bold mt-1.5 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>우선 대응 및 답변 필요</span>
            </p>
          </div>
          <div className="p-3 bg-rose-50/80 text-rose-700 rounded-lg border border-rose-100">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </motion.div>
      </div>

      {/* 핵심 3개 분석 지표 1행 3컬럼 통합 레이아웃 (3:4:5 비율) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* 1. 최근 급증 키워드 TOP 5 (lg:col-span-3) */}
        <div className="lg:col-span-3 bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between hover:shadow-sm transition">
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200/80">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <TrendingUp className="text-rose-500 w-4 h-4" />
                급증 키워드 TOP 5
              </h4>
              <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded font-mono">가중치</span>
            </div>
            
            <div className="space-y-3 pt-1">
              {topKeywords.map((item, index) => {
                const maxVal = topKeywords[0]?.count || 1;
                const percentage = (item.count / maxVal) * 100;
                return (
                  <div key={item.keyword} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="w-4 h-4 bg-[#0A2351] text-white font-bold rounded text-[9px] flex items-center justify-center">
                          {index + 1}
                        </span>
                        <span className="font-bold text-slate-800 text-xs">{item.keyword}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono font-semibold">{item.count}회</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className={`h-full rounded-full ${
                          index === 0 ? 'bg-rose-500' :
                          index === 1 ? 'bg-amber-500' :
                          index === 2 ? 'bg-[#0A2351]' :
                          'bg-slate-400'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <button 
              onClick={() => onNavigateToTab(2)}
              className="text-[11px] text-[#0A2351] font-bold hover:underline inline-flex items-center gap-1"
            >
              상세 원문 분석하기
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* 2. 속까지 채워진 3D 입체 파이 차트 - 정책 분야별 제안 비중 (lg:col-span-4) */}
        <div className="lg:col-span-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:shadow-sm transition flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200/80">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <PieIcon className="text-indigo-600 w-4 h-4" />
                분야별 제안 비중 (3D 파이)
              </h4>
              <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded font-mono">카테고리 누적</span>
            </div>

            {/* 3D 꽉 찬 원형 파이 차트 (innerRadius={0}) + 3D 섀도우 필터 */}
            <div className="h-[150px] w-full relative filter drop-shadow-lg">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={0}
                    outerRadius={68}
                    paddingAngle={1.5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[index % COLORS.length]} 
                        stroke="#ffffff" 
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    content={({ active, payload }: any) => {
                      if (active && payload && payload.length) {
                        const data = payload[0];
                        const total = proposals.length || 1;
                        const ratio = ((data.value / total) * 100).toFixed(1);
                        const color = data.payload.fill || data.color || '#3b82f6';
                        return (
                          <div className="bg-slate-900/95 text-white p-3 rounded-xl shadow-2xl border border-slate-700/80 backdrop-blur-xs space-y-1.5 min-w-[150px] z-50">
                            <div className="flex items-center gap-2 border-b border-slate-700/60 pb-1.5">
                              <span className="w-3 h-3 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: color }} />
                              <span className="font-black text-xs text-white">{data.name}</span>
                            </div>
                            <div className="space-y-1 text-[11px] pt-0.5">
                              <div className="flex justify-between items-center text-slate-300">
                                <span>제안 건수:</span>
                                <span className="font-black text-amber-400 font-mono text-xs">{data.value}건</span>
                              </div>
                              <div className="flex justify-between items-center text-slate-300">
                                <span>점유 비율:</span>
                                <span className="font-black text-sky-400 font-mono text-xs">{ratio}%</span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* 콤팩트 범례 목록 */}
            <div className="grid grid-cols-2 gap-1.5 pt-2">
              {pieData.map((entry, index) => {
                const total = proposals.length;
                const ratio = ((entry.value / total) * 100).toFixed(1);
                return (
                  <div 
                    key={entry.name} 
                    onClick={() => onSelectCategory(entry.name)}
                    className="flex items-center justify-between p-1 hover:bg-slate-100 border border-transparent hover:border-slate-200 rounded cursor-pointer transition text-xs"
                    title="클릭 시 해당 분야 필터링"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-xs shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="font-bold text-slate-700 truncate text-[11px]">{entry.name}</span>
                    </div>
                    <span className="text-[10px] font-bold text-[#0A2351] font-mono shrink-0 ml-1">{ratio}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 3. 부서별 제안 접수 현황 (위로 올려서 붙임) (lg:col-span-5) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:shadow-sm transition flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200/80">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Building2 className="text-slate-600 w-4 h-4" />
                부서별 제안 접수 현황
              </h4>
              <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded font-mono">부서 매칭 카운트</span>
            </div>
            
            <div className="h-[185px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptStats} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}
                    formatter={(value, name) => [
                      `${value}건`, 
                      name === 'count' ? '총 접수' : '미답변'
                    ]}
                  />
                  <Bar dataKey="count" name="총 접수" fill="#6366f1" radius={[3, 3, 0, 0]}>
                    {deptStats.map((entry, index) => (
                      <Cell key={`cell-total-${index}`} fill={entry.unanswered > 0 ? '#818cf8' : '#cbd5e1'} />
                    ))}
                  </Bar>
                  <Bar dataKey="unanswered" name="미답변" fill="#f43f5e" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-2 flex flex-wrap items-center justify-center gap-3 text-[10px] font-bold">
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 bg-slate-300 rounded-xs" />
                <span className="text-slate-500">답변 완료</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 bg-[#818cf8] rounded-xs" />
                <span className="text-slate-500">미답변 포함</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 bg-[#f43f5e] rounded-xs" />
                <span className="text-slate-500">긴급 미답변</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 하단: 긴급 주요 정책 공백 (미답변 고공감 민원) 보드 */}
      <div className="bg-gradient-to-br from-rose-50/65 to-amber-50/40 p-5 rounded-xl border border-rose-200/80 shadow-xs hover:shadow-sm transition">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-bold text-rose-950 flex items-center gap-2">
            <AlertTriangle className="text-rose-600 w-4.5 h-4.5" />
            긴급: 주요 정책 공백 (미답변 고공감 민원 3선)
          </h4>
          <span className="text-[11px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full border border-rose-200 animate-pulse">
            우선 대응 및 정책 발굴 필요
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {keyGaps.map(gap => (
            <div 
              key={gap.id}
              onClick={() => onNavigateToTab(3)}
              className="bg-white p-3.5 rounded-xl border border-rose-100 hover:border-rose-300 hover:shadow-md cursor-pointer transition flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start gap-2 mb-1.5">
                  <span className="text-[10px] font-black bg-rose-50 text-rose-700 px-2 py-0.5 rounded border border-rose-200">
                    공감 {gap.vote_score}표
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold font-mono bg-slate-100 px-1.5 py-0.5 rounded">{gap.district} · {gap.category}</span>
                </div>
                <h5 className="text-xs font-bold text-slate-900 line-clamp-1 mb-1">{gap.title}</h5>
                <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">{gap.content}</p>
              </div>
              <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap gap-1">
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
    </div>
  );
};
