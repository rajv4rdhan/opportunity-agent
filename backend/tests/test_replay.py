"""Replay timing helper."""

from datetime import datetime, timedelta, timezone

from app.services.replay import replay_delays

BASE = datetime(2026, 10, 24, 12, 0, tzinfo=timezone.utc)


def test_speeds_scale_the_gaps_and_cap_idle_waits():
    timestamps = [
        BASE,
        BASE + timedelta(seconds=2),
        BASE + timedelta(seconds=4),
        BASE + timedelta(seconds=400),
    ]

    assert replay_delays(timestamps, speed=1) == [0.0, 1.5, 1.5, 1.5]
    assert replay_delays(timestamps, speed=20) == [0.0, 0.1, 0.1, 1.5]
    assert replay_delays(timestamps, speed=100, cap=0.5) == [0.0, 0.02, 0.02, 0.5]


def test_empty_and_single_event():
    assert replay_delays([]) == []
    assert replay_delays([BASE]) == [0.0]


def test_out_of_order_timestamps_never_sleep_negative():
    timestamps = [BASE, BASE + timedelta(seconds=2), BASE + timedelta(seconds=1)]
    assert replay_delays(timestamps, speed=1) == [0.0, 1.5, 0.0]
