"""Load try-on instruction templates from vendor_cache/tryon_templates/ (.txt, # lines are comments)."""
from pathlib import Path

_TEMPLATES_DIR = Path(__file__).resolve().parent / "tryon_templates"


def load_prompt(name: str) -> str:
    path = _TEMPLATES_DIR / f"{name}.txt"
    if not path.is_file():
        raise FileNotFoundError(f"Template file not found: {path}")
    lines = []
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        lines.append(stripped)
    text = " ".join(lines).strip()
    if not text:
        raise ValueError(f"Template file is empty: {path}")
    return text
