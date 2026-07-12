# Contributing

Thanks for helping improve n8n-to-mermaid.

## Local setup

Use Python 3.11+ and uv:

```bash
uv sync --all-groups
uv run ruff check .
uv run python -m unittest discover -s tests -v
```

## Design rules

- Keep parsing, graph modelling, and rendering inside `src/n8n_to_mermaid/core`.
- Keep CLI, HTTP, and browser concerns in their own adapters; they must not
  duplicate conversion rules.
- Add tests for every supported n8n connection shape or renderer behavior.
- Do not add secrets, exports containing sensitive credentials, editor settings,
  or private working notes to commits.

Keep public project documentation concise. Put temporary local experiments and
agent handoffs in `.workspace/`; it is intentionally excluded from Git.
