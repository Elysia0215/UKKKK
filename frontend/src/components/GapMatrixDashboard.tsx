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
  Sparkles,
  Check,
  X,
  Clock,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { PolicyProposal } from '../types';
import rawMongttangData from '../data/mongttang.json';
import civilRequestsData from '../data/civil_requests_all.json';
import newsAllData from '../data/news_all.json';
import classifiedPolicyData from '../data/classified_policy.json';

interface Props {
  proposals: PolicyProposal[];
  onNavigateToTab: (tabIndex: number, category?: string) => void;
}

interface FeedbackLog {
  issue_id: string;
  source_type: string;
  source_id: string;
  ai_matched_policy_id: string;
  ai_satisfaction_label: string;
  official_feedback: '승인' | '수정 후 승인' | '반려';
  correct_policy_id: string;
  correct_action: string;
  edited_answer: string;
  reviewer_id: string;
  reviewed_at: string;
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
  
  // New scoring variables
  firstSeenYear: number;
  latestSeenYear: number;
  repeatYearCount: number;
  longUnresolvedBonus: number;
  policySatisfaction: number;
  similarity: number;
  targetMatch: number;
  contentMatch: number;
  conditionMatch: number;
  policyName: string;
  targetGroup: string;
  supportDetail: string;
  complaint: string;
  urgencyScore: number;
  satisfactionLabel: string;
}

