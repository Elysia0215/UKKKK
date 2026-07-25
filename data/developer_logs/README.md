# UKKKK AI·개발 로그

로컬 개발 서버에서 접수한 로그는 `팀원이름/DEVLOG-*.json` 파일로 자동 저장됩니다.

- 팀원은 오류 접수까지만 수행합니다.
- AI 검증 대상으로 내보내면 `ai_in_progress`로 변경됩니다.
- 데이터 수정·검증 완료 후 `ai_applied_data`로 변경합니다.
- 재수집 또는 새 API에도 적용될 규칙 수정·검증 후 `ai_applied_rule`로 변경합니다.
- 실제 GitHub push 성공 확인 후 `github_pushed`로 변경합니다.

각 로그가 독립 파일이므로 팀원별 누적 관리와 Git 병합 시 충돌 최소화가 가능합니다.
