#!/usr/bin/env python3

from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "lib"))

from step_helpers import release_commit, run_step_main


def main() -> int:
    return run_step_main(release_commit)


if __name__ == "__main__":
    raise SystemExit(main())
