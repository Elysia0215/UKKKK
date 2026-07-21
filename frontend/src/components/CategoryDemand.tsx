/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Line, ComposedChart } from 'recharts';
import { PolicyCategory, PolicyProposal } from '../types';
import { extractTopKeywords } from '../data/mockData';
import { KeywordDetailModal } from './KeywordDetailModal';
import { 
  BarChart3, 
  ThumbsUp, 
  Eye, 
  ChevronRight, 
  FileText, 
  Calendar, 
  Building2, 
  MessageSquare,
  Sparkles,
  ExternalLink,
  Tag
} from 'lucide-react';

interface Props {
  proposals: PolicyProposal[];
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
}

export const CategoryDemand: React.FC<Props> = ({
  proposals,
  selectedCategory,
  onSelectCategory
}) => {
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [selectedKeywordModal, setSelectedKeywordModal] = useState<string | null>(null);

  const topKeywords30 = useMemo(() => extractTopKeywords(proposals, 30), [proposals]);

  // 카테고리별 통계 데이터 가공
  const categoryChartData = useMemo(() => {
    const stats: Record<string, { count: number; totalVote: number }> = {
      '임신': { count: 0, totalVote: 0 },
      '출산': { count: 0, totalVote: 0 },
      '보육': { count: 0, totalVote: 0 },
      '다자녀': { count: 0, totalVote: 0 },
      '위기임산부': { count: 0, totalVote: 0 },
      '다문화': { count: 0, totalVote: 0 },
    };

    proposals.forEach(p => {
      if (stats[p.category]) {
        stats[p.category].count += 1;
        stats[p.category].totalVote += p.vote_score;
      }
    });

    return Object.entries(stats).map(([name, val]) => ({
      name,
      count: val.count,
      avgVote: val.count > 0 ? Math.round(val.totalVote / val.count) : 0
    }));
  }, [proposals]);

  // 공감수 최고순 제안 5건
  const topVotedProposals = useMemo(() => {
    return [...proposals]
      .sort((a, b) => b.vote_score - a.vote_score)
      .slice(0, 5);
  }, [proposals]);

  // 카테고리별 필터링된 제안들
  const filteredProposals = useMemo(() => {
    if (!selectedCategory) return proposals;
    return proposals.filter(p => p.category === selectedCategory);
  }, [proposals, selectedCategory]);

  // 현재 상세히 보기 위한 제안 정보
  const activeProposal = useMemo(() => {
    const idToFind = selectedProposalId || topVotedProposals[0]?.id;
    return proposals.find(p => p.id === idToFind);
  }, [proposals, selectedProposalId, topVotedProposals]);

  return (
    <div className="space-y-6">
      {/* 전체 출산·육아 핵심 키워드 태그 클라우드 (TOP 30 대형 뷰) */}
      <div className="bg-gradient-to-r from-slate-900 to-[#0A2351] text-white p-6 rounded-2xl shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-yellow-400" />
            <h3 className="text-base font-black">전체 정책 키워드 태그 탐색기 (TOP 30 대형 뷰)</h3>
          </div>
          <span className="text-xs text-blue-200 font-mono">태그 클릭 시 426건 중 관련 제안 원문 팝업</span>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {topKeywords30.map((item, idx) => (
            <button
              key={item.keyword}
              onClick={() => setSelectedKeywordModal(item.keyword)}
              className={`text-xs px-3 py-1.5 rounded-full font-extrabold border transition-all cursor-pointer flex items-center gap-1.5 ${
                idx < 5
                  ? 'bg-rose-500 hover:bg-rose-600 text-white border-rose-400 shadow-sm hover:scale-105'
                  : idx < 15
                  ? 'bg-blue-600/80 hover:bg-blue-600 text-white border-blue-400 hover:scale-105'
                  : 'bg-white/10 hover:bg-white/20 text-blue-100 border-white/20 hover:scale-105'
              }`}
              title={`'${item.keyword}' 관련 본문 총 ${item.count}회 등장 (클릭하여 연관 제안 원문 보기)`}
            >
              <span>#{item.keyword}</span>
              <span className="text-[10px] bg-black/30 px-1.5 py-0.2 rounded-full font-mono font-normal">
                {item.count}회
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 2축 복합 분석 그래프 */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs hover:shadow-sm transition">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 pb-4 border-b border-slate-200/80 gap-2">
          <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="text-indigo-600 w-5 h-5" />
              정책 분야별 수요 강도 복합 분석 (제안수 vs 평균 공감도)
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              막대(제안수)는 민원의 양을, 선(평균 공감도)은 시민들의 체감 수요 강도를 의미합니다.
            </p>
          </div>
          {selectedCategory && (
            <button
              onClick={() => onSelectCategory(null)}
              className="text-xs text-[#0A2351] font-bold hover:underline"
            >
              전체 보기
            </button>
          )}
        </div>

        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={categoryChartData} margin={{ top: 10, right: -15, left: -25, bottom: 5 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 'bold' }} />
              <YAxis yAxisId="left" label={{ value: '제안 건수 (건)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: 10, fill: '#0A2351', fontWeight: 'bold' } }} tick={{ fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" label={{ value: '평균 공감수 (표)', angle: 90, position: 'insideRight', style: { textAnchor: 'middle', fontSize: 10, fill: '#f59e0b', fontWeight: 'bold' } }} tick={{ fontSize: 10 }} />
              <Tooltip 
                contentStyle={{ borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}
                formatter={(value, name) => [
                  name === 'count' ? `${value}건` : `${value}표`,
                  name === 'count' ? '제안 건수' : '평균 공감도'
                ]}
              />
              <Bar yAxisId="left" dataKey="count" name="count" fill="#0A2351" radius={[4, 4, 0, 0]} cursor="pointer" onClick={(state) => {
                if (state && state.activeLabel) onSelectCategory(state.activeLabel as string);
              }} />
              <Line yAxisId="right" type="monotone" dataKey="avgVote" name="avgVote" stroke="#f59e0b" strokeWidth={3} dot={{ r: 5, fill: '#f59e0b' }} activeDot={{ r: 8 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-6 mt-3 text-xs">
          <div className="flex items-center gap-1.5 font-bold">
            <span className="w-4 h-2.5 bg-[#0A2351] rounded-xs" />
            <span className="text-slate-600">제안 건수 (좌측 축)</span>
          </div>
          <div className="flex items-center gap-1.5 font-bold">
            <span className="w-4 h-0.5 bg-amber-500 relative block"><span className="absolute -top-1 left-1 w-2.5 h-2.5 rounded-full bg-amber-500" /></span>
            <span className="text-slate-600">평균 공감수 (우측 축)</span>
          </div>
        </div>
      </div>

      {/* 키워드/공감수 탑 5 & 원문 미리보기 스플릿 스크린 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 공감수 탑 리스트 */}
        <div className="lg:col-span-5 bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between hover:shadow-sm transition">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 mb-4">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ThumbsUp className="text-[#0A2351] w-4.5 h-4.5" />
                시민 공감도 Top 5 제안
              </h4>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-bold">실시간</span>
            </div>

            <div className="space-y-3">
              {topVotedProposals.map((prop, idx) => {
                const isActive = activeProposal?.id === prop.id;
                return (
                  <div
                    key={prop.id}
                    onClick={() => setSelectedProposalId(prop.id)}
                    className={`p-3 rounded-lg border transition cursor-pointer flex items-center gap-3 ${
                      isActive 
                        ? 'bg-[#0a2351]/5 border-[#0A2351]' 
                        : 'bg-slate-50 border-slate-200/60 hover:border-slate-300'
                    }`}
                  >
                    <span className={`w-6 h-6 rounded-full font-black text-xs flex items-center justify-center flex-shrink-0 ${
                      idx === 0 ? 'bg-amber-100 text-amber-800' :
                      idx === 1 ? 'bg-slate-200 text-slate-700' :
                      idx === 2 ? 'bg-orange-100 text-orange-800' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h5 className="text-xs font-bold text-slate-800 line-clamp-1">{prop.title}</h5>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 font-bold">
                        <span>{prop.district}</span>
                        <span>•</span>
                        <span className="text-[#0A2351]">{prop.category}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-xs font-bold text-slate-700 font-mono flex items-center gap-1 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                        <ThumbsUp className="w-3 h-3 text-blue-500" />
                        {prop.vote_score}표
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 bg-slate-50 p-3 rounded-xl flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500 flex-shrink-0" />
            <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
              공감수는 다수 시민들의 공통적 고충을 판단하는 중요 기준입니다. 미답변 정책공백에 주목하세요.
            </p>
          </div>
        </div>

        {/* 원문 미리보기 */}
        <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between hover:shadow-sm transition">
          <AnimatePresence mode="wait">
            {activeProposal ? (
              <motion.div
                key={activeProposal.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-4"
              >
                {/* 헤더 */}
                <div className="border-b border-slate-200/80 pb-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold bg-[#0A2351] text-white px-2.5 py-0.5 rounded-full">
                        {activeProposal.category}
                      </span>
                      <span className="text-xs text-slate-500 font-bold font-mono">{activeProposal.id}</span>
                    </div>
                    <span className="text-xs text-slate-500 font-bold font-mono flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                      <Calendar className="w-3.5 h-3.5" />
                      {activeProposal.reg_date}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 leading-snug">
                    {activeProposal.title}
                  </h3>
                </div>

                {/* 원문내용 */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 max-h-[190px] overflow-y-auto">
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line font-sans">
                    {activeProposal.content}
                  </p>
                </div>

                {/* 메타데이터 */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-200 space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">시민 참여 정보</p>
                    <div className="flex items-center gap-4 text-slate-700 font-mono font-semibold mt-1">
                      <span className="flex items-center gap-1 bg-white border border-slate-100 px-2 py-0.5 rounded shadow-2xs">
                        <ThumbsUp className="w-3.5 h-3.5 text-blue-500" /> 공감 {activeProposal.vote_score}
                      </span>
                      <span className="flex items-center gap-1 bg-white border border-slate-100 px-2 py-0.5 rounded shadow-2xs">
                        <MessageSquare className="w-3.5 h-3.5 text-slate-400" /> 댓글 {activeProposal.comment_cnt}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-200 space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">발생 지역 및 부서</p>
                    <div className="mt-1 space-y-1">
                      <p className="text-xs text-slate-700 font-bold">{activeProposal.district}</p>
                      <div className="flex flex-wrap gap-1">
                        {activeProposal.department.map(dept => (
                          <span key={dept} className="text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded flex items-center gap-0.5 font-bold">
                            <Building2 className="w-2.5 h-2.5 text-slate-400" />
                            {dept}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 답변상태 뱃지 및 원문 URL */}
                <div className="flex flex-col gap-2 bg-slate-100 p-3 rounded-xl text-xs text-slate-700 border border-slate-200">
                  <div className="flex justify-between items-center">
                    <span className="font-bold">공식 답변 등록 상태:</span>
                    {activeProposal.reply_yn === 'Y' ? (
                      <span className="text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-lg font-bold">
                        답변 완료
                      </span>
                    ) : (
                      <span className="text-[11px] bg-rose-50 text-rose-800 border border-rose-200 px-2.5 py-0.5 rounded-lg font-bold">
                        미답변 (검토 중)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                    <span className="font-bold text-slate-500">원문 링크:</span>
                    <a
                      href={activeProposal.url || `https://idea.seoul.go.kr/front/freeSuggest/view.do?sn=${activeProposal.id.replace('PROP-', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 hover:underline font-medium text-xs bg-white px-2.5 py-1 rounded-md border border-blue-200 transition-colors"
                      title={activeProposal.url || `https://idea.seoul.go.kr/front/freeSuggest/view.do?sn=${activeProposal.id.replace('PROP-', '')}`}
                    >
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate max-w-[220px]">
                        {activeProposal.url || `https://idea.seoul.go.kr/front/freeSuggest/view.do?sn=${activeProposal.id.replace('PROP-', '')}`}
                      </span>
                    </a>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="text-center py-20 text-slate-400 text-xs">
                제안을 선택하시면 실시간 원문 미리보기가 여기에 로드됩니다.
              </div>
            )}
          </AnimatePresence>
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