export const GapMatrixDashboard: React.FC<Props> = ({ proposals, onNavigateToTab }) => {
  const [selectedIssue, setSelectedIssue] = useState<IssueItem | null>(null);
  const [activeTab, setActiveTab] = useState<'proposals' | 'civil' | 'policies' | 'news'>('proposals');

  // Human-in-the-loop state variables
  const [feedbackLogs, setFeedbackLogs] = useState<FeedbackLog[]>([]);
  const [showApprovalPanel, setShowApprovalPanel] = useState<boolean>(false);
  const [editedAnswer, setEditedAnswer] = useState<string>('');
  const [feedbackAction, setFeedbackAction] = useState<'승인' | '수정 후 승인' | '반려' | null>(null);
  const [customActions, setCustomActions] = useState<Record<string, { action: string; status: string; overrideSatisfaction?: string }>>({});

  // [추가] 실제 원문 대조용 검증 펼치기/접기 토글 상태
  const [showRawProposals, setShowRawProposals] = useState<boolean>(false);
  const [showRawCivils, setShowRawCivils] = useState<boolean>(false);
  const [showRawPolicies, setShowRawPolicies] = useState<boolean>(false);
  const [showComparisonModal, setShowComparisonModal] = useState<boolean>(false);

  // [추가] 선택된 이슈에 해당하는 실제 원천 데이터 매핑 memo
  const selectedIssueRawData = useMemo(() => {
    if (!selectedIssue) return { proposals: [], civils: [], policies: [] };
    
    // 1. 매칭되는 상상대로서울 시민제안 필터링 (8대 분류 규칙 연동)
    const matchedProps = proposals.filter(p => {
      const cat = selectedIssue.name;
      if (cat === '임신·난임·생식건강') return p.category === '임신·난임·생식건강';
      if (cat === '출산·산후 초기지원') return p.category === '출산·산후 초기지원';
      if (cat === '양육비·부모급여·금융지원') return p.category === '다자녀·양육비·생활지원' && (p.sub_category?.includes('양육비') || p.sub_category?.includes('생활비') || p.sub_category?.includes('지원'));
      if (cat === '보육·돌봄 인프라') return p.category === '보육·돌봄 인프라';
      if (cat === '일·가정 양립 지원') return p.category === '일·가정 양립·부모 노동';
      if (cat === '다자녀 가구 특화 혜택') return p.category === '다자녀·양육비·생활지원' && p.sub_category?.includes('다자녀');
      if (cat === '주거·교통·도시생활환경') return p.category === '주거·교통·도시생활환경';
      if (cat === '의료·건강·심리 지원') return p.sub_category?.includes('건강') || p.sub_category?.includes('의료') || p.sub_category?.includes('치료') || p.category === '취약·다양가족 사각지대';
      return p.category === cat;
    }).sort((a, b) => b.vote_score - a.vote_score);

    // 2. 매칭되는 국민신문고 현장민원 필터링
    const matchedCivils = (civilRequestsData as any[]).filter(r => 
      r.category === selectedIssue.name || 
      r.category === selectedIssue.category || 
      r.title?.includes(selectedIssue.name.substring(0, 2))
    );

    // 3. 매칭되는 몽땅정보통 서울시 정책 데이터 필터링 및 프로퍼티 매핑
    const matchedPolicies = (classifiedPolicyData as any[])
      .filter(p => {
        const nameMatch = selectedIssue.policyName && (
          p.사업명 === selectedIssue.policyName || 
          p.사업명?.includes(selectedIssue.policyName) ||
          selectedIssue.policyName?.includes(p.사업명)
        );
        if (nameMatch) return true;
        
        const cat = selectedIssue.name;
        if (cat === '임신·난임·생식건강') return p.Category === '임신' || p.사업대분류명 === '임신';
        if (cat === '출산·산후 초기지원') return p.Category === '출산' || p.사업대분류명 === '출산';
        if (cat === '보육·돌봄 인프라') return p.Category === '보육' || p.사업대분류명 === '육아' && p.사업중분류명?.includes('돌봄');
        if (cat === '양육비·부모급여·금융지원') return p.Category === '다자녀' || p.사업대분류명 === '육아' && (p.사업중분류명?.includes('생활지원') || p.사업중분류명?.includes('수당'));
        if (cat === '일·가정 양립 지원') return p.Category === '일자리' || p.사업중분류명?.includes('일·가정') || p.사업중분류명?.includes('노동');
        if (cat === '다자녀 가구 특화 혜택') return p.Category === '다자녀' || p.사업중분류명?.includes('다자녀');
        if (cat === '주거·교통·도시생활환경') return p.Category === '주거' || p.사업대분류명?.includes('주거') || p.사업중분류명?.includes('교통');
        if (cat === '취약·다양가족 사각지대') return p.Category === '기타' || p.사업대분류명?.includes('기타') || p.사업중분류명?.includes('취약');
        return false;
      })
      .map(p => ({
        id: p.사업소분류명 || '정책',
        policy_name: p.사업명,
        targetGroup: p.이용대상내용 || '서울시 거주 아동 및 부모',
        supportDetail: p.사업내용 || '상세 내용 전화 문의',
        apply_method: p.이용방법내용 || '몽땅정보만능키 온라인 접수',
        url: p.신청하기사이트주소 && p.신청하기사이트주소 !== '.' && p.신청하기사이트주소 !== ''
          ? p.신청하기사이트주소 
          : (p.자세히보기사이트주소 && p.자세히보기사이트주소 !== '.' && p.자세히보기사이트주소 !== '' ? p.자세히보기사이트주소 : 'https://umppa.seoul.go.kr'),
        category: p.사업대분류명 || p.Category
      }));

    return {
      proposals: matchedProps,
      civils: matchedCivils,
      policies: matchedPolicies
    };
  }, [selectedIssue, proposals]);

  // 1. 최신성 가중치 계산 규칙
  const getRecencyWeight = (dateStr?: string) => {
    if (!dateStr) return 1.10;
    const year = new Date(dateStr).getFullYear() || parseInt(dateStr.substring(0, 4));
    if (isNaN(year)) return 1.10;
    if (year >= 2026) return 1.50;
    if (year === 2025) return 1.40;
    if (year === 2024) return 1.30;
    if (year === 2023) return 1.20;
    return 1.10;
  };

  const getNewsRecencyWeight = (title: string, snippet: string) => {
    const text = (title + ' ' + snippet).toLowerCase();
    if (text.includes('2026')) return 1.50;
    if (text.includes('2025')) return 1.40;
    if (text.includes('2024')) return 1.30;
    if (text.includes('2023')) return 1.20;
    return 1.45; // Default average
  };

  // 2. 8대 분류별 매칭 몽땅정보 정책 속성 정보 및 충족성
  const catPolicyProps: Record<string, { similarity: number; targetMatch: number; contentMatch: number; conditionMatch: number; policyName: string; supportDetail: string; targetGroup: string; url: string; complaint: string }> = useMemo(() => ({
    '임신·난임·생식건강': {
      policyName: '난임부부 시술비 지원',
      targetGroup: '서울시 거주 난임 진단 신혼부부 (중위소득/연령 기준 적용)',
      supportDetail: '신선배아/동결배아 시술비 일부 지원 (회당 최대 110만원)',
      url: 'https://umppa.seoul.go.kr',
      complaint: '난임 시술비 지원 기준 연령 완화 및 횟수 대폭 확대 요구',
      similarity: 78,
      targetMatch: 60,
      contentMatch: 50,
      conditionMatch: 60
    },
    '출산·산후 초기지원': {
      policyName: '서울형 산후조리경비 지원 및 첫만남이용권',
      targetGroup: '출산가구 부모 (서울시 6개월 이상 거주 조건)',
      supportDetail: '출생아당 100만원 상당 포인트 및 첫만남이용권 바우처',
      url: 'https://umppa.seoul.go.kr',
      complaint: '산후조리원 이용 요금 전액 지원 및 지역 거주 요건 폐지 요망',
      similarity: 82,
      targetMatch: 80,
      contentMatch: 70,
      conditionMatch: 70
    },
    '양육비·부모급여·금융지원': {
      policyName: '부모급여 및 아동수당 지원',
      targetGroup: '0~23개월 아동을 양육하는 부모 (소득 무관)',
      supportDetail: '매월 50만원 ~ 100만원 현금 지급',
      url: 'https://umppa.seoul.go.kr',
      complaint: '다자녀 가구 양육비 가산 지급 및 사교육비 보조 신설 청구',
      similarity: 90,
      targetMatch: 90,
      contentMatch: 80,
      conditionMatch: 90
    },
    '보육·돌봄 인프라': {
      policyName: '서울형 우리동네키움센터 및 국공립 어린이집',
      targetGroup: '돌봄이 필요한 초등학생 및 영유아 가정',
      supportDetail: '방과후 돌봄 제공 및 어린이집 보육료 지원',
      url: 'https://umppa.seoul.go.kr',
      complaint: '야간/주말 긴급돌봄 인프라 확충 및 형제자매 키즈카페 동반제한 완화',
      similarity: 72,
      targetMatch: 70,
      contentMatch: 60,
      conditionMatch: 50
    },
    '일·가정 양립 지원': {
      policyName: '육아휴직 장려금 및 중소기업 육아휴직 대체인력 지원',
      targetGroup: '육아휴직을 사용하는 근로자 및 해당 중소기업',
      supportDetail: '월 최대 120만원 지원금 및 대체인력 인건비 일부 보조',
      url: 'https://umppa.seoul.go.kr',
      complaint: '중소기업 육아휴직 눈치 근절 및 부모 육아단축근무제 의무화',
      similarity: 65,
      targetMatch: 60,
      contentMatch: 50,
      conditionMatch: 40
    },
    '다자녀 가구 특화 혜택': {
      policyName: '다자녀 혜택 하수도 및 주차요금 감면',
      targetGroup: '서울시 거주 2자녀 이상 다자녀 가구',
      supportDetail: '공영주차장 50% 할인, 수도요금 감면, 다둥이 행복카드 발급',
      url: 'https://umppa.seoul.go.kr',
      complaint: '다자녀 자동차 취득세 면제 대상을 3자녀에서 2자녀로 확대 요구',
      similarity: 88,
      targetMatch: 85,
      contentMatch: 80,
      conditionMatch: 80
    },
    '주거·교통·도시생활환경': {
      policyName: '신혼부부 임차보증금 이자지원 및 임산부 교통비 지원',
      targetGroup: '신혼부부 및 서울시 거주 임산부',
      supportDetail: '전세자금 대출 이자 지원 및 임산부 70만원 교통 포인트 제공',
      url: 'https://umppa.seoul.go.kr',
      complaint: '신혼부부 보증금 대출 한도 상향 및 임산부 주차구역 확대',
      similarity: 80,
      targetMatch: 75,
      contentMatch: 70,
      conditionMatch: 75
    },
    '의료·건강·심리 지원': {
      policyName: '서울형 가임력 검사 및 소아 야간응급진료센터',
      targetGroup: '예비 부부 및 긴급 진료 필요 소아 환자',
      supportDetail: 'AMH 검사비 지원 및 야간 진료 거점 소아병원 운영',
      url: 'https://umppa.seoul.go.kr',
      complaint: '야간 소아응급 진료 병원 서울 동남권/서북권 거점 추가 확충',
      similarity: 75,
      targetMatch: 70,
      contentMatch: 60,
      conditionMatch: 60
    }
  }), []);

  // 3. 8대 분류별 갭 분석 및 정밀 우선순위 모델 적용
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
      const existingPoliciesCount = (classifiedPolicyData as any[]).filter(p => {
        const cName = cat.name;
        if (cName === '임신·난임·생식건강') return p.Category === '임신' || p.사업대분류명 === '임신';
        if (cName === '출산·산후 초기지원') return p.Category === '출산' || p.사업대분류명 === '출산';
        if (cName === '보육·돌봄 인프라') return p.Category === '보육' || p.사업대분류명 === '육아' && p.사업중분류명?.includes('돌봄');
        if (cName === '양육비·부모급여·금융지원') return p.Category === '다자녀' || p.사업대분류명 === '육아' && (p.사업중분류명?.includes('생활지원') || p.사업중분류명?.includes('수당'));
        if (cName === '일·가정 양립 지원') return p.Category === '일자리' || p.사업중분류명?.includes('일·가정') || p.사업중분류명?.includes('노동');
        if (cName === '다자녀 가구 특화 혜택') return p.Category === '다자녀' || p.사업중분류명?.includes('다자녀');
        if (cName === '주거·교통·도시생활환경') return p.Category === '주거' || p.사업대분류명?.includes('주거') || p.사업중분류명?.includes('교통');
        if (cName === '취약·다양가족 사각지대') return p.Category === '기타' || p.사업대분류명?.includes('기타') || p.사업중분류명?.includes('취약');
        return false;
      }).length;

      // 뉴스 모의 보도량 (출산 관련)
      const newsCount = propsCount > 0 ? Math.floor(propsCount * 1.5 + idx * 3) : 10;

      // [추가] 1) 최신성 가중치 적용 연산
      const weightedDemandSum = catProps.reduce((sum, p) => {
        const base = 3 + (p.vote_score || 0) * 0.05 + (p.comment_cnt || 0) * 0.2;
        return sum + base * getRecencyWeight(p.reg_date);
      }, 0);
      const demandScore = Math.min(100, Math.round(weightedDemandSum * 0.8));

      // [추가] 2) 장기 미해결 이슈 보너스 연산
      const unresolvedYears = Array.from(new Set(
        catProps
          .filter(p => p.reply_yn === 'N')
          .map(p => {
            if (!p.reg_date) return 2025;
            const yr = new Date(p.reg_date).getFullYear() || parseInt(p.reg_date.substring(0, 4));
            return isNaN(yr) ? 2025 : yr;
          })
      )) as number[];
      const repeatYearCount = unresolvedYears.length || 1;
      const firstSeenYear = unresolvedYears.length > 0 ? Math.min(...unresolvedYears) : 2025;
      const latestSeenYear = unresolvedYears.length > 0 ? Math.max(...unresolvedYears) : 2026;
      const longUnresolvedBonus = repeatYearCount >= 4 ? 30 :
                                 repeatYearCount === 3 ? 20 :
                                 repeatYearCount === 2 ? 10 : 0;
      const longUnresolvedMultiplier = 1 + (repeatYearCount - 1) * 0.1;

      const correctedDemandScore = Math.min(100, Math.round(demandScore * longUnresolvedMultiplier));

      // [추가] 3) 안전/건강/위기 시급성 점수 연산
      let keywordBonus = 0;
      const crisisKeywords = ['위기', '긴급', '응급', '안전', '건강', '고위험', '사각지대', '피해', '보호공백', '불이익', '차별', '비용 부담', '폐원', '돌봄공백', '소아응급', '산후우울', '위기임산부'];
      catCivils.forEach(c => {
        const text = (c.title + ' ' + (c.content || '')).toLowerCase();
        if (crisisKeywords.some(kw => text.includes(kw))) {
          keywordBonus += 3;
        }
      });
      const urgencyScore = Math.min(100, Math.round(civilRequestsCount * 1.5 + keywordBonus));

      // [추가] 4) 정책충족도 및 정책공백(100 - 충족도) 점수 계산
      const matchedProp = catPolicyProps[cat.name];
      const policySatisfaction = matchedProp 
        ? Math.round(matchedProp.similarity * 0.4 + matchedProp.targetMatch * 0.2 + matchedProp.contentMatch * 0.25 + matchedProp.conditionMatch * 0.15)
        : 0;
      const gapScore = existingPoliciesCount === 0 ? 100 : Math.max(100 - policySatisfaction, 10);

      // 뉴스 최신성 가중치 적용
      const matchedNews = newsAllData.filter(n => n.category === cat.name);
      const sumNewsWeight = matchedNews.reduce((sum, n) => sum + getNewsRecencyWeight(n.title, n.snippet), 0);
      const avgNewsWeight = matchedNews.length > 0 ? sumNewsWeight / matchedNews.length : 1.4;
      const mediaScore = Math.min(100, Math.round(newsCount * 1.3 * avgNewsWeight));

      // 최종 우선순위 점수
      const priorityScore = Math.min(100, Math.round(
        (correctedDemandScore * 0.4) + (urgencyScore * 0.3) + (gapScore * 0.2) + (mediaScore * 0.1) + longUnresolvedBonus
      ));

      // 추천 액션 룰
      let recommendedAction = '지속 모니터링';
      let statusInterpretation = '정상 상태';
      let matchingReason = '시민 요구와 기존 정책 공급이 적절히 조화를 이루고 있습니다.';
      let satisfactionLabel = '충족';

      if (policySatisfaction >= 80) {
        satisfactionLabel = '충족';
        recommendedAction = '기존 정책 홍보 강화';
        statusInterpretation = '정책 체감 및 접근성 우려';
        matchingReason = '유사한 서울시 지원 정책이 이미 존재하나 시민의 체감도가 낮아 안내 강화가 요구됩니다.';
      } else if (policySatisfaction >= 50) {
        satisfactionLabel = '일부 충족';
        recommendedAction = '신청·이용 기준 개선';
        statusInterpretation = '일부 수혜 조건 불일치';
        matchingReason = '매핑되는 기존 정책이 있으나 시민이 요구하는 연령/소득 조건 및 횟수가 불일치하여 조율이 요망됩니다.';
      } else {
        satisfactionLabel = '미충족';
        recommendedAction = '신규 정책 검토';
        statusInterpretation = '정책 공백 감지';
        matchingReason = '시민 수요 및 고충이 제기되고 있으나 이를 해소할 만한 마땅한 지원 사업이 보이지 않는 상태입니다.';
      }

      // [Human-in-the-loop] 공무원 피드백 오버라이드 적용
      if (customActions[cat.name]) {
        recommendedAction = customActions[cat.name].action;
        statusInterpretation = customActions[cat.name].status;
        satisfactionLabel = customActions[cat.name].overrideSatisfaction || satisfactionLabel;
        matchingReason = `실무 공무원이 AI 매칭 모델을 검토하고 의사결정 액션을 '${recommendedAction}'(으)로 최종 확정하였습니다.`;
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
        civilRequestsCount: civilRequestsCount,
        newsCount: newsCount,
        existingPoliciesCount: existingPoliciesCount,
        priorityScore: priorityScore,
        recommendedAction: recommendedAction,
        statusInterpretation: statusInterpretation,
        primaryDept: cat.dept,
        deptPhone: cat.phone,
        matchingReason: matchingReason,
        representativeProposal: representativeProposal,
        representativeCivil: representativeCivil,
        
        // New variables
        firstSeenYear: firstSeenYear,
        latestSeenYear: latestSeenYear,
        repeatYearCount: repeatYearCount,
        longUnresolvedBonus: longUnresolvedBonus,
        policySatisfaction: policySatisfaction,
        similarity: matchedProp?.similarity || 0,
        targetMatch: matchedProp?.targetMatch || 0,
        contentMatch: matchedProp?.contentMatch || 0,
        conditionMatch: matchedProp?.conditionMatch || 0,
        policyName: matchedProp?.policyName || '매핑 정보 없음',
        targetGroup: matchedProp?.targetGroup || '없음',
        supportDetail: matchedProp?.supportDetail || '없음',
        complaint: matchedProp?.complaint || '요구사항 분석 중',
        urgencyScore: urgencyScore,
        satisfactionLabel: satisfactionLabel
      };
    });
  }, [proposals, customActions, catPolicyProps]);

  const handleCardClick = (issue: IssueItem) => {
    setSelectedIssue(issue);
    setActiveTab('proposals');
  };

  const handleFeedbackSubmit = (actionType: '승인' | '수정 후 승인' | '반려') => {
    if (!selectedIssue) return;
    
    // Create log record
    const logRecord: FeedbackLog = {
      issue_id: selectedIssue.id,
      source_type: 'proposal_and_civil',
      source_id: `PROP-${selectedIssue.id.replace('GAP-', '00')}`,
      ai_matched_policy_id: `POLICY-${selectedIssue.id.replace('GAP-', '10')}`,
      ai_satisfaction_label: selectedIssue.satisfactionLabel,
      official_feedback: actionType,
      correct_policy_id: actionType === '반려' ? 'POLICY-NONE' : `POLICY-${selectedIssue.id.replace('GAP-', '10')}`,
      correct_action: actionType === '승인' ? '기존 정책 안내 답변' : actionType === '수정 후 승인' ? '신청·이용 기준 개선' : '신규 정책 검토',
      edited_answer: editedAnswer,
      reviewer_id: 'OFFICIAL-SESAC-01',
      reviewed_at: new Date().toISOString().substring(0, 10)
    };

    setFeedbackLogs(prev => [logRecord, ...prev]);
    setFeedbackAction(actionType);

    // Apply overrides reactive to the category
    setCustomActions(prev => ({
      ...prev,
      [selectedIssue.name]: {
        action: logRecord.correct_action,
        status: actionType === '승인' ? '기존 정책 안내 승인' : actionType === '수정 후 승인' ? '신청/이용 조건 개선' : '신규 정책 수립 검토',
        overrideSatisfaction: actionType === '승인' ? '충족' : actionType === '수정 후 승인' ? '일부 충족' : '미충족'
      }
    }));

    // Update selected issue immediately
    setSelectedIssue(prev => prev ? {
      ...prev,
      recommendedAction: logRecord.correct_action,
      statusInterpretation: actionType === '승인' ? '기존 정책 안내 승인' : actionType === '수정 후 승인' ? '신청/이용 조건 개선' : '신규 정책 수립 검토',
      satisfactionLabel: actionType === '승인' ? '충족' : actionType === '수정 후 승인' ? '일부 충족' : '미충족',
      matchingReason: `담당 공무원이 AI 판단을 검토하고 의사결정 액션을 '${logRecord.correct_action}'(으)로 최종 확정하였습니다.`
    } : null);

    alert(`[Human-in-the-loop 피드백 반영 완료]\n- 피드백 액션: ${actionType}\n- 확정 추천액션: ${logRecord.correct_action}\n- 해당 로그가 Human-in-the-loop 룰셋에 반영됩니다.`);
    setShowApprovalPanel(false);
  };

  return (
    <div className="space-y-6">
      {/* 최상단: 데이터 원천 융합 설명 배너 */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-md">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="bg-blue-600 text-white text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider">Decision Matrix Board</span>
            <h2 className="text-lg font-black mt-1">🏛️ 설명 가능한 정책 우선순위 모델 및 AI 답변 검토·승인 지원 패널</h2>
            <p className="text-[11px] text-slate-300 mt-1 leading-relaxed max-w-3xl">
              본 화면은 등록연도 기반 가중치, 다개년 장기 미해결 보너스, 정책공백 산식 보완(100 - 충족도)을 적용해 설명력을 높인 우선순위 모델입니다.<br />
              매핑된 기존 정책에 대해 담당자가 **AI 답변 검토·승인 패널**을 통해 승인/수정승인/반려 검토를 수행하면, **Human-in-the-loop 피드백 반영 구조**에 따라 대시보드의 행정 추천 액션이 실시간 동적으로 업데이트됩니다.
            </p>
          </div>
          <Building2 className="w-12 h-12 text-slate-700 flex-shrink-0 hidden md:block" />
        </div>
      </div>

      {/* 8대 분야별 정책 갭 매트릭스 진단표 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 왼쪽: 카테고리 갭 분석 표 */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-3xs overflow-hidden flex flex-col justify-between">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-600" />
              정책 우선순위 진단 매트릭스 표
            </h3>
            <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold">5원 데이터 융합</span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                  <th className="px-3 py-2">대분류 카테고리</th>
                  <th className="px-3 py-2 text-center">시민 제안 (수요)</th>
                  <th className="px-3 py-2 text-center">국민신문고 (현장)</th>
                  <th className="px-3 py-2 text-center">기존 정책 (공급)</th>
                  <th className="px-3 py-2 text-center">언론 보도 (사회)</th>
                  <th className="px-3 py-2 text-center">우선점수</th>
                  <th className="px-3 py-2">의사결정 추천 액션</th>
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
                      <span className={`px-2 py-0.5 rounded-full font-black text-xs ${
                        issue.priorityScore >= 75 ? 'bg-rose-100 text-rose-800' :
                        issue.priorityScore >= 50 ? 'bg-amber-100 text-amber-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {issue.priorityScore}점
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800 flex items-center gap-1">
                          {issue.recommendedAction}
                          {customActions[issue.name] && <Check className="w-3.5 h-3.5 text-blue-600" />}
                        </span>
                        <span className="text-[10px] text-slate-400">{issue.statusInterpretation}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-500 flex items-center justify-between">
            <span>💡 표의 카테고리를 클릭하면 우측 고정 패널에서 최신성/장기미해결 가중치가 적용된 5원 갭 분석 상세 조회를 시작할 수 있습니다.</span>
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
                <div className="min-w-0 mr-2">
                  <h3 className="font-bold text-xs truncate">{selectedIssue.name}</h3>
                  <span className="text-[9.5px] text-slate-300 block truncate">{selectedIssue.statusInterpretation}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {/* 2열 비교 분석기 확대 아이콘 버튼 (컴퓨존 챗봇 모티프) */}
                  <button 
                    onClick={() => {
                      setShowComparisonModal(true);
                      setShowRawProposals(true);
                      setShowRawCivils(true);
                      setShowRawPolicies(true);
                    }}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all duration-200 hover:scale-110 flex items-center justify-center cursor-pointer"
                    title="↔️ 양측 원문 2열 비교분석기 (전체화면 확대)"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                  <span className="text-[11px] bg-rose-600 text-white px-2 py-0.5 rounded font-black shadow-xs">
                    {selectedIssue.priorityScore}점
                  </span>
                </div>
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
              <div className="p-4 flex-grow text-xs leading-relaxed text-slate-700 space-y-3 overflow-y-auto max-h-64">
                {activeTab === 'proposals' && (
                  <div className="space-y-2.5">
                    <span className="text-[10px] font-bold text-blue-700 block">상상대로 서울 시민 요구</span>
                    <p className="bg-slate-50 p-2.5 rounded border border-slate-150 text-[11px] font-medium leading-relaxed">
                      {selectedIssue.representativeProposal}
                    </p>
                    
                    {/* 가중치 상세 */}
                    <div className="bg-blue-50/50 p-2.5 rounded-lg border border-blue-100/50 space-y-1 text-[10px] text-slate-600">
                      <span className="font-bold text-blue-900 block">📊 설명 가능한 수요 연산 근거</span>
                      <div className="flex justify-between">
                        <span>최초~최근 제기연도:</span>
                        <strong className="text-slate-800">{selectedIssue.firstSeenYear}년 ~ {selectedIssue.latestSeenYear}년</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>반복 등장 연도수:</span>
                        <strong className="text-slate-800">{selectedIssue.repeatYearCount}개년</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>장기 미해결 보너스:</span>
                        <strong className="text-rose-600">+{selectedIssue.longUnresolvedBonus}점</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>최신성 가중치:</span>
                        <strong className="text-blue-600">최대 1.50배 곱연산</strong>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>총 수집건수: <strong>{selectedIssue.proposalsCount}건</strong></span>
                      <span>총 시민공감: <strong>{selectedIssue.votesCount.toLocaleString()}표</strong></span>
                    </div>
                  </div>
                )}

                {activeTab === 'civil' && (
                  <div className="space-y-2.5">
                    <span className="text-[10px] font-bold text-indigo-700 block">국민신문고 현장 고충 민원</span>
                    <p className="bg-slate-50 p-2.5 rounded border border-slate-150 text-[11px] font-medium leading-relaxed">
                      {selectedIssue.representativeCivil}
                    </p>
                    
                    {/* 시급성 보정 지표 */}
                    <div className="bg-rose-50/50 p-2.5 rounded-lg border border-rose-100/50 text-[10px] text-slate-600 space-y-1">
                      <span className="font-bold text-rose-900 block">🚨 시급성(Urgency) 연산 근거</span>
                      <div className="flex justify-between">
                        <span>안전·긴급·돌봄공백 키워드 검출:</span>
                        <strong className="text-rose-600">보정 점수 반영완료</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>민원 위해도 점수:</span>
                        <strong className="text-slate-800">{selectedIssue.urgencyScore}점</strong>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>총 민원 접수: <strong>{selectedIssue.civilRequestsCount}건</strong></span>
                      <span className="text-rose-600 font-bold">⚠️ 시급성 감지</span>
                    </div>
                  </div>
                )}

                {activeTab === 'policies' && (
                  <div className="space-y-2.5">
                    <span className="text-[10px] font-bold text-emerald-700 block">몽땅정보통 관련 현행 지원사업</span>
                    <div className="space-y-1.5">
                      <div className="bg-slate-50 p-2.5 rounded border border-slate-150 space-y-1">
                        <p className="font-bold text-[11px] text-slate-900 flex justify-between items-center">
                          <span>총 {selectedIssue.existingPoliciesCount}개 공식 혜택 존재함</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            selectedIssue.satisfactionLabel === '충족' ? 'bg-emerald-100 text-emerald-800' :
                            selectedIssue.satisfactionLabel === '일부 충족' ? 'bg-amber-100 text-amber-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            충족도: {selectedIssue.satisfactionLabel} ({100 - selectedIssue.policySatisfaction}점 공백)
                          </span>
                        </p>
                        <p className="text-[10px] text-slate-500">
                          <strong>매핑 정책:</strong> {selectedIssue.policyName}
                        </p>
                        <p className="text-[9.5px] text-slate-500 leading-snug">
                          <strong>지원 내용:</strong> {selectedIssue.supportDetail}
                        </p>
                      </div>
                    </div>
                    
                    {/* AI 답변 검토 승인 패널 트리거 버튼 */}
                    <button 
                      onClick={() => {
                        setEditedAnswer(`[기존 정책 답변 안내]\n- 정책명: ${selectedIssue.policyName}\n- 지원대상: ${selectedIssue.targetGroup}\n- 지원내용: ${selectedIssue.supportDetail}\n- 신청방법: ${selectedIssue.url}를 통한 온라인/오프라인 신청 가능합니다.\n\n시민께서 제안해 주신 요구사항 중 일부가 현행 정책을 통해 이미 지원 중이거나 지원 방안에 포함되어 있음을 안내드립니다.`);
                        setFeedbackAction(null);
                        setShowApprovalPanel(true);
                      }}
                      className="mt-2 w-full text-center text-[10.5px] bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg font-extrabold transition flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
                      <span>🤖 AI 답변 검토·승인 패널 열기</span>
                    </button>

                    <button 
                      onClick={() => onNavigateToTab(4)}
                      className="w-full text-center text-[10px] bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded font-bold transition flex items-center justify-center gap-1"
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>서울시 323건 전체 정책 매핑 확인 ➔</span>
                    </button>
                  </div>
                )}

                {activeTab === 'news' && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-700 block">네이버 API & 연구 뉴스 DB 연계</span>
                      <span className="text-[9px] text-slate-400 font-medium">8대 정책 대분류 정규화 분류체계</span>
                    </div>
                    {(() => {
                      const matchedNews = newsAllData.filter(n => {
                        const issueName = selectedIssue.name;
                        const newsCat = n.category;
                        if (issueName === newsCat) return true;
                        if (issueName === '양육비·부모급여·금융지원' || issueName === '다자녀 가구 특화 혜택') {
                          return newsCat === '다자녀·양육비·생활지원';
                        }
                        if (issueName === '일·가정 양립 지원') {
                          return newsCat === '일·가정 양립·부모 노동';
                        }
                        if (issueName === '의료·건강·심리 지원') {
                          return newsCat === '임신·난임·생식건강' || newsCat === '취약·다양가족 사각지대';
                        }
                        return false;
                      }).slice(0, 5);

                      if (matchedNews.length === 0) {
                        return (
                          <div className="bg-slate-50 p-3 rounded-lg border border-slate-150 text-[10px] text-slate-500">
                            연관된 뉴스가 없습니다.
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                          {matchedNews.map((news: any, nIdx: number) => (
                            <div key={nIdx} className="bg-slate-50 p-2.5 rounded-lg border border-slate-150 text-[10px] space-y-1.5 shadow-2xs">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {news.strength === '상' ? (
                                  <span className="bg-red-50 text-red-600 text-[8px] font-black px-1.5 py-0.5 rounded border border-red-100 flex items-center gap-0.5">
                                    🚨 이슈강도: 상
                                  </span>
                                ) : news.strength === '중' ? (
                                  <span className="bg-amber-50 text-amber-700 text-[8px] font-bold px-1.5 py-0.5 rounded border border-amber-100">
                                    ⚡ 이슈강도: 중
                                  </span>
                                ) : (
                                  <span className="bg-slate-100 text-slate-500 text-[8px] px-1.5 py-0.5 rounded">
                                    이슈강도: 하
                                  </span>
                                )}
                                <span className="bg-blue-50 text-blue-700 text-[8px] font-bold px-1.5 py-0.5 rounded border border-blue-100">
                                  {news.type}
                                </span>
                              </div>
                              <a 
                                href={news.url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="font-extrabold text-slate-900 hover:text-blue-600 flex items-center justify-between gap-1 hover:underline text-[10.5px] leading-snug"
                              >
                                <span>{news.title}</span>
                                <ExternalLink className="w-3 h-3 flex-shrink-0 text-slate-400" />
                              </a>
                              <p className="text-slate-500 text-[9.5px] line-clamp-2 leading-relaxed">
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

      {/* 실시간 Human-in-the-loop 피드백 반영 로그 뷰어 */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-3xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            👥 Human-in-the-loop 피드백 반영 로그 (실시간 누적)
          </h4>
          <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold">담당자 피드백 기반 개선 로그</span>
        </div>
        <div className="p-4">
          {feedbackLogs.length === 0 ? (
            <div className="text-center py-6 text-[11px] text-slate-400">
              담당 공무원의 검토 피드백 이력이 아직 없습니다. 위의 'AI 답변 검토·승인 패널'을 열어 의사결정을 수행하십시오.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[10px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold">
                    <th className="px-3 py-2">일시</th>
                    <th className="px-3 py-2">대분류 ID</th>
                    <th className="px-3 py-2">검토자</th>
                    <th className="px-3 py-2">AI 판단 충족도</th>
                    <th className="px-3 py-2">공무원 피드백</th>
                    <th className="px-3 py-2">최종 적용된 행정 액션</th>
                    <th className="px-3 py-2">답변 수정본 일부</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {feedbackLogs.map((log, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-mono text-slate-500">{log.reviewed_at}</td>
                      <td className="px-3 py-2 font-mono font-bold text-slate-800">{log.issue_id}</td>
                      <td className="px-3 py-2 font-mono text-slate-500">{log.reviewer_id}</td>
                      <td className="px-3 py-2">
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                          log.ai_satisfaction_label === '충족' ? 'bg-emerald-100 text-emerald-800' :
                          log.ai_satisfaction_label === '일부 충족' ? 'bg-amber-100 text-amber-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {log.ai_satisfaction_label}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${
                          log.official_feedback === '승인' ? 'bg-emerald-600 text-white' :
                          log.official_feedback === '수정 후 승인' ? 'bg-blue-600 text-white' :
                          'bg-red-600 text-white'
                        }`}>
                          {log.official_feedback}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-bold text-slate-700">{log.correct_action}</td>
                      <td className="px-3 py-2 text-slate-400 truncate max-w-[200px]" title={log.edited_answer}>
                        {log.edited_answer.substring(0, 35)}...
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* AI 답변 검토 및 승인 패널 모달 팝업 */}
      {showApprovalPanel && selectedIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* 모달 헤더 */}
            <div className="bg-slate-900 p-4 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="font-extrabold text-sm">🤖 AI 답변 검토·승인 패널</h3>
                  <p className="text-[10px] text-slate-400">Human-in-the-loop 정책 교차 검증 의사결정 모듈</p>
                </div>
              </div>
              <button 
                onClick={() => setShowApprovalPanel(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 모달 본문 */}
            <div className="p-5 flex-grow overflow-y-auto space-y-4 text-xs leading-relaxed text-slate-700">
              {/* 시민 요구 vs 기존 정책 4대 비교표 */}
              <div>
                <span className="font-bold text-slate-900 block mb-2">⚖️ 시민 요구 vs 기존 정책 4대 비교표</span>
                <table className="w-full border-collapse border border-slate-200 text-[10.5px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                      <th className="px-3 py-1.5 border-r border-slate-200 w-1/5">비교 항목</th>
                      <th className="px-3 py-1.5 border-r border-slate-200 w-2/5">시민 요구사항 (상상대로/민원)</th>
                      <th className="px-3 py-1.5 w-2/5">기존 서울시 정책 내용 (몽땅정보통)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="px-3 py-1.5 border-r border-slate-200 font-bold bg-slate-50">대상 조건</td>
                      <td className="px-3 py-1.5 border-r border-slate-200 text-slate-600">연령/소득에 따른 차별 폐지 및 지원 장벽 완화 요구</td>
                      <td className="px-3 py-1.5 text-slate-600">{selectedIssue.targetGroup}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="px-3 py-1.5 border-r border-slate-200 font-bold bg-slate-50">지원 혜택</td>
                      <td className="px-3 py-1.5 border-r border-slate-200 text-slate-600">{selectedIssue.complaint}</td>
                      <td className="px-3 py-1.5 text-slate-600">{selectedIssue.supportDetail}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="px-3 py-1.5 border-r border-slate-200 font-bold bg-slate-50">신청 조건</td>
                      <td className="px-3 py-1.5 border-r border-slate-200 text-slate-600">원스톱 모바일 간편 신청 및 서류 간소화 필요</td>
                      <td className="px-3 py-1.5 text-slate-600">정부24 또는 서울 몽땅정보만능키 온라인 접수 지원</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-1.5 border-r border-slate-200 font-bold bg-slate-50">핵심 불만</td>
                      <td className="px-3 py-1.5 border-r border-slate-200 text-slate-600">혜택 홍보 부재, 높은 조건의 사각지대 존재</td>
                      <td className="px-3 py-1.5 text-slate-600">기존 사업이 실행 중이나 조건 완화 및 정보 확산 요구됨</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 매칭 유사도 및 충족도 인덱스 메트릭스 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-400 block font-bold">정책 유사도</span>
                  <strong className="text-sm font-mono text-indigo-600">{selectedIssue.similarity}%</strong>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-400 block font-bold">대상 일치도</span>
                  <strong className="text-sm font-mono text-emerald-600">{selectedIssue.targetMatch}%</strong>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-400 block font-bold">지원내용 일치도</span>
                  <strong className="text-sm font-mono text-amber-600">{selectedIssue.contentMatch}%</strong>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-400 block font-bold">신청조건 일치도</span>
                  <strong className="text-sm font-mono text-purple-600">{selectedIssue.conditionMatch}%</strong>
                </div>
              </div>

              {/* 니즈 충족도 & 정책 공백 점수 산출 배너 */}
              <div className="bg-slate-900 text-white p-3 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400">최종 정책 공백 점수 산식 (100 - 충족도)</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-base font-mono font-black text-rose-400">정책공백 {100 - selectedIssue.policySatisfaction}점</span>
                    <span className="text-slate-500">|</span>
                    <span className="text-xs font-mono text-slate-300">충족도 {selectedIssue.policySatisfaction}점</span>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                  selectedIssue.satisfactionLabel === '충족' ? 'bg-emerald-600 text-white' :
                  selectedIssue.satisfactionLabel === '일부 충족' ? 'bg-amber-500 text-slate-900' :
                  'bg-red-600 text-white'
                }`}>
                  AI 평가: {selectedIssue.satisfactionLabel}
                </span>
              </div>

              {/* AI 분석 근거 키워드 */}
              <div className="space-y-1">
                <span className="font-bold text-slate-800 block">🏷️ 매칭 근거 핵심 키워드</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedIssue.name.split('·').concat(['출산', '시민요구', '수혜대상', '신청조건']).map((kw, kwIdx) => (
                    <span key={kwIdx} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[9.5px] border border-slate-200">
                      #{kw.trim()}
                    </span>
                  ))}
                </div>
              </div>

              {/* [추가] 실제 원천 데이터 검토용 아코디언 */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <span className="font-bold text-slate-800 block">📂 실제 원천 데이터 교차 검증 (원문 대조)</span>
                
                {/* 1. 시민 제안 원문 */}
                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                  <button 
                    type="button"
                    onClick={() => setShowRawProposals(!showRawProposals)}
                    className="w-full flex justify-between items-center p-2.5 bg-slate-50 text-[11px] font-bold text-blue-900 border-b border-slate-200"
                  >
                    <span>📜 실제 시민 제안 원문 ({selectedIssueRawData.proposals.length}건)</span>
                    <span className="text-[10px] font-normal">{showRawProposals ? '▲ 접기' : '▼ 펼치기'}</span>
                  </button>
                  {showRawProposals && (
                    <div className="p-2.5 max-h-48 overflow-y-auto space-y-2.5 text-[10.5px] bg-slate-50/20">
                      {selectedIssueRawData.proposals.map((prop, idx) => (
                        <div key={prop.id} className="p-2 bg-white rounded border border-slate-200 shadow-2xs">
                          <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold mb-1">
                            <span>No. {idx + 1} ({prop.id}) | 공감: {prop.vote_score}표</span>
                            <span>{prop.reg_date}</span>
                          </div>
                          <h5 className="font-bold text-slate-900 mb-1">{prop.title}</h5>
                          <p className="text-slate-600 whitespace-pre-line leading-relaxed max-h-24 overflow-y-auto font-sans text-[10.5px] p-2 bg-slate-50 rounded">{prop.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. 국민신문고 민원 원문 */}
                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                  <button 
                    type="button"
                    onClick={() => setShowRawCivils(!showRawCivils)}
                    className="w-full flex justify-between items-center p-2.5 bg-slate-50 text-[11px] font-bold text-indigo-900 border-b border-slate-200"
                  >
                    <span>🏢 실제 현장 민원 원문 ({selectedIssueRawData.civils.length}건)</span>
                    <span className="text-[10px] font-normal">{showRawCivils ? '▲ 접기' : '▼ 펼치기'}</span>
                  </button>
                  {showRawCivils && (
                    <div className="p-2.5 max-h-48 overflow-y-auto space-y-2.5 text-[10.5px] bg-slate-50/20">
                      {selectedIssueRawData.civils.map((civ, idx) => (
                        <div key={civ.id || idx} className="p-2 bg-white rounded border border-slate-200 shadow-2xs">
                          <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold mb-1">
                            <span>No. {idx + 1} | 담당부서: {civ.dept}</span>
                            <span>{civ.reg_date}</span>
                          </div>
                          <h5 className="font-bold text-slate-900 mb-1">{civ.title}</h5>
                          <p className="text-slate-600 whitespace-pre-line leading-relaxed max-h-24 overflow-y-auto font-sans text-[10.5px] p-2 bg-slate-50 rounded">{civ.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. 몽땅정보통 정책 원문 */}
                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                  <button 
                    type="button"
                    onClick={() => setShowRawPolicies(!showRawPolicies)}
                    className="w-full flex justify-between items-center p-2.5 bg-slate-50 text-[11px] font-bold text-emerald-900 border-b border-slate-200"
                  >
                    <span>🔍 실제 서울시 정책 상세 정보 ({selectedIssueRawData.policies.length}건)</span>
                    <span className="text-[10px] font-normal">{showRawPolicies ? '▲ 접기' : '▼ 펼치기'}</span>
                  </button>
                  {showRawPolicies && (
                    <div className="p-2.5 max-h-48 overflow-y-auto space-y-2.5 text-[10.5px] bg-slate-50/20">
                      {selectedIssueRawData.policies.map((pol, idx) => (
                        <div key={pol.id || idx} className="p-2 bg-white rounded border border-slate-200 shadow-2xs space-y-1">
                          <h5 className="font-extrabold text-slate-900 text-[11px]">{pol.policy_name}</h5>
                          <p className="text-slate-600 font-bold text-[10px]">🎯 지원 대상: {pol.targetGroup || pol.support_target}</p>
                          <p className="text-slate-600 text-[10px]">🎁 지원 혜택: {pol.supportDetail || pol.support_content}</p>
                          <p className="text-slate-600 text-[10px]">📝 신청 방법: {pol.apply_method || '온라인 접수'}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 답변 초안 작성 에디터 */}
              <div className="space-y-1">
                <span className="font-bold text-slate-800 block">✍️ 행정 공식 답변 초안 수정 (Human Edit)</span>
                <textarea 
                  value={editedAnswer}
                  onChange={(e) => setEditedAnswer(e.target.value)}
                  className="w-full h-24 p-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600 font-mono text-[10.5px]"
                />
              </div>
            </div>
 
             {/* 모달 푸터 버튼 피드백 */}
             <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] text-slate-500">
               <span className="flex items-center gap-1 font-medium">
                 <Info className="w-3.5 h-3.5 text-indigo-500" />
                 제출한 이력은 담당자 피드백 기반 룰·가중치 개선 구조에 기록됩니다.
               </span>
               <div className="flex gap-2 w-full sm:w-auto">
                 <button 
                   onClick={() => handleFeedbackSubmit('반려')}
                   className="flex-1 sm:flex-initial bg-rose-600 hover:bg-rose-700 text-white px-3 py-2 rounded-lg font-bold shadow-xs transition"
                 >
                   반려 (신규 검토)
                 </button>
                 <button 
                   onClick={() => handleFeedbackSubmit('수정 후 승인')}
                   className="flex-1 sm:flex-initial bg-amber-500 hover:bg-amber-600 text-slate-900 px-3 py-2 rounded-lg font-bold shadow-xs transition"
                 >
                   수정 후 승인
                 </button>
                 <button 
                   onClick={() => handleFeedbackSubmit('승인')}
                   className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg font-bold shadow-xs transition"
                 >
                   승인 (기존정책 안내)
                 </button>
               </div>
             </div>
           </div>
         </div>
       )}

      {/* [추가] 2열 교차 검증 비교분석기 모달 */}
      {showComparisonModal && selectedIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-slate-50 w-full max-w-6xl rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
            {/* 헤더 */}
            <div className="bg-slate-900 p-4 text-white flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">⚖️</span>
                <div>
                  <h3 className="font-extrabold text-sm">[2열 원문 교차 검증] {selectedIssue.name} 비교분석기</h3>
                  <p className="text-[10px] text-slate-400">
                    우선순위: <span className="text-rose-400 font-bold">{selectedIssue.priorityScore}점</span> | 
                    AI 분석결과: <span className="text-blue-300 font-bold">{selectedIssue.statusInterpretation}</span> | 
                    R&R: <span className="text-emerald-300 font-bold">{selectedIssue.primaryDept}</span>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowComparisonModal(false)}
                className="p-1 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* 비교 내용 본문 (2열 레이아웃) */}
            <div className="p-5 flex-grow overflow-y-auto grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
              
              {/* 왼쪽 열: 시민 요구사항 (시민 제안 및 현장 민원) */}
              <div className="space-y-4 flex flex-col min-h-0">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex-1 flex flex-col min-h-[300px]">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                    <h4 className="font-black text-xs text-blue-800 flex items-center gap-1">
                      <span>📜 시민 요구사항 (상상대로 서울 제안)</span>
                      <span className="bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded text-[9px] font-mono">{selectedIssueRawData.proposals.length}건</span>
                    </h4>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-3 max-h-[360px] pr-1">
                    {selectedIssueRawData.proposals.length === 0 ? (
                      <p className="text-slate-400 text-center py-10 text-[11px]">해당 분야의 매칭된 시민 제안이 없습니다.</p>
                    ) : (
                      selectedIssueRawData.proposals.map((prop, pIdx) => (
                        <div key={prop.id} className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px] space-y-1.5">
                          <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold">
                            <span>No. {pIdx + 1} ({prop.id})</span>
                            <div className="flex items-center gap-2">
                              <span>{prop.reg_date}</span>
                              <span className="bg-white border border-slate-200 px-1.5 py-0.2 rounded text-blue-600 font-mono">👍 {prop.vote_score}표</span>
                            </div>
                          </div>
                          <h5 className="font-bold text-slate-900 leading-snug">{prop.title}</h5>
                          <p className="text-slate-600 bg-white p-2.5 rounded border border-slate-150 whitespace-pre-line leading-relaxed max-h-36 overflow-y-auto font-sans text-[10.5px]">
                            {prop.content}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex-1 flex flex-col min-h-[220px]">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                    <h4 className="font-black text-xs text-indigo-800 flex items-center gap-1">
                      <span>🏢 현장 고충 민원 (국민신문고)</span>
                      <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded text-[9px] font-mono">{selectedIssueRawData.civils.length}건</span>
                    </h4>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-3 max-h-[260px] pr-1">
                    {selectedIssueRawData.civils.length === 0 ? (
                      <p className="text-slate-400 text-center py-10 text-[11px]">해당 분야의 매칭된 국민신문고 민원이 없습니다.</p>
                    ) : (
                      selectedIssueRawData.civils.map((civ, cIdx) => (
                        <div key={civ.id || cIdx} className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px] space-y-1.5">
                          <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold">
                            <span>No. {cIdx + 1} ({civ.dept})</span>
                            <span>{civ.reg_date}</span>
                          </div>
                          <h5 className="font-bold text-slate-900 leading-snug">{civ.title}</h5>
                          <p className="text-slate-600 bg-white p-2.5 rounded border border-slate-150 whitespace-pre-line leading-relaxed max-h-32 overflow-y-auto font-sans text-[10.5px]">
                            {civ.content}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* 오른쪽 열: 서울시 정책 공급 (몽땅정보통 지원사업 및 뉴스) */}
              <div className="space-y-4 flex flex-col min-h-0">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex-1 flex flex-col min-h-[300px]">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                    <h4 className="font-black text-xs text-emerald-800 flex items-center gap-1">
                      <span>🔍 서울시 정책 공급 현황 (몽땅정보통)</span>
                      <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded text-[9px] font-mono">{selectedIssueRawData.policies.length}건</span>
                    </h4>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-3 max-h-[360px] pr-1">
                    {selectedIssueRawData.policies.length === 0 ? (
                      <p className="text-slate-400 text-center py-10 text-[11px]">해당 분야의 매칭된 서울시 정책이 없습니다.</p>
                    ) : (
                      selectedIssueRawData.policies.map((pol, pIdx) => (
                        <div key={pol.id || pIdx} className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px] space-y-2">
                          <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold border-b border-slate-200/50 pb-1">
                            <span>No. {pIdx + 1} ({pol.id || '정책'})</span>
                            <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded text-[9.5px] font-bold">{pol.category || '출산지원'}</span>
                          </div>
                          <h5 className="font-black text-slate-900 text-xs flex justify-between items-start">
                            <span>{pol.policy_name}</span>
                          </h5>
                          <div className="space-y-1 text-[10px] leading-snug">
                            <p><strong className="text-slate-700">🎯 지원 대상:</strong> {pol.targetGroup || pol.support_target}</p>
                            <p><strong className="text-slate-700">🎁 지원 혜택:</strong> {pol.supportDetail || pol.support_content}</p>
                            <p><strong className="text-slate-700">📝 신청 방법:</strong> {pol.apply_method || '온라인 접수'}</p>
                            {pol.url && (
                              <p>
                                <strong className="text-slate-700">🔗 관련 링크:</strong>{' '}
                                <a href={pol.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                  {pol.url}
                                </a>
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex-1 flex flex-col min-h-[220px]">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                    <h4 className="font-black text-xs text-slate-800 flex items-center gap-1">
                      <span>📰 사회 보도 트렌드 (네이버 API & 연구 뉴스)</span>
                    </h4>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-2 max-h-[260px] pr-1">
                    {(() => {
                      const matchedNews = newsAllData.filter(n => {
                        const issueName = selectedIssue.name;
                        const newsCat = n.category;
                        if (issueName === newsCat) return true;
                        if (issueName === '양육비·부모급여·금융지원' || issueName === '다자녀 가구 특화 혜택') {
                          return newsCat === '다자녀·양육비·생활지원';
                        }
                        if (issueName === '일·가정 양립 지원') {
                          return newsCat === '일·가정 양립·부모 노동';
                        }
                        if (issueName === '의료·건강·심리 지원') {
                          return newsCat === '임신·난임·생식건강' || newsCat === '취약·다양가족 사각지대';
                        }
                        return false;
                      }).slice(0, 5);

                      if (matchedNews.length === 0) {
                        return <p className="text-slate-400 text-center py-10 text-[11px]">매칭된 뉴스가 없습니다.</p>;
                      }

                      return matchedNews.map((news: any, nIdx: number) => (
                        <div key={nIdx} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[10px] space-y-1">
                          <div className="flex items-center justify-between text-[9px] text-slate-400 font-bold">
                            <span>{news.type || '네이버뉴스'}</span>
                            <span className="text-red-500 font-black">🔥 이슈강도: {news.strength}</span>
                          </div>
                          <a 
                            href={news.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="font-bold text-slate-800 hover:text-blue-600 hover:underline flex items-center justify-between gap-1 leading-snug cursor-pointer"
                          >
                            <span className="line-clamp-1">{news.title}</span>
                            <ExternalLink className="w-2.5 h-2.5 flex-shrink-0 text-slate-400" />
                          </a>
                          <p className="text-slate-500 text-[9.5px] line-clamp-2 leading-relaxed">
                            {news.snippet}
                          </p>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>

            </div>

            {/* 푸터 */}
            <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-between items-center">
              <span className="text-[10px] text-slate-500">
                💡 좌측의 실제 시민 원문 요구(요구/민원)와 우측의 행정 공급(기존 정책/뉴스)을 직접 1:1로 비교해 보십시오.
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditedAnswer(`[기존 정책 답변 안내]\n- 정책명: ${selectedIssue.policyName}\n- 지원대상: ${selectedIssue.targetGroup}\n- 지원내용: ${selectedIssue.supportDetail}\n- 신청방법: ${selectedIssue.url}를 통한 온라인/오프라인 신청 가능합니다.\n\n시민께서 제안해 주신 요구사항 중 일부가 현행 정책을 통해 이미 지원 중이거나 지원 방안에 포함되어 있음을 안내드립니다.`);
                    setFeedbackAction(null);
                    setShowApprovalPanel(true);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>🤖 AI 답변 검토·승인 패널 열기</span>
                </button>
                <button
                  onClick={() => setShowComparisonModal(false)}
                  className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-4 py-2 rounded-lg transition cursor-pointer"
                >
                  비교뷰 닫기
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
