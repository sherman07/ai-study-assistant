from pathlib import Path
import re
import unittest


class SeleniumAutomationContractTests(unittest.TestCase):
    def test_selenium_is_a_declared_test_dependency(self):
        requirements = (Path(__file__).resolve().parents[1] / "requirements.txt").read_text(encoding="utf-8")
        self.assertRegex(
            requirements,
            re.compile(r"^selenium(?:[<>=!~].*)?$", re.MULTILINE),
            "Selenium must be declared so browser automation is reproducible in CI.",
        )
