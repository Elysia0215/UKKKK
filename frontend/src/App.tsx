/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  MapPin, 
  BarChart3, 
  AlertOctagon, 
  Building2, 
  HelpCircle,
  FileSpreadsheet,
  TrendingUp,
  Download,
  AlertTriangle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import rawMongttangData from './data/mongttang.json';
import { PolicyProposal, DashboardStats } from './types';

const mockProposals = rawMongttangData as unknown as PolicyProposal[];
import { DashboardOverview } from './components/DashboardOverview';
import { DistrictComparison } from './components/DistrictComparison';
import { CategoryDemand } from './components/CategoryDemand';
import { PriorityDetails } from './components/PriorityDetails';
import { MongttangList } from './components/MongttangList';
import { ClusterVolumeMap } from './components/ClusterVolumeMap';
import { SeoulMap } from './components/SeoulMap';
import { StatCharts } from './components/StatCharts';
import { PolicyExplorer } from './components/PolicyExplorer';
import { GapMatrixDashboard } from './components/GapMatrixDashboard';
import { ReportExportModal } from './components/ReportExportModal';
import { OfficeAssistant } from './components/OfficeAssistant';
import { SEOUL_DISTRICTS_DATA, DistrictData } from './data/seoulData';

import { exportToCsv } from './utils/exportCsv';

