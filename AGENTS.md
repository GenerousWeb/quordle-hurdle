# Development philosophy
- Prefer simple solutions over clever ones.
- Write code that is clear and self-explainatory.
- Build with long term in mind.
  
# After every change
Run these three commands after every code change and fix any failures before considering the task done:
```bash
npm run typecheck:all
npm run lint
npm test
```

# Stack
- node
- typescript
- react-router
- websocket
- fastify
- tailwind

# Testing conventions

## Write real tests before implementation (TDD)
Always write actual test assertions before writing the implementation they cover.
Never use `it.todo()` as a placeholder — write the full test body with real `expect(...)` calls.
Tests are expected to fail (red) until the feature is implemented. A failing test with a clear assertion is more valuable than a passing placeholder.

## What a real test looks like
```typescript
it("tile renders letter in uppercase", () => {
  const { container } = render(<Tile letter="c" state="typing" />);
  expect(container.firstChild).toHaveTextContent("C");
});
```

Not this:
```typescript
it.todo("tile renders letter in uppercase");
```

## DOM conventions for this project
Use `data-*` attributes as the primary test surface — they are stable, framework-agnostic, and decouple tests from CSS class names.

| Concept | Attribute |
|---------|-----------|
| Tile state (F2) | `data-state="empty\|typing\|green\|yellow\|grey"` |
| Tile flip animation | `data-flipping="true"`, `data-flip-mid="true"` |
| Tile shake animation | `data-shaking="true"` |
| Board container | `data-board-index="{0–3}"`, `data-status="{unsolved\|solved\|failed\|locked}"` |
| Row | `data-row-index="{0–8}"` |
| Tile | `data-tile-index="{0–4}"` |
| Failed board reveal row | `data-reveal-row="true"` |
| F1 tile result | `data-result="green\|yellow\|grey"` |

## Handling future APIs in tests
When tests cover a component API that does not exist yet, cast the component to `any` to avoid TypeScript errors at the call site while still compiling cleanly:
```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const F2Tile = Tile as any;
```
The tests will fail at assertion level (not compilation) until the implementation lands. This keeps `npm run typecheck:all` green while the test suite is red.