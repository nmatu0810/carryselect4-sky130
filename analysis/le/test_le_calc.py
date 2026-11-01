import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from le_calc import min_delay_tau, optimal_sizes, path_delay_tau, path_effort, stage_effort  # noqa: E402


def test_fo4():
    assert path_delay_tau([1], [4], [1]) == 5


def test_chain():
    assert stage_effort(64, 3) == pytest.approx(4)
    assert min_delay_tau(64, 3, 3) == pytest.approx(15)


def test_sizes():
    assert optimal_sizes([1, 1, 1], [1, 1, 1], 1, 64) == pytest.approx([1, 4, 16])


def test_branch():
    assert path_effort([2, 1], [3, 1], 2) == 12
