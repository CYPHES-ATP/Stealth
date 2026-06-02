# Real session handoff demo v0

This example connects the verified handoff demo to a real Stealth Windows test session.

The session flow was:

```text
open project -> inspect repo -> choose safe local smoke test -> run command -> report stdout -> confirm no file changes
he captured evidence is stored at:

examples/verified-handoff/session-evidence.real-smoke-test.json

The smoke test command was:

.venv/bin/python src/realized_vol.py

The command returned exit code 0 and produced:

[OK] realized sigma_5m=0.00165546
sigma_1h=0.0057347
sigma_1d=0.0280942

No project files were changed during the smoke test.

This moves the verifier from pure mock examples toward real Stealth session-style handoff evidence.
