/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PolicyCategory = '임신' | '출산' | '보육' | '다자녀' | '위기임산부' | '다문화' | '기타';

export type DepartmentName = 
  | '저출생사업1팀'
  | '건강임신지원팀'
  | '가족건강팀'
  | '돌봄사업팀'
  | '가족지원팀'
  | '아동보호팀'
  | '다문화지원팀'
  | '미지정';

export interface PolicyProposal {
  id: string;
  title: string;
  content: string;
  reg_date: string;
  vote_score: number;
  comment_cnt: number;
  reply_yn: 'Y' | 'N';
  district: string;
  category: PolicyCategory;
  department: DepartmentName[];
  url: string;
  source?: string;
  cluster_id: number;
  cluster_size: number;
  negative_signal?: boolean;
}

export interface DistrictStat {
  district: string;
  district_name?: string;
  tfr: number | null;               // 합계출산율
  fertility_rate?: number;
  births_total: number | null;      // 실제 출생아수 (2024)
  total_births?: number;
  first_child_births?: number;
  second_child_births?: number;
  third_child_births?: number;
  childcare_facility_count: number | null; // 보육시설 수 (2025)
  daycare_centers?: number;
  daycare_capacity?: number;
  proposal_count?: number;
}

export interface DashboardStats {
  totalCount: number;
  avgVoteScore: number;
  unansweredCount: number;
  unansweredRate: number; // %
}

export interface KeywordFreq {
  keyword: string;
  count: number;
}
