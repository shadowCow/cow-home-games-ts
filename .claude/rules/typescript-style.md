---
paths: "**/*.{ts,tsx}"
---

# TypeScript Style Guide

## Imports

- **Use extensionless imports** (no `.js` extensions in TypeScript files)
  - ✓ `import { foo } from './bar'`
  - ✗ `import { foo } from './bar.js'`

## Types vs Interfaces

- **Prefer `type` to `interface` for data objects**
  - ✓ `type User = { username: string; }`
  - ✗ `interface User { username: string; }`
  - Use `interface` when you need features like declaration merging or implementing in classes
