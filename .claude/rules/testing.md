# Testing Style Guide

## Test File Location

- **Place test files as siblings to the file being tested**
  - ✓ `room.ts` → `room.test.ts`
  - ✓ `fst-collection.ts` → `fst-collection.test.ts`
  - ✗ `room.ts` → `__tests__/room.test.ts`
  - Naming pattern: `{name-of-target-file}.test.ts`

## Test Structure

- **Use the Arrange-Act-Assert (AAA) pattern for all tests**
- **Clearly delineate each section with comments**

```typescript
test("should add entity to collection", () => {
  // Arrange
  const collection = createFstCollection(createCounterFst);
  const command = {
    kind: "AddEntity",
    id: "counter1",
    initialState: { count: 0 },
  };

  // Act
  const result = collection.handleCommand(command);

  // Assert
  assert.equal(result.kind, "Ok");
  assert.ok(state.entities["counter1"]);
});
```

## Test Runner

- Use Node.js built-in test runner (`node:test`)
- Run tests with: `npm test`
