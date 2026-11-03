# ToDo

[한국어](../README.md) | [日本語](README.ja.md) | **English**

A personal planner with tasks, weekly schedules, a calendar, and projects. **Deploy your own server and database for sign-in and automatic sync between your PC and phone.** Each deployment manages its own independent accounts and data.

It does not connect to the developer's live site. Choose **self-hosted deployment** for sign-in and automatic sync. Separate PC-local and Pages modes remain available without sign-in.

## Features

- Add, edit, and complete tasks; organize them by priority and project
- Weekly schedule and monthly calendar
- Recurring events and task search
- JSON backup and restore
- Korean and Japanese public holidays

## Recommended: Sign-in and automatic sync on your own server

Deploy **Cloudflare Workers and D1 in your own account** to sign in with the same URL and ToDo account on your PC and phone and sync your plans. This is separate from the developer's live service.

**[Self-hosting guide — sign-up, sign-in, sync, and phone access](SELF_HOSTED.en.md)**

| Mode | Sign-in and server storage | Automatic PC/phone sync | Requirements |
| --- | --- | --- | --- |
| **Own server — recommended** | Yes | Yes | Your Cloudflare account, Worker, D1, and configuration |
| PC-local | No | No | PC and Node.js |
| GitHub Pages | No | No | GitHub account and Pages settings |

Each operator must configure the server, database, URL, and secret once. Downloading or forking does not create a server automatically. ChatGPT-specific sign-in is not included in independent deployment; use a ToDo account. Add Google sign-in with your own OAuth credentials if desired.

### Try sync mode locally

```sh
npm ci
npm run setup:sync
npm run dev:sync
```

