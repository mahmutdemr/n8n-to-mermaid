"""n8n export JSON'unu uygulama içi grafik modeline dönüştürür."""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from .models import Edge, Node, WorkflowGraph


def workflow_to_graph(
    workflow: Mapping[str, Any], *, include_disabled: bool = True
) -> WorkflowGraph:
    """Bir n8n workflow export'unu doğrulanmış bir :class:`WorkflowGraph`a çevirir."""
    raw_nodes = workflow.get("nodes")
    if not isinstance(raw_nodes, list):
        raise ValueError("Invalid n8n workflow: 'nodes' must be a list.")
    if not all(isinstance(node, Mapping) for node in raw_nodes):
        raise ValueError("Invalid n8n workflow: every node must be an object.")

    parsed_nodes = tuple(
        Node(
            id=f"n{index + 1}",
            name=_node_name(node, index),
            type=str(node.get("type", "")),
            disabled=bool(node.get("disabled", False)),
        )
        for index, node in enumerate(raw_nodes)
        if include_disabled or not node.get("disabled", False)
    )
    identifiers = {node.name: node.id for node in parsed_nodes}
    if len(identifiers) != len(parsed_nodes):
        raise ValueError("Invalid n8n workflow: node names must be unique.")

    connections = workflow.get("connections", {})
    if not isinstance(connections, Mapping):
        raise ValueError("Invalid n8n workflow: 'connections' must be an object.")

    name = workflow.get("name")
    return WorkflowGraph(
        name=name.strip() if isinstance(name, str) and name.strip() else None,
        nodes=parsed_nodes,
        edges=tuple(_parse_edges(connections, identifiers)),
    )


def _node_name(node: Mapping[str, Any], index: int) -> str:
    name = node.get("name")
    return str(name) if name is not None else f"Unnamed node {index + 1}"


def _parse_edges(
    connections: Mapping[str, Any], identifiers: Mapping[str, str]
) -> list[Edge]:
    edges: list[Edge] = []
    emitted: set[tuple[str, str, str, int]] = set()
    for source_name, connection_types in connections.items():
        source_id = identifiers.get(str(source_name))
        if source_id is None or not isinstance(connection_types, Mapping):
            continue
        for connection_type, outputs in connection_types.items():
            if not isinstance(outputs, list):
                continue
            for output_index, targets in enumerate(outputs):
                if not isinstance(targets, list):
                    continue
                for target in targets:
                    if not isinstance(target, Mapping):
                        continue
                    target_id = identifiers.get(str(target.get("node", "")))
                    if target_id is None:
                        continue
                    edge = Edge(
                        source_id=source_id,
                        target_id=target_id,
                        kind=str(connection_type),
                        output_index=output_index,
                    )
                    key = (edge.source_id, edge.target_id, edge.kind, edge.output_index)
                    if key not in emitted:
                        emitted.add(key)
                        edges.append(edge)
    return edges
