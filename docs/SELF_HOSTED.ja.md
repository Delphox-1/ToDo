# 自分のサーバーにデプロイする — ログインと自動同期

[한국어](SELF_HOSTED.ko.md) | **日本語** | [English](SELF_HOSTED.en.md) · [README](README.ja.md)

自分のCloudflareアカウントに **Workers（アプリサーバー）とD1（DB）** を作成します。パソコンとスマートフォンで同じ公開URLを開き、同じToDoアカウントでログインすると、予定、プロジェクト、メモを自動同期できます。開発者の運用サーバーやDBは使用しません。

## 機能と違い

- ToDo独自のユーザー登録・ログイン、アカウント別の保存、ログアウト・退会
- タスク、繰り返し、週間予定、カレンダー、プロジェクト、検索、バックアップ・復元
- 同一アカウントの複数端末間の同期と、同時更新時の競合処理
- ホーム画面への追加
- 自分のOAuth設定を追加すればGoogleログインとアカウント連携も利用可能

元のサイトの **ChatGPT専用ログイン** はホスティング基盤の機能なので、この独立版には含まれません。ToDo独自のアカウントを使用してください。元のアカウントや予定は自動移行されません。必要ならバックアップから移してください。

**GitHub PagesとPCローカル版は別のモードです。** Pagesを有効にするだけでは、サーバー認証や自動同期は使えません。

## 1. 準備

自分のGitHubアカウントとFork、Cloudflareアカウント、Git、Node.js **22.13.0以上**が必要です。Cloudflareの利用制限と料金も確認してください。アカウント作成、ログイン、DB作成、デプロイは各自のアカウントで行います。無料・無制限の運用を保証するものではありません。

## 2. コードとローカル設定を準備

`YOUR-USERNAME` を自分のGitHubユーザー名に置き換えます。リポジトリ名を変更した場合はURLとフォルダー名も合わせてください。

```sh
git clone https://github.com/YOUR-USERNAME/ToDo.git
cd ToDo
npm ci
npm run setup:sync
```

`setup:sync` は次のファイルをローカルに作成します。既存のファイルは上書きしません。

- `self-hosted/wrangler.json`：自分のWorker、DB、URLの設定
- `self-hosted/.dev.vars`：自動生成したローカル認証用シークレット

どちらもGitの対象外です。開発者のサイト、キー、DBを設定しないでください。

## 3. ローカルで動作確認

```sh
npm run dev:sync
```

