import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  Copy,
  Download,
  Filter,
  Settings,
  Upload,
  Wrench,
  X,
} from 'lucide-react';
import {
  AI_DEVELOPER_LOG_CHANGED_EVENT,
  AI_DEVELOPER_LOG_EVENT,
  DeveloperLogDraft,
  DeveloperLogEntry,
  DeveloperLogIssueType,
  DeveloperLogStatus,
  appendDeveloperLog,
  buildCorrectionIdentity,
  getDeveloperLogAuthor,
  getDeveloperMode,
  loadDeveloperLogs,
  openDeveloperLogComposer,
  setDeveloperLogAuthor,
  setDeveloperMode,
  syncDeveloperLogsFromDisk,
  updateDeveloperLogStatus,
} from '../utils/developerLog';

const STATUS_CONFIG: Record<DeveloperLogStatus, { label: string; color: string }> = {
  team_suggestion: { label: '팀원 테스트 제안', color: 'bg-slate-100 text-slate-700' },
  ai_in_progress: { label: 'AI 수정 중·접수 중', color: 'bg-amber-100 text-amber-800' },
  ai_applied_data: { label: 'AI 반영 완료 1차·데이터', color: 'bg-blue-100 text-blue-800' },
  ai_applied_rule: { label: 'AI 반영 완료 2차·재수집 규칙', color: 'bg-violet-100 text-violet-800' },
  github_pushed: { label: 'GitHub Push 완료', color: 'bg-emerald-100 text-emerald-800' },
};

const STATUS_GUIDE: Array<{
  status: DeveloperLogStatus;
  description: string;
}> = [
  { status: 'team_suggestion', description: '팀원이 오류·개선점을 저장' },
  { status: 'ai_in_progress', description: 'AI 검증 대상으로 접수·교차검증 중' },
  { status: 'ai_applied_data', description: '현재 데이터 파일 수정·검증 완료' },
  { status: 'ai_applied_rule', description: '재수집·새 API에도 적용되도록 규칙 수정 완료' },
  { status: 'github_pushed', description: '검증된 코드·데이터의 원격 저장소 반영 완료' },
];

const ISSUE_LABELS: Record<DeveloperLogIssueType, string> = {
  policy_mismatch: '정책 오매칭',
  classification_error: '대·중·소분류 오류',
  rr_error: '담당팀·R&R 오류',
  district_error: '자치구 추정 오류',
  source_error: '원문·URL 오류',
  filter_error: '필터 오류',
  ui_error: '화면·UI 오류',
  data_error: '수치·데이터 오류',
  other: '기타 개발 오류',
};

const QUICK_SYMPTOMS: Array<{ label: string; issueType: DeveloperLogIssueType }> = [
  { label: '버튼이 반응하지 않음', issueType: 'ui_error' },
  { label: '선택 표시가 연동되지 않음', issueType: 'filter_error' },
  { label: '필터가 적용되지 않음', issueType: 'filter_error' },
  { label: '수치·내용이 틀림', issueType: 'data_error' },
  { label: '관련 없는 항목이 매칭됨', issueType: 'policy_mismatch' },
  { label: '원문·링크가 잘못됨', issueType: 'source_error' },
];

