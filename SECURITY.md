# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 2.x     | ✅        |
| 1.x     | ❌        |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT** open a public GitHub issue
2. Email: security@sherlock-cie.dev (placeholder)
3. Include: description, reproduction steps, impact assessment

We will acknowledge receipt within 48 hours and provide a detailed response within 7 days.

## Security Considerations

- All secrets managed via environment variables
- No credentials stored in source code
- Input validation on all API boundaries (Zod/Pydantic)
- SQL injection prevented by Prisma ORM
- WebSocket connections validated
- CORS configured per environment
