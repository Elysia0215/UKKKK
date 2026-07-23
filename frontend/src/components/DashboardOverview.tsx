/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
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
  ChevronRight,
  Award,
  Flame,
  Tag,
  Sparkles
} from 'lucide-react';
import { PolicyProposal, DashboardStats } from '../types';
import { extractTopKeywords, getDepartmentStats } from '../data/mockData';
import { KeywordDetailModal } from './KeywordDetailModal';
import { HoverScrollText } from './HoverScrollText';
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
  selectedDept?: string | null;
}

export const DashboardOverview: React.FC<Props> = ({ 
  proposals, 
  stats, 
  onNavigateToTab,
  onSelectCategory,
  selectedDept
}) => {
  const [selectedKeywordModal, setSelectedKeywordModal] = React.useState<string | null>(null);
  const [keywordLimit, setKeywordLimit] = React.useState<number>(5);

  // 부서별 필터 매칭 로직
  const filteredProposals = React.useMemo(() => {
    if (!selectedDept) return proposals;
    return proposals.filter(p => {
      if (selectedDept === '건강임신지원팀') return p.category === '임신·난임·생식건강';
      if (selectedDept === '저출생사업1팀') return p.category === '출산·산후 초기지원';
      if (selectedDept === '저출생사업2팀') return p.category === '다자녀·양육비·생활지원' && (p.sub_category?.includes('양육비') || p.sub_category?.includes('생활비') || p.sub_category?.includes('지원') || p.sub_category?.includes('다자녀'));
      if (selectedDept === '영유아담당관') return p.category === '보육·돌봄 인프라';
      if (selectedDept === '가족지원팀') return p.category === '일·가정 양립·부모 노동';
      if (selectedDept === '주거정비과') return p.category === '주거·교통·도시생활환경';
      if (selectedDept === '가족건강팀') return p.sub_category?.includes('건강') || p.sub_category?.includes('의료') || p.sub_category?.includes('치료') || p.category === '취약·다양가족 사각지대';
      if (selectedDept === '아동보호팀') return p.category === '취약·다양가족 사각지대';
      return true;
    });
  }, [proposals, selectedDept]);

  const topKeywords = extractTopKeywords(filteredProposals, keywordLimit);
  const deptStats = getDepartmentStats(filteredProposals);
  const deptStatsProcessed = React.useMemo(() => {
    return deptStats.map(d => ({
      ...d,
      name: d.dept,
      answered: Math.max(0, d.total - d.unanswered)
    }));
  }, [deptStats]);

  // 카테고리별 데이터 산출
  const categoryCount = filteredProposals.reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData: { name: string; value: number }[] = Object.entries(categoryCount)
    .map(([name, value]) => ({
      name: name || '기타',
      value: value as number
    }))
    .sort((a, b) => b.value - a.value);

  const topCategories = pieData.slice(0, 3);

  const topVotedProposals = useMemo(() => {
    if (!filteredProposals || filteredProposals.length === 0) return [];
    return [...filteredProposals].sort((a, b) => b.vote_score - a.vote_score).slice(0, 3);
  }, [filteredProposals]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#6366f1', '#64748b'];

  // 공감수가 높은 미답변 핵심 현안 (정책 공백 3건 간략 요약)
  const keyGaps = [...filteredProposals]
    .filter(p => p.reply_yn === 'N')
    .sort((a, b) => b.vote_score - a.vote_score)
    .slice(0, 3);

  return (
    <div className="space-y-6">
      {/* 부서 전용 필터 경고 배너 */}
      {selectedDept && (
        <div className="bg-blue-50/80 border border-blue-200/80 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg text-white">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                🏢 {selectedDept} R&R 업무 모니터링 모드 활성화
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                해당 부서 전담 카테고리에 연관된 총 {filteredProposals.length}건의 제안 및 민원 위주로 필터링되었습니다.
              </p>
            </div>
          </div>
          <div className="text-xs font-mono font-bold text-blue-600 bg-white border border-blue-200 px-3 py-1.5 rounded-lg shadow-2xs">
            담당 우선검토 안건: {filteredProposals.filter(p => p.reply_yn === 'N').length}건 미답변
          </div>
        </div>
      )}

      {/* 4대 주요 지표 가로형 슬림 스트레이트 바 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        {/* 1. 총 분석 제안 */}
        <div className="p-3 bg-slate-50/50 rounded-lg border border-slate-100 flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">총 분석 제안</p>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <span className="text-lg font-black text-slate-900 font-mono">
                {selectedDept ? filteredProposals.length.toLocaleString() : proposals.length.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-500 font-medium">건</span>
              {selectedDept && (
                <span className="text-[9px] text-slate-400 font-medium ml-1">
                  / {proposals.length.toLocaleString()}건 (전체)
                </span>
              )}
            </div>
            {selectedDept && (
              <span className="text-[8px] bg-blue-100/70 text-blue-700 font-bold px-1.5 py-0.2 rounded-full mt-1 inline-block">
                부서 비중 {Math.round((filteredProposals.length / (proposals.length || 1)) * 100)}%
              </span>
            )}
          </div>
          <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center font-bold shrink-0 ml-2">
            <FileText className="w-4 h-4" />
          </div>
        </div>

        {/* 2. 평균 시민 공감도 */}
        <div className="p-3 bg-slate-50/50 rounded-lg border border-slate-100 flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">평균 시민 공감도</p>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <span className="text-lg font-black text-slate-900 font-mono">
                {selectedDept 
                  ? Math.round(filteredProposals.reduce((acc, curr) => acc + curr.vote_score, 0) / (filteredProposals.length || 1)).toLocaleString()
                  : Math.round(proposals.reduce((acc, curr) => acc + curr.vote_score, 0) / (proposals.length || 1)).toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-500 font-medium">표</span>
              {selectedDept && (
                <span className="text-[9px] text-slate-400 font-medium ml-1">
                  / 전체 {Math.round(proposals.reduce((acc, curr) => acc + curr.vote_score, 0) / (proposals.length || 1)).toLocaleString()}표
                </span>
              )}
            </div>
            {selectedDept && (
              <span className="text-[8px] bg-amber-100/70 text-amber-700 font-bold px-1.5 py-0.2 rounded-full mt-1 inline-block">
                격차 {Math.round(filteredProposals.reduce((acc, curr) => acc + curr.vote_score, 0) / (filteredProposals.length || 1)) - Math.round(proposals.reduce((acc, curr) => acc + curr.vote_score, 0) / (proposals.length || 1)) >= 0 ? `+${Math.round(filteredProposals.reduce((acc, curr) => acc + curr.vote_score, 0) / (filteredProposals.length || 1)) - Math.round(proposals.reduce((acc, curr) => acc + curr.vote_score, 0) / (proposals.length || 1))}` : Math.round(filteredProposals.reduce((acc, curr) => acc + curr.vote_score, 0) / (filteredProposals.length || 1)) - Math.round(proposals.reduce((acc, curr) => acc + curr.vote_score, 0) / (proposals.length || 1))}표
              </span>
            )}
          </div>
          <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center font-bold shrink-0 ml-2">
            <ThumbsUp className="w-4 h-4" />
          </div>
        </div>

        {/* 3. 미답변 행정 건수 */}
        <div className="p-3 bg-slate-50/50 rounded-lg border border-slate-100 flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">미답변 행정 건수</p>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <span className="text-lg font-black text-rose-600 font-mono">
                {selectedDept 
                  ? filteredProposals.filter(p => p.reply_yn === 'N').length.toLocaleString()
                  : proposals.filter(p => p.reply_yn === 'N').length.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-500 font-medium">건</span>
              {selectedDept && (
                <span className="text-[9px] text-slate-400 font-medium ml-1">
                  / {proposals.filter(p => p.reply_yn === 'N').length.toLocaleString()}건 (전체)
                </span>
              )}
            </div>
            {selectedDept ? (
              <span className="text-[8px] bg-rose-100/70 text-rose-700 font-bold px-1.5 py-0.2 rounded-full mt-1 inline-block">
                부서 미답변 비중 {Math.round((filteredProposals.filter(p => p.reply_yn === 'N').length / (proposals.filter(p => p.reply_yn === 'N').length || 1)) * 100)}%
              </span>
            ) : (
              <span className="text-[8px] text-rose-500 font-bold mt-1 inline-block">
                전체 제안의 약 {Math.round((proposals.filter(p => p.reply_yn === 'N').length / (proposals.length || 1)) * 100)}% 검토 대기중
              </span>
            )}
          </div>
          <div className="w-8 h-8 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center font-bold shrink-0 ml-2">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        {/* 4. 행정 답변율 */}
        <div className="p-3 bg-slate-50/50 rounded-lg border border-slate-100 flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">행정 답변율</p>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <span className="text-lg font-black text-emerald-600 font-mono">
                {selectedDept
                  ? ((filteredProposals.filter(p => p.reply_yn === 'Y').length / (filteredProposals.length || 1)) * 100).toFixed(1)
                  : ((proposals.filter(p => p.reply_yn === 'Y').length / (proposals.length || 1)) * 100).toFixed(1)}
              </span>
              <span className="text-[10px] text-slate-500 font-medium">%</span>
              {selectedDept && (
                <span className="text-[9px] text-slate-400 font-medium ml-1">
                  / 전체 {((proposals.filter(p => p.reply_yn === 'Y').length / (proposals.length || 1)) * 100).toFixed(1)}%
                </span>
              )}
            </div>
            {selectedDept && (
              <span className="text-[8px] bg-emerald-100/70 text-emerald-700 font-bold px-1.5 py-0.2 rounded-full mt-1 inline-block">
                답변 격차 {(((filteredProposals.filter(p => p.reply_yn === 'Y').length / (filteredProposals.length || 1)) * 100) - ((proposals.filter(p => p.reply_yn === 'Y').length / (proposals.length || 1)) * 100)).toFixed(1)}%p
              </span>
            )}
          </div>
          <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center font-bold shrink-0 ml-2">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* 시민 제안 핵심 인사이트 (최다 제안 분야 / 최고 공감 제안 좌우 배치) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        {/* 1번 카드: 최다 제안 분야 TOP 3 */}
        <div className="bg-white p-4 rounded-xl border border-purple-100 shadow-2xs flex flex-col justify-between hover:shadow-xs transition h-full">
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-md">
                <Tag className="w-3.5 h-3.5 text-purple-600" />
                최다 제안 분야 TOP 3
              </span>
              <Award className="w-4 h-4 text-purple-500" />
            </div>

            <div className="space-y-3">
              {topCategories.map((item, idx) => {
                const pct = Math.round((item.value / (filteredProposals.length || 1)) * 100);
                return (
                  <div 
                    key={idx}
                    onClick={() => onSelectCategory(item.name)}
                    className="p-2 rounded-lg hover:bg-purple-50/70 transition cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5 gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className={`w-4.5 h-4.5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${
                          idx === 0 ? 'bg-purple-600 text-white' : idx === 1 ? 'bg-purple-200 text-purple-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {idx + 1}
                        </span>
                        <HoverScrollText 
                          text={item.name} 
                          className="font-bold text-slate-800 text-xs group-hover:text-purple-700 transition" 
                        />
                      </div>
                      <span className="text-[11px] font-mono font-bold text-purple-600 shrink-0 ml-1">
                        {pct}% <span className="text-[10px] font-normal text-slate-400">({item.value}건)</span>
                      </span>
                    </div>
                    {/* 미니 게이지 바 */}
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${idx === 0 ? 'bg-purple-600' : idx === 1 ? 'bg-purple-400' : 'bg-purple-300'}`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div 
            onClick={() => onNavigateToTab(1)}
            className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-purple-600 hover:text-purple-800 font-bold cursor-pointer hover:bg-purple-50/30 p-1 rounded transition"
          >
            <span>분야별 전체 분석</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* 2번 카드: 최고 공감 제안 TOP 3 */}
        <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-2xs flex flex-col justify-between hover:shadow-xs transition h-full">
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md">
                <Flame className="w-3.5 h-3.5 text-amber-600" />
                최고 공감 제안 TOP 3
              </span>
              <ThumbsUp className="w-4 h-4 text-amber-500" />
            </div>

            <div className="space-y-3">
              {topVotedProposals.map((item, idx) => (
                <div 
                  key={item.id || idx}
                  onClick={() => setSelectedKeywordModal(item.title)}
                  className="p-2 rounded-lg hover:bg-amber-50/70 transition cursor-pointer group flex items-start gap-2.5"
                >
                  <span className={`w-4.5 h-4.5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                    idx === 0 ? 'bg-amber-500 text-white' : idx === 1 ? 'bg-amber-200 text-amber-900' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <HoverScrollText 
                      text={item.title} 
                      className="text-xs font-bold text-slate-800 group-hover:text-amber-700 transition leading-snug" 
                    />
                    <p className="text-[10px] font-mono font-bold text-amber-600 mt-0.5">
                      총 {item.vote_score.toLocaleString()} 표 <span className="text-slate-400 font-normal">공감</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div 
            onClick={() => onNavigateToTab(2)}
            className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-amber-600 hover:text-amber-800 font-bold cursor-pointer hover:bg-amber-50/30 p-1 rounded transition"
          >
            <span>인기 이슈 제안 목록</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* 핵심 3개 분석 지표 1행 3컬럼 통합 레이아웃 (3:4:5 비율) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* 1. 최근 급증 키워드 (lg:col-span-3) */}
        <div className="lg:col-span-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between hover:shadow-sm transition h-full">
          <div>
            <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-200/80">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <TrendingUp className="text-rose-500 w-3.5 h-3.5" />
                급증 키워드 TOP {keywordLimit}
              </h4>
              <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-1 py-0.5 rounded font-mono">가중치</span>
            </div>
            
            <div className="space-y-1.5 pt-0.5">
              {topKeywords.map((item, index) => {
                const maxVal = topKeywords[0]?.count || 1;
                const percentage = (item.count / maxVal) * 100;
                return (
                  <div key={item.keyword} className="space-y-0.5">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3.5 h-3.5 bg-[#0A2351] text-white font-bold rounded text-[8px] flex items-center justify-center">
                          {index + 1}
                        </span>
                        <span className="font-bold text-slate-800 text-xs">{item.keyword}</span>
                      </div>
                      <span className="text-[9px] text-slate-500 font-mono font-semibold">{item.count}회</span>
                    </div>
                    <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
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
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
            <button 
              onClick={() => setKeywordLimit(keywordLimit === 5 ? 10 : 5)}
              className="text-[#0A2351] font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              {keywordLimit === 5 ? '➕ 더보기 (TOP 10)' : '➖ 접기 (TOP 5)'}
            </button>
            <button 
              onClick={() => onNavigateToTab(1)}
              className="text-slate-500 font-medium hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              상세 원문 분석
              <ChevronRight className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>

        {/* 2. 속까지 채워진 3D 입체 파이 차트 - 정책 분야별 제안 비중 (lg:col-span-4) */}
        <div className="lg:col-span-4 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs hover:shadow-sm transition flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-200/80">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <PieIcon className="text-indigo-600 w-3.5 h-3.5" />
                분야별 제안 비중 (3D 파이)
              </h4>
              <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-1 py-0.5 rounded font-mono">카테고리 누적</span>
            </div>

            {/* 3D 꽉 찬 원형 파이 차트 (innerRadius={0}) + 3D 섀도우 필터 */}
            <div className="h-[110px] w-full relative filter drop-shadow-lg">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={0}
                    outerRadius={50}
                    paddingAngle={1.5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[index % COLORS.length]} 
                        stroke="#ffffff" 
                        strokeWidth={1.5}
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
                          <div className="bg-slate-900/95 text-white p-2.5 rounded-lg shadow-2xl border border-slate-700/80 backdrop-blur-xs space-y-1 min-w-[130px] z-50">
                            <div className="flex items-center gap-1.5 border-b border-slate-700/60 pb-1">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                              <span className="font-black text-[11px] text-white">{data.name}</span>
                            </div>
                            <div className="space-y-0.5 text-[10px] pt-0.5">
                              <div className="flex justify-between items-center text-slate-300">
                                <span>제안 건수:</span>
                                <span className="font-black text-amber-400 font-mono">{data.value}건</span>
                              </div>
                              <div className="flex justify-between items-center text-slate-300">
                                <span>점유 비율:</span>
                                <span className="font-black text-sky-400 font-mono">{ratio}%</span>
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
          </div>

          {/* 콤팩트 범례 목록 (Pushed to bottom!) */}
          <div className="grid grid-cols-2 gap-1 pt-1.5 mt-2 border-t border-slate-100">
            {pieData.slice(0, 4).map((entry, index) => {
              const total = proposals.length;
              const ratio = ((entry.value / total) * 100).toFixed(1);
              return (
                <div 
                  key={entry.name} 
                  onClick={() => onSelectCategory(entry.name)}
                  className="flex items-center justify-between p-0.5 hover:bg-slate-100 rounded cursor-pointer transition text-[10px]"
                  title="클릭 시 해당 분야 필터링"
                >
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="w-2 h-2 rounded-xs shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="font-bold text-slate-700 truncate text-[10px]">{entry.name}</span>
                  </div>
                  <span className="text-[9px] font-bold text-[#0A2351] font-mono shrink-0 ml-0.5">{ratio}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. 부서별 제안 접수 현황 (lg:col-span-5) */}
        <div className="lg:col-span-5 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs hover:shadow-sm transition flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-200/80">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Building2 className="text-slate-600 w-3.5 h-3.5" />
                부서별 제안 접수 현황
              </h4>
              <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-1 py-0.5 rounded font-mono">부서 매칭</span>
            </div>
            
            <div className="h-[130px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptStatsProcessed} margin={{ top: 5, right: 5, left: -30, bottom: 20 }}>
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 8, fill: '#475569', fontWeight: 600 }} 
                    angle={-20} 
                    textAnchor="end" 
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 8 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', padding: '6px' }}
                    formatter={(value: any, name: any) => [
                      `${value}건`, 
                      (name === '답변 완료' || name === 'answered') ? '답변 완료' : '미답변 (검토 중)'
                    ]}
                  />
                  <Bar dataKey="answered" name="답변 완료" stackId="dept" fill="#cbd5e1" barSize={10} radius={[0, 0, 1, 1]} />
                  <Bar dataKey="unanswered" name="미답변" stackId="dept" fill="#f43f5e" barSize={10} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-[10px] font-bold">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-[#cbd5e1] rounded-xs" />
                <span className="text-slate-600">답변 완료</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-[#f43f5e] rounded-xs" />
                <span className="text-slate-600">미답변 (긴급 검토)</span>
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
              onClick={() => onNavigateToTab(2)}
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

      <KeywordDetailModal
        isOpen={!!selectedKeywordModal}
        keyword={selectedKeywordModal}
        proposals={proposals}
        onClose={() => setSelectedKeywordModal(null)}
      />
    </div>
  );
};
