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
  Download
} from 'lucide-react';
import { mockProposals } from './data/mockData';
import { DashboardStats } from './types';
import { DashboardOverview } from './components/DashboardOverview';
import { DistrictComparison } from './components/DistrictComparison';
import { CategoryDemand } from './components/CategoryDemand';
import { PriorityDetails } from './components/PriorityDetails';
import { MongttangList } from './components/MongttangList';
import { ClusterVolumeMap } from './components/ClusterVolumeMap';

import { exportToCsv } from './utils/exportCsv';

export default function App() {
  const [activeTab, setActiveTab] = useState<number>(0);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [selectedClusterId, setSelectedClusterId] = useState<number | null>(null);

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

  // 탭 네비게이션 및 카테고리/지역 즉시 이동 연동
  const handleNavigateToTab = (tabIndex: number) => {
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

  // 엑셀/CSV 데이터 내보내기
  const handleExportData = () => {
    const exportData = mockProposals.map(p => ({
      '제안ID': p.id,
      '카테고리': p.category,
      '제안제목': p.title,
      '제안본문내용': p.content,
      '등록일자': p.reg_date,
      '공감수': p.vote_score,
      '댓글수': p.comment_cnt,
      '답변여부': p.reply_yn === 'Y' ? '답변완료' : '미답변',
      '자치구': p.district,
      '담당부서': Array.isArray(p.department) ? p.department.join('; ') : p.department,
      '원문URL': p.url || `https://idea.seoul.go.kr/front/freeSuggest/view.do?sn=${p.id.replace('PROP-', '')}`
    }));

    exportToCsv(`서울시_출산정책_전체제안데이터_426건_${new Date().toISOString().split('T')[0]}.csv`, exportData);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* 서울시 시그니처 상단 헤더 */}
      <header className="bg-[#0A2351] text-white px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md sticky top-0 z-40">
        <div className="flex items-center space-x-4">
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center flex-shrink-0">
            <div className="w-5 h-5 border-2 border-[#0A2351] rounded-sm"></div>
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight flex items-center gap-2">
              서울시 출산·양육 정책 수요 분석 시스템
              <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-bold">MVP</span>
            </h1>
            <p className="text-xs text-slate-300">Seoul Maternity & Childcare Policy Dashboard v1.0</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs">
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

      {/* 메인 내비게이션 탭 */}
      <div className="bg-white border-b border-slate-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <nav className="flex space-x-2 overflow-x-auto" aria-label="Tabs">
            <button
              onClick={() => setActiveTab(0)}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg border transition whitespace-nowrap ${
                activeTab === 0
                  ? 'bg-[#0A2351] text-white border-[#0A2351]'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-slate-200 shadow-2xs'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              정책 수요 개요
            </button>

            <button
              onClick={() => setActiveTab(1)}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg border transition whitespace-nowrap ${
                activeTab === 1
                  ? 'bg-[#0A2351] text-white border-[#0A2351]'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-slate-200 shadow-2xs'
              }`}
            >
              <MapPin className="w-4 h-4" />
              지역별 비교
              {selectedDistrict && (
                <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />
              )}
            </button>

            <button
              onClick={() => setActiveTab(2)}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg border transition whitespace-nowrap ${
                activeTab === 2
                  ? 'bg-[#0A2351] text-white border-[#0A2351]'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-slate-200 shadow-2xs'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              키워드·수요 강도 분석
            </button>

            <button
              onClick={() => setActiveTab(3)}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg border transition whitespace-nowrap ${
                activeTab === 3
                  ? 'bg-[#0A2351] text-white border-[#0A2351]'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-slate-200 shadow-2xs'
              }`}
            >
              <AlertOctagon className="w-4 h-4 text-rose-500" />
              정책 우선순위 상세
              <span className="bg-rose-100 text-rose-700 text-[10px] font-black px-1.5 py-0.2 rounded-full ml-1">
                {mockProposals.filter(p => p.reply_yn === 'N' && p.vote_score >= 150).length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab(4)}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg border transition whitespace-nowrap ${
                activeTab === 4
                  ? 'bg-[#0A2351] text-white border-[#0A2351]'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-slate-200 shadow-2xs'
              }`}
            >
              <Building2 className="w-4 h-4 text-blue-500" />
              서울시 현행 정책 (몽땅정보 323건)
              <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-1.5 py-0.2 rounded-full ml-0.5">
                323
              </span>
            </button>

            <button
              onClick={() => setActiveTab(5)}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg border transition whitespace-nowrap ${
                activeTab === 5
                  ? 'bg-[#0A2351] text-white border-[#0A2351]'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-slate-200 shadow-2xs'
              }`}
            >
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              군집 볼륨 분석 (클러스터 맵)
            </button>
          </nav>
        </div>
      </div>

      {/* 메인 본문 콘텐츠 */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
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
          </motion.div>
        </AnimatePresence>
      </main>

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
    </div>
  );
}

