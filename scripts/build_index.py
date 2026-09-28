#!/usr/bin/env python3
"""Validerar alla kortlekar i <rot>/decks/ och skriver <rot>/decks/index.json.

Användning: python3 scripts/build_index.py [rot]   (standard: .)
Avslutar med felkod om någon kortlek är ogiltig, så att GitHub Actions stoppar publiceringen.
"""
import json
import re
import sys
from pathlib import Path


def validate(d):
    if not isinstance(d, dict):
        return "filen är inte ett JSON-objekt"
    if not isinstance(d.get("id"), str) or not re.fullmatch(r"[a-z0-9-]+", d["id"]):
        return 'fältet "id" saknas eller innehåller annat än a-z, 0-9 och bindestreck'
    if not isinstance(d.get("title"), str) or not d["title"].strip():
        return 'fältet "title" saknas'
    cards = d.get("cards")
    if not isinstance(cards, list) or not cards:
        return 'fältet "cards" saknas eller är tomt'
    terms = set()
    for n, c in enumerate(cards, 1):
        if not isinstance(c, dict) or not isinstance(c.get("term"), str) or not isinstance(c.get("answer"), str):
            return f'kort {n} saknar "term" eller "answer"'
        if c["term"] in terms:
            return f'kort {n}: begreppet "{c["term"]}" finns redan i kortleken'
        terms.add(c["term"])
        dis = c.get("distractors")
        if dis is not None and (not isinstance(dis, list) or not all(isinstance(x, str) for x in dis)):
            return f'kort {n}: "distractors" måste vara en lista med text'
        st = c.get("statements")
        if st is not None and (
            not isinstance(st, list)
            or not all(isinstance(s, dict) and isinstance(s.get("text"), str) and isinstance(s.get("true"), bool) for s in st)
        ):
            return f'kort {n}: varje påstående behöver "text" och "true" (true/false)'
    return None


def main():
    root = Path(sys.argv[1] if len(sys.argv) > 1 else ".")
    decks_dir = root / "decks"
    errors, index, ids = [], [], {}

    for f in sorted(decks_dir.glob("*.json")):
        if f.name == "index.json":
            continue
        try:
            d = json.loads(f.read_text(encoding="utf-8"))
        except Exception as e:
            errors.append(f"{f.name}: ogiltig JSON ({e})")
            continue
        err = validate(d)
        if err:
            errors.append(f"{f.name}: {err}")
            continue
        if d["id"] in ids:
            errors.append(f'{f.name}: id "{d["id"]}" används redan av {ids[d["id"]]}')
            continue
        ids[d["id"]] = f.name
        index.append({
            "id": d["id"],
            "title": d["title"],
            "description": d.get("description", ""),
            "tags": d.get("tags", []),
            "count": len(d["cards"]),
            "file": f.name,
        })

    if errors:
        print("Fel i kortlekarna:")
        for e in errors:
            print("  -", e)
        sys.exit(1)

    index.sort(key=lambda m: m["title"].lower())
    (decks_dir / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"OK: {len(index)} kortlekar, {sum(m['count'] for m in index)} kort.")


if __name__ == "__main__":
    main()
