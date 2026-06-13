import json
import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, ROOT)

import pytest  # noqa: E402


def _load(rel):
    with open(os.path.join(ROOT, rel)) as f:
        return json.load(f)


@pytest.fixture
def match():
    return _load("data/samples/match.sample.json")


@pytest.fixture
def timeline():
    return _load("data/samples/timeline.sample.json")


@pytest.fixture
def table():
    return _load("data/benchmarks/benchmarks.sample.json")


@pytest.fixture
def puuid():
    return "PUUID_PLAYER_JINX"
