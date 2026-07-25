// 100% 규칙 기반(Rule-based) 2단계 확장 수집 및 몽땅정보통 322개 사업/조직도 실무부서 100% 연동 (824건)
import { PolicyProposal, DistrictStat, DashboardStats, CivilRequest } from '../types';
import { extractNormalizedKeywords } from '../utils/textMining';
import rawMongttangData from './mongttang.json';

export type { PolicyProposal as Proposal };

export const SEOUL_DISTRICTS = [
  "종로구", "중구", "용산구", "성동구", "광진구", "동대문구", "중랑구", "성북구",
  "강북구", "도봉구", "노원구", "은평구", "서대문구", "마포구", "양천구", "강서구",
  "구로구", "금천구", "영등포구", "동작구", "관악구", "서초구", "강남구", "송파구", "강동구"
];

export const mockDashboardStats: DashboardStats = {
  "totalCount": 824,
  "avgVoteScore": 26.2,
  "unansweredCount": 760,
  "unansweredRate": 92.2
};

export const mockCivilRequests: CivilRequest[] = [
  {
    id: '1',
    title: '야간 긴급돌봄 어린이집 확충 요청',
    content: '야간 돌봄 수요가 높은 지역에 어린이집과 돌봄 인력을 확대해 주세요.',
    reg_date: '2026-07-20',
    category: '보육',
    dept: '돌봄사업팀',
    url: 'https://www.epeople.go.kr/nep/pttn/gnrlPttn/pttnSgstnLst.npaid'
  },
  {
    id: '2',
    title: '난임 시술비 지원 소득 기준 완화',
    content: '난임 치료 비용 부담을 줄이기 위해 지원 기준을 완화해 주세요.',
    reg_date: '2026-07-21',
    category: '임신',
    dept: '건강임신지원팀',
    url: 'https://www.epeople.go.kr/nep/pttn/gnrlPttn/pttnSgstnLst.npaid'
  },
  {
    id: '3',
    title: '다자녀 가구 주거 안정 지원 확대',
    content: '다자녀 가구의 주거비 부담을 줄일 수 있도록 지원 대상을 확대해 주세요.',
    reg_date: '2026-07-22',
    category: '다자녀',
    dept: '가족지원팀',
    url: 'https://www.epeople.go.kr/nep/pttn/gnrlPttn/pttnSgstnLst.npaid'
  }
];

export const districtStats: DistrictStat[] = [
  { "district": "종로구", "tfr": 0.448, "births_total": 437, "childcare_facility_count": 61 },
  { "district": "중구", "tfr": 0.59, "births_total": 612, "childcare_facility_count": 64 },
  { "district": "용산구", "tfr": 0.575, "births_total": 1045, "childcare_facility_count": 84 },
  { "district": "성동구", "tfr": 0.714, "births_total": 1666, "childcare_facility_count": 133 },
  { "district": "광진구", "tfr": 0.462, "births_total": 1263, "childcare_facility_count": 119 },
  { "district": "동대문구", "tfr": 0.589, "births_total": 1441, "childcare_facility_count": 169 },
  { "district": "중랑구", "tfr": 0.61, "births_total": 1733, "childcare_facility_count": 161 },
  { "district": "성북구", "tfr": 0.603, "births_total": 1710, "childcare_facility_count": 174 },
  { "district": "강북구", "tfr": 0.446, "births_total": 1241, "childcare_facility_count": 108 },
  { "district": "도봉구", "tfr": 0.575, "births_total": 1072, "childcare_facility_count": 125 },
  { "district": "노원구", "tfr": 0.671, "births_total": 2314, "childcare_facility_count": 285 },
  { "district": "은평구", "tfr": 0.578, "births_total": 1952, "childcare_facility_count": 201 },
  { "district": "서대문구", "tfr": 0.551, "births_total": 1380, "childcare_facility_count": 120 },
  { "district": "마포구", "tfr": 0.594, "births_total": 1812, "childcare_facility_count": 170 },
  { "district": "양천구", "tfr": 0.608, "births_total": 1890, "childcare_facility_count": 230 },
  { "district": "강서구", "tfr": 0.587, "births_total": 2810, "childcare_facility_count": 310 },
  { "district": "구로구", "tfr": 0.655, "births_total": 2105, "childcare_facility_count": 225 },
  { "district": "금천구", "tfr": 0.541, "births_total": 980, "childcare_facility_count": 115 },
  { "district": "영등포구", "tfr": 0.622, "births_total": 2250, "childcare_facility_count": 210 },
  { "district": "동작구", "tfr": 0.570, "births_total": 1720, "childcare_facility_count": 180 },
  { "district": "관악구", "tfr": 0.382, "births_total": 1850, "childcare_facility_count": 175 },
  { "district": "서초구", "tfr": 0.653, "births_total": 2150, "childcare_facility_count": 195 },
  { "district": "강남구", "tfr": 0.534, "births_total": 2410, "childcare_facility_count": 205 },
  { "district": "송파구", "tfr": 0.612, "births_total": 3250, "childcare_facility_count": 340 },
  { "district": "강동구", "tfr": 0.720, "births_total": 2680, "childcare_facility_count": 250 }
];

export function getDepartmentStats(proposals: PolicyProposal[]) {
  const deptMap: Record<string, { total: number; unanswered: number }> = {};
  proposals.forEach(p => {
    if (p.department && p.department.length > 0) {
      p.department.forEach(d => {
        if (!deptMap[d]) {
          deptMap[d] = { total: 0, unanswered: 0 };
        }
        deptMap[d].total += 1;
        if (p.reply_yn === 'N') {
          deptMap[d].unanswered += 1;
        }
      });
    }
  });

  return Object.entries(deptMap)
    .map(([dept, stats]) => ({
      dept,
      total: stats.total,
      unanswered: stats.unanswered,
      rate: stats.total > 0 ? Math.round((stats.unanswered / stats.total) * 1000) / 10 : 0
    }))
    .sort((a, b) => b.total - a.total);
}

export function extractTopKeywords(proposals: PolicyProposal[], count: number = 30): { keyword: string; count: number }[] {
  const merged: Record<string, number> = {};

  proposals.forEach(p => {
    const text = p.title + ' ' + (p.content || '');
    const kws = extractNormalizedKeywords(text);
    for (const [k, v] of Object.entries(kws)) {
      merged[k] = (merged[k] || 0) + v;
    }
  });

  return Object.entries(merged)
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, count);
}

export const mockProposals = rawMongttangData as unknown as PolicyProposal[];
