# Project invariants

- Respond/document primarily in Chinese; code identifiers may be English.
- Character: classic yellow-face ninja bust, black hood/mask and floating yellow hands. Do not add a full-body human rig or legs without an explicit user change.
- Two independent seats: human or AI. P1 WASD + JKL/UIO; P2 arrows + Numpad1-6. Use physical key codes, not character values.
- Maximum 3 simultaneous keys. Relative-facing motion input; startup/active/recovery; no key-repeat spam.
- AI and human submit intents to the same combat rules, with identical costs, cooldowns and hit rules. Do not implement cloud LLM calls for frame-by-frame AI.
- Never claim a voice exists unless its exact filename was verified in the supplied package. Keep third-party audio separate from source-code licensing.
- Tests: node --test tests/*.test.cjs. Browser smoke-test menu, imports, both keyboards, AI match, pause/blur, rematch and offline bundle.
- Do not announce deployment or upload success without observing the corresponding result.
