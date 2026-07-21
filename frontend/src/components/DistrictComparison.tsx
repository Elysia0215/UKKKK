/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, ThumbsUp, MessageSquare, HelpCircle, CheckCircle, ArrowUpDown, ExternalLink } from 'lucide-react';
import { PolicyProposal } from '../types';
import { SEOUL_DISTRICTS } from '../data/mockData';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ComposedChart, Line, Legend } from 'recharts';
import { districtStats } from '../data/mockData';

interface Props {
  proposals: PolicyProposal[];
  selectedDistrict: string | null;
  onSelectDistrict: (district: string | null) => void;
}

export const DistrictComparison: React.FC<Props> = ({
  proposals,
  selectedDistrict,
  onSelectDistrict
}) => {
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // 자치구별 데이터 계산
  const districtData = useMemo(() => {
    const counts = SEOUL_DISTRICTS.reduce((acc, dist) => {
      acc[dist] = { count: 0, avgVote: 0, totalVote: 0 };
      return acc;
    }, {} as Record<string, { count: number; avgVote: number; totalVote: number }>);

    proposals.forEach(prop => {
      if (counts[prop.district]) {
        counts[prop.district].count += 1;
        counts[prop.district].totalVote += prop.vote_score;
      }
    });

    return Object.entries(counts)
      .map(([name, stats]) => ({
        name,
        count: stats.count,
        avgVote: stats.count > 0 ? Math.round(stats.totalVote / stats.count) : 0
      }))
      .filter(item => item.count > 0 || selectedDistrict === item.name) // 제안이 있는 구만 우선 보거나 전체 출력
      .sort((a, b) => {
        return sortOrder === 'desc' ? b.count - a.count : a.count - b.count;
      });
  }, [proposals, sortOrder, selectedDistrict]);

  // 자치구별 제안 건수 + 공공데이터(실제 출생아수) 결합 - 수요-공급 갭 비교용
  const districtGapData = useMemo(() => {
    const proposalCounts = SEOUL_DISTRICTS.reduce((acc, dist) => {
      acc[dist] = 0;
      return acc;
    }, {} as Record<string, number>);
    proposals.forEach(prop => {
      if (proposalCounts[prop.district] !== undefined) {
        proposalCounts[prop.district] += 1;
      }
    });

    return districtStats.map(stat => ({
      name: stat.district,
      proposalCount: proposalCounts[stat.district] || 0,
      births: stat.births_total ?? 0,
      childcare: stat.childcare_facility_count ?? 0,
    }));
  }, [proposals]);


  const filteredProposals = useMemo(() => {
    if (!selectedDistrict) return [];
    return proposals.filter(p => p.district === selectedDistrict);
  }, [proposals, selectedDistrict]);

  return (
    <div className="space-y-6">
      {/* 공공데이터 결합: 제안건수 vs 실제 출생아수·보육시설 */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs hover:shadow-sm transition">
        <div className="mb-4 pb-4 border-b border-slate-200/80">
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <MapPin className="text-emerald-600 w-5 h-5" />
            자치구별 시민제안 vs 공공데이터(실제 출생아수·보육시설)
          </h4>
          <p className="text-xs text-slate-500 mt-1">
            서울 열린데이터광장 통계(2024~2025)와 시민제안 건수를 함께 비교해 수요-공급 격차를 확인합니다.
            제안 건수가 많은데 실제 출생아수·보육시설도 뒷받침되는지 한눈에 볼 수 있습니다.
          </p>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={districtGapData} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
              <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 'bold' }} interval={0} angle={-35} textAnchor="end" height={60} />
              <YAxis yAxisId="left" tick={{ fontSize: 10 }} label={{ value: '제안 건수', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#0A2351', fontWeight: 'bold' } }} allowDecimals={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} label={{ value: '실제 출생아수 (명)', angle: 90, position: 'insideRight', style: { fontSize: 10, fill: '#059669', fontWeight: 'bold' } }} />
              <Tooltip contentStyle={{ borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar yAxisId="left" dataKey="proposalCount" name="시민제안 건수" fill="#0A2351" radius={[4, 4, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="births" name="실제 출생아수(2024)" stroke="#059669" strokeWidth={3} dot={{ r: 4, fill: '#059669' }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[11px] text-slate-400 italic font-semibold mt-2 text-center">
          * 시민제안은 267건 중 지역 명시분(45건, 16.9%)만 반영되어 표본이 제한적입니다. 공공데이터(출생아수 등)는 자치구 전수 통계입니다.
        </p>
      </div>

      {/* 자치구별 제안수 막대그래프 */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs hover:shadow-sm transition">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 pb-4 border-b border-slate-200/80 gap-4">
          <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="text-red-600 w-5 h-5" />
              서울시 자치구별 제안 통계
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              막대바를 클릭하거나 아래 버튼을 통해 자치구별 상세 제안을 확인할 수 있습니다.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 px-3 py-1.5 rounded-lg border border-slate-200/80 font-bold flex items-center gap-1 transition"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              {sortOrder === 'desc' ? '건수 높은 순' : '건수 낮은 순'}
            </button>
            {selectedDistrict && (
              <button
                onClick={() => onSelectDistrict(null)}
                className="text-xs bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg font-bold hover:bg-red-100 transition"
              >
                필터 초기화
              </button>
            )}
          </div>
        </div>

        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={districtData} 
              margin={{ top: 10, right: 10, left: -25, bottom: 5 }}
              onClick={(state) => {
                if (state && state.activeLabel) {
                  onSelectDistrict(state.activeLabel as string);
                }
              }}
            >
              <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 'bold' }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}
                formatter={(value) => [`${value}건`, '제안 수']}
              />
              <Bar dataKey="count" fill="#93c5fd" radius={[4, 4, 0, 0]} cursor="pointer">
                {districtData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.name === selectedDistrict ? '#ef4444' : '#0A2351'} 
                    className="hover:opacity-85 transition-opacity"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="text-center mt-2">
          <p className="text-[11px] text-slate-400 italic font-semibold">
            * 차트 막대를 클릭하면 해당 자치구 제안 목록으로 바로 점프합니다. (현재 선택: <span className="text-rose-600 font-bold">{selectedDistrict || '없음'}</span>)
          </p>
        </div>
      </div>

      {/* 25개 자치구 퀵 필터 그리드 */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <p className="text-xs font-bold text-slate-700 mb-2.5">전체 자치구 퀵 선택</p>
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-9 lg:grid-cols-12 gap-1.5">
          {SEOUL_DISTRICTS.map(dist => {
            const hasData = proposals.some(p => p.district === dist);
            const count = proposals.filter(p => p.district === dist).length;
            const isSelected = selectedDistrict === dist;
            
            return (
              <button
                key={dist}
                onClick={() => onSelectDistrict(isSelected ? null : dist)}
                className={`text-[11px] py-1.5 px-1 rounded-lg font-bold border transition duration-150 flex flex-col items-center justify-center ${
                  isSelected 
                    ? 'bg-red-500 text-white border-red-600 shadow-sm' 
                    : hasData 
                      ? 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200 hover:border-[#0A2351]' 
                      : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                }`}
                disabled={!hasData}
              >
                <span>{dist}</span>
                {hasData && (
                  <span className={`text-[9px] mt-0.5 font-mono ${isSelected ? 'text-red-100' : 'text-slate-500'}`}>
                    ({count}건)
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 선택된 자치구의 제안 리스트 */}
      <AnimatePresence mode="wait">
        {selectedDistrict ? (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/85 mb-4">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="text-red-500 w-4 h-4" />
                <span>{selectedDistrict} 시민 제안 목록</span>
                <span className="text-xs bg-slate-100 text-slate-600 font-mono px-2 py-0.5 rounded">
                  총 {filteredProposals.length}건
                </span>
              </h4>
              <button
                onClick={() => onSelectDistrict(null)}
                className="text-xs text-slate-500 hover:text-slate-800"
              >
                목록 닫기
              </button>
            </div>

            <div className="space-y-4">
              {filteredProposals.length > 0 ? (
                filteredProposals.map(prop => (
                  <div 
                    key={prop.id}
                    className="p-4 rounded-lg border border-slate-100 hover:border-slate-300 transition bg-slate-50/50"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded">
                          {prop.category}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">{prop.id}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 font-mono">{prop.reg_date}</span>
                        {prop.reply_yn === 'Y' ? (
                          <span className="text-[11px] bg-emerald-50 text-emerald-600 border border-emerald-100 px-1.5 py-0.5 rounded flex items-center gap-1 font-bold">
                            <CheckCircle className="w-3 h-3" /> 답변완료
                          </span>
                        ) : (
                          <span className="text-[11px] bg-amber-50 text-amber-600 border border-amber-100 px-1.5 py-0.5 rounded flex items-center gap-1 font-bold">
                            <HelpCircle className="w-3 h-3" /> 검토중
                          </span>
                        )}
                      </div>
                    </div>

                    <h5 className="text-sm font-bold text-slate-800 mb-1.5">{prop.title}</h5>
                    <p className="text-xs text-slate-600 leading-relaxed mb-3">{prop.content}</p>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-semibold uppercase">배정부서</span>
                        <div className="flex flex-wrap gap-1">
                          {prop.department.map(dept => (
                            <span key={dept} className="text-[10px] bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded">
                              {dept}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
                        <span className="flex items-center gap-1 text-slate-600">
                          <ThumbsUp className="w-3.5 h-3.5 text-blue-500" /> 공감 {prop.vote_score}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5" /> 댓글 {prop.comment_cnt}
                        </span>
                        <a
                          href={prop.url || `https://idea.seoul.go.kr/front/freeSuggest/view.do?sn=${prop.id.replace('PROP-', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline font-bold"
                        >
                          원문 보기 <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400">
                  해당 자치구에 등록된 제안이 없습니다.
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="placeholder"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-slate-50/50 rounded-lg border-2 border-dashed border-slate-200 p-8 text-center text-slate-500 text-xs"
          >
            위에 정렬된 막대바나 자치구 버튼을 클릭하시면 자치구별 시민 목소리를 상세히 확인할 수 있습니다.
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
