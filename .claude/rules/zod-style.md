# Zod Schema Style Guide

## Discriminated Unions

- **Always use `kind` as the discriminator field**
  - ✓ `kind: z.literal("UserJoined")`
  - ✗ `type: z.literal("UserJoined")`
  - Rationale: `type` is a reserved word in TypeScript and can cause conflicts

- **The discriminator value must match the const/type name exactly**
  - ✓ `export const UserJoined = z.object({ kind: z.literal("UserJoined"), ... })`
  - ✗ `export const UserJoined = z.object({ kind: z.literal("user-joined"), ... })`
  - Rationale: Maintains consistency between type names and runtime values

## Schema Definition Pattern

- **Define each variant as a named constant with inferred type**
  ```typescript
  export const UserJoined = z.object({
    kind: z.literal("UserJoined"),
    userId: z.string(),
  });

  export type UserJoined = z.infer<typeof UserJoined>;
  ```

- **Create discriminated unions from named schemas**
  ```typescript
  export const UserEvent = z.discriminatedUnion("kind", [
    UserJoined,
    UserLeft,
    UserUpdated,
  ]);

  export type UserEvent = z.infer<typeof UserEvent>;
  ```
