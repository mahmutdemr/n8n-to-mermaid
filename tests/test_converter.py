import unittest

from n8n_to_mermaid import ConversionOptions, convert_workflow, workflow_to_graph

WORKFLOW = {
    "name": "Sipariş bildirimi",
    "nodes": [
        {"name": "Webhook", "type": "n8n-nodes-base.webhook"},
        {"name": "Siparişi işle", "type": "n8n-nodes-base.code"},
        {"name": "Slack bildirimi", "type": "n8n-nodes-base.slack", "disabled": True},
    ],
    "connections": {
        "Webhook": {"main": [[{"node": "Siparişi işle", "type": "main", "index": 0}]]},
        "Siparişi işle": {
            "main": [
                [{"node": "Slack bildirimi", "type": "main", "index": 0}],
                [{"node": "Webhook", "type": "main", "index": 0}],
            ]
        },
    },
}


class ConvertWorkflowTests(unittest.TestCase):
    def test_converts_nodes_connections_and_disabled_style(self) -> None:
        result = convert_workflow(WORKFLOW)

        self.assertIn("flowchart LR", result)
        self.assertIn('n1["Webhook\\nwebhook"]', result)
        self.assertIn("n1 --> n2", result)
        self.assertIn("n2 --> n3", result)
        self.assertIn("n2 -->|output 2| n1", result)
        self.assertIn("class n3 disabled", result)

    def test_can_exclude_disabled_nodes(self) -> None:
        result = convert_workflow(
            WORKFLOW, ConversionOptions(include_disabled=False, direction="LR")
        )

        self.assertIn("flowchart LR", result)
        self.assertNotIn("Slack bildirimi", result)
        self.assertNotIn("n2 --> n3", result)

    def test_rejects_invalid_workflow(self) -> None:
        with self.assertRaisesRegex(ValueError, "'nodes' must be a list"):
            convert_workflow({"connections": {}})

    def test_core_graph_is_independent_from_mermaid_output(self) -> None:
        graph = workflow_to_graph(WORKFLOW, include_disabled=False)

        self.assertEqual(graph.name, "Sipariş bildirimi")
        self.assertEqual([node.id for node in graph.nodes], ["n1", "n2"])
        self.assertEqual(len(graph.edges), 2)
        self.assertEqual(graph.edges[0].source_id, "n1")
        self.assertEqual(graph.edges[0].target_id, "n2")
        self.assertEqual(graph.edges[1].source_id, "n2")
        self.assertEqual(graph.edges[1].target_id, "n1")

    def test_omits_sticky_notes_and_their_connections(self) -> None:
        workflow = {
            "nodes": [
                {"name": "Başlangıç", "type": "n8n-nodes-base.manualTrigger"},
                {"name": "Not", "type": "n8n-nodes-base.stickyNote"},
                {"name": "Bitiş", "type": "n8n-nodes-base.set"},
            ],
            "connections": {
                "Başlangıç": {"main": [[{"node": "Bitiş"}]]},
                "Not": {"main": [[{"node": "Bitiş"}]]},
            },
        }

        result = convert_workflow(workflow)

        self.assertNotIn("Not", result)
        self.assertIn("n1 --> n2", result)
