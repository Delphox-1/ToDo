# 코드 수정 안내

클래스를 강제로 늘리기보다 기능별 모듈과 명시적인 의존성 전달로 나눴습니다. 각 모듈의 create 함수에 필요한 기능을 전달하며, 전역 앱 상태를 직접 수정하지 않습니다.

| 파일 | 담당 |
| --- | --- |
| public/planner/app.js | 화면 전환, 앱 상태와 이벤트 연결 |
| public/planner/date-tools.js | 날짜 계산, 주 시작일, 날짜 표시 |
| public/planner/sample-data.js | 예시 데이터 생성 |
| public/planner/schedule-view.js | 주간 일정 카드, 실패·미뤄짐 표시 |
| public/planner/trash-view.js | 휴지통 화면과 선택 상태 |
| public/planner/core.js | 할 일·반복 일정·보관 기간·저장 처리 |
| public/planner/merge.js | 기기 간 변경 병합 |
| public/planner/maintenance.js | 브라우저 저장 데이터 검사 |
| self-hosted/public/planner/maintenance.js | 서버 계정 데이터 검사 화면 |
| self-hosted/app/api/planner/check/route.ts | 본인 계정 검사 API |

공통 UI 모듈 4개는 public/planner에서 수정하고 npm run sync:ui로 개인 서버 버전에 복사하세요. npm run build:pages는 공통 모듈 복사와 docs 정적 파일 생성을 함께 수행합니다. app.js와 maintenance.js는 실행 모드별 차이가 있으므로 통째로 덮어쓰지 마세요.

수정 후 npm test, npm run build:pages, npm run check:sync로 확인하세요. 개인 서버 통합 검증은 npm run dev:sync를 실행한 후 별도 터미널에서 node scripts/verify-selfhost.mjs로 수행합니다. 이 검증은 로컬 테스트 계정만 생성·삭제합니다.
