/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CivilRequest {
  id: string;
  title: string;
  content: string;
  reg_date: string;
  category: string;
  dept: string;
  url: string;
}

export type PolicyCategory = 
  | '임신·난임·생식건강'
  | '출산·산후 초기지원'
  | '보육·돌봄 인프라'
  | '다자녀·양육비·생활지원'
  | '주거·교통·도시생활환경'
  | '일·가정 양립·부모 노동'
  | '취약·다양가족 사각지대'
  | '정보·상담·교육·거버넌스'
  | '임신' | '출산' | '보육' | '다자녀' | '위기임산부' | '다문화' | '기타';

export type DepartmentName =
  | '저출생사업1팀'
  | '건강임신지원팀'
  | '가족건강팀'
  | '돌봄사업팀'
  | '가족지원팀'
  | '아동보호팀'
  | '다문화지원팀'
  | '미지정'
  | string;

export interface DepartmentRanking {
  rank: number;
  role_type: string;
  dept_name: string;
  full_dept: string;
  phone: string;
  location?: string;
  duty_summary: string;
  matching_reason?: string;
}

export interface MatchedPolicy {
  policy_id: string;
  policy_name: string;
  summary: string;
  apply_url: string;
  dept_name: string;
  score: number;
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
  category_raw?: string;
  sub_category?: string;
  micro_category?: string;
  policy_flow?: string;
  matching_method?: string;
  department: DepartmentName[];
  url: string;
  source?: string;
  cluster_id: number;
  cluster_size: number;
  negative_signal?: boolean;
  department_rankings?: DepartmentRanking[];
  matched_policies?: MatchedPolicy[];
}

export interface DistrictStat {
  district?: string;
  district_name?: string;
  tfr?: number | null;               // 합계출산율
  fertility_rate?: number;
  births_total?: number | null;      // 실제 출생아수 (2024)
  total_births?: number;
  first_child_births?: number;
  second_child_births?: number;
  third_child_births?: number;
  childcare_facility_count?: number | null; // 보육시설 수 (2025)
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