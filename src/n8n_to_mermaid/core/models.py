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
    mode: str | None = None

    @property
    def is_trigger(self) -> bool:
        """n8n node type adına göre trigger node'unu belirler."""
        return self.type.endswith("Trigger")

    @property
    def is_agent(self) -> bool:
        """n8n AI Agent node'unu type adına göre belirler."""
        return self.type == "@n8n/n8n-nodes-langchain.agent"

    @property
    def is_rag_retriever(self) -> bool:
        """RAG sorgularında veri yükleyen Vector Store node'unu belirler."""
        return self.mode == "load" and "vectorStore" in self.type

    @property
    def is_ai_generator(self) -> bool:
        """Yanıt üretimini yapan yerleşik AI chain node'unu belirler."""
        return self.type.endswith(".informationExtractor")


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
class Group:
    """Renderer'ın bir Mermaid ``subgraph`` olarak sunacağı node grubu."""

    id: str
    label: str
    node_ids: tuple[str, ...]


@dataclass(frozen=True)
class WorkflowGraph:
    """n8n'e ya da herhangi bir render hedefine bağlı olmayan workflow grafı."""

    name: str | None
    nodes: tuple[Node, ...]
    edges: tuple[Edge, ...]
    groups: tuple[Group, ...] = ()
