// 100% 최신 엑셀(서울시_출산정책_제안데이터_분류_담당매칭_426건.xlsx) 전면 대체 mockData
import { PolicyProposal, DistrictStat, DashboardStats } from './types';
import mockProposalsJson from './data/mockProposals.json';
import districtStatsJson from './data/districtStats.json';
import mockDashboardStatsJson from './data/mockDashboardStats.json';
import seoulDistrictsJson from './data/seoulDistricts.json';

export type { PolicyProposal as Proposal };

export interface CivilRequest {
  id: string;
  title: string;
  content: string;
  reg_date: string;
  category: string;
  dept: string;
  url: string;
}

export const mockCivilRequests: CivilRequest[] = [];

export const SEOUL_DISTRICTS = seoulDistrictsJson as string[];

export const mockDashboardStats = mockDashboardStatsJson as DashboardStats;

export const districtStats = districtStatsJson as DistrictStat[];

export const mockProposals = mockProposalsJson as PolicyProposal[];