ローカルDBのマイグレーションが自動適用されます。[http://127.0.0.1:8787](http://127.0.0.1:8787) を開き、**회원가입（ユーザー登録）**からアカウントを作成してください。別のブラウザーでも同じURL・アカウントでログインし、保存内容を確認できます。

このURLは現在のパソコン専用です。スマートフォンからは、以下の公開後にアクセスできます。ローカルDBと公開DBは別です。停止するには **Ctrl+C** を押します。

## 4. 自分のCloudflareアカウントにDBを作成

ローカルサーバーを停止し、次を実行します。

```sh
npx wrangler login
npx wrangler d1 create todo-db --config self-hosted/wrangler.json
```

自分のCloudflareアカウントでログインし、作成結果の `database_id` を控えます。DBがすでにある場合は再作成せず、そのIDを確認してください。

## 5. 公開用の設定を編集

`self-hosted/wrangler.json` の該当項目を変更します。次は**一部項目の例**です。ファイル全体をこのJSONで置き換えず、`main`、`assets`、互換設定などを残してください。

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

`name` は自分のWorker名、`TODO_AUTH_ORIGIN` はパスや末尾の `/` を含まない本番のHTTPS URL、`database_id` は4のID、`database_name` は作成したDB名です。`binding: "DB"` と `migrations_dir` は維持してください。

`workers.dev` のサブドメインは自分のCloudflareアカウントで確認・設定します。`YOUR-SUBDOMAIN` をそのまま使用しないでください。独自ドメインを使う場合は、先にWorkerへの接続を設定します。

## 6. 本番の認証用シークレットを登録

1つ目のコマンドで生成した値をコピーし、2つ目で入力を求められたら貼り付けます。

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
npx wrangler secret put TODO_AUTH_SECRET --config self-hosted/wrangler.json
```

Workerが存在せず作成を求められた場合は、自分の設定したWorker名であることを確認してください。値はGitHubに公開せず、安定して保管します。運用開始後の変更は既存セッションに影響します。

ローカルの `.dev.vars` は本番環境に自動でアップロードされません。**本番用シークレットは別途登録が必要です。**

## 7. DBを初期化してデプロイ

```sh
npm run db:sync:remote
npm run deploy:sync
```

最初のコマンドは自分のリモートDBに未適用のマイグレーションを順に適用します。次のコマンドでアプリと静的ファイルを公開します。別途フロントエンドをビルドする必要はありません。

サンプルDB IDやローカルURLのままの本番デプロイは拒否されます。エラーの場合は5の設定を確認してください。Cloudflareの認証、権限、割り当て制限は自分のアカウントで解決する必要があります。

## 8. 公開後の確認と端末間同期

1. 公開したHTTPS URLを開き、ログイン画面を確認します。
2. 必要に応じて `https://自分のドメイン/api/health` が `{"ready":true}` を返すか確認します。503の場合はDB、マイグレーション、シークレット、URL設定を確認してください。
3. **公開サイトで新規登録**します。ローカルのアカウントはリモートDBにはありません。
4. パソコンとスマートフォンで**同じURL、同じアカウント**を使います。
5. 一方で予定やメモを変更し、もう一方に反映されることを確認します。

変更はサーバーに送信され、画面を表示中は**約10秒ごと**に別端末の更新を確認します。画面に戻ったときや再接続時にも同期します。即時プッシュ通知型の同期ではなく、通信状況により遅れる場合があります。オフライン時は端末内の既存データを編集できますが、別端末に移る前に同期完了を確認してください。完全なオフライン状態で新しく画面を開くことは保証されません。

スマートフォンでは自分の公開URLをSafariまたはChromeで開き、**共有／メニュー → ホーム画面に追加／アプリをインストール**を使います。自分のパソコンを起動したままにする必要はありません。操作の詳細は[README](README.ja.md)を参照してください。

## 9. Googleログイン — 任意

通常のID・パスワード認証には不要です。利用する場合は、自分のGoogle Cloudプロジェクトで**ウェブアプリケーションのOAuthクライアント**を作成し、次を承認済みリダイレクトURIに登録します。

```text
https://YOUR-APP-DOMAIN/api/auth/callback/google
```

ローカルでも試す場合は `http://127.0.0.1:8787/api/auth/callback/google` を別途登録し、開発用キーをローカルの `.dev.vars` に設定します。

本番用キーの登録：

```sh
npx wrangler secret put GOOGLE_CLIENT_ID --config self-hosted/wrangler.json
npx wrangler secret put GOOGLE_CLIENT_SECRET --config self-hosted/wrangler.json
```

同意画面、テストユーザー、アプリの公開状態も自分のGoogle設定で準備してください。キーがなければGoogleボタンは無効になります。既存のIDアカウントと同じ予定を使う場合は、**IDでログイン → アカウント管理 → Googleアカウントを連携**を使用してください。

## 運用とバックアップ

データは運営者のD1に保存されます。サーバーやDBの削除でデータを失う可能性があるため、JSONとDBのバックアップを定期的に管理してください。リモートのマイグレーション前にもバックアップしてください。

現在は訪問者が新規登録できる構成です。利用者を限定する場合は別途登録・アクセス制限が必要です。別の運営者がデプロイしたサイトとはアカウントや予定を共有しません。DB、URL、認証キー、Google設定は各運営者が管理し、キーをリポジトリに公開しないでください。

## 検証

```sh
npm test
npm run check:sync
```

ローカルの同期サーバーが動作中に限り、次も実行できます。生成したテストアカウントは終了時に削除され、本番URLでは実行できないよう制限されています。

```sh
node scripts/verify-selfhost.mjs
```

ローカルWorker・D1での統合テストと本番用バンドル生成は確認しています。各自のCloudflare本番デプロイとGoogle OAuthは各アカウントで最終確認が必要です。

公式資料：[Workers URL](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/)、[D1](https://developers.cloudflare.com/d1/get-started/)、[Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)、[Google OAuth](https://better-auth.com/docs/authentication/google)。
