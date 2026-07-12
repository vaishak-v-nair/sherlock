# Coding Standards

> **Version:** 1.0  
> **Last Updated:** 2026-07-12

---

## 1. TypeScript Standards

### Naming

- **Files:** `kebab-case.ts` (e.g., `meeting-adapter.ts`, `evidence-aggregator.service.ts`)
- **Classes:** `PascalCase` (e.g., `MetadataEngine`, `SessionManager`)
- **Interfaces:** `PascalCase`, no `I` prefix (e.g., `IntelligenceEngine`, not `IIntelligenceEngine`)
- **Functions/Methods:** `camelCase` (e.g., `processEvent`, `computeConfidence`)
- **Constants:** `UPPER_SNAKE_CASE` (e.g., `MAX_RETRY_COUNT`, `DEFAULT_DECAY_RATE`)
- **Enums:** `PascalCase` for enum name, `UPPER_SNAKE_CASE` for values
- **Type aliases:** `PascalCase` with descriptive suffix (e.g., `SessionId`, `ConfidenceScore`)

### Strict Mode

- `strict: true` in all `tsconfig.json`.
- No `any` type. Use `unknown` and narrow with type guards.
- No `@ts-ignore`. Use `@ts-expect-error` with a comment explaining why.
- No non-null assertions (`!`) without a justifying comment.

### Imports

- Use absolute imports via TypeScript path aliases.
- Order: Node built-ins → external packages → internal packages → relative imports.
- Separate groups with a blank line.

### Functions

- Maximum function length: 30 lines (guideline, not hard limit).
- Maximum function parameters: 3. Use an options object for more.
- Prefer `async/await` over `.then()` chains.
- All async functions must have error handling.

### Error Handling

- Throw typed errors extending a base `AppError` class.
- Never throw plain strings.
- Catch errors at service boundaries, not inside business logic.

---

## 2. Python Standards

### Naming

- **Files:** `snake_case.py` (e.g., `metadata_engine.py`, `evidence_aggregator.py`)
- **Classes:** `PascalCase` (e.g., `MetadataEngine`, `EvidenceEvent`)
- **Functions/Methods:** `snake_case` (e.g., `process_event`, `compute_confidence`)
- **Constants:** `UPPER_SNAKE_CASE` (e.g., `MAX_RETRY_COUNT`)
- **Private:** Prefix with single underscore `_` (e.g., `_internal_method`)

### Type Annotations

- All function parameters and return types must be annotated.
- Use Pydantic `BaseModel` for all data structures.
- Use `Optional[T]` for nullable fields, not `T | None`.

### Imports

- Standard library → third-party → local imports.
- Use absolute imports.
- Separate groups with blank lines.

### Async

- Use `async/await` for all IO operations.
- Redis, HTTP, and database calls must be async.
- Use `asyncio.gather` for concurrent independent operations.

---

## 3. React Standards

### Component Structure

```tsx
// 1. Imports
import { useState, useEffect } from 'react';

// 2. Types
interface ComponentProps {
  sessionId: string;
}

// 3. Component
export function Component({ sessionId }: ComponentProps) {
  // 3a. Hooks
  const [state, setState] = useState<StateType>(initialState);

  // 3b. Effects
  useEffect(() => {
    /* ... */
  }, [sessionId]);

  // 3c. Handlers
  const handleClick = () => {
    /* ... */
  };

  // 3d. Derived state
  const isActive = state.status === 'ACTIVE';

  // 3e. Render
  return <div>{/* ... */}</div>;
}
```

### Rules

- Functional components only (no class components).
- Custom hooks for reusable stateful logic.
- Props interfaces defined inline above the component.
- No inline styles except for truly dynamic values.
- Use `shadcn/ui` components as the base UI library.

---

## 4. NestJS Standards

### Module Structure

```
feature/
├── feature.module.ts      # Module declaration
├── feature.controller.ts  # HTTP/WS handlers (thin)
├── feature.service.ts     # Business logic
├── feature.types.ts       # Local types/interfaces
└── __tests__/
    └── feature.service.spec.ts
```

