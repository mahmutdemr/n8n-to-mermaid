"""Komut satırı arayüzü."""

from __future__ import annotations

import argparse
import json
import sys
from collections.abc import Sequence
from pathlib import Path

from .converter import VALID_DIRECTIONS, ConversionOptions, convert_workflow


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Convert an n8n workflow JSON export to a Mermaid flowchart."
    )
    parser.add_argument("input", type=Path, help="Path to an n8n workflow JSON export.")
    parser.add_argument(
        "-o", "--output", type=Path, help="Write Mermaid to this file instead of stdout."
    )
    parser.add_argument(
        "--direction", choices=sorted(VALID_DIRECTIONS), default="TD", help="Flowchart direction."
    )
    parser.add_argument("--title", help="Optional diagram title, stored as a Mermaid comment.")
    parser.add_argument(
        "--exclude-disabled",
        action="store_true",
        help="Omit disabled n8n nodes and their connections.",
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        workflow = json.loads(args.input.read_text(encoding="utf-8"))
        if not isinstance(workflow, dict):
            raise ValueError("Workflow JSON root must be an object.")
        mermaid = convert_workflow(
            workflow,
            ConversionOptions(
                direction=args.direction,
                title=args.title,
                include_disabled=not args.exclude_disabled,
            ),
        )
    except (OSError, json.JSONDecodeError, ValueError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 1

    if args.output:
        args.output.write_text(mermaid, encoding="utf-8")
    else:
        print(mermaid, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
