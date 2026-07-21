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

export interface CivilRequest {
  id: string;
  title: string;
  content: string;
  reg_date: string;
  category: PolicyCategory;
  dept: string;
  url: string;
}

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
  source?: '상상대로서울' | '국민권익위';
  related_civil_requests?: number;
  negative_signal?: boolean;
}

export interface DistrictStat {
  district?: string;
  tfr?: number | null;               // 합계출산율
  births_total?: number | null;      // 실제 출생아수 (2024)
  childcare_facility_count?: number | null; // 보육시설 수 (2025)
  district_name?: string;
  fertility_rate?: number;
  total_births?: number;
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

export interface MongttangPolicy {
  id?: string;
  biz_nm: string;
  biz_lclsf_nm: string;
  biz_mclsf_nm?: string;
  biz_sclsf_nm?: string;
  displayCategory?: string;
  displaySubCategory?: string;
  biz_cn: string;
  utztn_trpr_cn?: string | null;
  utztn_mthd_cn?: string | null;
  aref_cn?: string | null;
  trgt_rgn?: string | null;
  trgt_itrst?: string | null;
  trgt_child_age?: string | null;
  aply_site_addr?: string | null;
  deviw_site_addr?: string | null;
  oper_hr_cn?: string | null;
}

export interface CategoryMetric {
  Category: string;
  total_count: number;
  avg_demand_score: number;
}

export interface DepartmentMetric {
  Department: string;
  total_count: number;
  avg_demand_score: number;
}

export interface DashboardSummary {
  total_policy_count: number;
  category_metrics: CategoryMetric[];
  department_metrics: DepartmentMetric[];
}