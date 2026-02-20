# Smart Budget Tracker

This repository contains two small front-end apps for tracking personal finances and demonstrating basic AI-driven advice UI:

- `ClaudeAI/` — A budget tracker with charting and an AI advisory panel (ClaudeAI-themed).
- `Gemini AI/` — A polished expense tracker UI with local rule-based "AI" analysis and persistence.

Both apps are plain HTML/CSS/JavaScript and store data in `localStorage`.

## Quick start

Open either app in a simple static HTTP server or open the HTML file directly in modern browsers.

From the repository root, to serve on port 5500 (example):

```powershell
# from the repo root
cd "ClaudeAI"
python -m http.server 5500
# open http://localhost:5500 in your browser
```

Or for the Gemini app:

```powershell
cd "Gemini AI"
python -m http.server 5501
# open http://localhost:5501
```

Note: Serving via `http.server` avoids some browser restrictions on localStorage/canvas behavior.

## Features

- Add income/expense transactions with categories.
- Persistent storage using `localStorage`.
- Visual pie chart for expense categories (Chart.js or canvas fallback).
- Simple AI advisor panel (rule-based summary and suggestions).
- Delete individual transactions and reset all data.

## Project structure

- `ClaudeAI/` — Complete Claude-themed tracker (HTML, CSS, JS, docs).
- `Gemini AI/` — Gemini-themed tracker (HTML, CSS, JS) with more recent UI changes.

## Contributing

- Fork or branch, make changes, and open a pull request.
- Keep UX changes focused; tests are manual (open pages and verify localStorage behavior).

## License

MIT — see LICENSE in repo if you want to add one.

## Notes

- The AI features are simulated client-side using simple heuristics. Integrating a real LLM would require adding server-side API keys and careful UX/quotas handling.
- If localStorage errors occur (private browsing), data will not persist — consider exporting ledger if you need backups.

If you'd like, I can also add a `.gitignore`, a LICENSE file, or improve the README with badges and screenshots.
