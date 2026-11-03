# ToDo1

[한국어](../README.md) | [日本語](README.ja.md) | **English**

A **personal planner that runs on your own computer**, with tasks, weekly schedules, a calendar, and projects. Download the code and run it locally; your plans stay in the browser you use.

It does not connect to the developer's live site. No sign-in, cloud account, database, or secret keys are required. There are no third-party packages to install and no build step.

## Features

- Add, edit, and complete tasks; organize them by priority and project
- Weekly schedule and monthly calendar
- Recurring events and task search
- JSON backup and restore
- Korean and Japanese public holidays

## Getting started

### 1. Install Node.js

Install [Node.js](https://nodejs.org/) **22.13.0 or later**. Open a new terminal and confirm that this command prints a version:

```sh
node --version
```

### 2. Download the code

Select **Code → Download ZIP** at the top of the repository and extract the archive. Do not run the app from inside the ZIP file.

If you use Git, you can download it with:

```sh
git clone https://github.com/Delphox-1/ToDo1.git
cd ToDo1
```

### 3. Start the app

**Windows:** Double-click `Start-ToDo.cmd` in the extracted folder. Keep the command window open while using the app.

**Windows, macOS, and Linux:** Open a terminal in the folder containing `package.json` and run:

```sh
node scripts/local-server.mjs
```

You can also use `npm start` if you prefer the npm command included with Node.js. **You do not need to run `npm install`, `npm ci`, or a build.**

### 4. Open the planner

Visit **http://127.0.0.1:4173** in your browser and add a task. No sign-in or registration is needed.

Close the terminal or press **Ctrl+C** to stop the server. Start it again and use the **same browser and URL** to see your saved plans. Open the local URL above rather than double-clicking the HTML file.

## Storage and backups

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
| The port is already in use | Close the previous ToDo1 server and try again, or use the alternate port command below. |
| Your previous plans are missing | Use the same browser, profile, URL, and port as before. |
| Changes do not appear | Check that the server is running and reload the page. |

```sh
node scripts/local-server.mjs --port 4174
```

Then open **http://127.0.0.1:4174**. Different ports have separate browser storage. To access your previous plans, return to the original port or import a backup.

## Development and testing

The app uses only built-in Node.js features. Run the tests with:

```sh
npm test
```

Browser code lives in `public/planner/`, and the local server is `scripts/local-server.mjs`. Personal planner data is not included in this repository.
