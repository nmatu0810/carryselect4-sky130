"""Logical Effort helpers (Sutherland/Sproull/Harris). Delays in units of tau.

Notation: g = logical effort, b = branching effort, h = electrical effort,
p = parasitic delay, H = path electrical effort, F = G*B*H, N = stages.
"""
from math import prod


def path_effort(g: list[float], b: list[float], H: float) -> float:
    """F = G * B * H with G = prod(g), B = prod(b)."""
    return prod(g) * prod(b) * H


def stage_effort(F: float, N: int) -> float:
    """Optimal per-stage effort f_hat = F^(1/N)."""
    return F ** (1.0 / N)


def path_delay_tau(g: list[float], h: list[float], p: list[float]) -> float:
    """D = sum(g_i*h_i + p_i)."""
    return sum(gi * hi + pi for gi, hi, pi in zip(g, h, p, strict=True))


def min_delay_tau(F: float, N: int, P: float) -> float:
    """D_hat = N*F^(1/N) + P."""
    return N * stage_effort(F, N) + P


def optimal_sizes(g: list[float], b: list[float], c_in: float, c_load: float) -> list[float]:
    """Input capacitance of every stage for minimum delay.

    Walks back from the load: C_in,i = g_i * b_i * C_in,i+1 / f_hat, C_in,N+1 = c_load.
    The first element equals c_in when the path is sized optimally.
    """
    n = len(g)
    if len(b) != n:
        raise ValueError("g and b must have the same length")
    fhat = stage_effort(path_effort(g, b, c_load / c_in), n)
    sizes = [0.0] * n
    nxt = c_load
    for i in reversed(range(n)):
        sizes[i] = g[i] * b[i] * nxt / fhat
        nxt = sizes[i]
    return sizes
