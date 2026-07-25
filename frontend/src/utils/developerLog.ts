export const AI_DEVELOPER_LOG_KEY = 'ukkkk_ai_developer_logs_v1';
export const AI_DEVELOPER_MODE_KEY = 'ukkkk_ai_developer_mode_v1';
export const AI_DEVELOPER_AUTHOR_KEY = 'ukkkk_ai_developer_author_v1';
export const AI_DEVELOPER_LOG_EVENT = 'ukkkk:ai-developer-log-open';
export const AI_DEVELOPER_LOG_CHANGED_EVENT = 'ukkkk:ai-developer-log-changed';

export type DeveloperLogStatus =
  | 'team_suggestion'
  | 'ai_in_progress'
  | 'ai_applied_data'
  | 'ai_applied_rule'
  | 'github_pushed';

export type DeveloperLogIssueType =
  | 'policy_mismatch'
  | 'classification_error'
  | 'rr_error'
  | 'district_error'
  | 'source_error'
  | 'filter_error'
  | 'ui_error'
  | 'data_error'
  | 'other';

export type DeveloperLogEntityType =
  | 'proposal'
  | 'policy'
  | 'proposal_policy_match'
  | 'civil_request'
  | 'news'
  | 'district_stat'
  | 'gap_cluster'
  | 'screen';

export type DeveloperLogEntitySnapshot = {
  entityType: DeveloperLogEntityType;
  stableId?: string;
  relatedStableId?: string;
  sourceUrl?: string;
  currentIndex?: number;
  dataVersion?: string;
  contentHash?: string;
  fieldPath?: string;
  title?: string;
  content?: string;
  currentValue?: unknown;
  relatedRecord?: Record<string, unknown>;
  record?: Record<string, unknown>;
};

export type DeveloperLogHistory = {
  status: DeveloperLogStatus;
  at: string;
  actor: 'team' | 'ai' | 'developer';
  memo?: string;
};

export type DeveloperLogEntry = {
  id: string;
  issueType: DeveloperLogIssueType;
  status: DeveloperLogStatus;
  summary: string;
  description: string;
  expectedValue?: string;
  pageKey: string;
  pageLabel: string;
  scope: {
    departmentGroup?: string | null;
    rrDepartment?: string | null;
    district?: string | null;
    filters?: Record<string, unknown>;
  };
  entity: DeveloperLogEntitySnapshot;
  createdAt: string;
  updatedAt: string;
  history: DeveloperLogHistory[];
  createdBy?: string;
};

export type DeveloperLogDraft = Partial<
  Pick<
    DeveloperLogEntry,
    'issueType' | 'summary' | 'description' | 'expectedValue' | 'pageKey' | 'pageLabel'
  >
> & {
  scope?: DeveloperLogEntry['scope'];
  entity?: Partial<DeveloperLogEntitySnapshot>;
};

const safeParse = (value: string | null): DeveloperLogEntry[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((log: DeveloperLogEntry) => {
      // 구버전의 사용자용 '다음 단계' 버튼은 memo 없이 상태 이력만 추가했다.
      // 실제 작업 근거가 없는 수동 상태 변경을 제거하고 마지막 유효 상태로 복원한다.
      const validHistory = (log.history || []).filter((history, index) => (
        index === 0 || Boolean(history.memo)
      ));
      const lastValid = validHistory[validHistory.length - 1];
      if (!lastValid || validHistory.length === (log.history || []).length) return log;
      return {
        ...log,
        status: lastValid.status,
        updatedAt: lastValid.at,
        history: validHistory,
      };
    });
  } catch {
    return [];
  }
};

export const loadDeveloperLogs = (): DeveloperLogEntry[] => {
  if (typeof window === 'undefined') return [];
  return safeParse(window.localStorage.getItem(AI_DEVELOPER_LOG_KEY));
};

export const saveDeveloperLogs = (logs: DeveloperLogEntry[]) => {
  window.localStorage.setItem(AI_DEVELOPER_LOG_KEY, JSON.stringify(logs));
  window.dispatchEvent(new CustomEvent(AI_DEVELOPER_LOG_CHANGED_EVENT));
};

export const getDeveloperLogAuthor = () => (
  typeof window === 'undefined'
    ? 'local-user'
    : window.localStorage.getItem(AI_DEVELOPER_AUTHOR_KEY)?.trim() || 'local-user'
);

