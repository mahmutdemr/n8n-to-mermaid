"""Geriye uyumlu yüksek seviye dönüşüm API'si."""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
from typing import Any

from .core import VALID_DIRECTIONS, render_mermaid, workflow_to_graph


@dataclass(frozen=True)
class ConversionOptions:
    """Üretilen Mermaid diyagramını etkileyen seçenekler."""

    direction: str = "TD"
    title: str | None = None
    include_disabled: bool = True


def convert_workflow(workflow: Mapping[str, Any], options: ConversionOptions | None = None) -> str:
    """Bir n8n workflow export'unu Mermaid ``flowchart`` metnine dönüştürür.

    n8n bağlantıları node adına göre sakladığından, Mermaid kimlikleri node
    sırasından türetilir; böylece boşluk, Türkçe karakter ve tekrar eden işaretler
    diyagram sözdizimini bozmaz.
    """
    options = options or ConversionOptions()
    if options.direction not in VALID_DIRECTIONS:
        allowed = ", ".join(sorted(VALID_DIRECTIONS))
        raise ValueError(f"Unsupported direction {options.direction!r}; use one of: {allowed}")

    graph = workflow_to_graph(workflow, include_disabled=options.include_disabled)
    return render_mermaid(graph, direction=options.direction, title=options.title)