const AI_HANDOFF_PROMPT = `당신은 UKKKK의 AI 개발 검수 담당자입니다.
UKKKK는 서울시 시민 제안과 민원·정책·뉴스·통계를 연결해 출산·양육 정책의 검토 대상, 담당 후보, 판단 근거와 후속 조치를 지원하는 상상대로 서울 백오피스 파일럿입니다.

[반드시 지킬 프로젝트 규칙]
1. 목업이나 임의 예시가 아니라 저장소의 실제 데이터를 기준으로 검증합니다.
2. 정책 대분류 담당군과 실제 조직 R&R 팀은 서로 다른 축입니다. 대분류 선택 시 해당 정책 범위만, 실제 팀 선택 시 그 팀의 주관·협조 매칭 범위만 적용합니다.
3. 자치구가 '미상'이라고 모두 결측으로 보지 않습니다. 사용자가 구를 선택했거나 본문에 특정 구가 명시된 경우에만 구 단위로 복원하고, 그렇지 않은 서울시 전체 제안은 전체 범위로 구분합니다.
4. stableId를 최우선으로 원본을 찾고, 없으면 sourceUrl·contentHash·제목·선택 원문을 교차검증합니다. currentIndex는 참고값일 뿐 영구 식별자로 사용하지 않습니다.
5. 사용자의 제보를 그대로 정답으로 간주하지 말고 원본 데이터, 화면 필터 상태, 프론트엔드 로직, 데이터 생성 스크립트를 교차검증합니다.
6. 기존 사용자 변경과 관계없는 파일은 수정하지 않습니다.

[처리 순서]
1. 각 로그의 pageLabel, scope, entity, summary, description으로 재현 조건을 정리합니다.
2. 원본 레코드와 화면·필터 로직을 찾아 제보가 맞는지 판정합니다.
3. 데이터 값만 잘못된 경우 실제 데이터와 파생 산출물을 수정하고 테스트한 뒤 ai_applied_data로 갱신합니다.
4. 새 API 재수집 시 같은 오류가 반복될 수 있으면 정제·분류·매칭 생성 규칙과 테스트까지 수정한 뒤 ai_applied_rule로 갱신합니다.
5. 상태 갱신은 scripts/update_developer_log_status.py를 사용하고 memo에 수정 파일·검증 결과를 남깁니다.
6. github_pushed는 실제 git push 성공 응답을 확인한 경우에만 기록합니다.
7. 최종 보고에는 로그별 판정, 원인, 수정 파일, 검증 결과, 남은 위험을 구분해 작성합니다.

[금지]
- 사용자가 화면에서 '다음 단계'를 눌러 상태를 임의 변경하게 만들지 않습니다.
- 테스트 없이 반영 완료로 표시하지 않습니다.
- 실제 push 없이 GitHub Push 완료로 표시하지 않습니다.`;

type Props = {
  activeTab: number;
  pageLabel: string;
  departmentGroup?: string | null;
  rrDepartment?: string | null;
  district?: string | null;
};

const downloadJson = (name: string, value: unknown) => {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
};

