export interface DistrictData {
  name: string;
  engName: string;
  path: string;
  labelX: number;
  labelY: number;
  proposals: number;
  births2025: number;
  daycare2025: number;
  demandScore: number;
  fertilityRate: number;
  policyCount: number;
}

export const SEOUL_BORDER_FRAME_PATH =
  'M20 30 H680 A20 20 0 0 1 700 50 V640 A20 20 0 0 1 680 660 H20 A20 20 0 0 1 0 640 V50 A20 20 0 0 1 20 30 Z';

export const SEOUL_DISTRICTS_DATA: DistrictData[] = [
  { name: '종로구', engName: 'Jongno-gu', path: 'M 208 108 L 242 96 L 260 116 L 248 138 L 220 132 L 206 118 Z', labelX: 232, labelY: 118, proposals: 6, births2025: 478, daycare2025: 61, demandScore: 74, fertilityRate: 0.448, policyCount: 18 },
  { name: '중구', engName: 'Jung-gu', path: 'M 242 96 L 276 92 L 292 110 L 280 132 L 248 138 L 240 118 Z', labelX: 260, labelY: 115, proposals: 8, births2025: 670, daycare2025: 64, demandScore: 71, fertilityRate: 0.59, policyCount: 22 },
  { name: '용산구', engName: 'Yongsan-gu', path: 'M 276 92 L 312 88 L 330 106 L 318 132 L 280 132 L 270 112 Z', labelX: 300, labelY: 115, proposals: 12, births2025: 1143, daycare2025: 84, demandScore: 78, fertilityRate: 0.575, policyCount: 24 },
  { name: '성동구', engName: 'Seongdong-gu', path: 'M 312 88 L 344 84 L 360 104 L 348 130 L 318 132 L 306 110 Z', labelX: 334, labelY: 116, proposals: 18, births2025: 1823, daycare2025: 133, demandScore: 83, fertilityRate: 0.714, policyCount: 28 },
  { name: '광진구', engName: 'Gwangjin-gu', path: 'M 344 84 L 380 82 L 396 104 L 384 130 L 348 130 L 338 108 Z', labelX: 368, labelY: 116, proposals: 16, births2025: 1382, daycare2025: 119, demandScore: 80, fertilityRate: 0.462, policyCount: 26 },
  { name: '동대문구', engName: 'Dongdaemun-gu', path: 'M 206 138 L 238 132 L 256 154 L 244 176 L 214 172 L 202 150 Z', labelX: 230, labelY: 150, proposals: 21, births2025: 1576, daycare2025: 169, demandScore: 79, fertilityRate: 0.589, policyCount: 25 },
  { name: '중랑구', engName: 'Jungnang-gu', path: 'M 238 132 L 272 132 L 288 154 L 276 176 L 244 176 L 232 154 Z', labelX: 255, labelY: 150, proposals: 14, births2025: 1896, daycare2025: 161, demandScore: 77, fertilityRate: 0.61, policyCount: 23 },
  { name: '성북구', engName: 'Seongbuk-gu', path: 'M 272 132 L 306 132 L 322 154 L 310 176 L 276 176 L 266 154 Z', labelX: 292, labelY: 150, proposals: 20, births2025: 1871, daycare2025: 174, demandScore: 82, fertilityRate: 0.603, policyCount: 27 },
  { name: '강북구', engName: 'Gangbuk-gu', path: 'M 306 132 L 340 132 L 356 154 L 342 176 L 310 176 L 298 154 Z', labelX: 328, labelY: 150, proposals: 10, births2025: 822, daycare2025: 103, demandScore: 68, fertilityRate: 0.446, policyCount: 16 },
  { name: '도봉구', engName: 'Dobong-gu', path: 'M 340 132 L 374 132 L 392 154 L 378 176 L 342 176 L 332 154 Z', labelX: 358, labelY: 150, proposals: 9, births2025: 1144, daycare2025: 138, demandScore: 69, fertilityRate: 0.568, policyCount: 17 },
  { name: '노원구', engName: 'Nowon-gu', path: 'M 196 172 L 228 176 L 242 198 L 228 220 L 196 214 L 184 194 Z', labelX: 214, labelY: 190, proposals: 23, births2025: 2257, daycare2025: 253, demandScore: 84, fertilityRate: 0.671, policyCount: 30 },
  { name: '은평구', engName: 'Eunpyeong-gu', path: 'M 154 150 L 194 162 L 208 188 L 194 214 L 156 208 L 142 182 Z', labelX: 178, labelY: 176, proposals: 15, births2025: 2010, daycare2025: 181, demandScore: 76, fertilityRate: 0.54, policyCount: 24 },
  { name: '서대문구', engName: 'Seodaemun-gu', path: 'M 194 162 L 226 154 L 242 178 L 228 208 L 194 214 L 182 188 Z', labelX: 218, labelY: 176, proposals: 19, births2025: 1544, daycare2025: 123, demandScore: 81, fertilityRate: 0.625, policyCount: 26 },
  { name: '마포구', engName: 'Mapo-gu', path: 'M 226 154 L 262 150 L 276 178 L 262 208 L 228 208 L 216 180 Z', labelX: 244, labelY: 178, proposals: 22, births2025: 1883, daycare2025: 159, demandScore: 85, fertilityRate: 0.515, policyCount: 29 },
  { name: '양천구', engName: 'Yangcheon-gu', path: 'M 262 178 L 296 176 L 310 204 L 294 228 L 262 224 L 248 198 Z', labelX: 284, labelY: 206, proposals: 13, births2025: 1737, daycare2025: 179, demandScore: 75, fertilityRate: 0.592, policyCount: 24 },
  { name: '강서구', engName: 'Gangseo-gu', path: 'M 108 194 L 150 186 L 166 214 L 150 242 L 118 238 L 100 218 Z', labelX: 134, labelY: 210, proposals: 17, births2025: 3056, daycare2025: 261, demandScore: 78, fertilityRate: 0.583, policyCount: 25 },
  { name: '구로구', engName: 'Guro-gu', path: 'M 150 186 L 186 190 L 198 220 L 184 246 L 154 242 L 138 214 Z', labelX: 170, labelY: 216, proposals: 11, births2025: 2308, daycare2025: 219, demandScore: 72, fertilityRate: 0.702, policyCount: 21 },
  { name: '금천구', engName: 'Geumcheon-gu', path: 'M 186 190 L 220 194 L 232 224 L 218 248 L 188 246 L 176 220 Z', labelX: 206, labelY: 218, proposals: 7, births2025: 967, daycare2025: 100, demandScore: 70, fertilityRate: 0.52, policyCount: 18 },
  { name: '영등포구', engName: 'Yeongdeungpo-gu', path: 'M 220 194 L 258 190 L 272 220 L 258 246 L 224 248 L 208 220 Z', labelX: 244, labelY: 220, proposals: 24, births2025: 2378, daycare2025: 196, demandScore: 86, fertilityRate: 0.627, policyCount: 31 },
  { name: '동작구', engName: 'Dongjak-gu', path: 'M 258 190 L 296 190 L 312 220 L 296 248 L 262 246 L 244 220 Z', labelX: 280, labelY: 222, proposals: 20, births2025: 1962, daycare2025: 152, demandScore: 83, fertilityRate: 0.609, policyCount: 28 },
  { name: '관악구', engName: 'Gwanak-gu', path: 'M 296 190 L 332 198 L 346 228 L 332 254 L 296 252 L 280 224 Z', labelX: 318, labelY: 230, proposals: 12, births2025: 1664, daycare2025: 149, demandScore: 73, fertilityRate: 0.396, policyCount: 20 },
  { name: '서초구', engName: 'Seocho-gu', path: 'M 332 198 L 372 204 L 388 230 L 372 256 L 336 254 L 320 228 Z', labelX: 352, labelY: 234, proposals: 26, births2025: 2033, daycare2025: 160, demandScore: 89, fertilityRate: 0.605, policyCount: 32 },
  { name: '강남구', engName: 'Gangnam-gu', path: 'M 372 204 L 410 198 L 426 224 L 410 252 L 374 256 L 360 230 Z', labelX: 394, labelY: 236, proposals: 29, births2025: 2860, daycare2025: 166, demandScore: 91, fertilityRate: 0.618, policyCount: 34 },
  { name: '송파구', engName: 'Songpa-gu', path: 'M 410 198 L 446 194 L 462 222 L 448 248 L 412 252 L 396 226 Z', labelX: 430, labelY: 236, proposals: 33, births2025: 3464, daycare2025: 280, demandScore: 94, fertilityRate: 0.58, policyCount: 36 },
  { name: '강동구', engName: 'Gangdong-gu', path: 'M 446 194 L 480 198 L 496 224 L 482 248 L 448 248 L 432 222 Z', labelX: 470, labelY: 236, proposals: 28, births2025: 2591, daycare2025: 226, demandScore: 88, fertilityRate: 0.664, policyCount: 33 },
];

