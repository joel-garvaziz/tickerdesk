import json
import unittest
from types import SimpleNamespace
from unittest.mock import patch

import server


SOURCE = "Kochi transit line opens in 2028."
MALAYALAM = "കൊച്ചിയിൽ 2028ൽ പുതിയ പാത തുറക്കും"


class FakeClient:
    def __init__(self, response):
        self.response = response
        self.calls = []
        self.chat = SimpleNamespace(
            completions=SimpleNamespace(create=self.create)
        )

    def create(self, **kwargs):
        self.calls.append(kwargs)
        return SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content=json.dumps(self.response)))]
        )


class GenerateEndpointTests(unittest.TestCase):
    def setUp(self):
        self.client = server.app.test_client()
        self.previous_client = server.client

    def tearDown(self):
        server.client = self.previous_client

    def test_homepage_exposes_language_selection_without_ai_banner(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertIn(b'id="language"', response.data)
        self.assertIn("മലയാളം".encode(), response.data)
        self.assertNotIn(b"AI mode: OpenAI drafts a ticker", response.data)
        response.close()

    def post_with_response(self, language, response, text=SOURCE):
        fake = FakeClient(response)
        server.client = fake
        result = self.client.post(
            "/api/generate", json={"text": text, "language": language}
        )
        return result, fake

    def test_english_generation(self):
        result, fake = self.post_with_response(
            "en",
            {
                "ticker": "Kochi transit line opens in 2028",
                "evidence": ["Kochi transit line opens in 2028"],
                "needs_review": False,
                "review_flags": [],
            },
        )
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json["ticker"], "Kochi transit line opens in 2028")
        self.assertIn("English", fake.calls[0]["messages"][0]["content"])

    def test_malayalam_generation_and_exact_unicode_evidence(self):
        result, fake = self.post_with_response(
            "ml",
            {
                "ticker": MALAYALAM,
                "evidence": [MALAYALAM],
                "needs_review": False,
                "review_flags": [],
            },
            text=MALAYALAM,
        )
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json["ticker"], MALAYALAM)
        self.assertEqual(len(server.words(MALAYALAM)), 5)
        self.assertIn("Malayalam", fake.calls[0]["messages"][0]["content"])

    def test_bilingual_generation_has_distinct_fields(self):
        result, fake = self.post_with_response(
            "both",
            {
                "english_ticker": "Kochi transit line opens in 2028",
                "malayalam_ticker": MALAYALAM,
                "evidence": ["Kochi transit line opens in 2028"],
                "needs_review": False,
                "review_flags": [],
            },
        )
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json["english_ticker"], "Kochi transit line opens in 2028")
        self.assertEqual(result.json["malayalam_ticker"], MALAYALAM)
        self.assertIn("English and one natural, grammatically correct Malayalam", fake.calls[0]["messages"][0]["content"])

    def test_unicode_word_count_and_punctuation(self):
        self.assertEqual(len(server.words("കേരളത്തിൽ 2027 ജൂൺ 3ന് പാലം തുറന്നു.")), 6)
        self.assertEqual(len(server.words("കേരളം । 2027")), 2)
        malayalam_digits = "".join(chr(0x0D66 + int(digit)) for digit in "2028")
        self.assertIn("2028", server.nums(malayalam_digits))
        response = {
            "ticker": "കൊച്ചിയിൽ 2028ൽ പുതിയ പാത തുറക്കും",
            "evidence": [MALAYALAM],
            "needs_review": False,
            "review_flags": [],
        }
        self.assertEqual(server.check(MALAYALAM, response, "ml"), [])
        response["evidence"] = [""]
        self.assertIn("evidence quotes must not be empty", server.check(MALAYALAM, response, "ml"))

    def test_names_dates_and_figures_are_requested_and_returned_unchanged(self):
        source = "Elena Marsh announced $3.2 million for Kochi on Nov 2, 2027."
        ticker = "Elena Marsh announces $3.2 million for Kochi Nov 2, 2027"
        result, fake = self.post_with_response(
            "en",
            {
                "ticker": ticker,
                "evidence": [source],
                "needs_review": False,
                "review_flags": [],
            },
            text=source,
        )
        self.assertEqual(result.json["ticker"], ticker)
        self.assertIn("names, dates, places, figures", fake.calls[0]["messages"][0]["content"])

    def test_over_limit_malayalam_retries_then_fails(self):
        too_long = " ".join(["കേരളം"] * 11)
        result, fake = self.post_with_response(
            "ml",
            {
                "ticker": too_long,
                "evidence": [MALAYALAM],
                "needs_review": False,
                "review_flags": [],
            },
            text=too_long,
        )
        self.assertEqual(result.json["mode"], "failed")
        self.assertEqual(len(fake.calls), 2)

    def test_unsupported_numbers_retry_and_source_number_omissions_flag_review(self):
        bad = {
            "ticker": "Kochi transit line opens in 2040",
            "evidence": ["Kochi transit line opens in 2028"],
            "needs_review": False,
            "review_flags": [],
        }
        result, fake = self.post_with_response("en", bad)
        self.assertEqual(result.json["mode"], "failed")
        self.assertEqual(len(fake.calls), 2)

        flagged = {
            "ticker": "Kochi transit line opens",
            "evidence": ["Kochi transit line opens in 2028"],
            "needs_review": False,
            "review_flags": [],
        }
        result, _ = self.post_with_response("en", flagged)
        self.assertEqual(result.json["mode"], "llm")
        self.assertTrue(any("omits source figure" in flag for flag in result.json["flags"]))

    def test_currency_and_percentage_markers_are_part_of_numeric_facts(self):
        response = {
            "ticker": "Project receives 3.2 million and reports 20 increase",
            "evidence": ["Project receives $3.2 million and reports a 20% increase."],
            "needs_review": False,
            "review_flags": [],
        }
        errors = server.check(
            "Project receives $3.2 million and reports a 20% increase.",
            response,
            "en",
        )
        self.assertTrue(any("number not in the source" in error for error in errors))

    def test_invalid_language_and_unconfigured_api_report_failure(self):
        result = self.client.post("/api/generate", json={"text": SOURCE, "language": []})
        self.assertEqual(result.status_code, 400)
        server.client = None
        result = self.client.post("/api/generate", json={"text": SOURCE, "language": "ml"})
        self.assertEqual(result.json["mode"], "failed")

    def test_api_parse_failure_retries_without_fabricating_output(self):
        fake = FakeClient("{not json")
        server.client = fake
        result = self.client.post(
            "/api/generate", json={"text": SOURCE, "language": "ml"}
        )
        self.assertEqual(result.json["mode"], "failed")
        self.assertEqual(len(fake.calls), 2)


if __name__ == "__main__":
    unittest.main()
