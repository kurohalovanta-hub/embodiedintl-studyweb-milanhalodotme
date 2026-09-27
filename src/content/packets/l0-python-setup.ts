import type { LearningPacket } from "@/lib/packet-types";
import { ytEmbed } from "@/lib/packet-types";

// Selected from docs/curation/l0-python-setup.md (live-verified 2026-08-21).
// Curation override: the environments material moved from 2026 L3 to 2026 L6 §1
// (Dependencies & Environments), the packet cites the corrected lecture.

export const packet: LearningPacket = {
  nodeId: "l0-python-setup",
  whyNow:
    "A lot of beginner robotics and ML trouble is environment trouble. PyTorch, MuJoCo, and LeRobot all install the same way you are about to practice here. The whole node is one question: which Python is running, and where does it keep its packages. Get this now and the classic 'I installed it but import fails' error becomes a two-minute fix instead of a wall.",
  diagnostic: {
    prompt:
      "Cold, 3 min: what is the difference between python, python3, and a venv's python? Give two commands that show which interpreter and which pip are live (which python; python -c 'import sys; print(sys.prefix)'; pip --version). Then predict: what happens to a package you installed once you run deactivate?",
    minutes: 3,
  },
  orient: {
    title: "Missing Semester 2026 L6, Packaging and Shipping Code (Dependencies & Environments segment)",
    creator: "MIT (Missing Semester)",
    url: "https://www.youtube.com/watch?v=KBMiB-8P4Ns",
    embedUrl: ytEmbed("https://www.youtube.com/watch?v=KBMiB-8P4Ns", 0, 900),
    endSeconds: 900,
    minutes: 15,
    whySelected:
      "Only the first segment is in scope (isolation, pip, uv, dependency hell) at 1.25×. Stop when wheels and artifacts begin; the rest of the lecture is months-later material.",
    unverified: true,
  },
  coreRead: [
    {
      title: "Install packages in a virtual environment using pip and venv, PyPA packaging guide",
      url: "https://packaging.python.org/en/latest/guides/installing-using-pip-and-virtual-environments/",
      sections:
        "Full, as a strict do-along at your own prompt: python3 -m venv .venv → activate (per-platform) → pip install → pip freeze → requirements.txt.",
      minutes: 25,
      whySelected: "The standard workflow from the people who own Python packaging. Every later PyTorch, MuJoCo, or LeRobot install is this same sequence.",
    },
    {
      title: "Missing Semester 2026 L6 notes, §Dependencies & Environments",
      resourceId: "missing-semester",
      sections: "The isolation and dependency-hell framing, plus uv as the fast modern front-end for the same concepts (not a different mental model).",
      minutes: 10,
    },
    {
      title: "venv, Python standard library documentation",
      url: "https://docs.python.org/3/library/venv.html",
      sections:
        "Keep open as reference: the per-platform activation table, and the mechanism in one sentence, lightweight environments with their own independent site-packages; sys.prefix repoints to the venv, sys.base_prefix stays at the base interpreter.",
      minutes: 5,
    },
  ],
  recall: [
    { q: "What does activating a venv actually do?", a: "Mostly edits PATH so python/pip resolve to the venv's copies (and sets VIRTUAL_ENV). It is not a mode switch, deactivate just restores the old PATH." },
    { q: "You ran pip install X, but import X fails. The canonical cause?", a: "pip belongs to ONE interpreter, you installed into a different one than the one running the script. Compare pip --version's path against which python / sys.prefix." },
    { q: "Is a venv a full copy of Python?", a: "No, it is lightweight: its own site-packages plus pointers to a base interpreter. sys.prefix points at the venv, sys.base_prefix at the base." },
    { q: "What is uv relative to venv + pip?", a: "A 10–100× faster drop-in front-end for the same concepts, uv venv, uv pip install, same mental model, faster resolver; it can manage Python versions too." },
    { q: "What do pip freeze and requirements.txt give you together?", a: "A pinned, reproducible dependency set: freeze records exact installed versions; pip install -r rebuilds the same environment anywhere." },
  ],
  practice: [
    {
      prompt:
        "Missing Semester L6 exercise #1, the clearest way to see what activation does: run printenv > before, activate a venv, run printenv > after, then diff before after. Write one sentence on what activation actually changed.",
      source: "Missing Semester 2026 L6 notes",
      minutes: 10,
    },
    {
      prompt:
        "The node's exercise: two venvs with different NumPy versions, one script. Use python -c 'import numpy; print(numpy.__version__, numpy.__file__)' to prove which environment serves the script, and say why.",
      minutes: 20,
    },
    {
      prompt:
        "Break and repair: install a package, then break one of its files in site-packages (or pip install an impossible version pin). Read the FULL error, then fix it.",
      minutes: 15,
    },
    {
      prompt: "Redo one environment setup with uv venv and uv pip install, and feel the speed difference. Same concepts, faster tool.",
      source: "https://github.com/astral-sh/uv",
      minutes: 10,
    },
  ],
  implement: {
    spec:
      "Write a requirements.txt for a tiny project, then from a FRESH shell: new venv → pip install -r requirements.txt → the script runs. Plus one hand-drawn diagram answering 'where does import numpy find code?': shell PATH → interpreter → sys.prefix → site-packages.",
    checks: [
      "Round-trip works from a genuinely fresh shell with no manual fixes",
      "Diagram walked aloud without notes, each arrow named by the command that proves it (which python, pip --version, sys.prefix)",
    ],
    minutes: 20,
  },
  stuck: {
    alternateRead: {
      title: "VS Code 'Python: Create Environment' + interpreter picker (official Python tutorial)",
      url: "https://code.visualstudio.com/docs/python/python-tutorial",
      sections:
        "The environment-creation and interpreter-selection steps only, the GUI shows the same objects (interpreter, .venv folder) when the shell version has not clicked. Do it once from the GUI, then never again except via shell.",
      minutes: 10,
    },
    note: "The uv README quickstart (github.com/astral-sh/uv) is the same workflow told faster; a good second pass before you re-read anything.",
  },
  deepen: [
    {
      title: "Missing Semester 2026 L6, §§2–4",
      resourceId: "missing-semester",
      sections: "Wheels, pyproject.toml, lockfiles, libraries-vs-applications pinning, deferred until the L1 exit project (a small reusable Python package).",
      minutes: 30,
    },
    {
      title: "uv project workflow",
      url: "https://github.com/astral-sh/uv",
      sections: "uv init / add / lock / sync, adopt at the same L1 moment, not before.",
      minutes: 15,
    },
  ],
  prove: {
    task:
      "Timed, about 20 minutes, from a FRESH shell: create an env, install a pinned dependency set from a given requirements.txt, run its test suite, then show (with commands, not prose) where every package lives on disk and which interpreter ran the tests.",
    criteria: [
      "Test suite ran inside the venv, with the command and output pasted",
      "site-packages path shown from evidence (a package's __file__, sys.prefix), not guessed",
      "which python and pip --version shown to agree, and you can say why they must",
      "Under 20 minutes from first prompt to final explanation",
    ],
    minutes: 20,
  },
  transfer: {
    task:
      "Clone any small real Python project and build its environment from its requirements or pyproject WITHOUT instructions, diagnosing whatever breaks. Bonus: explain why sudo pip install into the system Python is the classic mistake venvs exist to prevent.",
    criteria: [
      "Project runs from its own fresh venv",
      "Every failure diagnosed by interpreter-resolution reasoning (which python, pip --version, sys.prefix), no rerun-until-it-works",
    ],
    minutes: 25,
  },
  retention:
    "7 days, cold: the create → activate → install → verify cycle in under 3 minutes. 30 days, entering PyTorch: before installing torch, state which env you are in and prove it, the habit is the test.",
  researchRecord: "docs/curation/l0-python-setup.md",
  minutes: 178,
};
