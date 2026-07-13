from __future__ import annotations

import unittest
from pathlib import Path

from fastapi.testclient import TestClient

from n8n_to_mermaid.server import create_app

WORKFLOW = {
    "name": "API testi",
    "nodes": [
        {"name": "Başlangıç", "type": "n8n-nodes-base.manualTrigger"},
        {"name": "Bitiş", "type": "n8n-nodes-base.set"},
    ],
    "connections": {"Başlangıç": {"main": [[{"node": "Bitiş"}]]}},
}


class ServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        web_directory = Path(__file__).resolve().parents[1] / "apps" / "web"
        cls.client = TestClient(create_app(web_directory))

    def test_healthcheck(self) -> None:
        response = self.client.get("/healthz")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_converts_workflow_through_api(self) -> None:
        response = self.client.post("/api/v1/convert?direction=TB", json=WORKFLOW)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json()["mermaid"],
            (
                "flowchart TB\n"
                "    %% API testi\n"
                "    %% type: manualTrigger\n"
                '    n1["Başlangıç"]\n'
                "    %% type: set\n"
                '    n2["Bitiş"]\n'
                "    n1 --> n2\n"
                "    class n1 trigger\n"
                "    classDef trigger fill:#dbeafe,stroke:#2563eb,color:#172554\n"
            ),
        )

    def test_rejects_invalid_workflow(self) -> None:
        response = self.client.post("/api/v1/convert", json={"connections": {}})

        self.assertEqual(response.status_code, 422)
        self.assertIn("'nodes' must be a list", response.json()["detail"])

    def test_serves_web_interface(self) -> None:
        response = self.client.get("/")

        self.assertEqual(response.status_code, 200)
        self.assertIn("n8n to Mermaid", response.text)
