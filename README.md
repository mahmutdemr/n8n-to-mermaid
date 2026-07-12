# n8n-to-mermaid

Convert n8n workflow exports into readable Mermaid flowcharts.

`n8n-to-mermaid` is intentionally built around a small, interface-independent
Python core. The same graph model can serve a terminal command today and a
static browser experience later, without putting UI concerns in the conversion
logic.

> **Project status:** early development. The CLI is usable; the static browser
> UI is planned work.

## What it does

- Reads an n8n workflow export (`nodes` and `connections`).
- Builds a portable, typed workflow graph.
- Renders that graph as a Mermaid `flowchart`.
- Preserves non-main connections and labels secondary outputs.
- Styles trigger and disabled nodes.

## Quick start

Requires Python 3.11+ and [uv](https://docs.astral.sh/uv/).

```bash
uv sync --all-groups
uv run n8n-to-mermaid examples/input/simple-workflow.json
```

Write to a file and choose a direction:

```bash
uv run n8n-to-mermaid workflow.json --output workflow.mmd --direction LR
```

Paste the resulting Mermaid text into a Mermaid-compatible Markdown renderer,
such as GitHub or the Mermaid Live Editor.

## Docker

Build the image, then mount a directory containing your n8n export:

```bash
docker build -t n8n-to-mermaid .
docker run --rm -v "$PWD:/work:ro" n8n-to-mermaid /work/workflow.json
```

To save the result, redirect stdout on the host:

```bash
docker run --rm -v "$PWD:/work:ro" n8n-to-mermaid /work/workflow.json > workflow.mmd
```

## Project layout

```text
src/n8n_to_mermaid/core/  Domain graph, n8n parser, Mermaid renderer
src/n8n_to_mermaid/       CLI adapter and public Python API
examples/input/           Safe n8n workflow fixtures
examples/output/          Expected Mermaid output for those fixtures
.workspace/               Private developer/agent notes (ignored except its guide)
```

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a change.

## Development

```bash
uv sync --all-groups
uv run ruff check .
uv run python -m unittest discover -s tests -v
```

## Roadmap

- Compact and annotated Mermaid output modes, backed by golden fixtures.
- Static web interface deployable to GitHub Pages.
- Richer n8n node classifications, error paths, sub-workflows, and themes.
- Direct n8n API import, with explicit user credentials and security guidance.

## License

MIT. See [LICENSE](LICENSE).
