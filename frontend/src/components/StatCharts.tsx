import React, { useState, useMemo } from 'react';
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
  ComposedChart,
  Line,
} from 'recharts';
import { DistrictData, SEOUL_DISTRICTS_DATA, CATEGORY_METRICS, DEPARTMENT_METRICS } from '../data/seoulData';
import { BarChart3, TrendingUp, PieChart as PieIcon, HelpCircle, Table2, Activity, Download } from 'lucide-react';

interface StatChartsProps {
  selectedDistrict: DistrictData;
  onSelectDistrict: (district: DistrictData) => void;
  colorMetric: 'proposals' | 'births' | 'daycare' | 'fertility' | 'demand' | 'demandScore';
  proposals?: any[];
}

export const StatCharts: React.FC<StatChartsProps> = ({
  selectedDistrict,
  onSelectDistrict,
  colorMetric,
  proposals,
}) => {
  const [activeTab, setActiveTab] = useState<'ranking' | 'distribution' | 'policy' | 'table' | 'scaling'>('ranking');
  const [includeUnassigned, setIncludeUnassigned] = useState(false);

  const chartData = useMemo(() => {
    return SEOUL_DISTRICTS_DATA.map((d) => ({
      name: d.name,
      Value:
        colorMetric === 'proposals' ? d.proposals :
        colorMetric === 'births' ? d.births2025 :
        colorMetric === 'daycare' ? d.daycare2025 :
        (colorMetric === 'demand' || colorMetric === 'demandScore') ? d.demandScore :
        d.fertilityRate,
      births: d.births2025,
      fertility: d.fertilityRate,
      daycare: d.daycare2025,
      original: d,
    })).sort((a, b) => b.Value - a.Value);
  }, [colorMetric]);

  const districtChartData = useMemo(() => {
    const list = [...SEOUL_DISTRICTS_DATA];
    const chartList = list.map((d) => {
      return {
        district: d.name,
        "출생아수(명)": d.births2025,
        "보육시설수(개소)": d.daycare2025,
        original: d,
      };
    });

    if (includeUnassigned && proposals) {
      chartList.push({
        district: "서울시 전체 (미상)",
        "출생아수(명)": 39400,
        "보육시설수(개소)": 4310,
        original: {
          name: "미상",
          engName: "Unassigned",
          path: "",
          labelX: 0,
          labelY: 0,
          proposals: 0,
          births2025: 39400,
          daycare2025: 4310,
          demandScore: 0,
          fertilityRate: 0.55,
          policyCount: 0
        }
      });
    }
    return chartList;
  }, [proposals, includeUnassigned]);

  const getMetricLabel = () => {
    if (colorMetric === 'proposals') return '시민제안 건수 (건)';
    if (colorMetric === 'births') return '출생아 수 (명)';
    if (colorMetric === 'daycare') return '보육시설 수 (개소)';
    if (colorMetric === 'demand' || colorMetric === 'demandScore') return '정책 수요 점수';
    return '합계출산율';
  };

  const getMetricColor = () => {
    if (colorMetric === 'proposals') return '#ef4444';
    if (colorMetric === 'births') return '#8b5cf6';
    if (colorMetric === 'daycare') return '#f59e0b';
    if (colorMetric === 'demand' || colorMetric === 'demandScore') return '#f43f5e';
    return '#10b981';
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-3 rounded-xl border border-slate-800 shadow-xl text-xs font-mono">
          <p className="font-bold text-sm text-indigo-300 mb-1">{data.name || data.district}</p>
          <div className="flex flex-col gap-1 text-[11px] text-slate-300">
            <p>출생아 수: <span className="text-purple-300 font-bold">{(data.births || data["출생아수(명)"]).toLocaleString()}명</span></p>
            <p>보육시설: <span className="text-amber-300 font-bold">{(data.daycare || data["보육시설수(개소)"])}개소</span></p>
            {data.fertility && <p>합계출산율: <span className="text-emerald-400 font-bold">{data.fertility.toFixed(3)}</span></p>}
          </div>
        </div>
      );
    }
    return null;
  };

  const handleExportCSV = () => {
    let csvContent = "";
    let fileName = "";
    
    if (activeTab === "ranking") {
      csvContent = "순위,자치구명,지표수치\n" + 
        chartData
          .map((d, i) => `${i + 1},${d.name},${d.Value}`)
          .join("\n");
      fileName = `seoul_districts_ranking_${colorMetric}.csv`;
    } else if (activeTab === "distribution") {
      csvContent = "자치구명,출생아수(명),합계출산율\n" +
        chartData
          .map(d => `${d.name},${d.births},${d.fertility}`)
          .join("\n");
      fileName = "seoul_districts_distribution.csv";
    } else if (activeTab === "policy") {
      csvContent = "부서명,정책수(건)\n" +
        DEPARTMENT_METRICS
          .map(d => `${d.name},${d.count}`)
          .join("\n");
      fileName = "seoul_policy_department_metrics.csv";
    } else if (activeTab === "table") {
      csvContent = "순위,자치구명,합계출산율(2025),출생아수(2025),보육시설수(개소)\n" +
        chartData
          .map((d, i) => `${i + 1},${d.name},${d.fertility.toFixed(3)},${d.births},${d.daycare}`)
          .join("\n");
      fileName = "seoul_districts_demographics_table.csv";
    } else if (activeTab === "scaling") {
      csvContent = "자치구명,출생아수(명),보육시설수(개소)\n" +
        districtChartData
          .map(d => `${d.district},${d["출생아수(명)"]},${d["보육시설수(개소)"]}`)
          .join("\n");
      fileName = "seoul_infrastructure_comparison.csv";
    }
    
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('ranking')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'ranking' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" /> 구별 랭킹
            </button>
            <button
              onClick={() => setActiveTab('distribution')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'distribution' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" /> 출산율 분포
            </button>
            <button
              onClick={() => setActiveTab('policy')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'policy' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <PieIcon className="w-3.5 h-3.5" /> 정책 공급 현황
            </button>
            <button
              onClick={() => setActiveTab('scaling')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'scaling' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Activity className="w-3.5 h-3.5" /> 제안-인프라 비교
            </button>
            <button
              onClick={() => setActiveTab('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'table' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Table2 className="w-3.5 h-3.5" /> 구별 통계 표
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 transition shadow-2xs cursor-pointer"
            title="현재 활성화된 탭의 수치 통계 자료를 CSV 파일로 저장합니다."
          >
            <Download className="w-3.5 h-3.5" /> 맞춤 CSV
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
                  margin={{ top: 10, right: 10, left: -20, bottom: 80 }}
                  onClick={(state: any) => {
                    if (state && state.activePayload && state.activePayload[0]) {
                      const clickedDist = state.activePayload[0].payload.original;
                      onSelectDistrict(clickedDist);
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#64748b', fontSize: 9, fontWeight: 500 }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                    interval={0}
                    minTickGap={0}
                    height={70}
                    angle={-45}
                    textAnchor="end"
                    tickMargin={12}
                  />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                  <Bar dataKey="Value" radius={[4, 4, 0, 0]} cursor="pointer">
                    {chartData.map((entry, index) => {
                      const isSelected = entry.name === selectedDistrict.name;
                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={isSelected ? '#1e1b4b' : getMetricColor()}
                          fillOpacity={isSelected ? 1 : 0.75}
                          cursor="pointer"
                          onClick={() => onSelectDistrict(entry.original)}
                        />
                      );
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
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#64748b', fontSize: 9 }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                    interval={0}
                    minTickGap={0}
                    height={70}
                    angle={-45}
                    textAnchor="end"
                    tickMargin={12}
                  />
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

        {activeTab === 'scaling' && (
          <div className="w-full h-full flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-semibold text-slate-500 font-mono">★ 자치구별 출생아 수 vs 보육시설 수 비교 분석</span>
              {proposals && (
                <button
                  onClick={() => setIncludeUnassigned(prev => !prev)}
                  className={`text-[10px] px-2.5 py-1 rounded-md font-bold border transition cursor-pointer ${
                    includeUnassigned
                      ? 'bg-indigo-600 text-white border-indigo-700'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {includeUnassigned ? '미상(서울시전체) 포함 중' : '✓ 25개 자치구 전용 보기'}
                </button>
              )}
            </div>
            <div className="flex-1 w-full min-h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={districtChartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 80 }}
                  onClick={(state: any) => {
                    if (state && state.activePayload && state.activePayload[0]) {
                      const original = state.activePayload[0].payload.original;
                      if (original && original.name !== "미상") {
                        onSelectDistrict(original);
                      }
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="district"
                    tick={{ fill: '#64748b', fontSize: 9 }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                    interval={0}
                    minTickGap={0}
                    height={70}
                    angle={-45}
                    textAnchor="end"
                    tickMargin={12}
                  />
                  <YAxis yAxisId="left" orientation="left" stroke="#e11d48" tick={{ fontSize: 10 }} label={{ value: '출생아수(명)', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                  <YAxis yAxisId="right" orientation="right" stroke="#10b981" tick={{ fontSize: 10 }} label={{ value: '보육시설수(개소)', angle: 90, position: 'insideRight', fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'Inter' }} />
                  <Line yAxisId="left" type="monotone" dataKey="출생아수(명)" stroke="#e11d48" strokeWidth={2.5} dot={{ r: 2 }} />
                  <Line yAxisId="right" type="monotone" dataKey="보육시설수(개소)" stroke="#10b981" strokeWidth={2.5} dot={{ r: 2 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'table' && (
          <div className="w-full h-full flex flex-col gap-4 overflow-y-auto max-h-[360px] p-1">
            <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl text-[11px] text-slate-600 leading-relaxed shrink-0">
              <span className="font-bold text-slate-800 block mb-1">💡 비교 지표 조정 안내 (3개 축 ➔ 2개 축)</span>
              기존의 3대 비교 분석 축 중 <span className="font-bold text-red-600">‘시민제안 건수’</span>는 자치구 미지정(미상) 건수가 대다수를 차지하여 특정 자치구 통계에 통합할 경우 데이터 왜곡이 발생합니다. 이에 따라 통계의 신뢰성을 극대화하기 위해 분석 축에서 제외하고, 검증된 <span className="font-bold text-indigo-600">공공 행정 데이터 지표(출생아 수, 보육시설 수, 합계출산율)</span> 중심으로 25개 자치구 비교 테이블을 새롭게 재구성하였습니다.
            </div>
            <div className="flex-1 w-full border border-slate-200 rounded-xl overflow-hidden shadow-2xs min-h-[180px]">
              <div className="max-h-[220px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-900 text-white font-semibold sticky top-0 text-[10px] uppercase">
                      <th className="p-2.5">순위</th>
                      <th className="p-2.5">자치구명</th>
                      <th className="p-2.5 text-right">합계출산율 (2025)</th>
                      <th className="p-2.5 text-right">출생아 수 (2025)</th>
                      <th className="p-2.5 text-right">보육시설 수 (개소)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.map((row, idx) => (
                      <tr 
                        key={row.name}
                        onClick={() => onSelectDistrict(row.original)}
                        className={`border-b border-slate-100 cursor-pointer hover:bg-indigo-50/50 transition-colors ${
                          row.name === selectedDistrict.name ? 'bg-indigo-50 font-bold text-indigo-900' : 'text-slate-700'
                        }`}
                      >
                        <td className="p-2.5 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="p-2.5 font-bold">{row.name}</td>
                        <td className="p-2.5 text-right font-mono text-emerald-600">{row.fertility.toFixed(3)}</td>
                        <td className="p-2.5 text-right font-mono text-purple-600">{row.births.toLocaleString()}명</td>
                        <td className="p-2.5 text-right font-mono text-amber-600">{row.daycare}개소</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-start gap-2.5">
        <HelpCircle className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
        <div className="text-[11px] text-slate-600 leading-relaxed">
          {selectedDistrict.name}은(는) 2025년 기준 합계출산율 <span className="font-semibold text-emerald-600">{selectedDistrict.fertilityRate.toFixed(3)}</span>, 2025년 연간 출생아수 <span className="font-semibold text-purple-600">{selectedDistrict.births2025.toLocaleString()}명</span>를 기록하고 있습니다. 어린이집은 현재 <span className="font-semibold text-amber-600">{selectedDistrict.daycare2025}개소</span>가 확보되어 있습니다.
        </div>
      </div>
    </div>
  );
};

export default StatCharts;
