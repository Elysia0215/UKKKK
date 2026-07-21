import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, Cell } from 'recharts';
import { PolicyProposal } from '../types';
import { Layers, AlertTriangle, Sparkles, TrendingUp, HelpCircle } from 'lucide-react';

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
}

export const ClusterVolumeMap: React.FC<Props> = ({ proposals, onSelectCluster }) => {
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
      const gapScore = Math.round((unansweredCount * totalVotes) / supplyCount);

      points.push({
        clusterId,
        clusterName: `[군집 #${clusterId}] ${representative.title}`,
        category: representative.category,
        volume,
        totalVotes,
        unansweredCount,
        supplyCount,
        gapScore,
        representativeTitle: representative.title,
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
            <span className="bg-rose-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded uppercase">KR-SBERT 분석</span>
            <h3 className="text-lg font-black">의미적 임베딩 군집 볼륨 지도 (Demand vs Supply)</h3>
          </div>
          <p className="text-xs text-blue-100 font-medium">
            426건 시민 제안의 의미적 군집별 **수요 볼륨(제안수/공감도)**과 **몽땅정보 연관 정책 사업(공급)**을 비교 시각화합니다.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-xs px-4 py-2.5 rounded-xl border border-white/20 font-mono text-xs">
          <div>
            <span className="block text-[10px] text-blue-200">도출 군집</span>
            <span className="font-bold text-base text-yellow-300">{clusterData.length}개 묶음</span>
          </div>
          <div className="w-px h-6 bg-white/20" />
          <div>
            <span className="block text-[10px] text-blue-200">응집 제안</span>
            <span className="font-bold text-base text-emerald-300">123건</span>
          </div>
        </div>
      </div>

      {/* Top 3 High Gap Alert */}
      <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
        <h4 className="text-xs font-extrabold text-rose-800 flex items-center gap-1.5 mb-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-600 animate-bounce" />
          행정 최우선 대응 필요: 수요 대비 공급 부족 "정책 사각지대 Top 3 군집"
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {topGapClusters.map((c, idx) => (
            <div
              key={c.clusterId}
              onClick={() => onSelectCluster?.(c.clusterId)}
              className="bg-white p-3 rounded-lg border border-rose-200 shadow-2xs hover:border-rose-400 cursor-pointer transition-all"
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] bg-rose-600 text-white font-bold px-1.5 py-0.5 rounded">
                  사각지대 #{idx + 1}
                </span>
                <span className="text-[10px] text-slate-400 font-mono font-bold">군집 #{c.clusterId}</span>
              </div>
              <h5 className="text-xs font-bold text-slate-900 truncate mb-1">{c.representativeTitle}</h5>
              <div className="flex justify-between items-center text-[11px] text-slate-500 font-mono">
                <span>시민 제안 {c.volume}건 (공감 {c.totalVotes}표)</span>
                <span className="text-rose-600 font-bold">기존 사업 {c.supplyCount}개만 존재</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cluster Scatter/Bubble Chart */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-200/80">
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Layers className="text-blue-600 w-5 h-5" />
            군집별 제안 볼륨(X축) vs 시민 공감도(Y축) 분포 지도
          </h4>
          <span className="text-[11px] text-slate-500 font-medium">버블 크기 = 정책 사각지대 갭 지수</span>
        </div>

        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
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
                style={{ fontSize: '11px', fontWeight: 'bold' }}
              />
              <ZAxis type="number" dataKey="gapScore" range={[60, 400]} />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data: ClusterVolumePoint = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl border border-slate-700 text-xs space-y-1 max-w-xs">
                        <p className="font-bold text-yellow-300">{data.clusterName}</p>
                        <p className="text-[11px] text-slate-300">카테고리: {data.category}</p>
                        <div className="pt-1 border-t border-slate-700 text-[11px] font-mono justify-between flex">
                          <span>제안 수량: <b>{data.volume}건</b></span>
                          <span>총 공감: <b>{data.totalVotes}표</b></span>
                        </div>
                        <div className="text-[11px] font-mono text-emerald-300 flex justify-between">
                          <span>몽땅정보 사업 수: <b>{data.supplyCount}개</b></span>
                          <span className="text-rose-400 font-bold">갭지수: <b>{data.gapScore}</b></span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Scatter data={clusterData} onClick={(entry) => onSelectCluster?.(entry.clusterId)}>
                {clusterData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.gapScore > 100 ? '#ef4444' : entry.gapScore > 40 ? '#f59e0b' : '#3b82f6'}
                    className="cursor-pointer hover:opacity-80 transition"
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
