# Security Policy

## Secrets
- Keep `AI_API_KEY` in server-side environment variables or deployment secret storage.
- Never commit real credentials, paste them into browser code, or store them in localStorage.
- Rotate any credential that was accidentally exposed.

## Network exposure
The local server currently has no user authentication, authorization, CSRF protection, or rate limiting. Do not expose it directly to the public internet as-is. Before public deployment, add an authenticated gateway, request throttling, origin/CSRF protections as appropriate, logging without secrets, and infrastructure-level body/time limits.

## AI output
Treat model output as untrusted input. The app validates the Deck structure and HTML renderers escape user content, but AI feedback is advisory and does not verify facts. Do not treat generated claims, numbers, quotations, or citations as true without independent sources.

## Reporting
Please report suspected vulnerabilities privately to the repository maintainers rather than publishing API keys, personal data, or exploit details in public issues.
