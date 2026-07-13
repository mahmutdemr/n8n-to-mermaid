FROM python:3.13-slim AS builder

WORKDIR /app
COPY pyproject.toml README.md ./
COPY src ./src
RUN pip install --no-cache-dir .

FROM python:3.13-slim

RUN useradd --create-home --uid 10001 appuser
COPY --from=builder /usr/local /usr/local
COPY apps/web /app/web
USER appuser
WORKDIR /work
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD ["python", "-c", "from urllib.request import urlopen; urlopen('http://127.0.0.1:8080/healthz')"]
CMD ["uvicorn", "n8n_to_mermaid.server:app", "--host", "0.0.0.0", "--port", "8080", "--proxy-headers"]