export default function App() {
  const [activeTab, setActiveTab] = useState<number>(0);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [selectedClusterId, setSelectedClusterId] = useState<number | null>(null);
  const [selectedPublicDistrict, setSelectedPublicDistrict] = useState<DistrictData>(
    SEOUL_DISTRICTS_DATA.find((d) => d.name === '송파구') || SEOUL_DISTRICTS_DATA[0]
  );
  const [publicColorMetric, setPublicColorMetric] = useState<'proposals' | 'births' | 'daycare' | 'fertility' | 'demandScore'>('fertility');
  const [publicSortBy, setPublicSortBy] = useState<'name' | 'value'>('value');
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  // 실시간 통계 연산
  const stats = useMemo<DashboardStats>(() => {
    const totalCount = mockProposals.length;
    const totalVoteScore = mockProposals.reduce((sum, p) => sum + p.vote_score, 0);
    const avgVoteScore = totalCount > 0 ? totalVoteScore / totalCount : 0;
    const unansweredCount = mockProposals.filter(p => p.reply_yn === 'N').length;
    const unansweredRate = totalCount > 0 ? (unansweredCount / totalCount) * 100 : 0;

    return {
      totalCount,
      avgVoteScore,
      unansweredCount,
      unansweredRate
    };
  }, []);

  const publicStats = useMemo(() => {
    const totalProposals = mockProposals.length;
    const totalBirths = SEOUL_DISTRICTS_DATA.reduce((sum, d) => sum + d.births2025, 0);
    const totalDaycare = SEOUL_DISTRICTS_DATA.reduce((sum, d) => sum + d.daycare2025, 0);
    const avgFertility = SEOUL_DISTRICTS_DATA.reduce((sum, d) => sum + d.fertilityRate, 0) / SEOUL_DISTRICTS_DATA.length;

    return {
      totalProposals,
      totalBirths,
      totalDaycare,
      avgFertility
    };
  }, [mockProposals]);

  // 탭 네비게이션 및 카테고리/지역 즉시 이동 연동
  const handleNavigateToTab = (tabIndex: number, category?: string) => {
    if (category) {
      setSelectedCategory(category);
    }
    setActiveTab(tabIndex);
  };

  // 상단 네비게이션 탭 직접 클릭 시 이전 점프 필터(카테고리/지역 등) 초기화 후 탭 전환
  const handleTabClick = (tabIndex: number) => {
    setSelectedCategory(null);
    setSelectedSubCategory(null);
    setSelectedClusterId(null);
    setSelectedDistrict(null);
    setActiveTab(tabIndex);
  };

  const handleSelectCategoryFromOverview = (category: string) => {
    setSelectedCategory(category);
    setActiveTab(2); // 키워드/수요 분석 탭으로 이동
  };

  const handleSelectDistrictFromOverview = (district: string | null) => {
    setSelectedDistrict(district);
    setActiveTab(1); // 지역별 비교 탭으로 이동
  };

  const handleSelectCluster = (clusterId: number, category?: string, subCategory?: string) => {
    if (category) setSelectedCategory(category);
    if (subCategory) setSelectedSubCategory(subCategory);
    setSelectedClusterId(clusterId);
    setActiveTab(3); // 정책 우선순위 상세 탭으로 이동
  };

  // 엑셀/CSV 데이터 내보내기 및 맞춤 보고서 생성
  const handleExportData = () => {
    setIsExportModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* 서울시 시그니처 상단 헤더 */}
      <header className="bg-[#0A2351] text-white px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md sticky top-0 z-40">
        <div 
          onClick={() => handleTabClick(0)} 
          className="flex items-center space-x-4 cursor-pointer group hover:opacity-95 transition"
          title="클릭 시 홈 대시보드(정책 수요 개요)로 이동"
        >
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
            <div className="w-5 h-5 border-2 border-[#0A2351] rounded-sm"></div>
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight flex items-center gap-2 group-hover:text-blue-200 transition">
              서울시 출산·양육 정책 수요 분석 시스템
              <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-bold">MVP</span>
            </h1>
            <p className="text-xs text-slate-300">Seoul Maternity & Childcare Policy Dashboard v1.0</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs">
          {/* 부서 선택 필터 */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 rounded px-2.5 py-1">
            <Building2 className="w-3.5 h-3.5 text-blue-400" />
            <select
              value={selectedDept || ''}
              onChange={(e) => setSelectedDept(e.target.value || null)}
              className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer pr-1"
            >
              <option value="" className="bg-[#0A2351] text-slate-300">🏢 전체 부서 (R&R 통합)</option>
              {[
                '건강임신지원팀',
                '저출생사업1팀',
                '저출생사업2팀',
                '영유아담당관',
                '가족지원팀',
                '주거정비과',
                '가족건강팀',
                '아동보호팀'
              ].map((dept) => (
                <option key={dept} value={dept} className="bg-[#0A2351] text-white">
                  🏢 {dept}
                </option>
              ))}
            </select>
          </div>

          <span className="bg-blue-600 px-3 py-1 rounded text-xs font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            실시간 분석 중
          </span>
          <span className="opacity-70 font-mono">2026.07.19 23:10 기준</span>
          <button
            onClick={handleExportData}
            className="text-xs bg-slate-800/80 text-white border border-slate-700 hover:bg-slate-700 font-bold px-3 py-1 rounded flex items-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>보고서 다운로드</span>
          </button>
        </div>
      </header>

      {/* 메인 본문 레이아웃 (사이드바 + 메인 콘텐츠) */}
      <div className="flex-grow flex flex-row w-full relative">
        {/* 좌측 사이드바 */}
        <aside className={`${isSidebarOpen ? 'w-64' : 'w-16'} bg-[#0B2545] text-white flex flex-col transition-all duration-300 border-r border-[#134074] shrink-0 sticky top-[72px] h-[calc(100vh-72px)] overflow-y-auto z-30`}>
          
          {/* 사이드바 접기/펼치기 토글 단추 */}
          <div className={`p-3 border-b border-[#134074] flex items-center bg-[#081F3D] ${isSidebarOpen ? 'justify-between gap-3' : 'justify-end'}`}>
            {isSidebarOpen ? (
              <span className="text-[11px] sm:text-[12px] font-black tracking-[0.24em] text-slate-200 uppercase">
                메뉴 탐색기
              </span>
            ) : (
              <span className="w-0" />
            )}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 rounded bg-blue-900 hover:bg-blue-800 text-white transition cursor-pointer flex items-center justify-center shrink-0"
              title={isSidebarOpen ? "사이드바 접기" : "사이드바 펼치기"}
            >
              {isSidebarOpen ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* 세로 메뉴 목록 */}
          <nav className="flex flex-col py-2" aria-label="Sidebar Tabs">
            <button
              onClick={() => handleTabClick(0)}
              title="서울시 출산·육아 시민 제안 전체 현황 및 연도별 민원 트렌드 종합 개요"
              className={`flex items-center gap-3 w-full px-4 py-3 text-[13px] font-black tracking-[0.01em] transition cursor-pointer border-l-4 text-left ${
                activeTab === 0
                  ? 'bg-[#134074] text-white border-blue-400'
                  : 'text-slate-300 hover:text-white hover:bg-[#134074]/30 border-transparent'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              {isSidebarOpen && <span>정책 수요 개요</span>}
            </button>

            <button
              onClick={() => handleTabClick(1)}
              title="25개 자치구별 시민 제안 수량 및 출생아·보육시설 인프라 비교 지도 분석"
              className={`flex items-center gap-3 w-full px-4 py-3 text-[13px] font-black tracking-[0.01em] transition cursor-pointer border-l-4 text-left ${
                activeTab === 1
                  ? 'bg-[#134074] text-white border-blue-400'
                  : 'text-slate-300 hover:text-white hover:bg-[#134074]/30 border-transparent'
              }`}
            >
              <MapPin className="w-4 h-4 shrink-0" />
              {isSidebarOpen && (
                <span className="flex items-center gap-1">
                  <span>지역별 비교</span>
                  {selectedDistrict && <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />}
                </span>
              )}
            </button>

            <button
              onClick={() => handleTabClick(2)}
              title="TOP 30 최신 핵심 키워드 태그 클라우드 및 생애주기별 민원 수요 강도 분석"
              className={`flex items-center gap-3 w-full px-4 py-3 text-[13px] font-black tracking-[0.01em] transition cursor-pointer border-l-4 text-left ${
                activeTab === 2
                  ? 'bg-[#134074] text-white border-blue-400'
                  : 'text-slate-300 hover:text-white hover:bg-[#134074]/30 border-transparent'
              }`}
            >
              <BarChart3 className="w-4 h-4 shrink-0" />
              {isSidebarOpen && <span>키워드·수요 강도 분석</span>}
            </button>

            <button
              onClick={() => handleTabClick(3)}
              title="150표 이상 시민 공감을 얻었으나 서울시 공식 답변이 완료되지 않은 긴급 정책 공백 제안 총 4건 검토 및 일괄 답변 처리"
              className={`flex items-center gap-3 w-full px-4 py-3 text-[13px] font-black tracking-[0.01em] transition cursor-pointer border-l-4 text-left ${
                activeTab === 3
                  ? 'bg-[#134074] text-white border-blue-400'
                  : 'text-slate-300 hover:text-white hover:bg-[#134074]/30 border-transparent'
              }`}
            >
              <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />
              {isSidebarOpen && (
                <span className="flex items-center justify-between w-full min-w-0">
                  <span className="truncate">정책 우선순위 상세</span>
                  <span className="bg-rose-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full shrink-0 ml-1">
                    {mockProposals.filter(p => p.reply_yn === 'N' && p.vote_score >= 150).length}
                  </span>
                </span>
              )}
            </button>

            <button
              onClick={() => handleTabClick(4)}
              title="몽땅정보 만능키에 등록된 서울시 323개 공식 출산·보육 사업 검색 및 대조"
              className={`flex items-center gap-3 w-full px-4 py-3 text-[13px] font-black tracking-[0.01em] transition cursor-pointer border-l-4 text-left ${
                activeTab === 4
                  ? 'bg-[#134074] text-white border-blue-400'
                  : 'text-slate-300 hover:text-white hover:bg-[#134074]/30 border-transparent'
              }`}
            >
              <Building2 className="w-4 h-4 text-blue-400 shrink-0" />
              {isSidebarOpen && (
                <span className="flex items-center justify-between w-full min-w-0">
                  <span className="truncate">서울시 현행 정책</span>
                  <span className="bg-blue-900 text-slate-300 text-[9px] px-1.5 py-0.2 rounded-full shrink-0 ml-1">
                    323
                  </span>
                </span>
              )}
            </button>

            <button
              onClick={() => handleTabClick(5)}
              title="BERT Embedding 기반 유사 제안 군집 볼록(Voronoi/3D) 클러스터 시각화 지도"
              className={`flex items-center gap-3 w-full px-4 py-3 text-[13px] font-black tracking-[0.01em] transition cursor-pointer border-l-4 text-left ${
                activeTab === 5
                  ? 'bg-[#134074] text-white border-blue-400'
                  : 'text-slate-300 hover:text-white hover:bg-[#134074]/30 border-transparent'
              }`}
            >
              <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
              {isSidebarOpen && <span className="truncate">군집 볼륨 분석</span>}
            </button>

            <button
              onClick={() => handleTabClick(6)}
              title="KOSIS/KSTAT 서울시 출생아 수, 합계출산율(TFR), 보육시설 통계 지표 분석"
              className={`flex items-center gap-3 w-full px-4 py-3 text-[13px] font-black tracking-[0.01em] transition cursor-pointer border-l-4 text-left ${
                activeTab === 6
                  ? 'bg-[#134074] text-white border-blue-400'
                  : 'text-slate-300 hover:text-white hover:bg-[#134074]/30 border-transparent'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-indigo-400 shrink-0" />
              {isSidebarOpen && <span className="truncate">공공데이터 지표</span>}
            </button>

            <button
              onClick={() => handleTabClick(7)}
              title="수요-공급-민원 통합 갭(Gap) 분석 6대 판단 매트릭스 진단표"
              className={`flex items-center gap-3 w-full px-4 py-3 text-[13px] font-black tracking-[0.01em] transition cursor-pointer border-l-4 text-left ${
                activeTab === 7
                  ? 'bg-[#134074] text-white border-blue-400'
                  : 'text-slate-300 hover:text-white hover:bg-[#134074]/30 border-transparent'
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse shrink-0" />
              {isSidebarOpen && <span className="truncate">의사결정 갭 분석표</span>}
            </button>
          </nav>
        </aside>

        {/* 메인 콘텐츠 영역 */}
        <main className="flex-grow p-6 overflow-y-auto bg-slate-50 min-h-[calc(100vh-72px)]">
          <div className="max-w-6xl mx-auto w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
              >
            {activeTab === 0 && (
              <DashboardOverview 
                proposals={mockProposals}
                stats={stats}
                onNavigateToTab={handleNavigateToTab}
                onSelectCategory={handleSelectCategoryFromOverview}
                selectedDept={selectedDept}
              />
            )}

            {activeTab === 1 && (
              <DistrictComparison 
                proposals={mockProposals}
                selectedDistrict={selectedDistrict}
                onSelectDistrict={setSelectedDistrict}
              />
            )}

            {activeTab === 2 && (
              <CategoryDemand 
                proposals={mockProposals}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
              />
            )}

            {activeTab === 3 && (
              <PriorityDetails 
                proposals={mockProposals}
                initialCategory={selectedCategory || undefined}
                initialSubCategory={selectedSubCategory || undefined}
                initialClusterId={selectedClusterId || undefined}
              />
            )}

            {activeTab === 4 && (
              <MongttangList />
            )}

            {activeTab === 5 && (
              <ClusterVolumeMap
                proposals={mockProposals}
                onSelectCluster={handleSelectCluster}
              />
            )}

            {activeTab === 6 && (
              <div className="space-y-6">
                <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                    <p className="text-[11px] text-slate-500 uppercase tracking-[0.18em] font-semibold">서울시 연간 총 출생아 수</p>
                    <p className="mt-3 text-2xl font-extrabold text-slate-900">{publicStats.totalBirths.toLocaleString()}</p>
                    <p className="text-xs text-slate-400">명 / 2025 (잠정)</p>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                    <p className="text-[11px] text-slate-500 uppercase tracking-[0.18em] font-semibold">서울시 총 보육시설 수</p>
                    <p className="mt-3 text-2xl font-extrabold text-slate-900">{publicStats.totalDaycare.toLocaleString()}</p>
                    <p className="text-xs text-slate-400">개소 / 2025</p>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                    <p className="text-[11px] text-slate-500 uppercase tracking-[0.18em] font-semibold">서울시 평균 합계출산율</p>
                    <p className="mt-3 text-2xl font-extrabold text-slate-900">{publicStats.avgFertility.toFixed(3)}</p>
                    <p className="text-xs text-slate-400">자치구별 평균</p>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                    <p className="text-[11px] text-slate-500 uppercase tracking-[0.18em] font-semibold">누적 시민 제안 건수</p>
                    <p className="mt-3 text-2xl font-extrabold text-slate-900">{publicStats.totalProposals}</p>
                    <p className="text-xs text-slate-400">서울시 정책 제안</p>
                  </div>
                </section>
                <div className="bg-emerald-600 text-white p-5 rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="bg-white/25 text-white text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      🎉 2025년 최신 인구동향 통계청 잠정 속보 반영 완료
                    </span>
                    <h3 className="text-base font-extrabold mt-1.5">
                      서울시 출생아 수 9.4% 대반등 성공 (45,500명) & 합계출산율 0.63명 반등!
                    </h3>
                    <p className="text-[11px] text-emerald-100 mt-0.5">
                      통계청 2026.02.25 발표 잠정치 기준: 서울시 출생아 증가율(9.4%) 전국 광역시도 중 압도적 1위 기록!
                    </p>
                  </div>
                  <div className="flex gap-2.5">
                    <div className="bg-white/15 px-3 py-1.5 rounded-lg text-center border border-white/10">
                      <span className="text-[8px] text-emerald-200 uppercase font-semibold block">전국 TFR</span>
                      <span className="text-base font-black">0.80명</span>
                    </div>
                    <div className="bg-white/15 px-3 py-1.5 rounded-lg text-center border border-white/10">
                      <span className="text-[8px] text-emerald-200 uppercase font-semibold block">서울 TFR</span>
                      <span className="text-base font-black">0.63명</span>
                    </div>
                  </div>
                </div>

                <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-5 space-y-5">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-[0.2em] font-semibold">메트릭 필터</p>
                          <h2 className="text-lg font-bold text-slate-900 mt-2">지도 기반 정책 수요 시각화</h2>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPublicSortBy(publicSortBy === 'name' ? 'value' : 'name')}
                          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                        >
                          정렬: {publicSortBy === 'name' ? '자치구명' : '수치 순'}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'fertility', label: '합계출산율 (2025년)' },
                          { id: 'births', label: '출생아 수 (2025년)' },
                          { id: 'daycare', label: '보육시설 수' },
                          { id: 'demandScore', label: '정책 수요 점수' },
                        ].map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setPublicColorMetric(item.id as typeof publicColorMetric)}
                            className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                              publicColorMetric === item.id
                                ? 'bg-[#0A2351] text-white border-[#0A2351]'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <SeoulMap
                      selectedDistrict={selectedPublicDistrict}
                      onSelectDistrict={setSelectedPublicDistrict}
                      colorMetric={publicColorMetric}
                      showBackground={true}
                      sortBy={publicSortBy}
                    />
                  </div>

                  <div className="lg:col-span-7 space-y-6">
                    <div className="bg-[#0A2351] text-white rounded-xl p-6 shadow-md border border-slate-800 relative overflow-hidden">
                      <span className="text-[11px] uppercase text-blue-200 tracking-[0.3em] font-bold">Selected district</span>
                      <h2 className="text-3xl font-black text-white mt-4">{selectedPublicDistrict.name}</h2>
                      <p className="mt-3 text-sm text-slate-200 max-w-2xl">
                        선택된 자치구의 출생아 수, 보육시설 현황, 합계출산율, 정책 수요지수를 함께 확인합니다.
                      </p>
                      <div className="mt-6 grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-white/10 border border-white/10 p-4">
                          <p className="text-[10px] uppercase text-slate-300 tracking-[0.25em]">출생아 수</p>
                          <p className="mt-3 text-2xl font-bold">{selectedPublicDistrict.births2025.toLocaleString()}</p>
                          <p className="text-xs text-slate-300">명 / 2025 (잠정)</p>
                        </div>
                        <div className="rounded-xl bg-white/10 border border-white/10 p-4">
                          <p className="text-[10px] uppercase text-slate-300 tracking-[0.25em]">보육시설</p>
                          <p className="mt-3 text-2xl font-bold">{selectedPublicDistrict.daycare2025.toLocaleString()}</p>
                          <p className="text-xs text-slate-300">개소 / 2025</p>
                        </div>
                      </div>
                    </div>

                    <div className="h-[480px]">
                      <StatCharts
                        selectedDistrict={selectedPublicDistrict}
                        onSelectDistrict={setSelectedPublicDistrict}
                        colorMetric={publicColorMetric}
                      />
                    </div>

                    <div className="h-[680px]">
                      <PolicyExplorer selectedDistrict={selectedPublicDistrict} />
                    </div>
                  </div>
                </section>
              </div>
            )}

            {activeTab === 7 && (
              <GapMatrixDashboard 
                proposals={mockProposals}
                onNavigateToTab={handleNavigateToTab}
                selectedDept={selectedDept}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  </div>

      {/* 하단 업무용 푸터 */}
      <footer className="bg-white border-t border-slate-200 px-6 py-3 flex flex-col md:flex-row items-center justify-between text-xs text-slate-500 mt-auto">
        <div className="flex items-center space-x-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-slate-700">시스템 연동 상태:</span>
          <span>상상대로서울 민원제안 실시간 모니터링 중</span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-400">데이터 수집 주기: 15분</span>
        </div>
        <div className="flex items-center space-x-4 mt-2 md:mt-0">
          <span className="text-slate-400">여성가족실 양육정책 분석관 전용</span>
          <span className="inline-block w-2 h-2 rounded-full bg-blue-600" />
          <span className="font-semibold text-slate-700">Admin 접속 중</span>
        </div>
      </footer>

      {/* 보고서 생성 및 내보내기 모달 */}
      <ReportExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        selectedDept={selectedDept}
        proposals={mockProposals}
      />

      {/* 오피스 길잡이 (새싹이) */}
      <OfficeAssistant
        selectedDept={selectedDept}
        onNavigateToTab={handleNavigateToTab}
      />
    </div>
  );
}
