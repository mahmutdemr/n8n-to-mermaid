import json
import unittest
from pathlib import Path

from n8n_to_mermaid import convert_workflow

PROJECT_ROOT = Path(__file__).resolve().parents[1]
EXAMPLES_DIRECTORY = PROJECT_ROOT / "examples"


class ExampleFixtureTests(unittest.TestCase):
    def test_simple_workflow_output_is_current(self) -> None:
        workflow = json.loads(
            (EXAMPLES_DIRECTORY / "input" / "simple-workflow.json").read_text(encoding="utf-8")
        )
        expected = (EXAMPLES_DIRECTORY / "output" / "simple-workflow.mmd").read_text(
            encoding="utf-8"
        )

        self.assertEqual(convert_workflow(workflow), expected)
