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
  Database,
  Layers
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
  const [publicSubTab, setPublicSubTab] = useState<'district' | 'demographics' | 'structure'>('district');

  // 시민 제안 목록 필터 상태 (Tab 6)
  const [publicSearchTerm, setPublicSearchTerm] = useState('');
  const [publicSortOrder, setPublicSortOrder] = useState<'latest' | 'oldest' | 'title'>('latest');
  const [publicCategoryFilter, setPublicCategoryFilter] = useState<'전체' | '임신' | '출산' | '보육' | '다자녀'>('전체');

  // 부서 필터링된 제안 목록 (여러 탭에서 공유)
  const deptFilteredProposals = useMemo(() => {
    if (!selectedDept) return mockProposals;
    const DEPT_CATEGORY_MAP: Record<string, (p: PolicyProposal) => boolean> = {
      '건강임신지원팀': p => p.category === '임신·난임·생식건강',
      '저출생사업1팀': p => p.category === '출산·산후 초기지원',
      '저출생사업2팀': p => p.category === '다자녀·양육비·생활지원',
      '영유아담당관': p => p.category === '보육·돌봄 인프라',
      '가족지원팀': p => p.category === '일·가정 양립·부모 노동',
      '주거정비과': p => p.category === '주거·교통·도시생활환경',
      '가족건강팀': p => p.sub_category?.includes('건강') || p.sub_category?.includes('의료') || p.category === '취약·다양가족 사각지대',
      '아동보호팀': p => p.category === '취약·다양가족 사각지대',
    };
    const filterFn = DEPT_CATEGORY_MAP[selectedDept];
    return filterFn ? mockProposals.filter(filterFn) : mockProposals;
  }, [mockProposals, selectedDept]);

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
            {[
              { tab: 0, icon: <LayoutDashboard className="w-4 h-4 shrink-0" />, label: '수요 현황 종합', iconColor: '',
                info: ['전체 제안 건수 및 답변 현황', '연도별·월별 민원 트렌드', '부서별 분류 현황', '데이터 품질 정제 보고', 'TOP 3 핵심 인사이트'] },
              { tab: 2, icon: <BarChart3 className="w-4 h-4 shrink-0" />, label: '시민 목소리 분석', iconColor: '',
                info: ['TOP 30 핵심 키워드 태그 클라우드', 'TF-IDF 기반 키워드 중요도 순위', '5단계 생애주기별 분류 필터', '키워드별 공감도 TOP 5 제안', '2축 복합 분석 차트'] },
              { tab: 3, icon: <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />, label: '긴급 민원 처리', iconColor: 'rose',
                badge: mockProposals.filter(p => p.reply_yn === 'N' && p.vote_score >= 150).length,
                info: ['150+ 공감 미답변 긴급 제안', '유사 제안 군집 그룹화 뷰', '다중 필터 (연도·주기·부서)', 'AI 공문 초안 일괄 답변', '원문 펼치기 & 외부 링크'] },
              { tab: 4, icon: <Building2 className="w-4 h-4 text-blue-400 shrink-0" />, label: '현행 정책 검색', iconColor: 'blue',
                badge: 322, badgeStyle: 'bg-blue-900 text-slate-300',
                info: ['몽땅정보 만능키 322개 사업', '정책명·부서·대상 키워드 검색', '지원 대상 및 내용 상세 보기', '시민 제안과 기존 정책 대조'] },
              { tab: 5, icon: <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />, label: '정책 사각지대 탐색', iconColor: 'emerald',
                info: ['BERT 임베딩 유사 제안 군집', 'TOP 3 핵심 클러스터 분석', '버블 차트 (크기=건수, 색=공감)', '군집 클릭 시 갭 분석 연동', '부서 필터 연동 군집 시각화'] },
              { tab: 6, icon: <FileSpreadsheet className="w-4 h-4 text-indigo-400 shrink-0" />, label: '자치구 통계 비교', iconColor: 'indigo',
                info: ['서울시 GeoJSON 행정구역 지도', '25개 자치구 제안수 분포', '출생아수·보육시설수 이중축 차트', 'KOSIS 공공데이터 지표', '자치구별 제안 상세 목록'] },
              { tab: 7, icon: <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse shrink-0" />, label: '정책 갭 진단', iconColor: 'rose',
                info: ['수요-공급 6대 갭 매트릭스', '근거 신뢰도 스코어 필터', '논문·뉴스·공공데이터 교차 검증', '부서별 진단 상태 추적', '정책 승인 패널 연동'] },
              { tab: 8, icon: <Database className="w-4 h-4 text-cyan-400 shrink-0" />, label: '결측치 복원 & 로그', iconColor: 'cyan',
                info: ['구 미상 제안 일괄 텍스트마이닝', '5원 데이터 교차분석 자치구 추정', '복원 결과 선택 → 데이터 반영', '정책 오매칭·피드백 통합 로그', '시스템 품질 관리 이력 조회'] },
            ].map(item => (
              <div key={item.tab} className="relative group/nav">
                <button
                  onClick={() => handleTabClick(item.tab)}
                  className={`flex items-center gap-3 w-full px-4 py-3 text-[13px] font-black tracking-[0.01em] transition cursor-pointer border-l-4 text-left ${
                    activeTab === item.tab
                      ? 'bg-[#134074] text-white border-blue-400'
                      : 'text-slate-300 hover:text-white hover:bg-[#134074]/30 border-transparent'
                  }`}
                >
                  {item.icon}
                  {isSidebarOpen && (
                    <span className="flex items-center justify-between w-full min-w-0">
                      <span className="truncate">{item.label}</span>
                      {item.badge !== undefined && (
                        <span className={`${item.badgeStyle || 'bg-rose-600 text-white'} text-[9px] font-black px-1.5 py-0.2 rounded-full shrink-0 ml-1`}>
                          {item.badge}
                        </span>
                      )}
                    </span>
                  )}
                </button>
                {/* 호버 정보 툴팁 */}
                <div className="hidden group-hover/nav:block absolute left-full top-0 ml-2 z-50 w-56 bg-slate-900 text-white text-[11px] p-3 rounded-xl shadow-2xl border border-slate-700 pointer-events-none">
                  <div className="font-black text-[12px] mb-1.5 text-blue-300 flex items-center gap-1.5">
                    {item.icon}
                    {item.label}
                  </div>
                  <div className="space-y-1">
                    {item.info.map((line, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-slate-300 leading-snug">
                        <span className="text-blue-400 shrink-0 mt-px">›</span>
                        <span>{line}</span>
                      </div>
                    ))}
                  </div>
                  <div className="absolute -left-1 top-3 w-2 h-2 bg-slate-900 border-l border-b border-slate-700 rotate-45" />
                </div>
              </div>
            ))}
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
                proposals={deptFilteredProposals}
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
                selectedDept={selectedDept || undefined}
              />
            )}

            {activeTab === 4 && (
              <MongttangList />
            )}

            {activeTab === 5 && (
              <ClusterVolumeMap
                proposals={deptFilteredProposals}
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
                    onClick={() => setPublicSubTab('structure')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      publicSubTab === 'structure' ? 'bg-[#0A2351] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" /> 민원 구조 분석
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
                        proposals={deptFilteredProposals}
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
                ) : publicSubTab === 'structure' ? (
                  /* ── 민원 구조 분석 인포그래픽 ── */
                  (() => {
                    const total = deptFilteredProposals.length;
                    const withDistrict = deptFilteredProposals.filter(p => p.district && p.district !== '미상' && p.district !== '구 미상' && p.district !== '');
                    const withoutDistrict = deptFilteredProposals.filter(p => !p.district || p.district === '미상' || p.district === '구 미상' || p.district === '');
                    const localCount = withDistrict.length;
                    const commonCount = withoutDistrict.length;
                    const localPct = ((localCount / total) * 100).toFixed(1);
                    const commonPct = ((commonCount / total) * 100).toFixed(1);

                    // 구별 특화 민원 분포
                    const districtCounts: Record<string, number> = {};
                    withDistrict.forEach(p => {
                      districtCounts[p.district] = (districtCounts[p.district] || 0) + 1;
                    });
                    const sortedDistricts = Object.entries(districtCounts).sort((a, b) => b[1] - a[1]);
                    const maxDistrictCount = sortedDistricts.length > 0 ? sortedDistricts[0][1] : 1;

                    // 카테고리별 공통 vs 특화 비율
                    const catMap: Record<string, { common: number; local: number }> = {};
                    deptFilteredProposals.forEach(p => {
                      const cat = String(p.category || '기타');
                      if (!catMap[cat]) catMap[cat] = { common: 0, local: 0 };
                      if (!p.district || p.district === '미상' || p.district === '구 미상' || p.district === '') {
                        catMap[cat].common++;
                      } else {
                        catMap[cat].local++;
                      }
                    });
                    const catEntries = Object.entries(catMap).sort((a, b) => (b[1].common + b[1].local) - (a[1].common + a[1].local));

                    // 공감도 비교
                    const avgVoteLocal = withDistrict.length > 0 ? (withDistrict.reduce((s, p) => s + p.vote_score, 0) / withDistrict.length) : 0;
                    const avgVoteCommon = withoutDistrict.length > 0 ? (withoutDistrict.reduce((s, p) => s + p.vote_score, 0) / withoutDistrict.length) : 0;

                    return (
                      <div className="space-y-4">
                        {/* 헤더 */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5">
                          <h3 className="text-sm font-black text-slate-900 mb-1 flex items-center gap-2">
                            <Layers className="w-4 h-4 text-indigo-500" />
                            민원 구조 분석 — 서울시 공통 vs 구별 특화
                          </h3>
                          <p className="text-[11px] text-slate-500">전체 {total}건 시민 제안을 "서울시 전체 공통 민원"과 "자치구 특화 민원"으로 분리하여 구조적 차이를 분석합니다.</p>
                        </div>

                        {/* 1단계: 도넛형 비율 + KPI */}
                        <div className="grid grid-cols-2 gap-3">
                          {/* 공통 민원 카드 */}
                          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 text-center">
                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">서울시 전체 공통 민원</div>
                            <div className="relative w-28 h-28 mx-auto mb-3">
                              <svg viewBox="0 0 36 36" className="w-full h-full">
                                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#6366f1" strokeWidth="3" strokeDasharray={`${commonPct}, 100`} strokeLinecap="round" />
                              </svg>
                              <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-2xl font-black text-indigo-600">{commonPct}%</span>
                                <span className="text-[9px] text-slate-500">{commonCount}건</span>
                              </div>
                            </div>
                            <p className="text-[10px] text-slate-600">특정 자치구를 지정하지 않은 서울시 전체 대상 제안</p>
                            <div className="mt-2 text-[10px] bg-indigo-50 rounded-lg px-2 py-1.5 border border-indigo-100">
                              <span className="text-slate-500">평균 공감</span>{' '}
                              <span className="font-black text-indigo-700">{avgVoteCommon.toFixed(1)}표</span>
                            </div>
                          </div>

                          {/* 구별 특화 카드 */}
                          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 text-center">
                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">자치구 특화 민원</div>
                            <div className="relative w-28 h-28 mx-auto mb-3">
                              <svg viewBox="0 0 36 36" className="w-full h-full">
                                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#f59e0b" strokeWidth="3" strokeDasharray={`${localPct}, 100`} strokeLinecap="round" />
                              </svg>
                              <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-2xl font-black text-amber-600">{localPct}%</span>
                                <span className="text-[9px] text-slate-500">{localCount}건</span>
                              </div>
                            </div>
                            <p className="text-[10px] text-slate-600">특정 자치구를 언급하거나 지정한 지역 특화 제안</p>
                            <div className="mt-2 text-[10px] bg-amber-50 rounded-lg px-2 py-1.5 border border-amber-100">
                              <span className="text-slate-500">평균 공감</span>{' '}
                              <span className="font-black text-amber-700">{avgVoteLocal.toFixed(1)}표</span>
                            </div>
                          </div>
                        </div>

                        {/* 2단계 & 3단계: 2열 grid 레이아웃 (좌: 자치구별 특화 분포, 우: 8대 카테고리별 비율) */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
                          
                          {/* 좌측 열: 구별 특화 민원 바차트 */}
                          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 flex flex-col justify-between">
                            <div>
                              <h4 className="text-xs font-black text-slate-800 mb-3 flex items-center justify-between">
                                <span className="flex items-center gap-1.5">
                                  <MapPin className="w-3.5 h-3.5 text-amber-500" />
                                  자치구별 특화 민원 분포
                                </span>
                                <span className="text-[9px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-bold border border-amber-200">
                                  특정구 {localCount}건
                                </span>
                              </h4>
                              <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
                                {sortedDistricts.map(([district, count], i) => (
                                  <div key={district} className="flex items-center gap-2 text-[10px]">
                                    <span className="w-4 text-right text-slate-400 font-bold">{i + 1}</span>
                                    <span className="w-14 font-bold text-slate-700 shrink-0">{district}</span>
                                    <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                                      <div
                                        className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 flex items-center justify-end pr-1.5 shadow-3xs"
                                        style={{ width: `${Math.max((count / maxDistrictCount) * 100, 8)}%` }}
                                      >
                                        <span className="text-[8px] font-black text-amber-950">{count}</span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {sortedDistricts.length === 0 && (
                                <p className="text-xs text-slate-400 text-center py-8">구가 특정된 제안이 없습니다</p>
                              )}
                            </div>
                          </div>

                          {/* 우측 열: 카테고리별 공통 vs 특화 스택 바 */}
                          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 flex flex-col justify-between">
                            <div>
                              <h4 className="text-xs font-black text-slate-800 mb-3 flex items-center justify-between">
                                <span className="flex items-center gap-1.5">
                                  <BarChart3 className="w-3.5 h-3.5 text-indigo-500" />
                                  8대 카테고리별 공통 vs 특화 비율
                                </span>
                                <div className="flex items-center gap-2 text-[9px] font-bold">
                                  <span className="flex items-center gap-0.5 text-indigo-700">
                                    <span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" /> 공통
                                  </span>
                                  <span className="flex items-center gap-0.5 text-amber-700">
                                    <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> 구 특화
                                  </span>
                                </div>
                              </h4>
                              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                                {catEntries.map(([cat, { common, local }]) => {
                                  const catTotal = common + local;
                                  const commonW = (common / catTotal) * 100;
                                  return (
                                    <div key={cat} className="space-y-0.5">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-slate-700 truncate max-w-[200px]">{cat}</span>
                                        <span className="text-[9px] text-slate-400 font-mono font-bold">{catTotal}건</span>
                                      </div>
                                      <div className="flex h-4.5 rounded-md overflow-hidden border border-slate-200 shadow-3xs">
                                        <div
                                          className="bg-indigo-400 flex items-center justify-center transition-all duration-300"
                                          style={{ width: `${commonW}%` }}
                                        >
                                          {commonW > 15 && <span className="text-[8px] font-black text-white">{common}</span>}
                                        </div>
                                        <div
                                          className="bg-amber-400 flex items-center justify-center transition-all duration-300"
                                          style={{ width: `${100 - commonW}%` }}
                                        >
                                          {(100 - commonW) > 15 && <span className="text-[8px] font-black text-amber-950">{local}</span>}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>

                        </div>

                        {/* 인사이트 요약 */}
                        <div className="bg-gradient-to-r from-indigo-50 to-amber-50 rounded-xl border border-indigo-200/50 p-4">
                          <h4 className="text-xs font-black text-slate-800 mb-2">📊 구조 분석 인사이트</h4>
                          <div className="space-y-1.5 text-[10px] text-slate-700">
                            <p>• 전체 제안의 <strong className="text-indigo-700">{commonPct}%</strong>가 서울시 전체 공통 민원으로, 특정 구를 지정하지 않은 정책 수요입니다.</p>
                            <p>• 자치구 특화 민원 <strong className="text-amber-700">{localCount}건</strong> 중 상위 3개 구는{' '}
                              <strong>{sortedDistricts.slice(0, 3).map(d => d[0]).join(', ')}</strong>입니다.
                            </p>
                            <p>• 공통 민원 평균 공감 <strong>{avgVoteCommon.toFixed(1)}표</strong> vs 특화 민원 <strong>{avgVoteLocal.toFixed(1)}표</strong> — {avgVoteCommon > avgVoteLocal ? '공통 이슈에 더 많은 시민이 공감하고 있어, 서울시 차원의 광역 정책 대응이 우선적으로 필요합니다.' : '지역 특화 이슈에 공감이 집중되어, 자치구별 맞춤 정책이 효과적입니다.'}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })()
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
        publicSubTab={publicSubTab}
      />
    </div>
  );
}
