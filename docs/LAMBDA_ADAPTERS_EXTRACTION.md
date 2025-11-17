# Lambda Adapters Extraction to Separate Package

## 📋 Objective

This document explains how Lambda adapters are prepared to be extracted to a separate package (`@syntrojs/lambda-adapters`) in the future, while maintaining compatibility with SyntroJS core.

---

## 🏗️ Current Architecture

### Structure Prepared for Extraction

```
syntrojs/
├── src/
│   ├── domain/
│   │   └── interfaces/
│   │       └── ILambdaAdapter.ts      # ✅ Shared interface (stays in core)
│   ├── lambda/
│   │   ├── adapters/
│   │   │   ├── ApiGatewayAdapter.ts   # 🔄 Can be moved to separate package
│   │   │   └── LambdaAdapterFactory.ts # 🔄 Can be moved to separate package
│   │   ├── handlers/
│   │   │   └── LambdaHandler.ts       # ✅ Stays in core (uses factory)
│   │   ├── types.ts                    # ✅ Shared types (stays)
│   │   └── index.ts                    # ✅ Public exports
```

---

## 🔄 Future Extraction Plan

### Step 1: Create Separate Package

```bash
# Structure of the new package
@syntrojs/lambda-adapters/
├── src/
│   ├── adapters/
│   │   ├── ApiGatewayAdapter.ts
│   │   ├── SQSAdapter.ts
│   │   ├── S3Adapter.ts
│   │   └── EventBridgeAdapter.ts
│   ├── factory/
│   │   └── LambdaAdapterFactory.ts
│   └── index.ts
├── package.json
└── tsconfig.json
```

### Step 2: Package Dependencies

```json
{
  "name": "@syntrojs/lambda-adapters",
  "version": "1.0.0",
  "peerDependencies": {
    "syntrojs": "^0.6.x"
  },
  "dependencies": {
    "zod": "^3.22.4"
  }
}
```

### Step 3: Implement ILambdaAdapter

Adapters in the separate package implement the SyntroJS interface:

```typescript
// @syntrojs/lambda-adapters/src/adapters/ApiGatewayAdapter.ts
import type { ILambdaAdapter } from 'syntrojs/domain/interfaces';
import type { LambdaResponse } from 'syntrojs/lambda/types';

export class ApiGatewayAdapter implements ILambdaAdapter {
  getEventType(): string {
    return 'api-gateway';
  }

  canHandle(event: unknown): boolean {
    // Implementation
  }

  async handle(event: unknown): Promise<LambdaResponse> {
    // Implementation
  }
}
```

### Step 4: Usage in SyntroJS

```typescript
// src/lambda/handlers/LambdaHandler.ts
import { lambdaAdapterFactory } from '../adapters/LambdaAdapterFactory';
// In the future:
// import { ApiGatewayAdapter } from '@syntrojs/lambda-adapters';

constructor(config: LambdaHandlerConfig = {}) {
  // Option 1: Use internal adapters (current)
  const apiGatewayAdapter = new ApiGatewayAdapter(routeRegistry, validator);
  this.adapterFactory.register('api-gateway', apiGatewayAdapter);

  // Option 2: Use external adapters (future)
  // import { ApiGatewayAdapter } from '@syntrojs/lambda-adapters';
  // const apiGatewayAdapter = new ApiGatewayAdapter(routeRegistry, validator);
  // this.adapterFactory.register('api-gateway', apiGatewayAdapter);
}
```

---

## ✅ Principles Applied

### SOLID

1. **Single Responsibility**: Each adapter has a single responsibility
2. **Open/Closed**: Easy to add new adapters without modifying core
3. **Liskov Substitution**: All adapters implement `ILambdaAdapter`
4. **Interface Segregation**: Small and specific interface
5. **Dependency Inversion**: SyntroJS depends on `ILambdaAdapter`, not concrete implementations

### DDD

- **Domain Interface**: `ILambdaAdapter` is in domain layer
- **Infrastructure**: Adapters are in infrastructure layer
- **Separation**: Core does not depend on specific implementations

### Functional Programming

- **Pure Functions**: `getEventType()`, `canHandle()` are pure
- **Immutability**: Factory does not mutate adapters after registration
- **Composition**: Factory composes adapters dynamically

### Guard Clauses

- Early validation in all methods
- Clear and descriptive errors
- Early exit on error

---

## 🧪 Independent Testing

Adapters can be tested completely isolated:

```typescript
// Test adapter without SyntroJS
import { ApiGatewayAdapter } from '@syntrojs/lambda-adapters';
import { MockRouteRegistry, MockValidator } from './mocks';

describe('ApiGatewayAdapter - Isolated', () => {
  it('should implement ILambdaAdapter', () => {
    const adapter = new ApiGatewayAdapter(mockRegistry, mockValidator);
    expect(adapter.getEventType()).toBe('api-gateway');
    expect(adapter.canHandle(validEvent)).toBe(true);
  });
});
```

---

## 📦 Gradual Migration

### Phase 1: Preparation (Current)
- ✅ `ILambdaAdapter` interface created
- ✅ Factory pattern implemented
- ✅ Adapters implement interface
- ✅ Independent unit tests

### Phase 2: Extraction
1. Create `@syntrojs/lambda-adapters` package
2. Move adapters to new package
3. Maintain compatibility with SyntroJS core
4. Update imports in SyntroJS

### Phase 3: External Usage
```typescript
// Users can use external adapters
import { SyntroJS } from 'syntrojs';
import { ApiGatewayAdapter } from '@syntrojs/lambda-adapters';

const app = new SyntroJS({ rest: false });
// Register external adapter
lambdaAdapterFactory.register('api-gateway', new ApiGatewayAdapter(...));
```

---

## 🔍 Advantages of Current Structure

1. **Testability**: Adapters can be tested without full SyntroJS
2. **Extensibility**: Easy to add new adapters
3. **Separation**: Core does not depend on specific implementations
4. **Reusability**: Adapters can be used in other projects
5. **Maintainability**: Changes in adapters do not affect core

---

## 🔌 Lambda Adapters Status

### ✅ Implemented

- ✅ **API Gateway**: Full support for API Gateway REST API (v1) events
- ✅ **SQS**: SQS event adapter with message processing support
- ✅ **S3**: S3 event adapter with object event processing support
- ✅ **EventBridge**: EventBridge event adapter with custom event processing support

### ⏳ Coming Soon

- ⏳ **API Gateway HTTP API (v2)**: HTTP API v2 adapter (planned)

---

## 📝 Extraction Checklist

- [x] `ILambdaAdapter` interface created in domain layer
- [x] Factory pattern implemented
- [x] Adapters implement interface
- [x] Independent unit tests created
- [x] API Gateway adapter implemented
- [x] SQS adapter implemented
- [x] S3 adapter implemented
- [x] EventBridge adapter implemented
- [ ] Separate package created
- [ ] Adapters moved to new package
- [ ] Migration documentation
- [ ] Usage examples updated

---

**Last updated**: 2024-11-17
**Status**: Structure prepared, ready for extraction when needed
