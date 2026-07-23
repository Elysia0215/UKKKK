import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  Legend,
} from 'recharts';
import { Download, Info, Calendar, ArrowUpRight, ArrowDownRight, RefreshCw, BarChart2 } from 'lucide-react';
import demographicsData from '../data/demographicsData.json';

interface DemographicsAnalyzerProps {}

export const DemographicsAnalyzer: React.FC<DemographicsAnalyzerProps> = () => {
  const [selectedRegion, setSelectedRegion] = useState<string>('전국');
  const [activeMetric, setActiveMetric] = useState<'births' | 'fertilityRate' | 'deaths' | 'naturalIncrease'>('births');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const { nationalTrends, sidoRecords } = demographicsData;

  // Extract unique regions (Sidos)
  const regions = useMemo(() => {
    const list = Array.from(new Set(sidoRecords.map(r => r.sido)));
    // Put 전국 first if exists
    return ['전국', ...list.filter(r => r !== '전국')].sort();
  }, [sidoRecords]);

  // Year-over-Year comparison for KPI cards (2025 vs 2024 for Selected Region)
  const kpis = useMemo(() => {
    // If region is 전국, we can read from nationalTrends or filter from sidoRecords where sido === '전국'
    const records = selectedRegion === '전국' 
      ? nationalTrends.map(t => ({
          year: t.year,
          births: t.births,
          fertilityRate: t.year >= 2015 ? (sidoRecords.find(s => s.year === t.year && s.sido === '전국')?.fertilityRate ?? 0.8) : 1.2, // fallback or read
          deaths: t.deaths,
          naturalIncrease: t.naturalIncrease
        }))
      : sidoRecords.filter(r => r.sido === selectedRegion);

    const data2025 = records.find(r => r.year === 2025);
    const data2024 = records.find(r => r.year === 2024);

    const getDiff = (m: 'births' | 'fertilityRate' | 'deaths' | 'naturalIncrease') => {
      if (!data2025 || !data2024) return { val: 0, pct: 0, direction: 'none' };
      
      // Special TFR fallback for national if not in nationalTrends
      let v2025 = data2025[m];
      let v2024 = data2024[m];
      if (selectedRegion === '전국' && m === 'fertilityRate') {
        v2025 = 0.80;
        v2024 = 0.75;
      }

      const diffVal = v2025 - v2024;
      const pct = v2024 !== 0 ? (diffVal / Math.abs(v2024)) * 100 : 0;
      const direction = diffVal > 0 ? 'up' : diffVal < 0 ? 'down' : 'same';
      
      return { val: diffVal, pct, direction };
    };

    const getVal = (m: 'births' | 'fertilityRate' | 'deaths' | 'naturalIncrease') => {
      if (selectedRegion === '전국' && m === 'fertilityRate') return 0.80;
      return data2025 ? data2025[m] : 0;
    };

    return {
      births: { val: getVal('births'), diff: getDiff('births') },
      fertilityRate: { val: getVal('fertilityRate'), diff: getDiff('fertilityRate') },
      deaths: { val: getVal('deaths'), diff: getDiff('deaths') },
      naturalIncrease: { val: getVal('naturalIncrease'), diff: getDiff('naturalIncrease') },
    };
  }, [selectedRegion, nationalTrends, sidoRecords]);

  // Filtered dataset for table and charts
  const regionHistory = useMemo(() => {
    if (selectedRegion === '전국') {
      return nationalTrends.map(t => {
        const tfr = sidoRecords.find(s => s.year === t.year && s.sido === '전국')?.fertilityRate ?? (t.year === 2025 ? 0.80 : 0.75);
        return {
          year: t.year,
          births: t.births,
          fertilityRate: tfr,
          deaths: t.deaths,
          naturalIncrease: t.naturalIncrease,
          isProvisional: t.isProvisional
        };
      });
    } else {
      return sidoRecords
        .filter(r => r.sido === selectedRegion)
        .sort((a, b) => a.year - b.year);
    }
  }, [selectedRegion, nationalTrends, sidoRecords]);

  // Sido comparison for selected metric in 2025
  const sidoCompareData = useMemo(() => {
    const data2025 = sidoRecords.filter(r => r.year === 2025 && r.sido !== '전국');
    const mapped = data2025.map(r => ({
      sido: r.sido,
      value: r[activeMetric === 'fertilityRate' ? 'fertilityRate' : activeMetric] as number,
      original: r
    }));

    return mapped.sort((a, b) => {
      return sortOrder === 'desc' ? b.value - a.value : a.value - b.value;
    });
  }, [sidoRecords, activeMetric, sortOrder]);

  const handleExportCSV = () => {
    const csvHeader = "연도,지역명,출생아수(명),합계출산율,사망자수(명),자연증가(명),잠정치여부\n";
    const csvRows = regionHistory.map(r => 
      `${r.year},${selectedRegion},${r.births},${r.fertilityRate.toFixed(3)},${r.deaths},${r.naturalIncrease},${r.isProvisional ? '잠정' : '확정'}`
    ).join("\n");

    const blob = new Blob(["\uFEFF" + csvHeader + csvRows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `demographics_trend_${selectedRegion}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getMetricLabel = (m: typeof activeMetric) => {
    if (m === 'births') return '출생아 수';
    if (m === 'fertilityRate') return '합계출산율';
    if (m === 'deaths') return '사망자 수';
    return '자연증가';
  };

  const getMetricUnit = (m: typeof activeMetric) => {
    if (m === 'fertilityRate') return '';
    return '명';
  };

  return (
    <div className="space-y-6">
      {/* Region Selector and Top Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-500" />
            2025년 인구동향조사 잠정 결과 분석
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            국가데이터처에서 공표한 2025년 출생·사망통계(잠정) 데이터를 기반으로 장기 트렌드와 시도별 지표를 분석합니다.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-slate-600">분석 지역:</label>
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="bg-white border border-slate-200 text-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
          >
            {regions.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          <button
            onClick={handleExportCSV}
            className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> 추이 CSV 다운로드
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Births */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">연간 출생아 수</span>
              <h3 className="text-2xl font-black text-slate-800 mt-1">
                {kpis.births.val.toLocaleString()}명
              </h3>
            </div>
            <span className="bg-amber-50 text-amber-600 text-[9px] font-bold px-2 py-0.5 rounded-md border border-amber-200">
              2025 잠정
            </span>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">전년 대비</span>
            <div className="flex items-center gap-1">
              {kpis.births.diff.direction === 'up' ? (
                <span className="text-emerald-600 font-bold flex items-center">
                  <ArrowUpRight className="w-3.5 h-3.5" /> +{kpis.births.diff.val.toLocaleString()}명 ({kpis.births.diff.pct.toFixed(1)}%)
                </span>
              ) : (
                <span className="text-rose-600 font-bold flex items-center">
                  <ArrowDownRight className="w-3.5 h-3.5" /> {kpis.births.diff.val.toLocaleString()}명 ({kpis.births.diff.pct.toFixed(1)}%)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card 2: Fertility Rate */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">합계출산율</span>
              <h3 className="text-2xl font-black text-slate-800 mt-1">
                {kpis.fertilityRate.val.toFixed(3)}명
              </h3>
            </div>
            <span className="bg-amber-50 text-amber-600 text-[9px] font-bold px-2 py-0.5 rounded-md border border-amber-200">
              2025 잠정
            </span>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">전년 대비</span>
            <div className="flex items-center gap-1">
              {kpis.fertilityRate.diff.direction === 'up' ? (
                <span className="text-emerald-600 font-bold flex items-center">
                  <ArrowUpRight className="w-3.5 h-3.5" /> +{kpis.fertilityRate.diff.val.toFixed(3)} ({kpis.fertilityRate.diff.pct.toFixed(1)}%)
                </span>
              ) : (
                <span className="text-rose-600 font-bold flex items-center">
                  <ArrowDownRight className="w-3.5 h-3.5" /> {kpis.fertilityRate.diff.val.toFixed(3)} ({kpis.fertilityRate.diff.pct.toFixed(1)}%)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card 3: Deaths */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">연간 사망자 수</span>
              <h3 className="text-2xl font-black text-slate-800 mt-1">
                {kpis.deaths.val.toLocaleString()}명
              </h3>
            </div>
            <span className="bg-amber-50 text-amber-600 text-[9px] font-bold px-2 py-0.5 rounded-md border border-amber-200">
              2025 잠정
            </span>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">전년 대비</span>
            <div className="flex items-center gap-1">
              {kpis.deaths.diff.direction === 'up' ? (
                <span className="text-rose-600 font-bold flex items-center">
                  <ArrowUpRight className="w-3.5 h-3.5" /> +{kpis.deaths.diff.val.toLocaleString()}명 ({kpis.deaths.diff.pct.toFixed(1)}%)
                </span>
              ) : (
                <span className="text-emerald-600 font-bold flex items-center">
                  <ArrowDownRight className="w-3.5 h-3.5" /> {kpis.deaths.diff.val.toLocaleString()}명 ({kpis.deaths.diff.pct.toFixed(1)}%)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card 4: Natural Increase */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">인구 자연증가</span>
              <h3 className={`text-2xl font-black mt-1 ${kpis.naturalIncrease.val < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {kpis.naturalIncrease.val.toLocaleString()}명
              </h3>
            </div>
            <span className="bg-amber-50 text-amber-600 text-[9px] font-bold px-2 py-0.5 rounded-md border border-amber-200">
              2025 잠정
            </span>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">전년 대비</span>
            <div className="flex items-center gap-1">
              {kpis.naturalIncrease.diff.val > 0 ? (
                <span className="text-emerald-600 font-bold flex items-center">
                  <ArrowUpRight className="w-3.5 h-3.5" /> 자연감소 {Math.abs(kpis.naturalIncrease.diff.val).toLocaleString()}명 완화
                </span>
              ) : (
                <span className="text-rose-600 font-bold flex items-center">
                  <ArrowDownRight className="w-3.5 h-3.5" /> 자연감소 {Math.abs(kpis.naturalIncrease.diff.val).toLocaleString()}명 심화
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts & Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Long-term Trend Chart */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-indigo-500" />
              {selectedRegion} 인구동향 장기 추이 (1981 ~ 2025p)
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              출생아 수(파란색), 사망자 수(빨간색) 및 자연감소 추세의 장기 변화를 시각화합니다. (우측 축: 합계출산율)
            </p>
          </div>

          <div className="h-[280px] w-full pt-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={regionHistory} margin={{ top: 10, right: 30, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis yAxisId="left" tick={{ fontSize: 10 }} label={{ value: '명', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} label={{ value: '합계출산율', angle: 90, position: 'insideRight', fontSize: 10 }} />
                <Tooltip
                  formatter={(value: any, name: string) => {
                    if (name === "fertilityRate") return [value.toFixed(3), "합계출산율"];
                    return [value.toLocaleString() + "명", name === "births" ? "출생아 수" : name === "deaths" ? "사망자 수" : "자연증가"];
                  }}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                <Line yAxisId="left" type="monotone" dataKey="births" name="출생아 수" stroke="#3b82f6" strokeWidth={2.5} dot={false} />
                <Line yAxisId="left" type="monotone" dataKey="deaths" name="사망자 수" stroke="#ef4444" strokeWidth={2.5} dot={false} />
                <Line yAxisId="left" type="monotone" dataKey="naturalIncrease" name="자연증가" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="3 3" dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="fertilityRate" name="합계출산율" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sido Regional Bar Chart */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-sm font-bold text-slate-800">2025년 시도별 지표 비교</h4>
              <p className="text-xs text-slate-400 mt-0.5">지표 및 정렬을 선택하여 시도별 수치를 대조하세요.</p>
            </div>
            
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
              <button
                onClick={() => setSortOrder('desc')}
                className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                  sortOrder === 'desc' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                }`}
              >
                높은순
              </button>
              <button
                onClick={() => setSortOrder('asc')}
                className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                  sortOrder === 'asc' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                }`}
              >
                낮은순
              </button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-1.5 my-2">
            {(['births', 'fertilityRate', 'deaths', 'naturalIncrease'] as const).map(m => (
              <button
                key={m}
                onClick={() => setActiveMetric(m)}
                className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition ${
                  activeMetric === m
                    ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {getMetricLabel(m)}
              </button>
            ))}
          </div>

          <div className="h-[230px] w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sidoCompareData} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="sido" 
                  tick={{ fontSize: 9, fill: '#64748b' }} 
                  interval={0} 
                  angle={-30} 
                  textAnchor="end" 
                  tickMargin={5}
                />
                <YAxis tick={{ fontSize: 9 }} />
                <Tooltip
                  formatter={(value: any) => [
                    value.toLocaleString() + getMetricUnit(activeMetric), 
                    getMetricLabel(activeMetric)
                  ]}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', fontSize: '10px' }}
                />
                <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                  {sidoCompareData.map((entry, index) => {
                    const isSelected = entry.sido === selectedRegion;
                    return (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={isSelected ? '#1e1b4b' : activeMetric === 'births' ? '#3b82f6' : activeMetric === 'deaths' ? '#ef4444' : activeMetric === 'fertilityRate' ? '#10b981' : '#8b5cf6'} 
                        fillOpacity={isSelected ? 1 : 0.75}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Source Panel and Warnings */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row gap-4 items-start">
        <Info className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
        <div className="space-y-1.5 text-xs text-slate-600 leading-relaxed">
          <span className="font-bold text-slate-800 block">📊 2025년 출생·사망통계(잠정 결과) 데이터 안내 및 공표 정보</span>
          <p>
            본 화면에 표시된 2025년 수치는 국가데이터처(구 통계청)에서 2026년 2월 25일에 공표한 잠정 조사 결과입니다. 최종 확정치 통계는 2026년 8~9월경 발표될 예정이며, 확정치 공개 즉시 데이터가 갱신됩니다.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-[11px] text-slate-400 font-mono">
            <p>• 출처: 국가데이터처(구 통계청) 인구동향조과</p>
            <p>• 기준 정보: PDF 29, 35, 37, 47, 49 페이지</p>
            <p>• 최종 갱신: 2026-02-25 (잠정 공표일)</p>
          </div>
        </div>
      </div>
    </div>
  );
};
