# TickerDesk — Editorial Workspace

Turns press releases into English, Malayalam, or paired bilingual broadcast tickers of at most 10 whitespace-separated words, with editor review, a continuous right-to-left broadcast bar, and JSON export. The frontend is plain HTML/CSS/JavaScript; the optional Flask backend uses the OpenAI API for language-aware drafting and validation.

## Run
Start the Flask app with `python server.py` and open **http://127.0.0.1:5000**. Set `OPENAI_API_KEY` on the server to enable AI drafting. The interface remains usable without the API, but translations that cannot be safely extracted from the source must be written by an editor.
Tests: `node tests/run-tests.js` and `.venv\Scripts\python.exe -m unittest discover -s tests`.

## Use
1. Select English, മലയാളം (Malayalam), or Both (English + Malayalam), then paste one announcement, paste several separated by a blank line, or import UTF-8 TXT/JSON.
2. Both creates two independently editable, reviewable, approvable ticker records associated with the same source ID. Preview, reject, priority, reorder, and delete work per ticker version.
3. Approved tickers scroll continuously right-to-left with their priority label: BREAKING NEWS, JUST IN, or LATEST. Pause/Resume and hover pause are available. Reduced-motion preferences show a static, wrapped ticker.
4. "Export Approved" downloads only approved, valid ticker records as UTF-8 JSON.

## Faithfulness and limits
- AI-generated tickers are server-validated for the 10-word limit, unsupported numbers, and exact source evidence; flagged or translated text still requires editor review.
- English fallback is extractive. Malayalam fallback only reuses Malayalam wording already in the source; it never invents a translation. When a safe fallback is unavailable, the empty language version is flagged for manual editing and cannot be approved.
- Heuristic warnings are not proof: editors should verify names, dates, figures, claims, allegations, and translation faithfulness against the original.
- The word limit counts whitespace-separated tokens containing at least one Unicode letter or digit. Over-limit text cannot be approved or exported.

## Export schema
`{application, version, tickers:[{id, source_id, source_text, ticker_text, word_count, status, priority, position, language}]}`

The `language` field is `en` or `ml`. All previous fields and their meanings are preserved; English-only integrations can treat a missing `language` field in older exports as `en`. Bilingual pairs share a `source_id` and are separate records so their review statuses remain independent.

## Known limitations
No persistence across reloads, move buttons instead of drag-and-drop, and semantic translation accuracy cannot be proven automatically. Malayalam rendering depends on a Malayalam-capable system font; the CSS prefers Noto Sans Malayalam when installed.


## Run with the OpenAI API ticker backend

The project now includes an optional Flask backend. The browser calls `POST /api/generate`;
OpenAI generates a ticker and the server validates its length, numbers, and exact evidence
quotes. If the AI call fails, the UI uses the source-based fallback where possible and flags manual translation when a safe Malayalam version is unavailable.

### 1. Install Python dependencies

```bash
python -m venv .venv
```

Windows PowerShell:
```powershell
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Windows Command Prompt:
```bat
.venv\Scripts\activate.bat
pip install -r requirements.txt
```

macOS/Linux:
```bash
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Set your OpenAI API key

Windows PowerShell (current terminal only):
```powershell
$env:OPENAI_API_KEY="your-real-openai-api-key"
```

Windows Command Prompt:
```bat
set OPENAI_API_KEY=your-real-openai-api-key
```

macOS/Linux:
```bash
export OPENAI_API_KEY="your-real-openai-api-key"
```

Optional: set `OPENAI_MODEL` to a model available to your OpenAI account. The default in `server.py` is `gpt-4.1-mini`.

**Do not put the API key in `index.html`, JavaScript, or a committed `.env` file.**
The key must remain on the server. Do not share it or commit it to Git.

### 3. Start the app

```bash
python server.py
```

Open **http://127.0.0.1:5000** in your browser. Do not open `index.html` directly
as a `file://` URL, because API requests need to go through Flask.

### Notes

- AI-generated tickers still require editorial review.
- The validator is a basic safeguard, not a guarantee of factual accuracy.
- The API key must have access to the selected OpenAI model.
