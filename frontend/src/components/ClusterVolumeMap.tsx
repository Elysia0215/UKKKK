import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, Cell, BarChart, Bar, CartesianGrid } from 'recharts';
import { PolicyProposal } from '../types';
import { Layers, AlertTriangle, Sparkles, TrendingUp, HelpCircle, ChevronDown, ChevronUp, ExternalLink, Info, Target, Shield, Zap, PieChart } from 'lucide-react';

interface Props {
  proposals: PolicyProposal[];
  onSelectCluster?: (clusterId: number, category?: string, subCategory?: string, searchKeyword?: string) => void;
}

interface ClusterVolumePoint {
  clusterId: number;
  clusterName: string;
  category: string;
  subCategory?: string;
  volume: number;        // 제안 수 (Demand)
  totalVotes: number;    // 총 공감수
  unansweredCount: number; // 미답변 수
  supplyCount: number;   // 몽땅정보 연관 지원사업 수 (Supply)
  gapScore: number;      // 정책 사각지대 갭 지수 (Demand / Supply ratio)
  representativeTitle: string;
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
}

export const ClusterVolumeMap: React.FC<Props> = ({ proposals, onSelectCluster }) => {
  const [showAllClusters, setShowAllClusters] = useState(false);

  const clusterData = useMemo(() => {
    const clusterMap = new Map<number, PolicyProposal[]>();

    proposals.forEach(p => {
      if (p.cluster_size > 1 && p.cluster_id !== -1) {
        const list = clusterMap.get(p.cluster_id) || [];
        list.push(p);
        clusterMap.set(p.cluster_id, list);
      }
    });

    const points: ClusterVolumePoint[] = [];

    clusterMap.forEach((items, clusterId) => {
      const volume = items.length;
      const totalVotes = items.reduce((acc, curr) => acc + curr.vote_score, 0);
      const unansweredCount = items.filter(p => p.reply_yn === 'N').length;
      const representative = [...items].sort((a, b) => b.vote_score - a.vote_score)[0];

      // 몽땅정보 연관 사업 수 (Supply)
      const uniquePolicies = new Set<string>();
      items.forEach(p => {
        p.matched_policies?.forEach(m => uniquePolicies.add(m.policy_name));
      });
      const supplyCount = Math.max(1, uniquePolicies.size);

      // 정책 갭 스코어 = (미답변 수 * 총 공감수) / 공급 사업 수
      const rawGap = Math.round((unansweredCount * totalVotes) / supplyCount);
      
      let riskLevel: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
      if (rawGap >= 100) riskLevel = 'HIGH';
      else if (rawGap >= 40) riskLevel = 'MEDIUM';

      points.push({
        clusterId,
        clusterName: `[군집 #${clusterId}] ${representative.title}`,
        category: representative.category,
        subCategory: representative.sub_category,
        volume,
        totalVotes,
        unansweredCount,
        supplyCount,
        gapScore: rawGap,
        representativeTitle: representative.title,
        riskLevel,
      });
    });

    return points.sort((a, b) => b.gapScore - a.gapScore);
  }, [proposals]);

  const topGapClusters = clusterData.slice(0, 3);

  // 요약 통계
  const summaryStats = useMemo(() => {
    const highRisk = clusterData.filter(c => c.riskLevel === 'HIGH').length;
    const medRisk = clusterData.filter(c => c.riskLevel === 'MEDIUM').length;
    const totalDemand = clusterData.reduce((s, c) => s + c.volume, 0);
    const totalVotes = clusterData.reduce((s, c) => s + c.totalVotes, 0);
    const avgGap = clusterData.length > 0 ? Math.round(clusterData.reduce((s, c) => s + c.gapScore, 0) / clusterData.length) : 0;
    const maxGap = clusterData.length > 0 ? clusterData[0].gapScore : 0;
    return { highRisk, medRisk, totalDemand, totalVotes, avgGap, maxGap };
  }, [clusterData]);

  // 카테고리별 분포
  const categoryBreakdown = useMemo(() => {
    const catMap = new Map<string, { count: number; totalGap: number; highRisk: number; totalVotes: number }>();
    clusterData.forEach(c => {
      const existing = catMap.get(c.category) || { count: 0, totalGap: 0, highRisk: 0, totalVotes: 0 };
      existing.count++;
      existing.totalGap += c.gapScore;
      if (c.riskLevel === 'HIGH') existing.highRisk++;
      existing.totalVotes += c.totalVotes;
      catMap.set(c.category, existing);
    });
    return Array.from(catMap.entries())
      .map(([name, data]) => ({
        name: name.length > 12 ? name.slice(0, 12) + '…' : name,
        fullName: name,
        군집수: data.count,
        평균격차: Math.round(data.totalGap / data.count),
        고위험: data.highRisk,
        총공감: data.totalVotes,
      }))
      .sort((a, b) => b.평균격차 - a.평균격차);
  }, [clusterData]);

  // X축 도메인 계산 (데이터에 맞춰 조정)
  const xDomain = useMemo(() => {
    if (clusterData.length === 0) return [0, 30];
    const volumes = clusterData.map(c => c.volume);
    const minV = Math.min(...volumes);
    const maxV = Math.max(...volumes);
    return [Math.max(0, minV - 3), maxV + 2];
  }, [clusterData]);

  return (
    <div className="space-y-2.5">
      {/* 4분면 버블 차트 대시보드 헤더 */}
      <div className="bg-[#0A2351] text-white p-3 rounded-xl shadow-md border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] uppercase bg-rose-500/20 text-rose-200 border border-rose-400/30 px-2 py-0.5 rounded font-mono font-bold">
              시각지대 분석실
            </span>
            <h2 className="text-sm sm:text-base font-black text-white">시민 요구(체감·인권) 대비 행정 정책(공급) 사각지대 군집 시각화</h2>
          </div>
          <p className="text-[10.5px] text-slate-300 mt-0.5">
            시민 제안 426건을 의미적으로 묶은 49개 요구 주제별 **시민 관심도(요청량)**와 서울시가 실제 공급 중인 **양육 정책 수** 간 격차를 시각화합니다.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
          <div>
            <span className="block text-[9px] text-slate-300 font-sans">분석 대분류 주제</span>
            <span className="font-bold text-sm text-white">30개 분야</span>
          </div>
          <div className="w-px h-6 bg-white/20" />
          <div>
            <span className="block text-[9px] text-blue-200 font-sans">최다 지지 제안</span>
            <span className="font-bold text-sm text-emerald-300">5,346표 (군집 #10)</span>
          </div>
        </div>
      </div>

      {/* Top 3 High Gap Alert */}
      <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5">
        <div className="flex justify-between items-center mb-1.5">
          <h4 className="text-xs font-extrabold text-rose-800 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 animate-bounce" />
            🚨 행정 최우선 대응 권고: 시민 요구 대비 정책 공급이 가장 부족한 "정책 사각지대 Top 3 문제"
          </h4>
          <span className="text-[10px] text-rose-700 font-mono font-bold">실제 서울시 양육 정책 322건 대조 결과</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {topGapClusters.map((c, idx) => (
            <div
              key={c.clusterId}
              onClick={() => onSelectCluster?.(c.clusterId, c.category, c.subCategory, c.representativeTitle)}
              className="bg-white p-2 rounded-lg border border-rose-200 shadow-2xs hover:border-rose-400 cursor-pointer transition-all hover:scale-[1.01]"
            >
              <div className="flex justify-between items-center mb-0.5">
                <span className="text-[9px] bg-rose-600 text-white font-bold px-1.5 py-0.5 rounded">
                  정책 공백 #{idx + 1}
                </span>
                <span className="text-[9px] text-slate-400 font-mono font-bold">주제 #{c.clusterId}</span>
              </div>
              <h5 className="text-[11px] font-bold text-slate-900 truncate mb-1">{c.representativeTitle}</h5>
              <div className="flex justify-between items-center text-[10px] font-mono border-t border-slate-100 pt-1">
                <span className="text-slate-600">요구 제안 {c.volume}건 (공감 {c.totalVotes.toLocaleString()}표)</span>
                <span className="text-rose-600 font-bold bg-rose-50 px-1 py-0.5 rounded">시행 정책 {c.supplyCount}개</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 요약 KPI 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-white rounded-xl border border-slate-200 p-3 text-center shadow-2xs">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Target className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-[10px] font-bold text-slate-500">분석 군집</span>
          </div>
          <div className="text-2xl font-black text-slate-800">{clusterData.length}</div>
          <div className="text-[9px] text-slate-400 font-bold">개 요구 주제</div>
        </div>
        <div className="bg-rose-50 rounded-xl border border-rose-200 p-3 text-center shadow-2xs">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            <span className="text-[10px] font-bold text-rose-600">고위험 사각지대</span>
          </div>
          <div className="text-2xl font-black text-rose-700">{summaryStats.highRisk}</div>
          <div className="text-[9px] text-rose-500 font-bold">개 (격차≥100)</div>
        </div>
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-3 text-center shadow-2xs">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Shield className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-[10px] font-bold text-amber-600">보완 권장</span>
          </div>
          <div className="text-2xl font-black text-amber-700">{summaryStats.medRisk}</div>
          <div className="text-[9px] text-amber-500 font-bold">개 (격차 40~99)</div>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-3 text-center shadow-2xs">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Zap className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-[10px] font-bold text-blue-600">최대 격차점수</span>
          </div>
          <div className="text-2xl font-black text-blue-700">{summaryStats.maxGap.toLocaleString()}</div>
          <div className="text-[9px] text-blue-500 font-bold">점 (평균 {summaryStats.avgGap})</div>
        </div>
      </div>

      <hr className="border-slate-200/60" />

      {/* Cluster Scatter/Bubble Chart & Legend */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/80">
          <div>
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Layers className="text-blue-600 w-4 h-4" />
              시민 요구 주제별 제안 건수(X축) vs 시민 공감 지수(Y축) 분포 현황
            </h4>
            <p className="text-[10px] text-slate-500 mt-0.5">
              공감도가 가장 높은 제안(5,346표)의 이상치를 왜곡 없이 표현하기 위해 로그 스케일을 적용했습니다. 버블 크기가 클수록 정책 공급 격차가 큽니다.
            </p>
          </div>

          {/* 색상 범례 (Legend) */}
          <div className="flex items-center gap-2 text-[10px] font-bold bg-slate-50 p-1.5 rounded-lg border border-slate-200">
            <span className="text-slate-500 font-normal">사각지대 위험 수준:</span>
            <div className="flex items-center gap-1 text-rose-600">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>🔴 정책 시급 (격차점수≥100)</span>
            </div>
            <div className="flex items-center gap-1 text-amber-600">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>🟡 보완 권장 (격차점수≥40)</span>
            </div>
            <div className="flex items-center gap-1 text-blue-600">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span>🔵 일반 구역</span>
            </div>
          </div>
        </div>

        <div className="h-[340px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
              <XAxis
                type="number"
                dataKey="volume"
                name="제안 수량"
                unit="건"
                domain={xDomain}
                tickCount={6}
                style={{ fontSize: '11px', fontWeight: 'bold' }}
              />
              <YAxis
                type="number"
                dataKey="totalVotes"
                name="총 공감표"
                unit="표"
                scale="log"
                domain={[1, 10000]}
                allowDataOverflow
                tickFormatter={(val) => val.toLocaleString()}
                style={{ fontSize: '11px', fontWeight: 'bold' }}
              />
              <ZAxis type="number" dataKey="gapScore" range={[80, 500]} />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data: ClusterVolumePoint = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-xl border border-slate-700 text-xs space-y-1.5 max-w-xs">
                        <div className="flex justify-between items-center border-b border-slate-700 pb-1">
                          <span className="font-bold text-yellow-300">{data.clusterName}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                            data.riskLevel === 'HIGH' ? 'bg-rose-500 text-white' : data.riskLevel === 'MEDIUM' ? 'bg-amber-500 text-white' : 'bg-blue-600 text-white'
                          }`}>
                            {data.riskLevel === 'HIGH' ? '🔴 고위험' : data.riskLevel === 'MEDIUM' ? '🟡 중위험' : '🔵 일반'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300">카테고리: {data.category}</p>
                        <div className="pt-1 text-[11px] font-mono justify-between flex text-slate-200">
                          <span>제안 수량: <b>{data.volume}건</b></span>
                          <span>총 공감: <b>{data.totalVotes.toLocaleString()}표</b></span>
                        </div>
                        <div className="text-[11px] font-mono flex justify-between pt-0.5">
                          <span className="text-emerald-300">몽땅정보 연관 사업: <b>{data.supplyCount}개</b></span>
                          <span className="text-rose-400 font-bold">갭지수: <b>{data.gapScore}</b></span>
                        </div>
                        <p className="text-[10px] text-blue-200 pt-1 italic">클릭하여 해당 군집 제안 묶음으로 이동 ↗</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Scatter data={clusterData}>
                {clusterData.map((entry) => {
                  let fillColor = '#3B82F6';
                  if (entry.riskLevel === 'HIGH') fillColor = '#EF4444';
                  else if (entry.riskLevel === 'MEDIUM') fillColor = '#F59E0B';
                  return (
                    <Cell 
                      key={`cell-${entry.clusterId}`} 
                      fill={fillColor} 
                      fillOpacity={0.75} 
                      stroke="#ffffff" 
                      strokeWidth={1.5}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectCluster?.(entry.clusterId, entry.category, entry.subCategory, entry.representativeTitle);
                      }}
                      className="cursor-pointer hover:fill-opacity-100 transition-all duration-200"
                    />
                  );
                })}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* 49개 전체 군집 탐색 아코디언 테이블 */}
        <div className="pt-2 border-t border-slate-200">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowAllClusters(!showAllClusters);
            }}
            className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all duration-300 cursor-pointer shadow-3xs hover:shadow-2xs ${
              showAllClusters 
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800' 
                : 'bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border-blue-200 text-blue-900'
            }`}
            style={{ 
              animation: !showAllClusters ? 'pulse 2s infinite' : 'none'
            }}
          >
            <span className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600 shrink-0" />
              <span className="text-xs font-black">
                📋 전체 {clusterData.length}개 시민 요구 주제별 정책 부족 격차 순위표
              </span>
              <span className={`text-[9.5px] font-extrabold px-2 py-0.5 rounded-full ml-1.5 transition-all ${
                showAllClusters ? 'bg-slate-200 text-slate-700' : 'bg-blue-600 text-white'
              }`}>
                {showAllClusters ? '접기 ▴' : '💡 클릭해서 전체 목록 펼쳐보기 ▾'}
              </span>
            </span>
            {showAllClusters ? (
              <ChevronUp className="w-4 h-4 text-slate-600 stroke-[3]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-indigo-600 stroke-[3]" />
            )}
          </button>

          <AnimatePresence>
            {showAllClusters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mt-3"
              >
                <div className="max-h-[360px] overflow-y-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">요구 주제 번호</th>
                        <th className="p-2.5">사각지대 위험도</th>
                        <th className="p-2.5">대표 시민 제안(수요)</th>
                        <th className="p-2.5 text-right">제안 건수</th>
                        <th className="p-2.5 text-right">공감 수</th>
                        <th className="p-2.5 text-right">맞춤 정책 공급수</th>
                        <th className="p-2.5 text-right relative group">
                          <div className="inline-flex items-center gap-1 cursor-help justify-end w-full">
                            <span>정책 부족 격차점수</span>
                            <Info className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition" />
                          </div>
                          {/* 갭지수 한글 안내 설명 툴팁 */}
                          <div className="absolute hidden group-hover:block bg-slate-900 text-white text-[9.5px] p-3 rounded-lg shadow-xl z-50 w-72 top-8 right-0 leading-relaxed border border-slate-700 pointer-events-none text-left font-sans normal-case tracking-normal">
                            <span className="font-extrabold block text-rose-400 mb-1">🧮 정책 부족 격차점수 (Gap Score) 정의</span>
                            시민들이 제안 및 민원으로 요청한 <strong className="text-rose-300">수요 강도</strong>에 비해 서울시가 공급하고 있는 <strong className="text-emerald-300">복지 정책 수</strong>의 불균형을 계량화한 점수입니다. 
                            <p className="mt-1.5 text-slate-300 border-t border-slate-800 pt-1.5">
                              * 격차 점수가 높을수록 시민 요구 대비 복지 공급망이 부족한 <strong>사각지대</strong>임을 뜻하여 행정 개입이 시급함을 의미합니다.
                            </p>
                          </div>
                        </th>
                        <th className="p-2.5 text-center">이동</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {clusterData.map((item) => (
                        <tr key={item.clusterId} className="hover:bg-blue-50/50 transition">
                          <td className="p-2.5 font-bold text-slate-900">#{item.clusterId}</td>
                          <td className="p-2.5 font-sans">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              item.riskLevel === 'HIGH' ? 'bg-rose-100 text-rose-700 border border-rose-200' : item.riskLevel === 'MEDIUM' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-blue-100 text-blue-700 border border-blue-200'
                            }`}>
                              {item.riskLevel === 'HIGH' ? '🔴 고위험' : item.riskLevel === 'MEDIUM' ? '🟡 중위험' : '🔵 일반'}
                            </span>
                          </td>
                          <td className="p-2.5 font-sans font-bold text-slate-800 truncate max-w-[240px]">
                            {item.representativeTitle}
                          </td>
                          <td className="p-2.5 text-right">{item.volume}건</td>
                          <td className="p-2.5 text-right">{item.totalVotes.toLocaleString()}표</td>
                          <td className="p-2.5 text-right text-emerald-600 font-bold">{item.supplyCount}개</td>
                          <td className="p-2.5 text-right font-bold text-rose-600">{item.gapScore}</td>
                          <td className="p-2.5 text-center font-sans">
                            <button
                              onClick={() => onSelectCluster?.(item.clusterId, item.category, item.subCategory, item.representativeTitle)}
                              className="text-[10px] bg-[#0A2351] text-white px-2 py-1 rounded hover:bg-blue-900 font-bold cursor-pointer"
                            >
                              제안 묶음 ↗
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <hr className="border-slate-200/60" />

      {/* 카테고리별 정책 격차 분포 */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 mb-3 border-b border-slate-200/80">
          <div>
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <PieChart className="text-indigo-600 w-4 h-4" />
              생애주기 분류별 정책 사각지대 격차 현황
            </h4>
            <p className="text-[10px] text-slate-500 mt-0.5">
              카테고리별 평균 격차점수를 비교하여 어느 생애주기 영역의 정책 공급이 가장 부족한지 한눈에 파악합니다.
            </p>
          </div>
        </div>
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoryBreakdown} layout="vertical" margin={{ top: 5, right: 30, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
              <XAxis type="number" style={{ fontSize: '10px' }} />
              <YAxis type="category" dataKey="name" width={110} style={{ fontSize: '10px', fontWeight: 'bold' }} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white p-2.5 rounded-lg shadow-xl border border-slate-700 text-[11px] space-y-1">
                        <div className="font-bold text-blue-300">{d.fullName}</div>
                        <div>군집 수: <b>{d.군집수}</b>개</div>
                        <div>평균 격차점수: <b className="text-rose-300">{d.평균격차}</b></div>
                        <div>고위험 군집: <b className="text-rose-400">{d.고위험}</b>개</div>
                        <div>총 시민 공감: <b className="text-emerald-300">{d.총공감.toLocaleString()}</b>표</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="평균격차" radius={[0, 4, 4, 0]} barSize={16}>
                {categoryBreakdown.map((entry, idx) => (
                  <Cell
                    key={idx}
                    fill={entry.평균격차 >= 100 ? '#EF4444' : entry.평균격차 >= 40 ? '#F59E0B' : '#3B82F6'}
                    fillOpacity={0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {categoryBreakdown.map((cat, i) => (
            <span
              key={i}
              className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                cat.평균격차 >= 100 ? 'bg-rose-50 text-rose-700 border-rose-200'
                : cat.평균격차 >= 40 ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}
            >
              {cat.fullName} · 군집 {cat.군집수}개 · 격차 {cat.평균격차}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
