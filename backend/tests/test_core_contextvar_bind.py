"""Guard: core.* and backend.core.* must share request-scoped ContextVars."""

import importlib
import sys
import unittest


class CoreContextVarBindTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Importing the app installs the sys.modules aliases under test.
        importlib.import_module("backend.app")

    def test_core_config_modules_are_identical(self):
        import backend.core.config as backend_config
        import core.config as short_config

        self.assertIs(short_config, backend_config)
        self.assertIs(
            short_config.REQUEST_AI_TEXT_PROVIDER,
            backend_config.REQUEST_AI_TEXT_PROVIDER,
        )

    def test_provider_contextvar_is_shared_across_import_paths(self):
        import backend.core.config as backend_config
        import core.config as short_config

        token = short_config.REQUEST_AI_TEXT_PROVIDER.set("openai")
        try:
            self.assertEqual(backend_config.REQUEST_AI_TEXT_PROVIDER.get(), "openai")
            self.assertEqual(short_config.active_text_provider(), "openai")
        finally:
            short_config.REQUEST_AI_TEXT_PROVIDER.reset(token)


if __name__ == "__main__":
    unittest.main()
