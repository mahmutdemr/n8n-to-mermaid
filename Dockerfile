FROM python:3.13-slim AS builder

WORKDIR /app
COPY pyproject.toml README.md ./
COPY src ./src
RUN pip install --no-cache-dir .

FROM python:3.13-slim

RUN useradd --create-home --uid 10001 appuser
COPY --from=builder /usr/local /usr/local
USER appuser
WORKDIR /work
ENTRYPOINT ["n8n-to-mermaid"]
