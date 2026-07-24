/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
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
  ChevronRight,
  MessageSquare,
  Search,
  Database
} from 'lucide-react';
import rawMongttangData from './data/mongttang.json';
import { PolicyProposal, DashboardStats } from './types';

const initialProposals = rawMongttangData as unknown as PolicyProposal[];
import { DashboardOverview } from './components/DashboardOverview';
import { DistrictComparison } from './components/DistrictComparison';
import { CategoryDemand } from './components/CategoryDemand';
import { PriorityDetails } from './components/PriorityDetails';
import { MongttangList } from './components/MongttangList';
import { ClusterVolumeMap } from './components/ClusterVolumeMap';
import { SeoulMap } from './components/SeoulMap';
import { StatCharts } from './components/StatCharts';
import { PolicyExplorer } from './components/PolicyExplorer';
import { DemographicsAnalyzer } from './components/DemographicsAnalyzer';
import { GapMatrixDashboard } from './components/GapMatrixDashboard';
import { MissingDataSimulator } from './components/MissingDataSimulator';
import { ReportExportModal } from './components/ReportExportModal';
import { OfficeAssistant } from './components/OfficeAssistant';
import { SEOUL_DISTRICTS_DATA, DistrictData } from './data/seoulData';

import { exportToCsv } from './utils/exportCsv';

