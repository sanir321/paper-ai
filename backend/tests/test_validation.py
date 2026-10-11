"""Unit tests for author/resume field validation and session persistence.

Run with:  python -m pytest backend/tests -q   (requires pytest installed)
"""
import sys
import os
import json
import time
import tempfile

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import main


# ── _parse_author_names ───────────────────────────────────────────────────────

def test_author_single_name():
    assert main._parse_author_names("Samir Khadka") == ["Samir Khadka"]


def test_author_semicolon_separated():
    assert main._parse_author_names("Jane Doe; John Smith") == ["Jane Doe", "John Smith"]


def test_author_comma_separated():
    assert main._parse_author_names("Smith, John") == ["Smith", "John"]


def test_author_prose_is_rejected():
    prose = "I used a synthetic dataset of 500 samples with 3 features generated in numpy."
    assert main._parse_author_names(prose) == []


def test_author_long_prose_is_rejected():
    prose = "We trained a convolutional network on the ImageNet benchmark and evaluated it thoroughly."
    assert main._parse_author_names(prose) == []


def test_author_initials_allowed():
    assert main._parse_author_names("A. B. Sharma") == ["A. B. Sharma"]


def test_author_blank_returns_empty():
    assert main._parse_author_names("   ") == []


def test_author_keeps_plausible_and_drops_prose():
    mixed = "Samir Khadka; I used a synthetic dataset of 500 samples generated in numpy."
    assert main._parse_author_names(mixed) == ["Samir Khadka"]


# ── resume field validation ───────────────────────────────────────────────────

def test_email_accepts_valid():
    for v in ("samir@example.com", "a@b.co", "first.last+tag@sub.example.org"):
        assert main._looks_like_email(v), v


def test_email_rejects_invalid():
    for v in ("x", "no@", "@example.com", "samir@example", "", "a b@example.com"):
        assert not main._looks_like_email(v), v


def test_phone_accepts_valid():
    for v in ("+977 9812345678", "9812345678", "(555) 123-4567", "555.123.4567"):
        assert main._looks_like_phone(v), v


def test_phone_rejects_invalid():
    for v in ("x", "12345", "Final-year B.Tech student with internship experience.", "no", "none"):
        assert not main._looks_like_phone(v), v


def test_person_name_accepts_valid():
    for v in ("Samir Khadka", "A. B. Sharma", "Jane Doe"):
        assert main._looks_like_person_name(v), v


def test_person_name_rejects_prose():
    for v in ("Final-year B.Tech Computer Science student with internship experience",
              "I am a student, and I like Python",
              "no", "", "x"):
        assert not main._looks_like_person_name(v), v


def test_resume_field_error_empty_message_when_valid():
    assert main._resume_field_error("email", "samir@example.com") == ""
    assert main._resume_field_error("phone", "9812345678") == ""
    assert main._resume_field_error("name", "Samir Khadka") == ""


def test_resume_field_error_message_when_invalid():
    assert main._resume_field_error("email", "x") != ""
    assert main._resume_field_error("phone", "x") != ""
    assert main._resume_field_error("name", "Final-year B.Tech student with lots of experience") != ""


def test_negative_regex_matches_skip_words():
    for v in ("no", "No", "nope", "skip", "none", "n/a", "leave", "blank", "empty"):
        assert main._NEGATIVE_RE.match(v), v


# ── session persistence ───────────────────────────────────────────────────────

def _tmp_store(monkeypatch_dir):
    main._SESSION_STORE_DIR = monkeypatch_dir
    return monkeypatch_dir


def test_session_roundtrip_survives_restart(tmp_path):
    main.sessions.clear()
    main._last_session_access.clear()
    _tmp_store(str(tmp_path))

    sid = "abc-123"
    main.sessions[sid] = {
        "session_dir": "/tmp/x",
        "file_text": "hello",
        "filename": "a.txt",
        "answers": {"q": "a"},
        "questions_asked": ["q"],
        "ready": False,
        "analysis": {"title": "T"},
        "paper_text": None,
        "images": [],
    }
    main._touch_session(sid)

    path = tmp_path / f"{sid}.json"
    assert path.exists(), "session snapshot should be written"
    payload = json.loads(path.read_text())
    assert payload["session"]["filename"] == "a.txt"
    assert payload["session"]["answers"] == {"q": "a"}

    # Simulate a process restart: memory cleared, disk remains.
    main.sessions.clear()
    main._last_session_access.clear()
    main._restore_sessions()

    assert sid in main.sessions, "session should be restored from disk"
    assert main.sessions[sid]["analysis"]["title"] == "T"
    assert main.sessions[sid]["file_text"] == "hello"


def test_restore_skips_expired_sessions(tmp_path):
    main.sessions.clear()
    main._last_session_access.clear()
    _tmp_store(str(tmp_path))

    sid = "old-1"
    main.sessions[sid] = {"filename": "a.txt", "answers": {}}
    main._persist_session(sid)

    # Rewrite the snapshot with a timestamp beyond the TTL.
    path = tmp_path / f"{sid}.json"
    payload = json.loads(path.read_text())
    payload["saved_at"] = time.time() - (main.SESSION_TTL_MINUTES * 60 + 60)
    path.write_text(json.dumps(payload))

    main.sessions.clear()
    main._last_session_access.clear()
    main._restore_sessions()

    assert sid not in main.sessions, "expired sessions should not be restored"
    assert not path.exists(), "expired snapshot should be deleted"


def test_restore_ignores_corrupt_snapshot(tmp_path):
    main.sessions.clear()
    main._last_session_access.clear()
    _tmp_store(str(tmp_path))

    (tmp_path / "broken.json").write_text("{not json")
    (tmp_path / "noext.txt").write_text("ignored")
    main._restore_sessions()  # must not raise

    assert "broken" not in main.sessions


def test_persist_handles_unserialisable_values(tmp_path):
    main.sessions.clear()
    _tmp_store(str(tmp_path))
    sid = "bytes-1"
    main.sessions[sid] = {"blob": b"\x00\x01binary", "num": 3, "nested": {"b": b"x"}}
    main._persist_session(sid)  # must not raise

    payload = json.loads((tmp_path / f"{sid}.json").read_text())
    assert payload["session"]["num"] == 3
    assert isinstance(payload["session"]["blob"], str)


def test_snapshot_path_rejects_traversal():
    assert main._session_snapshot_path("../etc/passwd") is None
    assert main._session_snapshot_path("a/b") is None
    assert main._session_snapshot_path("") is None
    assert main._session_snapshot_path("ok-123") is not None