Open [http://127.0.0.1:8787](http://127.0.0.1:8787). This only tests the app on your PC. Complete the deployment guide above for phone access.

## Option 1: Download and run on your PC

### 1. Install Node.js

Install [Node.js](https://nodejs.org/) **22.13.0 or later**. Open a new terminal and confirm that this command prints a version:

```sh
node --version
```

### 2. Download the code

Select **Code → Download ZIP** at the top of the repository and extract the archive. Do not run the app from inside the ZIP file.

If you use Git, you can download it with:

```sh
git clone https://github.com/Delphox-1/ToDo.git
cd ToDo
```

### 3. Start the app

**Windows:** Double-click `Start-Local.cmd` in the extracted folder. Keep the command window open while using the app.

**Windows, macOS, and Linux:** Open a terminal in the folder containing `package.json` and run:

```sh
node scripts/local-server.mjs
```

You can also use `npm run start:local` if you prefer the npm command included with Node.js. **You do not need to run `npm install`, `npm ci`, or a build.**

### 4. Open the planner

Visit [http://127.0.0.1:4173](http://127.0.0.1:4173) in your browser and add a task. No sign-in or registration is needed.

Close the terminal or press **Ctrl+C** to stop the server. Start it again and use the **same browser and URL** to see your saved plans. Open the local URL above rather than double-clicking the HTML file.

## Option 2: Create your own website and add it to your phone's home screen

You do not need an existing public address or a server on your PC. **Fork the repository into your own GitHub account and enable GitHub Pages.** GitHub hosts the files and provides an HTTPS address for your copy. You do not need to download the code or install Node.js on your phone.

**Downloading the code alone does not create a website.** Complete the Fork and Pages steps below. This creates a static site separate from the developer's live service. It does not include account sign-in, a database server, or automatic syncing between devices.

### 1. Fork the repository into your account

1. Sign in to GitHub.
2. Select **Fork** at the top of this repository. It may be inside a menu on smaller screens.
3. Select your account under **Owner** and choose a **Repository name**, such as `my-todo`.
4. Select **Create fork**.
5. Confirm that the address belongs to **your account**, for example `github.com/YOUR-USERNAME/my-todo`. You are configuring your copy, not the original repository.

GitHub Free supports Pages for public repositories. You do not need to buy a domain, but account and organization policies and GitHub usage limits still apply.

### 2. Enable GitHub Pages

1. In **your fork**, open **Settings → Pages**.
2. Under **Build and deployment → Source**, select **Deploy from a branch**.
3. Select `main` for **Branch** and **`/docs`** for the folder, not `/(root)`.
4. Select **Save** and wait for deployment to finish.
5. Check progress under **Actions**. Once it finishes, open **Visit site** or the published URL under **Settings → Pages**.

This repository already includes `docs/index.html` and the files needed for Pages. You do not need a build step or secret keys for the initial deployment. The site may not be available until you enable Pages.

### 3. Find your website address

A typical project site uses the following format. This is a placeholder, not a link to an existing site.

```text
https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/
```

For example, account `alice` and repository `my-todo` would use the format `https://alice.github.io/my-todo/`. **Use the actual URL shown under Settings → Pages.** You can open it from both your PC and phone, and your PC does not need to stay on.

### 4. Add it to an iPhone home screen

1. Open your Pages URL in **Safari**. You should see the planner, not GitHub's code page.
2. Select **Share**. Depending on your Safari layout, it may be inside the page menu.
3. Select **Add to Home Screen**. If it is missing, look under **Edit Actions** in the share menu.
4. Enable **Open as Web App** if that option is shown.
5. Choose a name and select **Add**.
6. Open ToDo using the new home-screen icon.

### 5. Add it to an Android home screen

1. Open your Pages URL in **Chrome**.
2. Open the **⋮** menu in the top-right corner.
3. Select the available option: **Install and create shortcut → Install**, **Install app**, or **Add to Home screen**.
4. Follow the prompts, then open the planner from its home-screen icon.

Menu labels and whether the result opens as an app or a shortcut depend on your OS and browser. This is different from installing a native app from an app store. **Adding a home-screen icon does not guarantee full offline use.** The current version may need an internet connection to load the app.

### 6. Understand storage, sharing, and access

- Each user's GitHub Pages site serves their copy. **It does not connect to the developer's live service.**
- The website files come from GitHub, but plans stay **on the device and in the browser you use**. They are not uploaded to the repository.
- **Opening the same Pages URL on a PC and phone does not sync plans automatically.** Transfer them using backup export and import.
- Do not assume Safari's saved data will automatically appear in the home-screen web app. Before switching environments, export a backup from the old one and import it in the new one.
- The Pages website is public. Someone with its URL can open the app, but their plans are stored separately in their own browser.
- Export a backup before renaming a repository or changing its URL. A different domain has separate browser storage.

### Troubleshooting Pages and home-screen setup

| Problem | What to check |
| --- | --- |
| 404 or no website yet | Confirm that your fork uses `main /docs` and deployment has finished. |
| Only code or a README appears | Use the Pages **Visit site** URL rather than the `github.com/...` code URL. |
| Styles or icons are missing | Confirm that the complete `/docs` folder was copied, and use the Pages URL including its trailing `/`. |
| Settings or Pages is missing | Confirm that you are in your own fork and have the required permissions; check account and organization restrictions. |
| The home-screen option is missing | Use Safari on iPhone or Chrome on Android, and update your OS and browser. |
| Code edits do not appear on the website | Developers must run `npm run build:pages` to regenerate `docs/` and commit the results. |

Official guides: [Configure GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site), [Add a website to an iPhone home screen](https://support.apple.com/en-lamr/guide/iphone/iphea86e5236/ios), [Install a web app on Android](https://support.google.com/chrome/answer/9658361?hl=en&co=GENIE.Platform%3DAndroid).

## Storage and backups in PC-local and GitHub Pages modes

- Plans are stored in **your browser's localStorage**, not on a server. They are not sent to the developer.
- Data does not sync automatically across browsers, profiles, or computers.
- Use the backup download feature to save a JSON file, then import it in another environment to transfer your plans. Importing may change your current data, so make a backup first.
- Clearing site data, closing a private browsing session, or exceeding browser storage limits can remove data or prevent saves. Export backups regularly.
- The server listens only on your computer's `127.0.0.1` address. Sharing this local URL does not give other people access to your app.
- When online, the app supplements its public holiday data from public APIs. Task management still works offline, but holidays for years not covered by the bundled data may be unavailable.

## Troubleshooting

| Problem | What to do |
| --- | --- |
| `node` is not recognized | Install Node.js, then open a new terminal or restart your computer. |
| A file cannot be found | Extract the ZIP and run the command in the folder containing `package.json` and `scripts`. |
| The port is already in use | Close the previous ToDo server and try again, or use the alternate port command below. |
| Your previous plans are missing | Use the same browser, profile, URL, and port as before. |
| Changes do not appear | Check that the server is running and reload the page. |

```sh
node scripts/local-server.mjs --port 4174
```

Then open [http://127.0.0.1:4174](http://127.0.0.1:4174). Different ports have separate browser storage. To access your previous plans, return to the original port or import a backup.

## Development and testing

The app uses only built-in Node.js features. Run the tests with:

```sh
npm test
```

Browser code lives in `public/planner/`, and the local server is `scripts/local-server.mjs`. Personal planner data is not included in this repository.
