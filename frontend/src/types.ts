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
  district: string;
  tfr: number | null;               // 합계출산율
  births_total: number | null;      // 실제 출생아수 (2024)
  childcare_facility_count: number | null; // 보육시설 수 (2025)
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
