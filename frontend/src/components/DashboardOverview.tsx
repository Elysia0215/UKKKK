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
  const [keywordLimit, setKeywordLimit] = React.useState<number>(10);

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

      {/* 상단 2개 그룹 레이아웃 (좌: 행정 지표 4개 2x2 / 우: 주요 인사이트 2개 좌우 반반) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* [왼쪽 그룹: 행정 기본 현황 (2x2 감싸기)] */}
        <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2.5 px-1">
            <span className="text-xs font-bold text-slate-600 tracking-tight flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              행정 & 제안 기본 현황
            </span>
            <span className="text-[11px] font-medium text-slate-400">4대 주요 지표</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
            {/* 1. 총 분석 제안 */}
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-md transition flex flex-col justify-between">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-xs text-slate-500 font-bold">총 분석 제안</p>
                  <h3 className="text-xl font-black text-slate-900 mt-1 font-mono">{stats.totalCount.toLocaleString()} <span className="text-xs font-normal text-slate-500">건</span></h3>
                </div>
                <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center font-bold">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">서울 출산·육아 정책 제안</p>
            </div>

            {/* 2. 평균 시민 공감도 */}
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-md transition flex flex-col justify-between">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-xs text-slate-500 font-bold">평균 시민 공감도</p>
                  <h3 className="text-xl font-black text-[#0A2351] mt-1 font-mono">{Math.round(proposals.reduce((acc, curr) => acc + curr.vote_score, 0) / (proposals.length || 1)).toLocaleString()} <span className="text-xs font-normal text-slate-500">표</span></h3>
                </div>
                <div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center font-bold">
                  <ThumbsUp className="w-4 h-4" />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">제안당 평균 공감도 산출</p>
            </div>

            {/* 3. 미답변 행정 건수 */}
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-md transition flex flex-col justify-between">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-xs text-slate-500 font-bold">미답변 행정 건수</p>
                  <h3 className="text-xl font-black text-rose-600 mt-1 font-mono">{stats.unansweredCount.toLocaleString()} <span className="text-xs font-normal text-slate-500">건</span></h3>
                </div>
                <div className="w-9 h-9 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center font-bold">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <p className="text-[11px] text-rose-500 font-bold">전체 제안의 약 {Math.round(stats.unansweredRate)}% 검토 대기중</p>
            </div>

            {/* 4. 행정 답변율 */}
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-md transition flex flex-col justify-between">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-xs text-slate-500 font-bold">행정 답변율</p>
                  <h3 className="text-xl font-black text-emerald-600 mt-1 font-mono">{(100 - stats.unansweredRate).toFixed(1)} <span className="text-xs font-normal text-slate-500">%</span></h3>
                </div>
                <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">공식 수용 및 답변 처리 비율</p>
            </div>
          </div>
        </div>

        {/* [오른쪽 그룹: 주요 인사이트 묶음 (좌우 반반 50:50 감싸기)] */}
        <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2.5 px-1">
            <span className="text-xs font-bold text-purple-700 tracking-tight flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              시민 제안 핵심 인사이트
            </span>
            <span className="text-[11px] font-medium text-slate-400">실시간 데이터 산출</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
            {/* 1번 카드: 최다 제안 분야 TOP 3 */}
            <div className="bg-white p-3.5 rounded-xl border border-purple-100 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
                    <Tag className="w-3 h-3 text-purple-600" />
                    최다 제안 분야 TOP 3
                  </span>
                  <Award className="w-4 h-4 text-purple-500" />
                </div>

                <div className="space-y-2">
                  {topCategories.map((item, idx) => {
                    const pct = Math.round((item.value / (proposals.length || 1)) * 100);
                    return (
                      <div 
                        key={idx}
                        onClick={() => onSelectCategory(item.name)}
                        className="p-1.5 rounded-lg hover:bg-purple-50/70 transition cursor-pointer group"
                      >
                        <div className="flex items-center justify-between text-xs mb-1 gap-2">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <span className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${
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
                onClick={() => onNavigateToTab(2)}
                className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-purple-600 hover:text-purple-800 font-bold cursor-pointer hover:bg-purple-50/30 p-1 rounded transition"
              >
                <span>분야별 전체 분석</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* 2번 카드: 최고 공감 제안 TOP 3 */}
            <div className="bg-white p-3.5 rounded-xl border border-amber-100 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                    <Flame className="w-3 h-3 text-amber-600" />
                    최고 공감 제안 TOP 3
                  </span>
                  <ThumbsUp className="w-4 h-4 text-amber-500" />
                </div>

                <div className="space-y-2">
                  {topVotedProposals.map((item, idx) => (
                    <div 
                      key={item.id || idx}
                      onClick={() => setSelectedKeywordModal(item.title)}
                      className="p-1.5 rounded-lg hover:bg-amber-50/70 transition cursor-pointer group flex items-start gap-2"
                    >
                      <span className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5 ${
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
                onClick={() => onNavigateToTab(3)}
                className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-amber-600 hover:text-amber-800 font-bold cursor-pointer hover:bg-amber-50/30 p-1 rounded transition"
              >
                <span>인기 이슈 제안 목록</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </div>
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
              className="text-[11px] text-[#0A2351] font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
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
            
            <div className="h-[210px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptStatsProcessed} margin={{ top: 10, right: 10, left: -25, bottom: 35 }}>
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 9, fill: '#475569', fontWeight: 600 }} 
                    angle={-30} 
                    textAnchor="end" 
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}
                    formatter={(value: any, name: any) => [
                      `${value}건`, 
                      (name === '답변 완료' || name === 'answered') ? '답변 완료' : '미답변 (검토 중)'
                    ]}
                  />
                  <Bar dataKey="answered" name="답변 완료" stackId="dept" fill="#cbd5e1" barSize={12} radius={[0, 0, 2, 2]} />
                  <Bar dataKey="unanswered" name="미답변" stackId="dept" fill="#f43f5e" barSize={12} radius={[3, 3, 0, 0]} />
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

      <KeywordDetailModal
        isOpen={!!selectedKeywordModal}
        keyword={selectedKeywordModal}
        proposals={proposals}
        onClose={() => setSelectedKeywordModal(null)}
      />
    </div>
  );
};
