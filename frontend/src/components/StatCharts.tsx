import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  AreaChart,
  Area,
  Legend,
} from 'recharts';
import { DistrictData, SEOUL_DISTRICTS_DATA, CATEGORY_METRICS, DEPARTMENT_METRICS } from '../data/seoulData';
import { BarChart3, TrendingUp, PieChart as PieIcon, HelpCircle } from 'lucide-react';

interface StatChartsProps {
  selectedDistrict: DistrictData;
  onSelectDistrict: (district: DistrictData) => void;
  colorMetric: 'proposals' | 'births' | 'daycare' | 'fertility' | 'demandScore';
}

export const StatCharts: React.FC<StatChartsProps> = ({
  selectedDistrict,
  onSelectDistrict,
  colorMetric,
}) => {
  const [activeTab, setActiveTab] = useState<'ranking' | 'distribution' | 'policy'>('ranking');

  const chartData = SEOUL_DISTRICTS_DATA.map((d) => ({
    name: d.name,
    Value:
      colorMetric === 'proposals' ? d.proposals :
      colorMetric === 'births' ? d.births2024 :
      colorMetric === 'daycare' ? d.daycare2025 :
      colorMetric === 'demandScore' ? d.demandScore :
      d.fertilityRate,
    births: d.births2024,
    fertility: d.fertilityRate,
    daycare: d.daycare2025,
    original: d,
  })).sort((a, b) => b.Value - a.Value);

  const getMetricLabel = () => {
    if (colorMetric === 'proposals') return '시민제안 건수 (건)';
    if (colorMetric === 'births') return '출생아 수 (명)';
    if (colorMetric === 'daycare') return '보육시설 수 (개소)';
    if (colorMetric === 'demandScore') return '정책 수요 점수';
    return '합계출산율';
  };

  const getMetricColor = () => {
    if (colorMetric === 'proposals') return '#ef4444';
    if (colorMetric === 'births') return '#8b5cf6';
    if (colorMetric === 'daycare') return '#f59e0b';
    if (colorMetric === 'demandScore') return '#f43f5e';
    return '#10b981';
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-3 rounded-xl border border-slate-800 shadow-xl text-xs font-mono">
          <p className="font-bold text-sm text-indigo-300 mb-1">{data.name}</p>
          <div className="flex flex-col gap-1 text-[11px] text-slate-300">
            <p>시민제안: <span className="text-red-400 font-bold">{data.original.proposals}건</span></p>
            <p>출생아 수: <span className="text-purple-300 font-bold">{data.births.toLocaleString()}명</span></p>
            <p>보육시설: <span className="text-amber-300 font-bold">{data.daycare}개소</span></p>
            <p>합계출산율: <span className="text-emerald-400 font-bold">{data.fertility.toFixed(3)}</span></p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-500" />
            통계 기반 입체 분석 및 트렌드
          </h3>
          <p className="text-xs text-slate-500 mt-1">서울시 자치구별 통계를 다양한 차트로 분석해 보세요.</p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('ranking')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'ranking' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" /> 구별 랭킹
          </button>
          <button
            onClick={() => setActiveTab('distribution')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'distribution' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" /> 출산율 분포
          </button>
          <button
            onClick={() => setActiveTab('policy')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'policy' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <PieIcon className="w-3.5 h-3.5" /> 정책 공급 현황
          </button>
        </div>
      </div>

      <div className="p-5 flex-1 min-h-[350px] flex items-center justify-center">
        {activeTab === 'ranking' && (
          <div className="w-full h-full flex flex-col gap-2">
            <span className="text-[11px] font-semibold text-slate-500 font-mono">★ 자치구별 {getMetricLabel()} 내림차순 랭킹</span>
            <div className="flex-1 w-full min-h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                  onClick={(state: any) => {
                    if (state && state.activePayload && state.activePayload[0]) {
                      const clickedDist = state.activePayload[0].payload.original;
                      onSelectDistrict(clickedDist);
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                  <Bar dataKey="Value" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => {
                      const isSelected = entry.name === selectedDistrict.name;
                      return <Cell key={`cell-${index}`} fill={isSelected ? '#1e1b4b' : getMetricColor()} fillOpacity={isSelected ? 1 : 0.75} cursor="pointer" />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'distribution' && (
          <div className="w-full h-full flex flex-col gap-2">
            <span className="text-[11px] font-semibold text-slate-500 font-mono">★ 합계출산율(선)과 출생아 수(면) 자치구별 비교 분포도</span>
            <div className="flex-1 w-full min-h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 9 }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fill: '#8b5cf6', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: '#10b981', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'Inter' }} />
                  <Area yAxisId="left" type="monotone" dataKey="births" name="출생아 수 (명)" stroke="#8b5cf6" fill="#c084fc" fillOpacity={0.2} />
                  <Area yAxisId="right" type="monotone" dataKey="fertility" name="합계출산율" stroke="#10b981" fill="#34d399" fillOpacity={0.1} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'policy' && (
          <div className="w-full h-full flex flex-col md:flex-row gap-5 items-center">
            <div className="flex-1 w-full h-[280px] flex flex-col gap-2">
              <span className="text-[11px] font-semibold text-slate-500 font-mono">[카테고리별 정책 개수]</span>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={CATEGORY_METRICS} margin={{ top: 10, right: 10, left: -20, bottom: 20 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="Category" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                  <Tooltip formatter={(value: any) => [`${value}개 정책`, '개수']} />
                  <Bar dataKey="total_count" radius={[0, 4, 4, 0]}>
                    {CATEGORY_METRICS.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="flex-1 w-full h-[280px] flex flex-col gap-2">
              <span className="text-[11px] font-semibold text-slate-500 font-mono">[부서별 정책 분배 (건수)]</span>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={DEPARTMENT_METRICS} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 9 }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value: any) => [`${value}개 사업`, '담당 수']} />
                  <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-start gap-2.5">
        <HelpCircle className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
        <div className="text-[11px] text-slate-600 leading-relaxed">
          {selectedDistrict.name}은(는) 2025년 기준 합계출산율 <span className="font-semibold text-emerald-600">{selectedDistrict.fertilityRate.toFixed(3)}</span>, 2025년 연간 출생아수 <span className="font-semibold text-purple-600">{selectedDistrict.births2024.toLocaleString()}명</span>를 기록하고 있습니다. 어린이집은 현재 <span className="font-semibold text-amber-600">{selectedDistrict.daycare2025}개소</span>가 확보되어 있습니다.
        </div>
      </div>
    </div>
  );
};

export default StatCharts;