### Rules

- Controllers validate input and delegate to services.
- Services contain business logic and are injectable.
- Use constructor injection (NestJS DI container).
- Guard, interceptor, and pipe logic separated from controllers.

---

## 5. FastAPI Standards

### Route Structure

```python
@router.post("/endpoint", response_model=ResponseSchema)
async def endpoint_handler(
    payload: RequestSchema,
    service: ServiceClass = Depends(get_service),
) -> ResponseSchema:
    """One-line description of what this endpoint does."""
    return await service.process(payload)
```

### Rules

- Routes are thin: validate input, call service, return response.
- Business logic lives in service classes.
- Use `Depends()` for dependency injection.
- All response models defined with Pydantic.

---

## 6. Prisma Standards

- Schema file: `packages/database/prisma/schema.prisma`
- Model names: `PascalCase` singular (e.g., `Session`, `Evidence`)
- Field names: `camelCase` in Prisma, mapped to `snake_case` in PostgreSQL via `@map`
- Always define `createdAt` and `updatedAt` on every model.
- Use `@relation` explicitly for all relationships.

---

## 7. Commit Messages

Format: `type(scope): description`

Types:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, no logic change
- `refactor`: Code restructuring, no behavior change
- `test`: Adding or modifying tests
- `chore`: Build process, tooling, dependencies
- `perf`: Performance improvement
- `ci`: CI/CD changes

Examples:

```
feat(gateway): add webhook signature validation
fix(confidence): correct temporal decay calculation
docs(readme): update local setup instructions
refactor(ai-engine): extract metadata engine into separate module
test(evidence): add unit tests for evidence aggregation
chore(deps): update ioredis to v5.4.2
```

### Rules

- Subject line: imperative mood, max 72 characters, no period.
- Body (optional): explain WHY, not WHAT.
- Reference issue numbers: `Closes #42`.

---

## 8. Branch Naming

Format: `type/short-description`

Examples:

```
feat/metadata-engine
fix/confidence-decay
docs/technical-design
refactor/gateway-adapters
```

---

## 9. Pull Request Standards

### PR Title

Same format as commit messages: `type(scope): description`

### PR Description Template

```markdown
## What

Brief description of the change.

## Why

Motivation and context.

## How

Technical approach.

## Testing

How was this tested?

## Checklist

- [ ] Code follows coding standards
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No `console.log` / `print` statements
- [ ] No hardcoded values
- [ ] Types are strict (no `any`)
```

---

## 10. Linting & Formatting

### ESLint

- Config: `packages/eslint-config/`
- Extends: `@typescript-eslint/recommended`
- Rules: `no-explicit-any: error`, `no-unused-vars: error`

### Prettier

- Config: `.prettierrc` at root
- Print width: 100
- Single quotes: true
- Trailing commas: `all`
- Semicolons: true
- Tab width: 2

### Python

- Formatter: `ruff format`
- Linter: `ruff check`
- Type checker: `mypy --strict`

---

## 11. Testing Standards

### Unit Tests

- Test file location: `__tests__/` directory adjacent to source file.
- Test file naming: `*.spec.ts` (TypeScript), `test_*.py` (Python).
- One assertion per test (guideline).
- Use descriptive test names: `it('should reject evidence with score > 1.0')`.

### Test Structure (AAA)

```typescript
it('should compute weighted confidence score', () => {
  // Arrange
  const evidence = [createEvidence({ score: 0.8, weight: 0.5 })];

  // Act
  const result = computeConfidence(evidence);

  // Assert
  expect(result).toBeCloseTo(0.8, 2);
});
```

---

## 12. Definition of Done

A task is "done" when:

- [ ] Code compiles without errors (`tsc --noEmit` / `mypy`)
- [ ] All existing tests pass
- [ ] New tests written for new functionality
- [ ] Code follows coding standards (lint passes)
- [ ] Code is formatted (prettier/ruff)
- [ ] Documentation updated if public API changed
- [ ] No hardcoded values, secrets, or `TODO` comments without issue references
- [ ] PR reviewed and approved
