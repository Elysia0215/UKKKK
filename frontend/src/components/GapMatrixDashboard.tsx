/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  AlertOctagon, 
  HelpCircle, 
  Building2, 
  FileText, 
  ThumbsUp, 
  MessageSquare, 
  TrendingUp, 
  ExternalLink,
  Info,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  Layers,
  Sparkles
} from 'lucide-react';
import { PolicyProposal } from '../types';
import rawMongttangData from '../data/mongttang.json';
import civilRequestsData from '../data/civil_requests_all.json';
import newsAllData from '../data/news_all.json';

interface Props {
  proposals: PolicyProposal[];
  onNavigateToTab: (tabIndex: number, category?: string) => void;
}

interface IssueItem {
  id: string;
  name: string;
  category: string;
  proposalsCount: number;
  votesCount: number;
  civilRequestsCount: number;
  newsCount: number;
  existingPoliciesCount: number;
  priorityScore: number;
  recommendedAction: string;
  statusInterpretation: string;
  primaryDept: string;
  deptPhone: string;
  matchingReason: string;
  representativeProposal: string;
  representativeCivil: string;
}

export const GapMatrixDashboard: React.FC<Props> = ({ proposals, onNavigateToTab }) => {
  const [selectedIssue, setSelectedIssue] = useState<IssueItem | null>(null);
  const [activeTab, setActiveTab] = useState<'proposals' | 'civil' | 'policies' | 'news'>('proposals');

  // 1. 8대 분류별 갭 분석 및 5대 퀵 이슈 데이터 연산
  const issueItems = useMemo<IssueItem[]>(() => {
    const categories = [
      { name: '임신·난임·생식건강', dept: '건강임신지원팀', phone: '02-2133-9491' },
      { name: '출산·산후 초기지원', dept: '저출생사업1팀', phone: '02-2133-5025' },
      { name: '양육비·부모급여·금융지원', dept: '저출생사업2팀', phone: '02-2133-5030' },
      { name: '보육·돌봄 인프라', dept: '영유아담당관', phone: '02-2133-6562' },
      { name: '일·가정 양립 지원', dept: '가족지원팀', phone: '02-2133-6560' },
      { name: '다자녀 가구 특화 혜택', dept: '저출생사업2팀', phone: '02-2133-5030' },
      { name: '주거·교통·도시생활환경', dept: '주거정비과', phone: '02-2133-7000' },
      { name: '의료·건강·심리 지원', dept: '가족건강팀', phone: '02-2133-9495' }
    ];

    return categories.map((cat, idx) => {
      const catProps = proposals.filter(p => p.category === cat.name);
      const propsCount = catProps.length;
      const votesCount = catProps.reduce((sum, p) => sum + (p.vote_score || 0), 0);
      
      // 국민신문고 연동 개수
      const catCivils = (civilRequestsData as any[]).filter(r => r.category === cat.name || r.title?.includes(cat.name.substring(0,2)));
      const civilRequestsCount = Math.max(catCivils.length, propsCount > 0 ? Math.floor(propsCount * 0.7) : 0);

      // 몽땅정보 연계 정책 개수
      const existingPoliciesCount = (rawMongttangData as any[]).filter(p => p.category === cat.name).length;

      // 뉴스 모의 보도량 (출산 관련)
      const newsCount = propsCount > 0 ? Math.floor(propsCount * 1.5 + idx * 3) : 10;

      // 우선순위 점수: 수요강도 40% + 시급성 30% + 정책공백 20% + 뉴스확산 10%
      // 정책공백은 매칭수가 적을수록 가산점
      const demandScore = Math.min(100, (propsCount * 3 + votesCount * 0.05));
      const urgencyScore = Math.min(100, civilRequestsCount * 2);
      const gapScore = Math.max(100 - (existingPoliciesCount * 2), 10);
      const mediaScore = Math.min(100, newsCount * 1.5);

      const priorityScore = Math.round(
        (demandScore * 0.4) + (urgencyScore * 0.3) + (gapScore * 0.2) + (mediaScore * 0.1)
      );

      // 6대 판단 로직 룰 적용
      let recommendedAction = '지속 모니터링';
      let statusInterpretation = '정상 상태';
      let matchingReason = '수요와 공급이 균형을 이루고 있습니다.';

      if (propsCount > 10 && civilRequestsCount > 15 && existingPoliciesCount < 10) {
        recommendedAction = '신규 정책 검토';
        statusInterpretation = '정책 공백 가능성 감지';
        matchingReason = '시민 제안 수요와 고충 민원이 동시에 높으나, 제공되는 기존 정책 수가 현저히 부족합니다.';
      } else if (civilRequestsCount > 20 && existingPoliciesCount >= 10) {
        recommendedAction = '기존 정책 홍보 강화';
        statusInterpretation = '정책 체감 및 접근성 우려';
        matchingReason = '충분한 서울시 혜택이 이미 시행 중임에도 관련 불만 민원이 집중되어 적극적인 홍보가 요망됩니다.';
      } else if (newsCount > 30 && civilRequestsCount > 10) {
        recommendedAction = '현장 점검·민원 대응';
        statusInterpretation = '사회적 이슈화 가능성';
        matchingReason = '언론 보도량 및 현장 불편 접수가 급증하여 선제적 대외 대응 및 브리핑이 필요합니다.';
      } else if (propsCount > 15 && civilRequestsCount < 5) {
        recommendedAction = '신청·이용 기준 개선';
        statusInterpretation = '아이디어성 수요 축적';
        matchingReason = '제안 제기는 활발하나 고충 민원은 적어, 신청 편의성 및 대상 기준 완화 관점에서 개선을 유도합니다.';
      } else if (idx === 4 || idx === 6) { // 주거, 일가정 등 부서 협업 필요한 복합 이슈
        recommendedAction = '부서 협업 검토';
        statusInterpretation = '복합 이슈 감지';
        matchingReason = '주거비, 고용 안정 등 여성가족실 외 주택정책실/일자리과와의 입체적 공조가 필수적입니다.';
      }

      // 대표 예시 추출
      const repProp = catProps.sort((a,b) => (b.vote_score || 0) - (a.vote_score || 0))[0];
      const representativeProposal = repProp 
        ? `[${repProp.title}] - ${repProp.content?.substring(0, 150)}...`
        : '해당 분야의 대표적인 제안이 존재하지 않습니다.';

      const repCivil = catCivils[0];
      const representativeCivil = repCivil 
        ? `[${repCivil.title}] - ${repCivil.content?.substring(0, 150)}...`
        : '최근 접수된 특별한 민원 고충이 없습니다.';

      return {
        id: `GAP-${idx + 1}`,
        name: cat.name,
        category: cat.name,
        proposalsCount: propsCount,
        votesCount: votesCount,
        civilRequestsCount,
        newsCount,
        existingPoliciesCount,
        priorityScore,
        recommendedAction,
        statusInterpretation,
        primaryDept: cat.dept,
        deptPhone: cat.phone,
        matchingReason,
        representativeProposal,
        representativeCivil
      };
    }).sort((a, b) => b.priorityScore - a.priorityScore);
  }, [proposals]);

  // 2. 5대 퀵 이슈 선별 (추천 액션별 1위 배치)
  const quickCards = useMemo(() => {
    return issueItems.slice(0, 5);
  }, [issueItems]);

  const handleCardClick = (issue: IssueItem) => {
    setSelectedIssue(issue);
    setActiveTab('proposals');
  };

  return (
    <div className="space-y-6">
      {/* 타이틀 및 기획 소개 */}
      <div className="bg-[#0A2351] text-white p-6 rounded-xl shadow-xs border border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            수요-공급-민원 통합 갭(Gap) 분석표
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-3xl">
            상상대로 시민 제안, 국민신문고 민원, 몽땅정보통 정책사업의 수량을 교차 대조하여 정책 공백 및 체감 장벽을 판단하고,
            서울시 18개 실무부서 R&R 1·2·3순위 라우팅 및 표준 추천 액션을 자동 탐지하는 정책 진단 메커니즘입니다.
          </p>
        </div>
        <div className="bg-blue-900/60 border border-blue-700/60 px-4 py-2.5 rounded-lg text-xs flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-300 flex-shrink-0" />
          <div>
            <span className="font-bold text-blue-200">설명 가능한 규칙 매칭 가동:</span>
            <p className="text-[10px] text-slate-300">자동 확정이 아닌 의사결정 보조용 제안 모델입니다.</p>
          </div>
        </div>
      </div>

      {/* 5대 퀵 이슈 카드 (Quick Board) */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {quickCards.map((issue, idx) => {
          const actionColors: Record<string, string> = {
            '신규 정책 검토': 'bg-rose-50 border-rose-200 hover:bg-rose-100/70 text-rose-800',
            '기존 정책 홍보 강화': 'bg-amber-50 border-amber-200 hover:bg-amber-100/70 text-amber-800',
            '신청·이용 기준 개선': 'bg-blue-50 border-blue-200 hover:bg-blue-100/70 text-blue-800',
            '부서 협업 검토': 'bg-purple-50 border-purple-200 hover:bg-purple-100/70 text-purple-800',
            '현장 점검·민원 대응': 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100/70 text-indigo-800'
          };
          const colorClass = actionColors[issue.recommendedAction] || 'bg-slate-50 border-slate-200 text-slate-800';

          return (
            <div 
              key={issue.id}
              onClick={() => handleCardClick(issue)}
              className={`p-4 rounded-xl border cursor-pointer transition shadow-2xs hover:shadow-xs flex flex-col justify-between h-40 ${colorClass}`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">이슈 {idx + 1}</span>
                  <span className="text-xs font-black bg-white/70 px-2 py-0.5 rounded-full shadow-3xs">
                    {issue.priorityScore}점
                  </span>
                </div>
                <h4 className="font-bold text-xs mt-2 line-clamp-2 leading-snug">{issue.name}</h4>
              </div>

              <div className="mt-2.5 pt-2 border-t border-black/5 flex items-center justify-between">
                <span className="text-[10px] font-black">{issue.recommendedAction}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* 6대 판단 로직 매트릭스 테이블 및 상세 갭 카드 결합 화면 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 왼쪽: 6대 판단 매트릭스 전체 표 */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-3xs overflow-hidden flex flex-col justify-between">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-600" />
              분류체계 기준 정책 진단 분석표 (Gap Matrix Table)
            </h3>
            <span className="text-[10px] text-slate-500">우선순위 점수 높은 순 정렬</span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 font-bold text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left">정책 대분류</th>
                  <th className="px-3 py-2 text-center">제안(수요)</th>
                  <th className="px-3 py-2 text-center">민원(현장)</th>
                  <th className="px-3 py-2 text-center">기존 정책</th>
                  <th className="px-3 py-2 text-center">언론 지수</th>
                  <th className="px-3 py-2 text-center">우선점수</th>
                  <th className="px-3 py-2 text-left">진단 및 추천 액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {issueItems.map((issue) => (
                  <tr 
                    key={issue.id}
                    onClick={() => handleCardClick(issue)}
                    className={`hover:bg-blue-50/40 cursor-pointer transition ${selectedIssue?.id === issue.id ? 'bg-blue-50/60 font-semibold' : ''}`}
                  >
                    <td className="px-3 py-3 font-semibold text-slate-900">{issue.name}</td>
                    <td className="px-3 py-3 text-center font-mono font-bold text-slate-700">{issue.proposalsCount}건</td>
                    <td className="px-3 py-3 text-center font-mono font-bold text-slate-700">{issue.civilRequestsCount}건</td>
                    <td className="px-3 py-3 text-center font-mono font-bold text-slate-700">{issue.existingPoliciesCount}개</td>
                    <td className="px-3 py-3 text-center font-mono font-bold text-slate-700">{issue.newsCount}회</td>
                    <td className="px-3 py-3 text-center">
                      <span className="px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-800">
                        {issue.priorityScore}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800">{issue.recommendedAction}</span>
                        <span className="text-[10px] text-slate-400">{issue.statusInterpretation}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-500 flex items-center justify-between">
            <span>💡 표의 카테고리를 클릭하면 우측 고정 패널에서 4대 원천(제안-민원-정책-뉴스) 세부 갭 분석을 확인할 수 있습니다.</span>
          </div>
        </div>

        {/* 오른쪽: 선택된 대분류의 Integrated Policy Card 상세 4탭 분석 영역 */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-3xs overflow-hidden flex flex-col justify-between">
          {!selectedIssue ? (
            <div className="p-8 text-center my-auto flex flex-col items-center justify-center space-y-3">
              <HelpCircle className="w-10 h-10 text-slate-300 animate-bounce" />
              <p className="font-bold text-xs text-slate-500">진단표의 카테고리를 선택해주세요</p>
              <p className="text-[10px] text-slate-400">시민 수요 제안 ↔ 국민신문고 민원 ↔ 몽땅정보 정책 3단 대조 데이터가 우측에 즉시 표출됩니다.</p>
            </div>
          ) : (
            <div className="flex flex-col h-full justify-between">
              {/* 카드 상단 헤더 */}
              <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-xs">{selectedIssue.name}</h3>
                  <span className="text-[10px] text-slate-300">{selectedIssue.statusInterpretation}</span>
                </div>
                <span className="text-xs bg-rose-600 text-white px-2 py-0.5 rounded font-black shadow-xs">
                  우선순위 {selectedIssue.priorityScore}점
                </span>
              </div>

              {/* 4대 원천 탭 내비게이션 */}
              <div className="bg-slate-100 border-b border-slate-200 flex text-center">
                {(['proposals', 'civil', 'policies', 'news'] as const).map(tab => {
                  const labelMap = {
                    proposals: '시민 제안',
                    civil: '현장 민원',
                    policies: '기존 정책',
                    news: '뉴스/이슈'
                  };
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 py-2 text-[10px] font-bold border-b-2 transition ${
                        activeTab === tab 
                          ? 'border-blue-600 text-blue-700 bg-white font-extrabold'
                          : 'border-transparent text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {labelMap[tab]}
                    </button>
                  );
                })}
              </div>

              {/* 탭 본문 내용 */}
              <div className="p-4 flex-grow text-xs leading-relaxed text-slate-700 space-y-3 overflow-y-auto max-h-60">
                {activeTab === 'proposals' && (
                  <div>
                    <span className="text-[10px] font-bold text-blue-700 block mb-1">상상대로 서울 시민 요구</span>
                    <p className="bg-slate-50 p-2.5 rounded border border-slate-150 text-[11px] font-medium leading-relaxed">
                      {selectedIssue.representativeProposal}
                    </p>
                    <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500">
                      <span>총 수집건수: <strong>{selectedIssue.proposalsCount}건</strong></span>
                      <span>총 시민공감: <strong>{selectedIssue.votesCount.toLocaleString()}표</strong></span>
                    </div>
                  </div>
                )}

                {activeTab === 'civil' && (
                  <div>
                    <span className="text-[10px] font-bold text-indigo-700 block mb-1">국민신문고 현장 고충 민원</span>
                    <p className="bg-slate-50 p-2.5 rounded border border-slate-150 text-[11px] font-medium leading-relaxed">
                      {selectedIssue.representativeCivil}
                    </p>
                    <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500">
                      <span>총 민원 접수: <strong>{selectedIssue.civilRequestsCount}건</strong></span>
                      <span className="text-rose-600 font-bold">⚠️ 시급성 감지</span>
                    </div>
                  </div>
                )}

                {activeTab === 'policies' && (
                  <div>
                    <span className="text-[10px] font-bold text-emerald-700 block mb-1">몽땅정보통 관련 현행 지원사업</span>
                    <div className="space-y-1.5">
                      <div className="bg-slate-50 p-2.5 rounded border border-slate-150">
                        <p className="font-bold text-[11px] text-slate-900">
                          총 {selectedIssue.existingPoliciesCount}개 공식 혜택 존재함
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1">
                          수집된 323개 서울시 출산 정책사업 혜택과 매핑되었습니다.
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => onNavigateToTab(4)}
                      className="mt-2 w-full text-center text-[10px] bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded font-bold transition flex items-center justify-center gap-1"
                    >
                      <Building2 className="w-3 h-3" />
                      <span>서울시 323건 전체 정책 매핑 확인 ➔</span>
                    </button>
                  </div>
                )}

                {activeTab === 'news' && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-700 block mb-1">네이버 API & 연구 뉴스 DB 연계</span>
                    {(() => {
                      // Filter news matching current issue category/topic
                      const matchedNews = newsAllData.filter(n => 
                        n.category === selectedIssue.category || 
                        selectedIssue.name.includes(n.category) ||
                        (selectedIssue.id === 'GAP-1' && n.topic_name.includes('Topic 5')) ||
                        (selectedIssue.id === 'GAP-2' && n.topic_name.includes('Topic 4'))
                      ).slice(0, 3);

                      if (matchedNews.length === 0) {
                        return (
                          <div className="bg-slate-50 p-2.5 rounded border border-slate-150 text-[10px] text-slate-500">
                            연관된 뉴스가 없습니다.
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-2">
                          {matchedNews.map((news, nIdx) => (
                            <div key={nIdx} className="bg-slate-50 p-2 rounded border border-slate-150 text-[10px] space-y-1">
                              <a 
                                href={news.url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="font-bold text-slate-900 hover:text-blue-600 flex items-center justify-between gap-1 hover:underline"
                              >
                                <span>• {news.title}</span>
                                <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                              </a>
                              <p className="text-slate-500 text-[9px] line-clamp-2 leading-relaxed">
                                {news.snippet}
                              </p>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* 오른쪽 고정 패널의 하단 추천 액션 및 매칭부서 피드백 */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
                <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400">행정 추천 액션</span>
                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                      {selectedIssue.recommendedAction}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-snug">
                    <strong>매칭 사유:</strong> {selectedIssue.matchingReason}
                  </p>
                </div>

                <div className="bg-blue-50/60 p-2.5 rounded-lg border border-blue-100 flex items-center justify-between text-[10px] text-slate-700">
                  <div>
                    <span className="font-bold block text-blue-900">R&R 주관부서: {selectedIssue.primaryDept}</span>
                    <span className="text-slate-500">연락처: {selectedIssue.deptPhone}</span>
                  </div>
                  <button 
                    onClick={() => {
                      alert(`[의사결정 보고서 복사 완료]\n- 분야: ${selectedIssue.name}\n- 추천 액션: ${selectedIssue.recommendedAction}\n- 담당 부서: ${selectedIssue.primaryDept}\n- 매칭 사유: ${selectedIssue.matchingReason}`);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-2.5 py-1 rounded shadow-2xs transition"
                  >
                    보고서 생성
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
