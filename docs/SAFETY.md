# Safety & Prompt-Injection Defenses

This project treats all retrieved/user-provided content as untrusted input. The agentic system applies lightweight but explicit safety controls designed for demo and production-hardening use.

## Threat Model
- Prompt injection via campaign descriptions, user questions, or retrieved content.
- Tool abuse (attempts to invoke non-allowlisted tools or privileged actions).
- Data exfiltration requests (tokens, secrets, cross-tenant data).

## Defenses Implemented
- **Tool allowlist + validation**: every tool call is validated with strict argument checks; unknown tools are rejected.
- **Input sanitization**: instruction-like text is stripped and recorded as policy blocks.
- **No tool calls from retrieved content**: retrieval results are never trusted to initiate tools.
- **Deterministic fallback**: if LLM fails or policy checks fail, a deterministic strategy is produced with `fallback_used=true`.
- **Trace transparency**: policy steps and blocked instructions are surfaced in the agent trace.

## Redteam Harness
Run locally:
```
make redteam
```
This executes `eval/run_redteam.py` against `eval/redteam_cases.jsonl` and prints pass/fail for prompt injection, tool abuse, and exfiltration attempts.

## Expected Outputs
- `fallback_used` flag reflects deterministic fallback usage.
- Trace contains a `policy` step with blocked instruction strings.
- Disallowed patterns (e.g., “system prompt”, “secret”) are not present in replies.
