#!/usr/bin/env python3
"""Add previously unseen papers by the site owner to publications.yml."""

from __future__ import annotations

import argparse
import difflib
import html
import json
import re
import sys
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path


AUTHOR = "Ayesha Asloob Qureshi"
API = "https://export.arxiv.org/api/query"
ATOM = {"atom": "http://www.w3.org/2005/Atom"}
SECTION_MARKER = "# ---------- Preprints and submitted ----------"


def compact(value: str) -> str:
    return " ".join(html.unescape(value).split())


def normalise(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", value.casefold())


def yaml_string(value: str) -> str:
    # JSON strings are valid YAML double-quoted scalars and handle punctuation safely.
    return json.dumps(compact(value), ensure_ascii=False)


def scalar_value(raw: str) -> str:
    raw = raw.strip()
    if raw.startswith('"'):
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return raw
    if raw.startswith("'") and raw.endswith("'"):
        return raw[1:-1].replace("''", "'")
    return raw


def fetch_entries(feed_file: Path | None = None) -> list[dict[str, object]]:
    if feed_file:
        payload = feed_file.read_bytes()
    else:
        query = urllib.parse.urlencode(
            {
                "search_query": f'au:"{AUTHOR}"',
                "start": 0,
                "max_results": 200,
                "sortBy": "submittedDate",
                "sortOrder": "descending",
            }
        )
        request = urllib.request.Request(
            f"{API}?{query}",
            headers={"User-Agent": "ayeshaasloob.com publication sync (contact via website)"},
        )
        with urllib.request.urlopen(request, timeout=30) as response:
            payload = response.read()

    root = ET.fromstring(payload)
    entries: list[dict[str, object]] = []
    for entry in root.findall("atom:entry", ATOM):
        raw_id = compact(entry.findtext("atom:id", default="", namespaces=ATOM))
        match = re.search(r"/abs/([^/?#]+)", raw_id)
        if not match:
            continue
        arxiv_id = re.sub(r"v\d+$", "", match.group(1))
        title = compact(entry.findtext("atom:title", default="", namespaces=ATOM))
        authors = [
            compact(author.findtext("atom:name", default="", namespaces=ATOM))
            for author in entry.findall("atom:author", ATOM)
        ]
        if title and authors and any(normalise(name) == normalise(AUTHOR) for name in authors):
            entries.append({"arxiv": arxiv_id, "title": title, "authors": authors})
    return entries


def existing_titles(source: str) -> set[str]:
    return {
        normalise(scalar_value(raw))
        for raw in re.findall(r"(?m)^\s*title:\s*(.+?)\s*$", source)
    }


def title_similarity(left: str, right: str) -> float:
    return difflib.SequenceMatcher(None, normalise(left), normalise(right)).ratio()


def arxiv_sort_key(arxiv_id: str) -> tuple[int, int]:
    match = re.fullmatch(r"(\d{4})\.(\d+)", arxiv_id)
    return (int(match.group(1)), int(match.group(2))) if match else (0, 0)


def render_entry(entry: dict[str, object]) -> str:
    authors = ", ".join(yaml_string(str(author)) for author in entry["authors"])
    return (
        "- status: preprint\n"
        f"  authors: [{authors}]\n"
        f"  title: {yaml_string(str(entry['title']))}\n"
        f"  arxiv: {yaml_string(str(entry['arxiv']))}\n"
    )


def update_file(path: Path, entries: list[dict[str, object]]) -> list[dict[str, object]]:
    source = path.read_text(encoding="utf-8")
    if SECTION_MARKER not in source:
        raise ValueError(f"Could not find section marker in {path}")

    known_ids = set(re.findall(r'(?m)^\s*arxiv:\s*["\']?([^\s"\']+)', source))
    newest_known = max((arxiv_sort_key(value) for value in known_ids), default=(0, 0))
    changed: list[dict[str, object]] = []
    new_entries: list[dict[str, object]] = []

    for entry in entries:
        if entry["arxiv"] in known_ids:
            continue

        blocks = re.findall(r"(?ms)^- status: .*?(?=^- status:|\Z)", source)
        closest_block = ""
        closest_score = 0.0
        for block in blocks:
            match = re.search(r"(?m)^\s*title:\s*(.+?)\s*$", block)
            if not match:
                continue
            score = title_similarity(str(entry["title"]), scalar_value(match.group(1)))
            if score > closest_score:
                closest_block, closest_score = block, score

        # arXiv and journal titles can differ slightly in spelling or LaTeX markup.
        # Treat a very close title as the same paper instead of creating a duplicate.
        if closest_score >= 0.9:
            if closest_block.startswith("- status: submitted") and "\n  arxiv:" not in closest_block:
                updated = closest_block.replace("- status: submitted", "- status: preprint", 1)
                updated = re.sub(
                    r"(?m)^(\s*title:.*)$",
                    rf"\1\n  arxiv: {yaml_string(str(entry['arxiv']))}",
                    updated,
                    count=1,
                )
                source = source.replace(closest_block, updated, 1)
                changed.append(entry)
            continue

        # On the first run, do not resurrect an old arXiv preprint whose eventual
        # journal title differs substantially. New IDs sort after the newest ID
        # already curated in the file.
        if arxiv_sort_key(str(entry["arxiv"])) > newest_known:
            new_entries.append(entry)
            changed.append(entry)

    if not changed:
        return []

    if new_entries:
        block = "\n".join(render_entry(entry) for entry in new_entries) + "\n"
        insertion = SECTION_MARKER + "\n" + block
        source = source.replace(SECTION_MARKER + "\n", insertion, 1)
    path.write_text(source, encoding="utf-8")
    return changed


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=Path, default=Path("_data/publications.yml"))
    parser.add_argument("--feed-file", type=Path, help="Read an Atom feed from disk (for testing)")
    args = parser.parse_args()

    try:
        added = update_file(args.data, fetch_entries(args.feed_file))
    except (OSError, ET.ParseError, ValueError) as error:
        print(f"arXiv sync failed: {error}", file=sys.stderr)
        return 1

    if added:
        print(f"Updated {len(added)} arXiv paper(s):")
        for entry in added:
            print(f"- {entry['arxiv']}: {entry['title']}")
    else:
        print("No new arXiv papers found.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