export function DeveloperLogCenter({
  activeTab,
  pageLabel,
  departmentGroup,
  rrDepartment,
  district,
}: Props) {
  const [developerMode, setMode] = useState(getDeveloperMode);
  const [developerAuthor, setAuthor] = useState(getDeveloperLogAuthor);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [logPanelOpen, setLogPanelOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [logs, setLogs] = useState<DeveloperLogEntry[]>(loadDeveloperLogs);
  const [draft, setDraft] = useState<DeveloperLogDraft>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | DeveloperLogStatus>('all');
  const [issueFilter, setIssueFilter] = useState<'all' | DeveloperLogIssueType>('all');

  const reload = useCallback(() => {
    setMode(getDeveloperMode());
    setLogs(loadDeveloperLogs());
  }, []);

  useEffect(() => {
    void syncDeveloperLogsFromDisk().then(setLogs);
  }, []);

  // AI/Codex가 상태 갱신 스크립트로 로그 파일을 변경하면 열린 패널에도
  // 별도 새로고침 없이 반영되도록 디스크/API 상태를 주기적으로 동기화한다.
  useEffect(() => {
    if (!logPanelOpen) return;

    const sync = () => {
      void syncDeveloperLogsFromDisk().then(setLogs);
    };
    sync();
    const timer = window.setInterval(sync, 3000);
    window.addEventListener('focus', sync);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', sync);
    };
  }, [logPanelOpen]);

  useEffect(() => {
    const handleOpen = (event: Event) => {
      const custom = event as CustomEvent<DeveloperLogDraft>;
      const selectedText = window.getSelection()?.toString().trim() || '';
      const capturedText = custom.detail?.entity?.content || selectedText;
      setDraft({
        issueType: 'other',
        pageKey: `tab-${activeTab}`,
        pageLabel,
        ...custom.detail,
        entity: {
          entityType: custom.detail?.entity?.entityType || 'screen',
          ...custom.detail?.entity,
          content: capturedText,
        },
        scope: {
          departmentGroup,
          rrDepartment,
          district,
          ...custom.detail?.scope,
        },
      });
      setComposerOpen(true);
    };
    window.addEventListener(AI_DEVELOPER_LOG_EVENT, handleOpen);
    window.addEventListener(AI_DEVELOPER_LOG_CHANGED_EVENT, reload);
    return () => {
      window.removeEventListener(AI_DEVELOPER_LOG_EVENT, handleOpen);
      window.removeEventListener(AI_DEVELOPER_LOG_CHANGED_EVENT, reload);
    };
  }, [activeTab, pageLabel, departmentGroup, rrDepartment, district, reload]);

  const pendingCount = logs.filter((log) => log.status !== 'github_pushed').length;
  const filteredLogs = useMemo(() => logs.filter((log) => (
    (statusFilter === 'all' || log.status === statusFilter) &&
    (issueFilter === 'all' || log.issueType === issueFilter)
  )), [logs, statusFilter, issueFilter]);
  const requiresSelectedSource = !['ui_error', 'filter_error'].includes(draft.issueType || 'other');

  const toggleMode = () => {
    const next = !developerMode;
    setDeveloperMode(next);
    setMode(next);
    if (!next) {
      setComposerOpen(false);
      setLogPanelOpen(false);
    }
  };

  const submit = () => {
    const issueLabel = ISSUE_LABELS[draft.issueType || 'other'];
    const summary = draft.summary?.trim() || `${draft.pageLabel || pageLabel} · ${issueLabel}`;
    const description = draft.description?.trim()
      || `선택한 화면 내용에서 '${summary}' 현상을 확인했습니다. 선택 원문과 현재 필터 범위를 기준으로 검증해 주세요.`;
    appendDeveloperLog({
      ...draft,
      summary,
      description,
      pageKey: draft.pageKey || `tab-${activeTab}`,
      pageLabel: draft.pageLabel || pageLabel,
      scope: {
        departmentGroup,
        rrDepartment,
        district,
        ...draft.scope,
      },
    });
    setComposerOpen(false);
    setDraft({});
  };

  const exportForAi = () => {
    const targets = selectedIds.length
      ? logs.filter((log) => selectedIds.includes(log.id))
      : filteredLogs;
    if (!targets.length) return;
    updateDeveloperLogStatus(
      targets.map((log) => log.id),
      'ai_in_progress',
      'team',
      'AI 교차검증용 로그 내보내기',
    );
    downloadJson(`ukkkk-ai-review-${new Date().toISOString().slice(0, 10)}.json`, {
      schemaVersion: '1.0',
      handoffPromptVersion: '1.0',
      exportedAt: new Date().toISOString(),
      project: {
        name: 'UKKKK',
        repositoryRootHint: 'JSON 파일을 UKKKK 저장소와 함께 열어 작업하세요.',
        developerLogRoot: 'data/developer_logs/<팀원이름>/DEVLOG-*.json',
        statusUpdater: 'scripts/update_developer_log_status.py',
      },
      aiHandoffPrompt: AI_HANDOFF_PROMPT,
      instructions: [
        'stableId를 최우선으로 원본 레코드를 찾습니다.',
        'stableId가 없으면 sourceUrl과 contentHash를 교차검증합니다.',
        'currentIndex는 재수집 시 순서가 변할 수 있으므로 식별자로 사용하지 않습니다.',
        '1차 데이터 수정과 2차 재수집 규칙을 분리해 결과를 작성합니다.',
        'AI/Codex는 실제 수정과 검증을 마친 뒤 scripts/update_developer_log_status.py로 해당 로그 ID의 상태와 근거 memo를 갱신합니다.',
        'github_pushed는 실제 git push 성공 응답을 확인한 뒤에만 기록합니다.',
      ],
      logs: targets.map((log) => ({
        ...log,
        correctionIdentity: buildCorrectionIdentity(log.entity),
      })),
    });
    setSelectedIds([]);
  };

  return (
    <>
      <div className="relative">
        <button
          type="button"
          onClick={() => setSettingsOpen((open) => !open)}
          className="relative rounded border border-slate-700 bg-slate-800/80 p-1.5 text-slate-200 transition hover:bg-slate-700"
          title="시스템 설정"
          aria-label="시스템 설정"
        >
          <Settings className="h-3.5 w-3.5" />
          {developerMode && pendingCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 min-w-4 rounded-full bg-rose-500 px-1 text-center text-[8px] font-black text-white">
              {pendingCount}
            </span>
          )}
        </button>

        {settingsOpen && (
          <div className="absolute right-0 top-9 z-[70] w-72 rounded-xl border border-slate-200 bg-white p-3 text-slate-800 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <strong className="text-xs">⚙️ 시스템 설정</strong>
              <button onClick={() => setSettingsOpen(false)}><X className="h-4 w-4" /></button>
            </div>
            <label className="flex cursor-pointer items-start justify-between gap-3 rounded-lg bg-slate-50 p-2.5">
              <span>
                <span className="block text-[11px] font-black">개발자·AI 로그 모드</span>
                <span className="mt-0.5 block text-[9px] leading-relaxed text-slate-500">
                  켰을 때만 AI 로그 버튼과 검수 로그가 표시됩니다.
                </span>
              </span>
              <input
                type="checkbox"
                checked={developerMode}
                onChange={toggleMode}
                className="mt-0.5 h-4 w-4 accent-blue-600"
              />
            </label>
            {developerMode && (
              <>
                <label className="mt-2 block rounded-lg border border-slate-200 p-2.5">
                  <span className="block text-[10px] font-black">내 로그 폴더 이름</span>
                  <span className="mt-0.5 block text-[8px] text-slate-400">
                    data/developer_logs/이름 폴더에 로그 파일이 누적됩니다.
                  </span>
                  <input
                    value={developerAuthor}
                    onChange={(event) => setAuthor(event.target.value)}
                    onBlur={() => setDeveloperLogAuthor(developerAuthor)}
                    className="mt-1.5 w-full rounded border border-slate-200 px-2 py-1.5 text-[10px]"
                    placeholder="예: 박채연"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setDeveloperLogAuthor(developerAuthor);
                    void syncDeveloperLogsFromDisk().then(setLogs);
                    setLogPanelOpen(true);
                    setSettingsOpen(false);
                  }}
                  className="mt-2 flex w-full items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-[10px] font-black text-blue-800"
                >
                  개발자 로그 모아보기
                  <span className="flex items-center gap-1">
                    {pendingCount}건 <ChevronRight className="h-3 w-3" />
                  </span>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {developerMode && (
        <button
          type="button"
          onClick={() => openDeveloperLogComposer({
            pageKey: `tab-${activeTab}`,
            pageLabel,
            issueType: 'other',
            entity: { entityType: 'screen' },
          })}
          className="flex items-center gap-1 rounded border border-amber-300 bg-amber-50 px-2 py-1 text-[9px] font-black text-amber-800 hover:bg-amber-100"
          title="현재 화면의 데이터·분류·기능 오류를 AI 개발 로그로 보냅니다"
        >
          <Wrench className="h-3 w-3" />
          AI 로그
        </button>
      )}

      {composerOpen && developerMode && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-2xl select-text rounded-2xl bg-white p-5 text-slate-900 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black">🛠 AI·개발 로그 보내기</h2>
                <p className="mt-1 text-[10px] text-slate-500">
                  화면 캡처 대신 레코드 ID·URL·본문 해시·필드 경로를 함께 저장합니다.
                </p>
              </div>
              <button onClick={() => setComposerOpen(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-[10px] font-bold">
                오류 유형
                <select
                  value={draft.issueType || 'other'}
                  onChange={(event) => setDraft((value) => ({
                    ...value,
                    issueType: event.target.value as DeveloperLogIssueType,
                  }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs"
                >
                  {Object.entries(ISSUE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <label className="text-[10px] font-bold">
                제안·정책 ID
                <input
                  value={draft.entity?.stableId || ''}
                  onChange={(event) => setDraft((value) => ({
                    ...value,
                    entity: { entityType: value.entity?.entityType || 'screen', ...value.entity, stableId: event.target.value },
                  }))}
                  placeholder="자동 첨부 또는 직접 입력"
                  className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs"
                />
              </label>
            </div>
            <fieldset className="mt-3">
              <legend className="text-[10px] font-bold">
                어떤 문제가 있나요? <span className="text-rose-500">하나만 눌러도 됩니다.</span>
              </legend>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {QUICK_SYMPTOMS.map((symptom) => (
                  <button
                    key={symptom.label}
                    type="button"
                    onClick={() => setDraft((value) => ({
                      ...value,
                      issueType: symptom.issueType,
                      summary: symptom.label,
                    }))}
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-bold transition ${
                      draft.summary === symptom.label
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-300'
                    }`}
                  >
                    {symptom.label}
                  </button>
                ))}
              </div>
            </fieldset>
            <label className="mt-3 block text-[10px] font-bold">
              추가 설명 또는 원하는 결과 <span className="font-normal text-slate-400">(선택)</span>
              <textarea
                value={draft.description || ''}
                onChange={(event) => setDraft((value) => ({ ...value, description: event.target.value }))}
                rows={3}
                className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs"
                placeholder="예: 상단 대분류를 선택하면 아래 1차 대분류도 같은 값으로 선택 표시되어야 합니다."
              />
            </label>
            <label className="mt-3 block text-[10px] font-bold">
              <span className="flex items-center justify-between">
                현재 페이지·원본 데이터
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(draft.entity?.content || '')}
                  className="flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-[9px] text-slate-500 hover:bg-slate-50"
                >
                  <Copy className="h-3 w-3" /> 전체 복사
                </button>
              </span>
              <textarea
                value={draft.entity?.content || ''}
                onChange={(event) => setDraft((value) => ({
                  ...value,
                  entity: {
                    entityType: value.entity?.entityType || 'screen',
                    ...value.entity,
                    content: event.target.value,
                  },
                }))}
                rows={7}
                className="mt-1 w-full select-text rounded-lg border border-slate-200 bg-slate-50 p-2 font-mono text-[10px] leading-relaxed text-slate-700"
                placeholder="오류가 있는 문장을 화면에서 드래그한 뒤 AI 로그 버튼을 눌러주세요. 선택한 내용만 여기에 들어옵니다."
              />
              {draft.entity?.content?.trim() ? (
                <span className="mt-1 block text-[9px] font-bold text-emerald-600">
                  선택한 문장이 자동으로 담겼습니다. 내용을 확인한 뒤 오류와 관련 없는 부분은 지우거나 직접 수정해 주세요.
                </span>
              ) : !requiresSelectedSource ? (
                <span className="mt-1 block text-[9px] font-bold text-blue-600">
                  화면·필터 오류는 원문을 선택하지 않아도 저장할 수 있습니다. 페이지와 현재 대분류·팀은 자동으로 첨부됩니다.
                </span>
              ) : (
                <span className="mt-1 block font-bold text-rose-600">
                  데이터·매칭 오류는 확인할 대상을 찾을 수 있도록 문제 문장을 드래그한 뒤 AI 로그를 다시 눌러주세요.
                </span>
              )}
            </label>
            <div className="mt-3 rounded-lg border-2 border-rose-300 bg-rose-50 p-2.5 text-[10px] font-bold leading-relaxed text-rose-800">
              <span className="mr-1 text-rose-600">🚨 오류 발생 페이지:</span>
              <strong className="text-rose-950">{draft.pageLabel || pageLabel}</strong>
              <span className="mx-1 text-rose-300">|</span>
              대분류: {departmentGroup || '전체'}
              <span className="mx-1 text-rose-300">|</span>
              팀: {rrDepartment || '전체'}
              {draft.entity?.currentIndex !== undefined && <> · 당시 index: {draft.entity.currentIndex}</>}
              {draft.entity?.fieldPath && <> · 필드: {draft.entity.fieldPath}</>}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setComposerOpen(false)} className="rounded-lg px-3 py-2 text-xs font-bold text-slate-500">취소</button>
              <button
                onClick={submit}
                disabled={
                  !draft.summary?.trim() ||
                  (requiresSelectedSource && !draft.entity?.content?.trim())
                }
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-black text-white disabled:opacity-40"
              >
                팀원 테스트 제안으로 저장
              </button>
            </div>
          </div>
        </div>
      )}

      {logPanelOpen && developerMode && (
        <div className="fixed inset-0 z-[85] flex justify-end bg-slate-950/30">
          <section className="flex h-full w-full max-w-3xl flex-col bg-white text-slate-900 shadow-2xl">
            <header className="flex items-center justify-between border-b border-slate-200 p-4">
              <div>
                <h2 className="text-sm font-black">개발자·AI 검수 로그</h2>
                <p className="mt-1 text-[9px] text-slate-500">
                  안정 ID → URL → 본문 해시 순으로 원본과 교차검증합니다. index는 참고값입니다.
                </p>
              </div>
              <button onClick={() => setLogPanelOpen(false)}><X className="h-5 w-5" /></button>
            </header>
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="rounded border border-slate-200 p-1.5 text-[10px]">
                <option value="all">전체 상태</option>
                {Object.entries(STATUS_CONFIG).map(([value, config]) => <option key={value} value={value}>{config.label}</option>)}
              </select>
              <select value={issueFilter} onChange={(e) => setIssueFilter(e.target.value as typeof issueFilter)} className="rounded border border-slate-200 p-1.5 text-[10px]">
                <option value="all">전체 오류</option>
                {Object.entries(ISSUE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <button onClick={exportForAi} className="ml-auto flex items-center gap-1 rounded bg-slate-900 px-3 py-1.5 text-[10px] font-black text-white">
                <Download className="h-3 w-3" /> AI 검증용 JSON
              </button>
              <label className="flex cursor-pointer items-center gap-1 rounded border border-slate-200 px-3 py-1.5 text-[10px] font-black text-slate-600" title="향후 AI 검증 결과 JSON을 다시 반영하는 입력 위치">
                <Upload className="h-3 w-3" /> 결과 가져오기
                <input type="file" accept=".json" className="hidden" />
              </label>
              <p className="w-full text-right text-[8px] text-slate-400">
                내보낸 JSON에는 프로젝트 규칙·검증 순서·상태 갱신 명령이 자동 포함됩니다.
              </p>
            </div>
            <div className="border-b border-slate-100 bg-slate-50/70 p-3">
              <div className="mb-2 flex items-center justify-between">
                <strong className="text-[10px] text-slate-700">AI·개발 반영 상태 루프</strong>
                <span className="text-[8px] font-bold text-slate-400">
                  사용자가 누르지 않으며, AI/Codex가 실제 작업 결과를 확인한 뒤 변경합니다.
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {STATUS_GUIDE.map((guide, index) => (
                  <div key={guide.status} className="relative rounded-lg border border-slate-200 bg-white p-2">
                    <span className={`inline-block rounded px-1.5 py-0.5 text-[8px] font-black ${STATUS_CONFIG[guide.status].color}`}>
                      {index + 1}. {STATUS_CONFIG[guide.status].label}
                    </span>
                    <p className="mt-1 text-[8px] leading-relaxed text-slate-500">{guide.description}</p>
                    {index < STATUS_GUIDE.length - 1 && (
                      <ChevronRight className="absolute -right-2 top-1/2 z-10 h-3 w-3 -translate-y-1/2 rounded-full bg-white text-slate-300" />
                    )}
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[8px] leading-relaxed text-slate-500">
                로컬 실행에서는 팀원별 로그 폴더에 계속 누적됩니다. 3·4단계는 AI/Codex가 수정과 검증을 완료한 뒤 로그 파일에 근거를 기록하며, 5단계는 실제 GitHub Push 성공 응답을 확인한 경우에만 완료됩니다.
              </p>
              <div className="mt-3 border-t border-slate-200 pt-3">
                <strong className="text-[10px] text-slate-700">동작 방식</strong>
                <ol className="mt-2 grid gap-1.5 text-[9px] leading-relaxed text-slate-600">
                  <li><b>1. 팀원이 로그 저장</b> → <span className="font-bold text-slate-700">팀원 테스트 제안</span></li>
                  <li><b>2. AI 검증용 JSON 내보내기</b> → 자동으로 <span className="font-bold text-amber-700">AI 수정 중·접수 중</span></li>
                  <li><b>3. AI/Codex가 실제 데이터 수정·검증 후 로그 파일 갱신</b> → <span className="font-bold text-blue-700">1차·데이터 반영 완료</span></li>
                  <li><b>4. AI/Codex가 재수집 규칙이나 새 API 연동 코드까지 수정·검증 후 갱신</b> → <span className="font-bold text-violet-700">2차·재수집 규칙 반영 완료</span></li>
                  <li><b>5. 실제 GitHub Push 성공 응답 확인 후 AI/Codex가 갱신</b> → <span className="font-bold text-emerald-700">GitHub Push 완료</span></li>
                </ol>
              </div>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-3">
              {filteredLogs.map((log) => (
                <article key={log.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(log.id)}
                      onChange={(e) => setSelectedIds((ids) => e.target.checked ? [...ids, log.id] : ids.filter((id) => id !== log.id))}
                      className="mt-1"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`rounded px-1.5 py-0.5 text-[9px] font-black ${STATUS_CONFIG[log.status].color}`}>{STATUS_CONFIG[log.status].label}</span>
                        <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[9px] font-bold text-rose-700">{ISSUE_LABELS[log.issueType]}</span>
                        <span className="text-[9px] text-slate-400">{log.pageLabel}</span>
                      </div>
                      <h3 className="mt-2 text-xs font-black">{log.summary}</h3>
                      <p className="mt-1 whitespace-pre-wrap text-[10px] leading-relaxed text-slate-600">{log.description}</p>
                      <div className="mt-2 rounded bg-slate-50 p-2 font-mono text-[8px] text-slate-500">
                        ID {log.entity.stableId || '없음'} · 관련 ID {log.entity.relatedStableId || '없음'} · index {log.entity.currentIndex ?? '없음'} · version {log.entity.dataVersion || '없음'}
                      </div>
                    </div>
                    {log.status === 'github_pushed' ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <span className="shrink-0 rounded bg-slate-50 px-2 py-1 text-[8px] font-bold text-slate-400">
                        작업 결과에 따라 자동 변경
                      </span>
                    )}
                  </div>
                </article>
              ))}
              {!filteredLogs.length && (
                <div className="py-20 text-center text-xs font-bold text-slate-400">조건에 맞는 개발 로그가 없습니다.</div>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
