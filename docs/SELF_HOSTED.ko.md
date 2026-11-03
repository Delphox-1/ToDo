# 개인 서버에 배포하기 — 로그인과 자동 동기화

**한국어** | [日本語](SELF_HOSTED.ja.md) | [English](SELF_HOSTED.en.md) · [README](../README.md)

이 모드는 각자 **Cloudflare Workers(앱 서버) + D1(데이터베이스)**을 자신의 계정에 만들고 운영합니다. PC와 폰에서 같은 배포 주소를 열고 같은 ToDo 계정으로 로그인하면 일정·프로젝트·메모가 자동 동기화됩니다. 개발자의 운영 서버나 DB는 사용하지 않습니다.

## 가능한 기능과 차이점

- 자체 회원가입·로그인, 계정별 데이터 저장, 로그아웃·탈퇴
- 할 일, 반복 일정, 주간 계획, 캘린더, 프로젝트, 검색, 백업·복원
- 같은 계정의 여러 기기 동기화와 동시 수정 충돌 처리
- 휴대폰 홈 화면에 추가해 앱처럼 실행
- Google 로그인·계정 연결은 본인의 OAuth 설정을 추가하면 사용 가능

원본의 **ChatGPT 전용 로그인**은 해당 호스팅 플랫폼의 기능이므로 이 독립 배포에는 포함하지 않습니다. 대신 ToDo 자체 계정을 사용합니다. 기존 원본 계정과 데이터가 자동으로 이전되는 것은 아니며, 필요하면 백업 파일로 옮기세요.

**GitHub Pages와 PC 로컬 모드는 별도입니다.** Pages만 켜서는 이 로그인·서버 동기화 기능이 생기지 않습니다.

## 1. 준비

- 본인의 GitHub 계정과 이 저장소의 Fork
- 본인의 Cloudflare 계정
- PC에 Git과 Node.js **22.13.0 이상**
- 앱·DB 사용량에 따른 Cloudflare 이용 한도와 비용 확인

Cloudflare 계정 생성과 로그인, DB 생성, 배포는 각 사용자가 자기 계정으로 진행합니다. 이 안내는 무료·무제한 운영을 보장하지 않습니다.

## 2. 내려받고 로컬 설정 만들기

`YOUR-USERNAME`을 본인의 GitHub 아이디로 바꾸세요. 저장소 이름을 바꿨다면 URL과 폴더 이름도 맞춥니다.

```sh
git clone https://github.com/YOUR-USERNAME/ToDo.git
cd ToDo
npm ci
npm run setup:sync
```

`setup:sync`는 다음 파일을 **PC에만** 만들며, 이미 있는 파일을 덮어쓰지 않습니다.

- `self-hosted/wrangler.json`: 본인의 Worker·DB·주소 설정
- `self-hosted/.dev.vars`: 자동 생성한 로컬 인증 비밀값

두 파일은 Git에서 제외됩니다. 원본 사이트의 주소·키·DB를 넣지 마세요.

## 3. 배포 전 로컬에서 확인하기

```sh
npm run dev:sync
```

