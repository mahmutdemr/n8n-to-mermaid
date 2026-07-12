"""Taşınabilir workflow grafını Mermaid metni olarak render eder."""

from __future__ import annotations

from .models import WorkflowGraph

VALID_DIRECTIONS = frozenset({"TB", "TD", "BT", "RL", "LR"})


def render_mermaid(
    graph: WorkflowGraph, *, direction: str = "LR", title: str | None = None
) -> str:
    """Bir :class:`WorkflowGraph`ı Mermaid ``flowchart`` sözdizimine çevirir."""
    if direction not in VALID_DIRECTIONS:
        allowed = ", ".join(sorted(VALID_DIRECTIONS))
        raise ValueError(f"Unsupported direction {direction!r}; use one of: {allowed}")

    lines = [f"flowchart {direction}"]
    diagram_title = title.strip() if isinstance(title, str) and title.strip() else graph.name
    if diagram_title:
        lines.append(f"    %% {diagram_title}")

    nodes_by_id = {node.id: node for node in graph.nodes}
    grouped_node_ids = {node_id for group in graph.groups for node_id in group.node_ids}
    for group in graph.groups:
        lines.append(f'    subgraph {group.id}["{_escape_label(group.label)}"]')
        for node_id in group.node_ids:
            node = nodes_by_id[node_id]
            lines.append(f'        {node.id}["{_escape_label(_node_label(node.name, node.type))}"]')
        lines.append("    end")
    for node in graph.nodes:
        if node.id not in grouped_node_ids:
            lines.append(f'    {node.id}["{_escape_label(_node_label(node.name, node.type))}"]')
    for edge in graph.edges:
        connector = f" -->|{edge.label}| " if edge.label else " --> "
        lines.append(f"    {edge.source_id}{connector}{edge.target_id}")

    trigger_ids = [node.id for node in graph.nodes if node.is_trigger]
    disabled_ids = [node.id for node in graph.nodes if node.disabled]
    if trigger_ids:
        lines.append(f"    class {','.join(trigger_ids)} trigger")
        lines.append("    classDef trigger fill:#dbeafe,stroke:#2563eb,color:#172554")
    if disabled_ids:
        lines.append(f"    class {','.join(disabled_ids)} disabled")
        lines.append(
            "    classDef disabled fill:#f3f4f6,stroke:#9ca3af,color:#6b7280,stroke-dasharray: 5 5"
        )
    return "\n".join(lines) + "\n"


def _node_label(name: str, node_type: str) -> str:
    short_type = node_type.rsplit(".", maxsplit=1)[-1]
    return f"{name}\\n{short_type}" if short_type else name


def _escape_label(value: str) -> str:
    return value.replace("&", "&amp;").replace('"', "&quot;")
