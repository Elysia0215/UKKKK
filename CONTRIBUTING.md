# UKKKK Git 협업 규칙

## 1. 기본 원칙

- `main` 브랜치에는 직접 작업하거나 직접 push하지 않습니다.
- 모든 작업은 개인 브랜치 또는 기능 브랜치에서 진행합니다.
- 작업 완료 후 Pull Request를 생성하고, 팀원 확인 후 `main`에 병합합니다.
- 병합 전 충돌 여부와 실행 오류를 확인합니다.

---

## 2. 브랜치 구조

### main

- 최종 통합 및 배포용 브랜치
- 실행 가능한 상태만 유지
- 직접 push 금지
- Pull Request를 통해서만 병합

### 개인 작업 브랜치

각 팀원은 본인의 이름을 포함한 브랜치를 사용합니다.

예시:

```text
feature/chaeyeon
feature/daesu
feature/yeonkyung
feature/seonuk