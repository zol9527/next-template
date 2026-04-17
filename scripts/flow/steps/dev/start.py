#!/usr/bin/env python3

from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "lib"))

from step_helpers import run_step_main, start_dev


def main() -> int:
    return run_step_main(start_dev)


if __name__ == "__main__":
    raise SystemExit(main())
