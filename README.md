# n8n-to-mermaid

Convert n8n workflow exports into readable Mermaid flowcharts.

`n8n-to-mermaid` is intentionally built around a small, interface-independent
Python core. The same graph model supports both a terminal command and a static
browser experience, without putting UI concerns in the conversion logic.

> **Project status:** early development. The CLI and static browser UI are usable.

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

## Web interface

The static browser interface accepts pasted JSON and `.json` files, renders the
result locally, and downloads a `.mmd` file. No workflow data is uploaded.

Run it locally:

```bash
python3 -m http.server 8000 --directory apps/web
```

Then open <http://localhost:8000>. The GitHub Pages workflow deploys this same
directory after it is enabled in repository settings. This quick local server only
serves the browser UI; use Docker when you also need the HTTP API.

## Docker

### Run a published image

Download and start the application without cloning this repository:

```bash
docker run -d --name n8n-to-mermaid --restart unless-stopped \
  -p 127.0.0.1:8080:8080 \
  ghcr.io/mahmutdemr/n8n-to-mermaid:latest
```

Open <http://localhost:8080>. The same container provides the browser UI and a
local HTTP API. Stop or start the application at any time with:

```bash
docker stop n8n-to-mermaid
docker start n8n-to-mermaid
```

Use a versioned tag such as `:v1.0.0` when you need a repeatable deployment.
The `127.0.0.1` binding makes the application available only on the local
computer. To expose it to a trusted local network, explicitly use
`-p 0.0.0.0:8080:8080` instead.

### Build from source

With [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed,
start the browser application from the repository root:

```bash
docker compose up -d --build
```

Open <http://localhost:8080>. Browser conversions are still processed entirely
in the browser. The container also exposes an optional API at
<http://localhost:8080/api/v1/convert>.

After the first build, manage the application with:

```bash
docker compose stop
docker compose start
```

To remove the stopped container, run `docker compose down`. To use a different
host port, set `N8N_TO_MERMAID_PORT` before starting, for example:

```bash
N8N_TO_MERMAID_PORT=8787 docker compose up -d --build
```

Compose binds to `127.0.0.1` by default. Set
`N8N_TO_MERMAID_BIND_ADDRESS=0.0.0.0` only when deliberately exposing the
application to your local network.

### HTTP API

Send an n8n workflow export directly to the API when integrating the converter
into another application:

```bash
curl --request POST 'http://localhost:8080/api/v1/convert?direction=LR' \
  --header 'Content-Type: application/json' \
  --data-binary @workflow.json
```

The response is JSON with a `mermaid` field. API documentation is available at
<http://localhost:8080/api/docs>. The API stores no workflow data and has no
authentication because the documented Docker command binds it to localhost. If
you expose it beyond the local computer, place it behind appropriate network
access controls.

### Command line

The same image also retains the CLI. Build the image, then mount a directory
containing your n8n export:

```bash
docker build -t n8n-to-mermaid .
docker run --rm --entrypoint n8n-to-mermaid -v "$PWD:/work:ro" n8n-to-mermaid /work/workflow.json
```

To save the result, redirect stdout on the host:

```bash
docker run --rm --entrypoint n8n-to-mermaid -v "$PWD:/work:ro" n8n-to-mermaid /work/workflow.json > workflow.mmd
```

## Project layout

```text
src/n8n_to_mermaid/core/  Domain graph, n8n parser, Mermaid renderer
src/n8n_to_mermaid/       CLI adapter and HTTP API
apps/web/                 Static browser interface; no build dependency
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
(cd apps/web && npm test)
```

## Roadmap

- Compact and annotated Mermaid output modes, backed by golden fixtures.
- Static web interface deployable to GitHub Pages.
- Richer n8n node classifications, error paths, sub-workflows, and themes.
- Direct n8n API import, with explicit user credentials and security guidance.

## License

MIT. See [LICENSE](LICENSE).
