import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, Cell } from 'recharts';
import { PolicyProposal } from '../types';
import { Layers, AlertTriangle, Sparkles, TrendingUp, HelpCircle, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

interface Props {
  proposals: PolicyProposal[];
  onSelectCluster?: (clusterId: number) => void;
}

interface ClusterVolumePoint {
  clusterId: number;
  clusterName: string;
  category: string;
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

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-gradient-to-r from-[#0A2351] to-indigo-900 text-white p-6 rounded-2xl shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-rose-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded uppercase">KR-SBERT 의미적 분석</span>
            <h3 className="text-lg font-black">의미적 군집 볼륨 지도 (Demand vs Supply 갭 탐색)</h3>
          </div>
          <p className="text-xs text-blue-100 font-medium">
            426건 시민 제안의 의미적 49개 군집별 **수요 볼륨(제안수/공감도)**과 **몽땅정보 연관 정책 사업(공급)**을 비교 시각화합니다.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-xs px-4 py-2.5 rounded-xl border border-white/20 font-mono text-xs">
          <div>
            <span className="block text-[10px] text-blue-200 font-sans">도출 군집 수</span>
            <span className="font-bold text-base text-yellow-300">{clusterData.length}개 군집</span>
          </div>
          <div className="w-px h-6 bg-white/20" />
          <div>
            <span className="block text-[10px] text-blue-200 font-sans">최고 공감 제안</span>
            <span className="font-bold text-base text-emerald-300">5,346표 (#10)</span>
          </div>
        </div>
      </div>

      {/* Top 3 High Gap Alert */}
      <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
        <div className="flex justify-between items-center mb-2.5">
          <h4 className="text-xs font-extrabold text-rose-800 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 animate-bounce" />
            행정 최우선 대응 필요: 수요 대비 공급 부족 "정책 사각지대 Top 3 군집"
          </h4>
          <span className="text-[11px] text-rose-700 font-mono font-bold">실제 몽땅정보 322건 매칭 결과</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {topGapClusters.map((c, idx) => (
            <div
              key={c.clusterId}
              onClick={() => onSelectCluster?.(c.clusterId)}
              className="bg-white p-3.5 rounded-xl border border-rose-200 shadow-2xs hover:border-rose-400 cursor-pointer transition-all hover:scale-[1.01]"
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] bg-rose-600 text-white font-bold px-1.5 py-0.5 rounded">
                  사각지대 #{idx + 1}
                </span>
                <span className="text-[10px] text-slate-400 font-mono font-bold">군집 #{c.clusterId}</span>
              </div>
              <h5 className="text-xs font-bold text-slate-900 truncate mb-1.5">{c.representativeTitle}</h5>
              <div className="flex justify-between items-center text-[11px] font-mono border-t border-slate-100 pt-1.5">
                <span className="text-slate-600">제안 {c.volume}건 (공감 {c.totalVotes.toLocaleString()}표)</span>
                <span className="text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded">연관사업 {c.supplyCount}개</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cluster Scatter/Bubble Chart & Legend */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/80">
          <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="text-blue-600 w-5 h-5" />
              군집별 제안 수량(X축) vs 시민 총 공감도(Y축 - 로그스케일) 분포 지도
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              5,346표 최고 이상치가 넓게 조율되도록 로그 스케일을 적용했습니다. 버블 크기가 클수록 정책 사각지대 갭 지수가 높습니다.
            </p>
          </div>

          {/* 색상 범례 (Legend) */}
          <div className="flex items-center gap-3 text-[11px] font-bold bg-slate-50 p-2 rounded-lg border border-slate-200">
            <span className="text-slate-500 font-normal">위험도 범례:</span>
            <div className="flex items-center gap-1 text-rose-600">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>🔴 고위험 (갭≥100)</span>
            </div>
            <div className="flex items-center gap-1 text-amber-600">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>🟡 중위험 (갭≥40)</span>
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
              <Scatter data={clusterData} onClick={(entry) => onSelectCluster?.(entry.clusterId)} cursor="pointer">
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
            onClick={() => setShowAllClusters(!showAllClusters)}
            className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 transition cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              전체 {clusterData.length}개 군집 수요-공급 갭지수 리스트 {showAllClusters ? '접기' : '전체보기'}
            </span>
            {showAllClusters ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
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
                        <th className="p-2.5">군집 ID</th>
                        <th className="p-2.5">위험도</th>
                        <th className="p-2.5">대표 제안 제목</th>
                        <th className="p-2.5 text-right">제안 수량</th>
                        <th className="p-2.5 text-right">총 공감표</th>
                        <th className="p-2.5 text-right">몽땅정보 사업수</th>
                        <th className="p-2.5 text-right">갭지수</th>
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
                              onClick={() => onSelectCluster?.(item.clusterId)}
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
    </div>
  );
};
