"""Uygulama arayüzlerinin paylaştığı, taşınabilir grafik modeli."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Node:
    """Bir n8n node'unun render etmek için gerekli en küçük temsili."""

    id: str
    name: str
    type: str
    disabled: bool = False

    @property
    def is_trigger(self) -> bool:
        """n8n node type adına göre trigger node'unu belirler."""
        return self.type.endswith("Trigger")


@dataclass(frozen=True)
class Edge:
    """İki node arasındaki yönlü bağlantı."""

    source_id: str
    target_id: str
    kind: str = "main"
    output_index: int = 0

    @property
    def label(self) -> str:
        """Mermaid ve diğer görünümlerde kullanılacak kısa bağlantı etiketi."""
        if self.kind != "main":
            return self.kind
        return "" if self.output_index == 0 else f"output {self.output_index + 1}"


@dataclass(frozen=True)
class WorkflowGraph:
    """n8n'e ya da herhangi bir render hedefine bağlı olmayan workflow grafı."""

    name: str | None
    nodes: tuple[Node, ...]
    edges: tuple[Edge, ...]