export const CATEGORY_METRICS = [
  { Category: '임신', total_count: 32, color: '#6366f1' },
  { Category: '출산', total_count: 24, color: '#0ea5e9' },
  { Category: '보육', total_count: 40, color: '#f97316' },
  { Category: '다자녀', total_count: 18, color: '#14b8a6' },
  { Category: '위기임산부', total_count: 12, color: '#ec4899' },
];

export const DEPARTMENT_METRICS = [
  { name: '돌봄사업팀', count: 52 },
  { name: '가족건강팀', count: 38 },
  { name: '저출생사업1팀', count: 26 },
  { name: '건강임신지원팀', count: 18 },
  { name: '가족지원팀', count: 22 },
];

export interface PolicySample {
  id: string;
  name: string;
  category: string;
  target: string;
  content: string;
  howToApply: string;
  area: string;
  demandScore: number;
  department: string;
}

export const SEOUL_POLICIES_SAMPLE: PolicySample[] = [
  {
    id: 'POL-001',
    name: '영유아 보육료 지원 확대',
    category: '보육',
    target: '서울시 거주 영유아 가구',
    content: '만0~5세 영유아를 위한 보육료 지원을 최소 12개월까지 확대하고, 차상위 계층 우대 혜택을 강화합니다.',
    howToApply: '자치구 복지포털에서 온라인 신청',
    area: '서울시 전체',
    demandScore: 92,
    department: '돌봄사업팀',
  },
  {
    id: 'POL-002',
    name: '난임 치료 의료비 지원',
    category: '임신',
    target: '난임 부부 및 예비 부모',
    content: '난임 시술비 부담을 줄이기 위해 소득 기준을 완화하고 최대 4회까지 지원합니다.',
    howToApply: '서울시 임신지원센터 방문 또는 온라인 접수',
    area: '서울시 전체',
    demandScore: 88,
    department: '건강임신지원팀',
  },
  {
    id: 'POL-003',
    name: '다자녀 가구 주거 지원금',
    category: '다자녀',
    target: '세 자녀 이상 가구',
    content: '다자녀 가구를 위해 전세 보증금 및 월세 지원금을 제공하며, 주거 이동을 위한 추가 지원을 제공합니다.',
    howToApply: '주민센터 및 서울시 복지포털 온라인 신청',
    area: '전 자치구',
    demandScore: 90,
    department: '가족지원팀',
  },
  {
    id: 'POL-004',
    name: '임신부 건강관리 패키지',
    category: '출산',
    target: '임신부 및 출산 예정자',
    content: '임신부 건강검진, 식생활 컨설팅, 심리 상담까지 포함한 통합 지원 서비스를 제공합니다.',
    howToApply: '보건소 방문 예약',
    area: '서울시 전체',
    demandScore: 85,
    department: '가족건강팀',
  },
  {
    id: 'POL-005',
    name: '공공 아이돌봄 서비스',
    category: '보육',
    target: '맞벌이 가정 및 취약계층',
    content: '심야 및 주말 아이돌봄 서비스를 확대하여 돌봄 공백을 줄입니다.',
    howToApply: '아이돌봄 포털 온라인 신청',
    area: '서울시 전체',
    demandScore: 87,
    department: '돌봄사업팀',
  },
];
