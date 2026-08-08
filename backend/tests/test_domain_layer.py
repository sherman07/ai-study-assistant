import unittest

from backend.domain.learning_companion import ALLOWED_TURN_MODES, clean_text
from backend.domain import url_security
from backend.core import learning_companion as core_learning_companion
from backend.core import url_security as core_url_security


class DomainLayerTests(unittest.TestCase):
    def test_domain_learning_companion_is_canonical(self):
        self.assertEqual(clean_text("  hello  "), "hello")
        self.assertIn("teach", ALLOWED_TURN_MODES)
        self.assertIs(core_learning_companion.clean_text, clean_text)

    def test_domain_url_security_blocks_localhost(self):
        with self.assertRaises(ValueError):
            url_security.normalize_public_http_url("http://localhost/secret")
        self.assertEqual(
            url_security.normalize_public_http_url("https://example.com/notes"),
            "https://example.com/notes",
        )
        self.assertIs(
            core_url_security.normalize_public_http_url,
            url_security.normalize_public_http_url,
        )


if __name__ == "__main__":
    unittest.main()
