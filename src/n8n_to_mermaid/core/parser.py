"""n8n export JSON'unu uygulama içi grafik modeline dönüştürür."""

from __future__ import annotations

from collections.abc import Iterable, Mapping
from typing import Any

from .models import Edge, Group, Node, WorkflowGraph


def workflow_to_graph(
    workflow: Mapping[str, Any], *, include_disabled: bool = True
) -> WorkflowGraph:
    """Bir n8n workflow export'unu doğrulanmış bir :class:`WorkflowGraph`a çevirir."""
    raw_nodes = workflow.get("nodes")
    if not isinstance(raw_nodes, list):
        raise ValueError("Invalid n8n workflow: 'nodes' must be a list.")
    if not all(isinstance(node, Mapping) for node in raw_nodes):
        raise ValueError("Invalid n8n workflow: every node must be an object.")

    source_nodes = [
        node
        for node in raw_nodes
        if not _is_sticky_note(node) and (include_disabled or not node.get("disabled", False))
    ]
    parsed_nodes = tuple(
        Node(
            id=f"n{index + 1}",
            name=_node_name(node, index),
            type=str(node.get("type", "")),
            disabled=bool(node.get("disabled", False)),
            mode=_node_mode(node),
        )
        for index, node in enumerate(source_nodes)
    )
    identifiers = {node.name: node.id for node in parsed_nodes}
    if len(identifiers) != len(parsed_nodes):
        raise ValueError("Invalid n8n workflow: node names must be unique.")

    connections = workflow.get("connections", {})
    if not isinstance(connections, Mapping):
        raise ValueError("Invalid n8n workflow: 'connections' must be an object.")

    name = workflow.get("name")
    edges = tuple(_parse_edges(connections, identifiers))
    return WorkflowGraph(
        name=name.strip() if isinstance(name, str) and name.strip() else None,
        nodes=parsed_nodes,
        edges=edges,
        groups=tuple(_semantic_groups(parsed_nodes, edges)),
    )


def _node_name(node: Mapping[str, Any], index: int) -> str:
    name = node.get("name")
    return str(name) if name is not None else f"Unnamed node {index + 1}"


def _node_mode(node: Mapping[str, Any]) -> str | None:
    parameters = node.get("parameters")
    if not isinstance(parameters, Mapping):
        return None
    mode = parameters.get("mode")
    return mode if isinstance(mode, str) else None


def _is_sticky_note(node: Mapping[str, Any]) -> bool:
    """Sticky Note node'ları diyagramın işlem akışına ait değildir."""
    return str(node.get("type", "")).endswith(".stickyNote")


def _semantic_groups(nodes: tuple[Node, ...], edges: tuple[Edge, ...]) -> list[Group]:
    """Agent, RAG retrieval ve AI generation alt graph'larını tespit eder."""
    groups = _groups_for_roots(
        nodes,
        edges,
        roots=(node for node in nodes if node.is_agent),
        id_prefix="agent_group",
        label_prefix="Agent",
        claimed_ids=set(),
    )
    claimed_ids = {node_id for group in groups for node_id in group.node_ids}
    groups.extend(
        _groups_for_roots(
            nodes,
            edges,
            roots=(node for node in nodes if node.is_rag_retriever),
            id_prefix="rag_group",
            label_prefix="RAG retrieval",
            claimed_ids=claimed_ids,
        )
    )
    claimed_ids = {node_id for group in groups for node_id in group.node_ids}
    groups.extend(
        _groups_for_roots(
            nodes,
            edges,
            roots=(node for node in nodes if node.is_ai_generator),
            id_prefix="generation_group",
            label_prefix="AI generation",
            claimed_ids=claimed_ids,
        )
    )
    return groups


def _groups_for_roots(
    nodes: tuple[Node, ...],
    edges: tuple[Edge, ...],
    roots: Iterable[Node],
    id_prefix: str,
    label_prefix: str,
    claimed_ids: set[str],
) -> list[Group]:
    """Kök node'ları kendilerine özgü doğrudan AI yardımcılarıyla grupla."""
    root_nodes = tuple(roots)
    root_ids = {node.id for node in root_nodes}
    if not root_ids:
        return []

    candidates: dict[str, set[str]] = {root_id: set() for root_id in root_ids}
    for edge in edges:
        if not edge.kind.startswith("ai_"):
            continue
        if edge.target_id in root_ids:
            candidates[edge.target_id].add(edge.source_id)
        if edge.source_id in root_ids:
            candidates[edge.source_id].add(edge.target_id)

    owners: dict[str, set[str]] = {}
    for root_id, helper_ids in candidates.items():
        for helper_id in helper_ids:
            owners.setdefault(helper_id, set()).add(root_id)

    groups: list[Group] = []
    for group_index, root in enumerate(root_nodes, start=1):
        helper_ids = {
            helper_id
            for helper_id in candidates[root.id]
            if owners.get(helper_id) == {root.id} and helper_id not in claimed_ids
        }
        if not helper_ids:
            continue
        member_ids = {root.id, *helper_ids}
        groups.append(
            Group(
                id=f"{id_prefix}_{group_index}",
                label=f"{label_prefix}: {root.name}",
                node_ids=tuple(node.id for node in nodes if node.id in member_ids),
            )
        )
    return groups


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