export const setDeveloperLogAuthor = (author: string) => {
  window.localStorage.setItem(AI_DEVELOPER_AUTHOR_KEY, author.trim() || 'local-user');
  window.dispatchEvent(new CustomEvent(AI_DEVELOPER_LOG_CHANGED_EVENT));
};

const persistDeveloperLog = async (entry: DeveloperLogEntry) => {
  try {
    await fetch('/api/developer-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
  } catch {
    // 배포 환경이나 로컬 API 미실행 시 localStorage 캐시를 유지한다.
  }
};

export const syncDeveloperLogsFromDisk = async (): Promise<DeveloperLogEntry[]> => {
  try {
    const response = await fetch('/api/developer-logs');
    if (!response.ok) return loadDeveloperLogs();
    const diskLogs = await response.json() as DeveloperLogEntry[];
    const diskIds = new Set(diskLogs.map((log) => log.id));
    const cachedLogs = loadDeveloperLogs();
    const merged = new Map<string, DeveloperLogEntry>();
    [...cachedLogs, ...diskLogs].forEach((log) => {
      const previous = merged.get(log.id);
      if (!previous || previous.updatedAt < log.updatedAt) merged.set(log.id, log);
    });
    const logs = [...merged.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    saveDeveloperLogs(logs);
    cachedLogs.filter((log) => !diskIds.has(log.id)).forEach((log) => {
      void persistDeveloperLog({
        ...log,
        createdBy: log.createdBy || getDeveloperLogAuthor(),
      });
    });
    return logs;
  } catch {
    return loadDeveloperLogs();
  }
};

export const appendDeveloperLog = (
  draft: DeveloperLogDraft,
): DeveloperLogEntry => {
  const now = new Date().toISOString();
  const entry: DeveloperLogEntry = {
    id: `DEVLOG-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    issueType: draft.issueType || 'other',
    status: 'team_suggestion',
    summary: draft.summary?.trim() || '개발 검토 요청',
    description: draft.description?.trim() || '',
    expectedValue: draft.expectedValue?.trim() || undefined,
    pageKey: draft.pageKey || 'unknown',
    pageLabel: draft.pageLabel || '알 수 없는 화면',
    scope: draft.scope || {},
    entity: {
      entityType: draft.entity?.entityType || 'screen',
      ...draft.entity,
    },
    createdAt: now,
    updatedAt: now,
    history: [
      {
        status: 'team_suggestion',
        at: now,
        actor: 'team',
        memo: '팀원 테스트 제안 접수',
      },
    ],
    createdBy: getDeveloperLogAuthor(),
  };
  const logs = loadDeveloperLogs();
  saveDeveloperLogs([entry, ...logs]);
  void persistDeveloperLog(entry);
  return entry;
};

export const updateDeveloperLogStatus = (
  ids: string[],
  status: DeveloperLogStatus,
  actor: DeveloperLogHistory['actor'],
  memo?: string,
) => {
  const now = new Date().toISOString();
  const target = new Set(ids);
  const updated = loadDeveloperLogs().map((log) => (
    target.has(log.id)
      ? {
        ...log,
        status,
        updatedAt: now,
        history: [...log.history, { status, at: now, actor, memo }],
      }
      : log
  ));
  saveDeveloperLogs(updated);
  updated.filter((log) => target.has(log.id)).forEach((log) => {
    void persistDeveloperLog(log);
  });
};

export const openDeveloperLogComposer = (draft: DeveloperLogDraft = {}) => {
  window.dispatchEvent(
    new CustomEvent<DeveloperLogDraft>(AI_DEVELOPER_LOG_EVENT, { detail: draft }),
  );
};

export const getDeveloperMode = () => (
  typeof window !== 'undefined' &&
  window.localStorage.getItem(AI_DEVELOPER_MODE_KEY) === 'true'
);

export const setDeveloperMode = (enabled: boolean) => {
  window.localStorage.setItem(AI_DEVELOPER_MODE_KEY, String(enabled));
  window.dispatchEvent(new CustomEvent(AI_DEVELOPER_LOG_CHANGED_EVENT));
};

export const buildCorrectionIdentity = (entity: DeveloperLogEntitySnapshot) => ({
  stableId: entity.stableId || null,
  relatedStableId: entity.relatedStableId || null,
  sourceUrl: entity.sourceUrl || null,
  contentHash: entity.contentHash || null,
  currentIndex: entity.currentIndex ?? null,
  dataVersion: entity.dataVersion || null,
});