export default function App() {
  const [activeTab, setActiveTab] = useState<number>(0);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>('종로구');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [selectedClusterId, setSelectedClusterId] = useState<number | null>(null);
  const [selectedPublicDistrict, setSelectedPublicDistrict] = useState<DistrictData>(
    SEOUL_DISTRICTS_DATA.find((d) => d.name === '종로구') || SEOUL_DISTRICTS_DATA[0]
  );
  const [publicColorMetric, setPublicColorMetric] = useState<'proposals' | 'births' | 'daycare' | 'fertility' | 'demand' | 'demandScore'>('fertility');
  const [publicSortBy, setPublicSortBy] = useState<'name' | 'value'>('value');
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [mockProposals, setMockProposals] = useState<PolicyProposal[]>(initialProposals);

  // 결측치 복원 반영 콜백
  const handleImputeApply = useCallback((updates: Array<{ id: string; district: string; category: string }>) => {
    setMockProposals(prev => {
      const updateMap = new Map(updates.map(u => [u.id, u]));
      return prev.map(p => {
        const upd = updateMap.get(p.id);
        if (upd) {
          return { ...p, district: upd.district };
        }
        return p;
      });
    });
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${yyyy}.${mm}.${dd} ${hh}:${min}:${ss}`;
  };

  // 자치구 선택 동기화 핸들러
  const handleSelectDistrict = (district: DistrictData) => {
    setSelectedPublicDistrict(district);
    setSelectedDistrict(district.name);
  };

  // 공공데이터 지표 서브탭 상태
  const [publicSubTab, setPublicSubTab] = useState<'district' | 'demographics'>('district');

  // 시민 제안 목록 필터 상태 (Tab 6)
  const [publicSearchTerm, setPublicSearchTerm] = useState('');
  const [publicSortOrder, setPublicSortOrder] = useState<'latest' | 'oldest' | 'title'>('latest');
  const [publicCategoryFilter, setPublicCategoryFilter] = useState<'전체' | '임신' | '출산' | '보육' | '다자녀'>('전체');

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
    setActiveTab(6); // 공공데이터 지표 탭으로 이동
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

  // 시민 제안 목록 필터링 (Tab 6)
  const filteredPublicProposals = useMemo(() => {
    return mockProposals
      .filter(p => p.district === selectedPublicDistrict.name)
      .filter(p => {
        const searchMatch = !publicSearchTerm || 
          p.title.toLowerCase().includes(publicSearchTerm.toLowerCase()) ||
          p.content.toLowerCase().includes(publicSearchTerm.toLowerCase());
        const catMatch = publicCategoryFilter === '전체' || p.category === publicCategoryFilter;
        return searchMatch && catMatch;
      })
      .sort((a, b) => {
        if (publicSortOrder === 'latest') return new Date(b.reg_date).getTime() - new Date(a.reg_date).getTime();
        if (publicSortOrder === 'oldest') return new Date(a.reg_date).getTime() - new Date(b.reg_date).getTime();
        return a.title.localeCompare(b.title);
      });
  }, [selectedPublicDistrict.name, publicSearchTerm, publicSortOrder, publicCategoryFilter]);

  const handleExportFilteredProposalsCSV = () => {
    const csvHeader = "제안ID,카테고리,등록일,제안명,제안내용\n";
    const csvRows = filteredPublicProposals.map(p => 
      `"${p.id}","${p.category}","${p.reg_date}","${p.title.replace(/"/g, '""')}","${p.content.replace(/"/g, '""')}"`
    ).join("\n");
    
    const blob = new Blob(["\uFEFF" + csvHeader + csvRows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `proposals_${selectedPublicDistrict.name}_filtered.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportDistrictStatsCSV = () => {
    const csvHeader = "자치구명,출생아수(2025 잠정),보육시설수(2025),합계출산율(2025 잠정),시민제안수(건),정책수요점수\n";
    const csvRows = SEOUL_DISTRICTS_DATA.map(d => 
      `${d.name},${d.births2025},${d.daycare2025},${d.fertilityRate.toFixed(3)},${d.proposals},${d.demandScore}`
    ).join("\n");
    
    const blob = new Blob(["\uFEFF" + csvHeader + csvRows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "seoul_25_districts_key_statistics.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
            <h1 className="text-lg font-black leading-tight flex items-center gap-2 group-hover:text-blue-200 transition tracking-wider">
              UKKKK
              <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-bold">MVP</span>
            </h1>
            <p className="text-xs text-slate-300 font-semibold">
              Unified Key-Knowledge Kit — 서울시 출산·양육 정책 수요 분석 시스템
            </p>
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
          <span className="opacity-70 font-mono notranslate" translate="no">{formatTime(currentTime)} 기준</span>
          <button
            onClick={handleExportData}
            className="text-xs bg-slate-800/80 text-white border border-slate-700 hover:bg-slate-700 font-bold px-3 py-1 rounded flex items-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span translate="no" className="notranslate">보고서 다운로드</span>
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
              title="몽땅정보 만능키에 등록된 서울시 322개 공식 출산·보육 사업 검색 및 대조"
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
                    322
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

            <button
              onClick={() => handleTabClick(8)}
              title="상상대로 '구 미상' 결측치를 5원 데이터 교차분석으로 자치구 복원하는 인터랙티브 시뮬레이터"
              className={`flex items-center gap-3 w-full px-4 py-3 text-[13px] font-black tracking-[0.01em] transition cursor-pointer border-l-4 text-left ${
                activeTab === 8
                  ? 'bg-[#134074] text-white border-blue-400'
                  : 'text-slate-300 hover:text-white hover:bg-[#134074]/30 border-transparent'
              }`}
            >
              <Database className="w-4 h-4 text-cyan-400 shrink-0" />
              {isSidebarOpen && <span className="truncate">결측치 복원 시뮬레이터</span>}
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
                onSelectDept={setSelectedDept}
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
                {/* Sub-tab Navigation */}
                <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                  <button
                    onClick={() => setPublicSubTab('district')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      publicSubTab === 'district' ? 'bg-[#0A2351] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5" /> 자치구별 정책·제안 비교
                  </button>
                  <button
                    onClick={() => setPublicSubTab('demographics')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      publicSubTab === 'demographics' ? 'bg-[#0A2351] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5" /> 인구동향 분석 (2025 잠정)
                  </button>
                </div>

                {publicSubTab === 'district' ? (
                  <div className="space-y-3">
                    {/* Metric Filter Bar (기존 정책 우선순위 상세 필터처럼 위로 올림) */}
                    <div className="bg-white px-3.5 py-2.5 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">지도 시각화 지표 선택:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { id: 'fertility', label: '합계출산율 (2025년)' },
                            { id: 'births', label: '출생아 수 (2025년)' },
                            { id: 'daycare', label: '보육시설 수' },
                            { id: 'demandScore', label: '정책 수요 점수' },
                          ].map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                setPublicColorMetric(item.id as any);
                                setPublicSortBy('value');
                              }}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                                publicColorMetric === item.id
                                  ? 'bg-[#0A2351] text-white border-[#0A2351] shadow-2xs'
                                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-800'
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPublicSortBy(publicSortBy === 'name' ? 'value' : 'name')}
                          className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                        >
                          정렬: {publicSortBy === 'name' ? '자치구명' : '수치 순'}
                        </button>
                      </div>
                    </div>

                    {/* Combined Map and Selected District Card (단 1개 통합 마스터 헤더 카드) */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3.5 space-y-3">
                      
                      {/* 📍 단 1개의 딥블루 마스터 헤더 바 (자치구명 + 3대 수치 + CSV 버튼 통합) */}
                      <div className="bg-[#0A2351] text-white p-3.5 rounded-xl shadow-md border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <MapPin className="w-5 h-5 text-indigo-400 shrink-0" />
                          <span className="text-[9px] uppercase bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 px-2 py-0.5 rounded font-mono font-bold">
                            SELECTED DISTRICT
                          </span>
                          <h2 className="text-xl sm:text-2xl font-black text-white">{selectedPublicDistrict.name}</h2>
                        </div>

                        <div className="flex items-center gap-2.5 sm:gap-4 text-xs flex-wrap">
                          <div className="bg-white/10 px-2.5 py-1 rounded-lg border border-white/10 flex items-center gap-1.5">
                            <span className="text-[9.5px] text-slate-300 font-bold">👶 출생아:</span>
                            <span className="font-black text-white text-xs font-mono">{selectedPublicDistrict.births2025.toLocaleString()}명</span>
                          </div>

                          <div className="bg-white/10 px-2.5 py-1 rounded-lg border border-white/10 flex items-center gap-1.5">
                            <span className="text-[9.5px] text-slate-300 font-bold">🏫 보육시설:</span>
                            <span className="font-black text-white text-xs font-mono">{selectedPublicDistrict.daycare2025.toLocaleString()}개소</span>
                          </div>

                          <div className="bg-white/10 px-2.5 py-1 rounded-lg border border-white/10 flex items-center gap-1.5">
                            <span className="text-[9.5px] text-rose-200 font-bold">📈 합계출산율:</span>
                            <span className="font-black text-rose-400 text-xs font-mono">{selectedPublicDistrict.fertilityRate.toFixed(3)}</span>
                          </div>

                          <button
                            onClick={handleExportDistrictStatsCSV}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1 transition shadow-2xs cursor-pointer ml-1"
                          >
                            <Download className="w-3 h-3" /> 통계 CSV
                          </button>
                        </div>
                      </div>

                      {/* 지도 전폭 시원한 렌더링 영역 */}
                      <div className="bg-slate-50/30 rounded-xl border border-slate-200/60 p-4 flex items-center justify-center">
                        <SeoulMap
                          selectedDistrict={selectedPublicDistrict}
                          onSelectDistrict={handleSelectDistrict}
                          colorMetric={publicColorMetric}
                          showBackground={false}
                          sortBy={publicSortBy}
                        />
                      </div>
                    </div>

                    {/* StatCharts container (underneath combined Map & Selected District container) */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col">
                      <StatCharts
                        selectedDistrict={selectedPublicDistrict}
                        onSelectDistrict={handleSelectDistrict}
                        colorMetric={publicColorMetric}
                        proposals={mockProposals}
                      />
                    </div>

                    {/* Policy Explorer (좌측: 행정 공급) & Citizen Proposals (우측: 시민 수요) 사이드-바이-사이드 대시보드 비교 뷰 */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                      {/* [좌측 칼럼] 🏛️ 자치구 맞춤형 지원사업 공공데이터 (행정 공급 현황) */}
                      <div>
                        <PolicyExplorer selectedDistrict={selectedPublicDistrict} />
                      </div>

                      {/* [우측 칼럼] 📣 자치구 시민 제안 목록 & 매칭 정책 진단 (시민 수요 현황) */}
                      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col p-6 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                          <div>
                            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                              <MessageSquare className="w-4 h-4 text-indigo-600" />
                              {selectedPublicDistrict.name} 시민 제안 목록
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">
                              선택된 자치구로 수집 및 카테고리 분류된 시민 정책 제안 리스트입니다.
                            </p>
                          </div>
                        </div>

                        {/* Search & Filter bar */}
                        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                          <div className="relative flex-1 min-w-[200px]">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                            <input
                              type="text"
                              placeholder="제안 제목, 본문 키워드로 빠른 검색..."
                              value={publicSearchTerm}
                              onChange={(e) => setPublicSearchTerm(e.target.value)}
                              className="w-full pl-9 pr-4 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 font-bold"
                            />
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <select
                              value={publicCategoryFilter}
                              onChange={(e) => setPublicCategoryFilter(e.target.value as any)}
                              className="bg-white border border-slate-200 text-slate-600 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none font-bold"
                            >
                              <option value="전체">카테고리 전체</option>
                              <option value="임신">임신</option>
                              <option value="출산">출산</option>
                              <option value="보육">보육</option>
                              <option value="다자녀">다자녀</option>
                            </select>

                            <select
                              value={publicSortOrder}
                              onChange={(e) => setPublicSortOrder(e.target.value as any)}
                              className="bg-white border border-slate-200 text-slate-600 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none font-bold"
                            >
                              <option value="latest">최신 등록순</option>
                              <option value="oldest">오래된 등록순</option>
                              <option value="title">가나다 제목순</option>
                            </select>

                            <button
                              onClick={() => { setPublicSearchTerm(''); setPublicSortOrder('latest'); setPublicCategoryFilter('전체'); }}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 text-xs font-bold transition cursor-pointer"
                            >
                              초기화
                            </button>

                            <button
                              onClick={handleExportFilteredProposalsCSV}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" /> 맞춤 CSV
                            </button>
                          </div>
                        </div>

                        {/* Proposal Cards List */}
                        <div className="max-h-[350px] overflow-y-auto space-y-3 pr-1 scrollbar-thin">
                          {filteredPublicProposals.length > 0 ? (
                            filteredPublicProposals.map(prop => (
                              <div key={prop.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:border-indigo-100 hover:shadow-xs transition">
                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                  <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100">
                                    {prop.category}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono">{prop.reg_date}</span>
                                </div>
                                <h4 className="text-xs font-bold text-slate-800">{prop.title}</h4>
                                <p className="text-[11px] text-slate-600 leading-relaxed mt-1 line-clamp-3">{prop.content}</p>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-10 text-slate-400 text-xs bg-slate-50/40 rounded-xl border border-dashed border-slate-200">
                              조건에 부합하는 시민 제안이 없습니다.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <DemographicsAnalyzer />
                )}
              </div>
            )}

            {activeTab === 7 && (
              <GapMatrixDashboard
                proposals={mockProposals}
                onNavigateToTab={handleNavigateToTab}
                selectedDept={selectedDept}
              />
            )}

            {activeTab === 8 && (
              <MissingDataSimulator proposals={mockProposals} onApply={handleImputeApply} />
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
        selectedDistrict={activeTab === 'publicData' ? (selectedDistrict || selectedPublicDistrict?.name) : selectedDistrict}
        selectedCategory={selectedCategory}
        proposals={mockProposals}
      />

      {/* 오피스 길잡이 (새싹이) */}
      <OfficeAssistant
        selectedDept={selectedDept}
        activeTab={activeTab}
        onNavigateToTab={handleNavigateToTab}
      />
    </div>
  );
}
