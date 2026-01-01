# @cow-sunday/protocol

Platform-agnostic protocol definitions and shared business logic for the cow-home-games multiplayer system.

## Message Patterns

This package follows a strict messaging pattern for client-server communication and event sourcing.

### Commands

**Commands** are requests from the client to the server. They represent actions that a user wants to perform.

- Naming: `{Action}Command` (e.g., `LoginCommand`)
- Direction: Client → Server
- **Required field**: `kind` - literal string matching the type name
- Defined with Zod schemas for runtime validation

### Events

**Events** represent the successful outcome of a command. They are immutable facts that have occurred in the system.

- Naming: `{Entity}{Action}` in past tense (e.g., `UserLoggedIn`)
- Purpose: Applied to state objects as part of event sourcing pattern
- **Required field**: `kind` - literal string matching the type name
- Defined with Zod schemas for runtime validation

### Failures

**Failures** represent unsuccessful command outcomes. They contain error information.

- Naming: `{Reason}` describing why the command failed (e.g., `InvalidLogin`)
- Purpose: Communicate errors back to the client
- **Required field**: `kind` - literal string matching the type name
- Defined with Zod schemas for runtime validation

## Example: Authentication Flow

```typescript
import { LoginCommand, UserLoggedIn, InvalidLogin } from '@cow-sunday/protocol';

// Client sends a command
const command: LoginCommand = {
  kind: 'LoginCommand',
  username: 'alice',
  password: 'secret123'
};

// Server processes and returns either:

// Success - an event
const event: UserLoggedIn = {
  kind: 'UserLoggedIn',
  username: 'alice',
  token: 'jwt-token-here'
};

// Or failure
const failure: InvalidLogin = {
  kind: 'InvalidLogin',
  error: 'Invalid credentials'
};
```

## Runtime Validation

All messages are defined as Zod schemas and can be validated at runtime:

```typescript
import { LoginCommand } from '@cow-sunday/protocol';

// Validates and throws if invalid
const command = LoginCommand.parse(untrustedData);

// Validates and returns result
const result = LoginCommand.safeParse(untrustedData);
if (result.success) {
  // result.data is type-safe
}
```

## Platform Agnostic

This package contains only pure TypeScript with no platform-specific APIs (no Node.js or browser-specific code). It can be imported and used in both client and server environments.
