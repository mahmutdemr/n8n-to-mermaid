"""Yerel Docker dağıtımı için HTTP API ve statik web arayüzü."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from .converter import ConversionOptions, convert_workflow


class ConversionResponse(BaseModel):
    """Başarılı dönüşüm yanıtı."""

    mermaid: str


def create_app(web_directory: Path | None = None) -> FastAPI:
    """API rotalarını ve aynı origin'deki statik arayüzü oluşturur."""
    app = FastAPI(
        title="n8n to Mermaid API",
        version="0.1.0",
        docs_url="/api/docs",
        redoc_url=None,
        openapi_url="/api/openapi.json",
    )

    @app.get("/healthz", tags=["health"])
    def healthcheck() -> dict[str, str]:
        return {"status": "ok"}

    @app.post("/api/v1/convert", response_model=ConversionResponse, tags=["conversion"])
    def convert(
        workflow: dict[str, Any],
        direction: str = Query("LR", pattern="^(TB|TD|BT|RL|LR)$"),
        title: str | None = Query(None),
        include_disabled: bool = Query(True),
    ) -> ConversionResponse:
        """Bir n8n workflow export'unu Mermaid metnine dönüştürür."""
        try:
            mermaid = convert_workflow(
                workflow,
                ConversionOptions(
                    direction=direction,
                    title=title,
                    include_disabled=include_disabled,
                ),
            )
        except ValueError as error:
            raise HTTPException(status_code=422, detail=str(error)) from error
        return ConversionResponse(mermaid=mermaid)

    app.mount("/", StaticFiles(directory=web_directory or _web_directory(), html=True), name="web")
    return app


def _web_directory() -> Path:
    configured_directory = os.environ.get("N8N_TO_MERMAID_WEB_DIR")
    if configured_directory:
        return Path(configured_directory)
    container_directory = Path("/app/web")
    if container_directory.is_dir():
        return container_directory
    return Path(__file__).resolve().parents[2] / "apps" / "web"


app = create_app()
