# TickerDesk

**AI-powered bilingual news ticker generation with editorial review and live broadcasting.**

TickerDesk is an editorial workspace that converts announcements and news updates into concise, broadcast-ready tickers in **English and Malayalam**. It combines AI-assisted generation with editor review, priority labels, and a continuously scrolling news ticker.

## Features

- **AI-powered ticker generation** using the OpenAI API.
- **English and Malayalam support** for bilingual news tickers.
- **Editorial review** so users can review and edit tickers before broadcasting.
- **Concise headlines** designed for broadcast, with a maximum of 10 words where applicable.
- **Priority labels** to help organize important news.
- **Continuous scrolling ticker** that moves headlines from right to left.
- **Rule-based fallback** when AI generation is unavailable.
- **JSON export** for saving generated ticker data.
- **Automated tests** for core application behavior.

## Tech Stack

- HTML, CSS, JavaScript
- Python and Flask
- OpenAI API
- Python `dotenv` for environment-variable management
- JavaScript and Python testing tools

## Prerequisites

- Python 3.10 or later
- An OpenAI API key
- Git (optional, for version control)

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/joel-garvaziz/tickerdesk.git
   cd tickerdesk
   ```

2. Create and activate a virtual environment:

   **Windows PowerShell**
   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```

3. Install the dependencies:

   ```powershell
   pip install -r requirements.txt
   ```

4. Create a `.env` file in the project root and add your API key:

   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   ```

   Replace the placeholder with your actual API key. Never commit your `.env` file or expose your API key in frontend JavaScript.

5. Start the application:

   ```powershell
   python server.py
   ```

6. Open the local URL displayed in the terminal in your browser.

## Usage

1. Enter or import a news announcement.
2. Choose the desired output language: English, Malayalam, or both, if available in your version.
3. Generate a concise ticker.
4. Review and edit the generated headline.
5. Assign a priority where needed.
6. Display approved headlines in the scrolling ticker.
7. Export the ticker data as JSON.

## Project Structure

```text
tickerdesk/
├── index.html
├── server.py
├── requirements.txt
├── .env                 # Local API key; do not commit
├── .gitignore
├── README.md
├── samples/
│   ├── announcements.json
│   └── announcements.txt
└── tests/
    ├── run-tests.js
    └── test_server.py
```

## Testing

Run the Python tests:

```powershell
python -m unittest discover -s tests
```

Run the JavaScript tests using Node.js:

```powershell
node tests/run-tests.js
```

## Security

- Keep API keys in environment variables or a local `.env` file.
- Ensure `.env` is listed in `.gitignore`.
- Never put secret keys in `index.html` or other frontend files.
- If an API key is accidentally pushed to GitHub, revoke it and generate a new one.

## License

No license has been specified yet.
