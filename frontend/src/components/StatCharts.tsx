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
  const [isGridView, setIsGridView] = useState<boolean>(true);

  // 8대 대분류 카테고리별 시민 제안 수 vs 공급 정책 수 대조 데이터셋 산출
  const categoryCompareData = useMemo(() => {
    const categories = [
      { name: '임신·난임·생식건강', policyCount: 38, proposalCount: 52 },
      { name: '출산·산후조리', policyCount: 29, proposalCount: 44 },
      { name: '영유아 보육·어린이집', policyCount: 65, proposalCount: 88 },
      { name: '초등돌봄·방과후', policyCount: 18, proposalCount: 35 },
      { name: '아동·청소년 복지', policyCount: 22, proposalCount: 27 },
      { name: '다자녀 지원', policyCount: 24, proposalCount: 48 },
      { name: '일·가정 양립', policyCount: 14, proposalCount: 56 },
      { name: '주거·생활·금융', policyCount: 20, proposalCount: 72 }
    ];

    if (proposals && proposals.length > 0) {
      return categories.map(cat => {
        const matched = proposals.filter(p => p.category === cat.name || cat.name.includes(p.category));
        return {
          name: cat.name,
          "시민 제안 수": matched.length > 0 ? matched.length : cat.proposalCount,
          "공급 정책 수": cat.policyCount
        };
      });
    }

    return categories.map(cat => ({
      name: cat.name,
      "시민 제안 수": cat.proposalCount,
      "공급 정책 수": cat.policyCount
    }));
  }, [proposals]);

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
        <div className="bg-slate-900 border border-slate-700 text-white p-3 rounded-lg shadow-xl text-[10.5px] leading-relaxed">
          <strong className="block text-indigo-300 font-bold mb-1 text-[11px]">📍 {data.name || data.district}</strong>
          {payload.map((item: any, idx: number) => {
            const isTFR = item.name === '합계출산율';
            return (
              <div key={idx} className="flex justify-between items-center gap-4">
                <span>{item.name}:</span>
                <strong className="font-mono font-black">
                  {isTFR ? Number(item.value).toFixed(3) : Number(item.value).toLocaleString()}
                  {isTFR ? '' : item.name.includes('수') ? '개소' : '명'}
                </strong>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  const handleExportCSV = () => {
    let csvContent = "";
    let fileName = "";
    
    if (activeTab === "ranking") {
      csvContent = `자치구명,${getMetricLabel()}\n` + 
        chartData.map(d => `${d.name},${d.Value}`).join("\n");
      fileName = `seoul_districts_${colorMetric}_ranking.csv`;
    } else if (activeTab === "distribution") {
      csvContent = "자치구명,출생아수(명),합계출산율\n" + 
        chartData.map(d => `${d.name},${d.births},${d.fertility.toFixed(3)}`).join("\n");
      fileName = "seoul_districts_birth_vs_fertility.csv";
    } else if (activeTab === "policy") {
      csvContent = "소관부서명,등록정책수(건)\n" + 
        DEPARTMENT_METRICS.map(d => `${d.name},${d.count}`).join("\n");
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
          {/* 뒤로가기 / 대시보드 복귀 버튼 */}
          {!isGridView && (
            <button
              onClick={() => setIsGridView(true)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 text-xs font-black flex items-center gap-1 cursor-pointer transition shadow-3xs"
            >
              ◀ 대시보드 홈
            </button>
          )}

          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => { setActiveTab('ranking'); setIsGridView(false); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                !isGridView && activeTab === 'ranking' ? 'bg-white text-slate-800 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" /> 구별 랭킹
            </button>
            <button
              onClick={() => { setActiveTab('distribution'); setIsGridView(false); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                !isGridView && activeTab === 'distribution' ? 'bg-white text-slate-800 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" /> 출산율 분포
            </button>
            <button
              onClick={() => { setActiveTab('policy'); setIsGridView(false); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                !isGridView && activeTab === 'policy' ? 'bg-white text-slate-800 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <PieIcon className="w-3.5 h-3.5" /> 정책 공급 현황
            </button>
            <button
              onClick={() => { setActiveTab('scaling'); setIsGridView(false); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                !isGridView && activeTab === 'scaling' ? 'bg-white text-slate-800 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Activity className="w-3.5 h-3.5" /> 제안-인프라 비교
            </button>
            <button
              onClick={() => { setActiveTab('table'); setIsGridView(false); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                !isGridView && activeTab === 'table' ? 'bg-white text-slate-800 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-800'
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

      <div className="p-5 flex-1 min-h-[380px] overflow-y-auto bg-slate-50/20">
        {isGridView ? (
          /* 5대 차트 요약 포털 그리드 레이아웃 */
          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-5 animate-in fade-in duration-200 pb-4">
            
            {/* 카드 1: 구별 랭킹 */}
            <div 
              onClick={() => { setActiveTab('ranking'); setIsGridView(false); }}
              className="bg-white p-4.5 rounded-xl border border-slate-200/80 hover:border-indigo-400 hover:-translate-y-1 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                    <span className="text-sm">📊</span> 구별 {getMetricLabel().split(' ')[0]} 랭킹
                  </h4>
                  <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-sm">Zoom-in ↗</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-normal mb-3">자치구별 지표 데이터를 내림차순 및 오름차순으로 정렬한 비교 랭킹 차트입니다.</p>
              </div>
              <div className="h-28 w-full pointer-events-none opacity-85">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.slice(0, 10)} margin={{ top: 5, right: 5, left: -30, bottom: 5 }}>
                    <Bar dataKey="Value" fill={getMetricColor()} radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 카드 2: 출산율 분포 */}
            <div 
              onClick={() => { setActiveTab('distribution'); setIsGridView(false); }}
              className="bg-white p-4.5 rounded-xl border border-slate-200/80 hover:border-indigo-400 hover:-translate-y-1 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                    <span className="text-sm">📈</span> 출산율 & 출생아 분포
                  </h4>
                  <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-sm">Zoom-in ↗</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-normal mb-3">출생율 선그래프와 출생아수 면그래프를 겹쳐 자치구별 집중 분포를 조감합니다.</p>
              </div>
              <div className="h-28 w-full pointer-events-none opacity-85">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData.slice(0, 12)} margin={{ top: 5, right: 5, left: -30, bottom: 5 }}>
                    <Area type="monotone" dataKey="births" fill="#c084fc" stroke="#8b5cf6" fillOpacity={0.25} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 카드 3: 요구 대비 정책 공급 격차 */}
            <div 
              onClick={() => { setActiveTab('policy'); setIsGridView(false); }}
              className="bg-white p-4.5 rounded-xl border border-slate-200/80 hover:border-indigo-400 hover:-translate-y-1 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                    <span className="text-sm">🍕</span> 요구 대비 정책 공급 격차
                  </h4>
                  <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-sm">Zoom-in ↗</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-normal mb-3">대분류 키워드별 시민 제안(수요) 건수와 서울시 양육 지원 정책(공급) 수의 1:1 대조 분석입니다.</p>
              </div>
              <div className="h-28 w-full pointer-events-none opacity-85">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryCompareData.slice(0, 5)} margin={{ top: 5, right: 5, left: -30, bottom: 5 }}>
                    <Bar dataKey="시민 제안 수" fill="#f43f5e" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="공급 정책 수" fill="#10b981" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 카드 4: 제안-인프라 비교 */}
            <div 
              onClick={() => { setActiveTab('scaling'); setIsGridView(false); }}
              className="bg-white p-4.5 rounded-xl border border-slate-200/80 hover:border-indigo-400 hover:-translate-y-1 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                    <span className="text-sm">⚡</span> 수요-보육시설 상관 분석
                  </h4>
                  <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-sm">Zoom-in ↗</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-normal mb-3">출생아 통계 수요와 현행 보육시설(어린이집 등) 인프라 간의 정밀 상관 곡선입니다.</p>
              </div>
              <div className="h-28 w-full pointer-events-none opacity-85">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData.slice(0, 15)} margin={{ top: 5, right: 5, left: -30, bottom: 5 }}>
                    <Area type="monotone" dataKey="daycare" fill="#34d399" stroke="#10b981" fillOpacity={0.2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 카드 5: 구별 통계 표 */}
            <div 
              onClick={() => { setActiveTab('table'); setIsGridView(false); }}
              className="bg-white p-4.5 rounded-xl border border-slate-200/80 hover:border-indigo-400 hover:-translate-y-1 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                    <span className="text-sm">📋</span> 자치구 종합 통계 실측 표
                  </h4>
                  <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-sm">Zoom-in ↗</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-normal mb-3">서울시 25개 자치구의 합계출산율, 출생아, 어린이집 실측 통합 통계 일람표입니다.</p>
              </div>
              <div className="h-28 overflow-hidden rounded border border-slate-100 text-[8.5px] text-slate-500 font-medium">
                <div className="bg-slate-900 text-white p-1 flex justify-between font-bold">
                  <span>구명</span>
                  <span>출산율</span>
                  <span>출생아</span>
                </div>
                <div className="divide-y divide-slate-100 bg-slate-50/50">
                  {chartData.slice(0, 4).map(d => (
                    <div key={d.name} className="p-1 flex justify-between">
                      <span className="font-bold text-slate-700">{d.name}</span>
                      <span className="text-emerald-600 font-mono">{d.fertility.toFixed(3)}</span>
                      <span className="text-purple-600 font-mono">{d.births.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 카드 6: 포털 가이드 */}
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-5 rounded-xl text-white flex flex-col justify-between shadow-xs border border-indigo-950 select-none">
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-base">💡</span>
                  <h4 className="text-xs font-extrabold text-indigo-200">자치구 입체 통계 분석</h4>
                </div>
                <p className="text-[10px] leading-relaxed text-indigo-100 font-medium">
                  본 분석실은 서울시 25개 자치구의 공공 인구 동향 데이터 및 보육 인프라 현황을 매칭하여 거시적 분석을 제공합니다. 
                </p>
              </div>
              <p className="text-[9px] text-indigo-300 font-bold leading-relaxed border-t border-indigo-800/60 pt-2.5">
                원하는 카드를 선택해 상세 랭킹 및 상관분석 시각화 차트를 확대하여 조회해보세요.
              </p>
            </div>

          </div>
        ) : (
          /* 기존 상세 차트 뷰 렌더러 (activeTab 분기) */
          <div className="w-full h-full flex flex-col animate-in fade-in duration-200">
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
                        angle={-20}
                        textAnchor="end"
                        tickMargin={8}
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
                        angle={-20}
                        textAnchor="end"
                        tickMargin={8}
                      />
                      <YAxis yAxisId="left" tick={{ fill: '#8b5cf6', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fill: '#10b981', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area yAxisId="left" type="monotone" dataKey="births" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.15} name="출생아 수(명)" />
                      <Area yAxisId="right" type="monotone" dataKey="fertility" stroke="#10b981" fill="#10b981" fillOpacity={0.05} name="합계출산율" />
                      <Legend wrapperStyle={{ fontSize: 11, pt: 10 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {activeTab === 'policy' && (
              <div className="w-full h-full flex flex-col gap-2">
                <span className="text-[11px] font-semibold text-slate-500 font-mono">★ 대분류 키워드별 시민 요구(제안 수) vs 행정 공급(등록 정책 수) 매칭 대조 분석</span>
                <div className="flex-1 w-full min-h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={categoryCompareData}
                      margin={{ top: 10, right: 10, left: -10, bottom: 80 }}
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
                        angle={-15}
                        textAnchor="end"
                        tickMargin={8}
                      />
                      <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                      <Legend wrapperStyle={{ fontSize: 11, pt: 10 }} />
                      <Bar dataKey="시민 제안 수" fill="#f43f5e" radius={[4, 4, 0, 0]} name="시민 요구(제안 건수)" />
                      <Bar dataKey="공급 정책 수" fill="#10b981" radius={[4, 4, 0, 0]} name="행정 공급(정책 건수)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {activeTab === 'scaling' && (
              <div className="w-full h-full flex flex-col gap-2">
                <span className="text-[11px] font-semibold text-slate-500 font-mono">★ 자치구별 출생아 수 대비 영유아 보육 인프라(어린이집 개소) 상관도 비교</span>
                <div className="flex-1 w-full min-h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={districtChartData} margin={{ top: 10, right: 10, left: -10, bottom: 80 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis
                        dataKey="district"
                        tick={{ fill: '#64748b', fontSize: 9 }}
                        axisLine={{ stroke: '#e2e8f0' }}
                        tickLine={false}
                        interval={0}
                        minTickGap={0}
                        height={70}
                        angle={-20}
                        textAnchor="end"
                        tickMargin={8}
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
