# Contributing to Sherlock CIE

Thank you for your interest in contributing to Sherlock CIE!

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/sherlock.git`
3. Create a feature branch: `git checkout -b feat/your-feature`
4. Follow the [Development Workflow](docs/DEVELOPMENT_WORKFLOW.md)

## Development Process

1. Read the [Engineering Rulebook](docs/ENGINEERING_RULEBOOK.md) before writing code
2. Follow the [Coding Standards](docs/CODING_STANDARDS.md)
3. Write tests for all new functionality
4. Ensure `pnpm lint`, `pnpm test`, and `pnpm build` pass before submitting

## Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

feat(gateway): add webhook signature validation
fix(confidence): correct temporal decay calculation
docs(readme): update setup instructions
```

## Pull Request Process

1. Update documentation if you've changed public APIs
2. Add tests for new functionality
3. Ensure all CI checks pass
4. Request review from a maintainer
5. Squash merge after approval

## Code Review Checklist

- [ ] Code follows [Coding Standards](docs/CODING_STANDARDS.md)
- [ ] No `any` types in TypeScript
- [ ] No hardcoded values or secrets
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No `console.log` / `print` statements in production code

## Architecture Changes

Changes to event schemas, database schema, service boundaries, or Redis channel patterns require:

1. Update to [Technical Design](docs/TECHNICAL_DESIGN.md)
2. Explicit approval before implementation
3. Migration plan for existing data

## Questions?

Open an issue with the `question` label.
