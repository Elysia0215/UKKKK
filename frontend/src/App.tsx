/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Baby, Home, Sparkles, FileText, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { SEOUL_DISTRICTS_DATA, DistrictData } from './data/seoulData';
import { SeoulMap } from './components/SeoulMap';
import { StatCharts } from './components/StatCharts';
import { PolicyExplorer } from './components/PolicyExplorer';

export default function App() {
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictData>(
    SEOUL_DISTRICTS_DATA.find((d) => d.name === '송파구') || SEOUL_DISTRICTS_DATA[0]
  );
  const [colorMetric, setColorMetric] = useState<'proposals' | 'births' | 'daycare' | 'fertility' | 'demandScore'>('fertility');
  const [showBackground, setShowBackground] = useState(true);
  const [sortBy, setSortBy] = useState<'name' | 'value'>('value');

  const totalProposals = SEOUL_DISTRICTS_DATA.reduce((sum, d) => sum + d.proposals, 0);
  const totalBirths = SEOUL_DISTRICTS_DATA.reduce((sum, d) => sum + d.births2024, 0);
  const totalDaycare = SEOUL_DISTRICTS_DATA.reduce((sum, d) => sum + d.daycare2025, 0);
  const avgFertility = SEOUL_DISTRICTS_DATA.reduce((sum, d) => sum + d.fertilityRate, 0) / SEOUL_DISTRICTS_DATA.length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <header className="bg-white border-b border-slate-100 px-6 py-4 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 text-white p-2.5 rounded-xl shadow-md shadow-indigo-100">
              <Baby className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                서울시 자치구별 출산·보육 정책 수요분석 맞춤형 대시보드
                <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-mono font-bold animate-pulse">
                  PUBLIC DATA LIVE
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                지오메트릭 벡터 맵과 공공 통계를 결합하여 서울시 자치구별 정책 인사이트를 제공합니다.
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] text-slate-500 uppercase tracking-[0.18em] font-semibold">서울시 연간 총 출생아 수</p>
              <p className="mt-3 text-2xl font-extrabold text-slate-900">{totalBirths.toLocaleString()}</p>
              <p className="text-xs text-slate-400">명 / 2024</p>
            </div>
            <div className="bg-purple-50 text-purple-600 p-3 rounded-2xl">
              <Sparkles className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] text-slate-500 uppercase tracking-[0.18em] font-semibold">서울시 총 보육시설 수</p>
              <p className="mt-3 text-2xl font-extrabold text-slate-900">{totalDaycare.toLocaleString()}</p>
              <p className="text-xs text-slate-400">개소 / 2025</p>
            </div>
            <div className="bg-amber-50 text-amber-600 p-3 rounded-2xl">
              <Home className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] text-slate-500 uppercase tracking-[0.18em] font-semibold">서울시 평균 합계출산율</p>
              <p className="mt-3 text-2xl font-extrabold text-slate-900">{avgFertility.toFixed(3)}</p>
              <p className="text-xs text-slate-400">자치구별 평균</p>
            </div>
            <div className="bg-emerald-50 text-emerald-600 p-3 rounded-2xl">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] text-slate-500 uppercase tracking-[0.18em] font-semibold">누적 시민 제안 건수</p>
              <p className="mt-3 text-2xl font-extrabold text-slate-900">{totalProposals}</p>
              <p className="text-xs text-slate-400">서울시 정책 제안</p>
            </div>
            <div className="bg-slate-100 text-slate-900 p-3 rounded-2xl">
              <FileText className="w-6 h-6" />
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 flex flex-col gap-5">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-[0.2em] font-semibold">메트릭 필터</p>
                  <h2 className="text-lg font-bold text-slate-900 mt-2">지도 기반 정책 수요 시각화</h2>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">INDIGO SLATE THEME</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'fertility', label: '합계출산율' },
                  { id: 'births', label: '출생아 수' },
                  { id: 'daycare', label: '보육시설 수' },
                  { id: 'demandScore', label: '정책 수요 점수' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setColorMetric(item.id as any)}
                    className={`rounded-2xl border px-3 py-2 text-sm font-semibold transition ${
                      colorMetric === item.id
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between gap-3 mt-4 text-xs text-slate-500">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showBackground}
                    onChange={(event) => setShowBackground(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  배경 레이어 표시
                </label>
                <button
                  type="button"
                  onClick={() => setSortBy(sortBy === 'name' ? 'value' : 'name')}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600 hover:bg-slate-100"
                >
                  정렬: {sortBy === 'name' ? '자치구명' : '수치 순'}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <SeoulMap
                selectedDistrict={selectedDistrict}
                onSelectDistrict={setSelectedDistrict}
                colorMetric={colorMetric}
                showBackground={showBackground}
                sortBy={sortBy}
              />
            </div>
          </div>

          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="bg-indigo-950 text-white rounded-[36px] p-6 shadow-xl border border-indigo-900 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 opacity-90"></div>
              <div className="relative z-10">
                <span className="text-[11px] uppercase text-indigo-300 tracking-[0.3em] font-bold">Selected district</span>
                <h2 className="text-3xl font-black text-white mt-4">{selectedDistrict.name}</h2>
                <p className="mt-3 text-sm text-slate-300 max-w-2xl">
                  선택된 자치구의 핵심 지표를 집중 분석합니다. 출생아 수, 보육시설 현황, 정책 수요점수까지 한눈에 확인할 수 있습니다.
                </p>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-3xl bg-white/10 border border-white/10 p-4">
                    <p className="text-[10px] uppercase text-slate-300 tracking-[0.25em]">출생아 수</p>
                    <p className="mt-3 text-2xl font-bold">{selectedDistrict.births2024.toLocaleString()}</p>
                    <p className="text-xs text-slate-400">명 / 2024</p>
                  </div>
                  <div className="rounded-3xl bg-white/10 border border-white/10 p-4">
                    <p className="text-[10px] uppercase text-slate-300 tracking-[0.25em]">보육시설</p>
                    <p className="mt-3 text-2xl font-bold">{selectedDistrict.daycare2025.toLocaleString()}</p>
                    <p className="text-xs text-slate-400">개소 / 2025</p>
                  </div>
                </div>
              </div>
              <div className="absolute right-6 top-6 bg-white/10 border border-white/10 rounded-3xl px-4 py-3 text-right">
                <p className="text-[9px] uppercase tracking-[0.35em] text-slate-300">정책 수요 지수</p>
                <p className="mt-2 text-2xl font-bold text-emerald-300">{selectedDistrict.demandScore}</p>
                <p className="text-[11px] text-slate-300">합계출산율 {selectedDistrict.fertilityRate.toFixed(3)}</p>
              </div>
            </div>

            <div className="h-[480px]">
              <StatCharts
                selectedDistrict={selectedDistrict}
                onSelectDistrict={setSelectedDistrict}
                colorMetric={colorMetric}
              />
            </div>

            <div className="h-[680px]">
              <PolicyExplorer selectedDistrict={selectedDistrict} />
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-white border-t border-slate-100 py-6 text-center text-xs text-slate-400 font-mono">
        <p>© 2026 서울시 출산·보육 정책 수요 분석 대시보드</p>
      </footer>
    </div>
  );
}