로컬 DB에 필요한 마이그레이션을 자동 적용하고 [http://127.0.0.1:8787](http://127.0.0.1:8787)을 엽니다. **회원가입**으로 새 ToDo 계정을 만든 뒤 로그인하세요. 다른 브라우저에서 같은 주소·계정으로 로그인해 저장 내용을 확인할 수 있습니다.

이 로컬 주소는 현재 PC에서만 열립니다. 실제 휴대폰 접속은 아래의 인터넷 배포를 마친 뒤 가능합니다. 로컬과 배포 DB도 서로 별개입니다. 종료하려면 **Ctrl+C**를 누릅니다.

## 4. 본인 Cloudflare 계정에 DB 만들기

로컬 서버를 종료하고 실행합니다.

```sh
npx wrangler login
npx wrangler d1 create todo-db --config self-hosted/wrangler.json
```

브라우저 로그인에서 자신의 Cloudflare 계정을 선택합니다. DB 생성 결과의 `database_id`를 본인의 설정에 사용하세요. DB를 이미 만들었다면 다시 생성하지 말고 기존 DB의 ID를 확인합니다.

## 5. 배포 설정 수정하기

`self-hosted/wrangler.json`에서 아래 **항목만** 본인 값으로 바꾸세요. 아래 JSON은 일부 항목의 예시이므로 전체 파일을 이것으로 교체하지 마세요. `main`, `assets`, 호환 설정 등 다른 항목은 유지합니다.

```json
{
  "name": "my-todo",
  "vars": {
    "TODO_AUTH_ORIGIN": "https://my-todo.YOUR-SUBDOMAIN.workers.dev"
  },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "todo-db",
      "database_id": "YOUR-D1-DATABASE-ID",
      "migrations_dir": "./migrations"
    }
  ]
}
```

- `name`: 본인의 Worker 이름. 예: `my-todo`
- `TODO_AUTH_ORIGIN`: 본인 앱의 **HTTPS 주소**. 경로와 마지막 `/` 없이 입력
- `database_id`: 4단계에서 받은 실제 D1 ID
- `database_name`: 만든 DB 이름과 일치
- `binding: "DB"`, `migrations_dir`: 그대로 유지

`workers.dev` 하위 도메인은 본인 Cloudflare 계정에서 확인·설정합니다. 예시의 `YOUR-SUBDOMAIN`을 그대로 쓰면 안 됩니다. 사용자 지정 도메인을 쓰려면 먼저 해당 Worker의 도메인 연결을 구성하고 그 주소를 사용하세요.

## 6. 운영용 인증 비밀값 등록하기

첫 명령으로 생성된 값을 복사하고, 두 번째 명령이 입력을 요청하면 붙여넣습니다.

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
npx wrangler secret put TODO_AUTH_SECRET --config self-hosted/wrangler.json
```

Worker가 없다는 안내와 생성 질문이 나오면, 설정한 **본인 Worker 이름**이 맞는지 확인한 뒤 생성합니다. 이 값은 공개 GitHub 파일에 넣지 않습니다. 운영 후 값을 바꾸면 기존 로그인 세션에 영향을 주므로 안정적으로 보관하세요.

로컬의 `.dev.vars`는 운영 환경에 자동 업로드되지 않습니다. **운영용 secret 등록은 별도로 해야 합니다.**

## 7. DB 초기화 후 앱 배포하기

```sh
npm run db:sync:remote
npm run deploy:sync
```

첫 명령은 본인 **원격 DB**에 아직 적용되지 않은 마이그레이션을 순서대로 적용합니다. 두 번째 명령은 앱과 정적 파일을 배포합니다. 별도의 프런트엔드 빌드는 필요하지 않습니다.

스크립트는 예시 DB ID나 로컬 주소를 그대로 둔 운영 배포를 거부합니다. 오류가 나면 5단계 설정을 확인하세요. Cloudflare 인증·계정 권한·할당량 관련 오류는 본인 계정에서 해결해야 합니다.

## 8. 배포 확인과 PC·폰 동기화

1. 배포된 HTTPS 주소를 엽니다. 로그인 화면이 보여야 합니다.
2. 필요하면 `https://본인주소/api/health`에서 `{"ready":true}`인지 확인합니다. 503이면 DB 마이그레이션·DB 바인딩·secret·주소 설정을 확인하세요.
3. **배포 사이트에서 새 계정**을 만듭니다. 로컬 테스트 계정은 원격 DB에 없습니다.
4. PC와 폰에서 **같은 HTTPS 주소와 같은 계정**으로 로그인합니다.
5. 한쪽에서 할 일·메모를 수정하고 다른 쪽에서 반영되는지 확인합니다.

저장은 변경 후 서버로 전송되고, 화면이 열려 있으면 **약 10초마다** 다른 기기의 변경을 확인합니다. 다시 화면으로 돌아오거나 연결이 복구될 때도 동기화합니다. 즉시 푸시되는 방식은 아니며 네트워크에 따라 지연될 수 있습니다. 오프라인에서는 기기에 남은 기록으로 작업할 수 있지만 동기화 완료 상태를 확인한 뒤 다른 기기로 옮기세요. 새 화면을 완전히 오프라인에서 여는 기능은 보장하지 않습니다.

폰에서는 본인의 배포 주소를 Safari/Chrome으로 열고 **공유 또는 메뉴 → 홈 화면에 추가/앱 설치**를 사용합니다. PC를 계속 켜 둘 필요는 없습니다. 자세한 버튼 설명은 [README의 휴대폰 안내](../README.md)를 참고하세요.

## 9. Google 로그인도 사용하려면 — 선택 사항

자체 아이디·비밀번호 로그인은 Google 설정 없이 동작합니다. Google 로그인을 추가하려면 본인의 Google Cloud 프로젝트에서 **웹 애플리케이션 OAuth 클라이언트**를 만듭니다.

승인된 리디렉션 URI:

```text
https://YOUR-APP-DOMAIN/api/auth/callback/google
```

개발용 Google 로그인을 테스트하려면 `http://127.0.0.1:8787/api/auth/callback/google`도 별도로 등록하고 로컬 `.dev.vars`에 본인 개발용 키를 설정하세요.

운영용 키 등록:

```sh
npx wrangler secret put GOOGLE_CLIENT_ID --config self-hosted/wrangler.json
npx wrangler secret put GOOGLE_CLIENT_SECRET --config self-hosted/wrangler.json
```

Google 동의 화면·테스트 사용자·앱 공개 상태도 본인의 Google 설정에 맞춰 준비해야 합니다. 키가 없으면 Google 버튼은 비활성화됩니다. 아이디로 가입한 계정과 같은 데이터를 쓰려면 **기존 아이디로 로그인 → 계정 관리 → Google 계정 연결**을 이용하세요.

## 운영과 데이터 보관

- 데이터는 배포한 사람의 D1에 저장됩니다. 서버·DB를 삭제하면 사용자 데이터가 사라질 수 있습니다.
- 정기적으로 앱의 JSON 백업과 본인 DB 백업을 관리하세요.
- 모든 방문자가 계정을 만들 수 있는 구성입니다. 제한된 사람에게만 공개하려면 별도 가입·접근 정책이 필요합니다.
- 다른 운영자가 배포한 사이트 사이에서는 계정이나 일정이 공유되지 않습니다.
- DB·주소·인증 키와 Google 설정은 각 운영자가 관리합니다. 이 저장소에 키를 올리지 마세요.
- 원격 DB 마이그레이션은 운영 데이터에 영향을 줄 수 있으므로 업데이트 전 백업하세요.

## 검증 명령

```sh
npm test
npm run check:sync
```

로컬 동기화 서버가 실행 중인 상태에서만 다음 검사를 실행하세요. 자체 생성한 테스트 계정은 검사 후 삭제됩니다. 운영 주소에서는 실행할 수 없도록 제한되어 있습니다.

```sh
node scripts/verify-selfhost.mjs
```

저장소에서는 로컬 Worker·D1 통합 검증과 배포용 번들 생성을 확인했습니다. 각자의 Cloudflare 실제 배포와 Google OAuth 연결은 각 계정에서 최종 확인해야 합니다.

공식 자료: [Workers 주소](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/), [D1 시작하기](https://developers.cloudflare.com/d1/get-started/), [Workers secrets](https://developers.cloudflare.com/workers/configuration/secrets/), [Google OAuth 설정](https://better-auth.com/docs/authentication/google).
