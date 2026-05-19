"""Load try-on prompts from vendor_cache/prompts/ (.txt, # lines are comments)."""
from pathlib import Path

_PROMPTS_DIR = Path(__file__).resolve().parent / "prompts"


def load_prompt(name: str) -> str:
    path = _PROMPTS_DIR / f"{name}.txt"
    if not path.is_file():
        raise FileNotFoundError(f"Prompt file not found: {path}")
    lines = []
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        lines.append(stripped)
    text = " ".join(lines).strip()
    if not text:
        raise ValueError(f"Prompt file is empty: {path}")
    return text
