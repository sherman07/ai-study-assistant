"""Plan → AI provider access domain tests."""

from __future__ import annotations

import unittest

from backend.application.provider_selection import entitlements_is_pro, resolve_request_provider
from backend.domain.provider_access import (
    FREE_DEFAULT_PROVIDER,
    resolve_provider_for_plan,
)


class ProviderAccessDomainTests(unittest.TestCase):
    def test_free_plan_clamps_gpt_and_gemini_to_deepseek(self):
        for requested in ("openai", "gemini", "", "gpt"):
            resolution = resolve_provider_for_plan(requested, is_pro=False, backend_default="openai")
            self.assertEqual(resolution["provider"], FREE_DEFAULT_PROVIDER)
            self.assertTrue(resolution["clamped"] or requested in {"deepseek"})
            self.assertEqual(resolution["allowed"], ["deepseek"])

    def test_free_plan_allows_deepseek(self):
        resolution = resolve_provider_for_plan("deepseek", is_pro=False)
        self.assertEqual(resolution["provider"], "deepseek")
        self.assertFalse(resolution["clamped"])

    def test_pro_plan_allows_all_providers(self):
        for requested, expected in (("", "openai"), ("openai", "openai"), ("gemini", "gemini"), ("deepseek", "deepseek")):
            resolution = resolve_provider_for_plan(requested, is_pro=True, backend_default="openai")
            self.assertEqual(resolution["provider"], expected)
            self.assertFalse(resolution["clamped"])


class ProviderSelectionApplicationTests(unittest.TestCase):
    def test_entitlements_payload_detects_pro(self):
        self.assertTrue(entitlements_is_pro({"entitlements": {"isPro": True}}))
        self.assertFalse(entitlements_is_pro({"entitlements": {"isPro": False}}))
        self.assertTrue(
            entitlements_is_pro({"user": {"plan": "pro_monthly", "subscriptionStatus": "active"}})
        )
        self.assertFalse(
            entitlements_is_pro({"user": {"plan": "free", "subscriptionStatus": "inactive"}})
        )

    def test_resolve_request_provider_clamps_without_strict(self):
        resolution = resolve_request_provider("openai", is_pro=False, backend_default="openai")
        self.assertEqual(resolution["provider"], "deepseek")
        self.assertTrue(resolution["clamped"])


if __name__ == "__main__":
    unittest.main()
