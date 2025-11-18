# Changelog v0.6.0 - AWS Lambda Support

**Release Date**: 2024-11-17  
**Status**: ✅ Complete (100%)

---

## 🎯 Major Features

### AWS Lambda Native Support

SyntroJS now supports AWS Lambda natively! The same codebase works seamlessly in both REST mode (development) and Lambda mode (production).

**Key Benefits**:
- ✅ Same code works in both REST and Lambda modes
- ✅ Full API Gateway integration with automatic event detection
- ✅ Dynamic routes support (`/users/:id`) with path parameter extraction
- ✅ Same Zod validation schemas work in both modes
- ✅ Tree-shaking optimized bundle size for Lambda deployments
- ✅ Testable adapters independently without full framework

**Usage**:
```typescript
import { SyntroJS } from 'syntrojs';
import { z } from 'zod';

// Lambda mode: rest: false
const app = new SyntroJS({ rest: false, title: 'My API' });

app.post('/users', {
  body: z.object({
    name: z.string().min(1),
    email: z.string().email(),
  }),
  handler: ({ body }) => ({ id: 1, ...body }),
});

// Export handler for AWS Lambda
export const handler = app.handler();
```

**That's it!** Deploy to AWS Lambda. Same validation, same type safety, same code.

---

## 🏗️ Architecture (SOLID + DDD)

### Lambda Adapter System

**Domain Interface** (`ILambdaAdapter`):
- Clean contract for all Lambda adapters
- Located in domain layer (DDD)
- Enables easy extraction to separate packages

**Factory Pattern** (`LambdaAdapterFactory`):
- Centralized adapter management
- Dynamic adapter registration
- Event type detection via `canHandle()` method
- Follows Open/Closed Principle

**Adapters**:
- `ApiGatewayAdapter` - Full API Gateway v1 (REST API) support
  - Event transformation to `RequestDTO`
  - Route matching with pattern support
  - Validation pipeline
  - Response conversion to `LambdaResponse`
- Future adapters: API Gateway v2, SQS, S3, EventBridge (prepared)

**Handler** (`LambdaHandler`):
- Main entry point for AWS Lambda
- Automatic event type detection
- Delegates to appropriate adapter via factory
- Error handling and fallbacks

### Extensible Architecture

**Prepared for Extraction**:
- Adapters implement `ILambdaAdapter` interface
- Factory pattern allows easy registration
- Can be extracted to `@syntrojs/lambda-adapters` package
- Tests can run independently without full framework

**SOLID Principles Applied**:
- **Single Responsibility**: Each adapter handles one event type
- **Open/Closed**: Easy to add new adapters without modifying core
- **Liskov Substitution**: All adapters implement same interface
- **Interface Segregation**: Small, focused `ILambdaAdapter` interface
- **Dependency Inversion**: SyntroJS depends on abstractions, not implementations

---

## ✨ Features

### API Gateway Integration

- ✅ **Event Detection**: Automatic detection of API Gateway events
- ✅ **Request Transformation**: API Gateway events → `RequestDTO` → `RequestContext`
- ✅ **Response Conversion**: Handler results → `LambdaResponse`
- ✅ **Dynamic Routes**: Full support for `/users/:id` patterns
- ✅ **Path Parameters**: Automatic extraction from route patterns
- ✅ **Query Parameters**: Multi-value query string support
- ✅ **Body Parsing**: JSON and base64 encoded body support
- ✅ **Cookie Extraction**: Automatic cookie parsing from headers
- ✅ **Error Handling**: Consistent error responses

### Route Registry Enhancements

- ✅ **Pattern Matching**: `find(method, path)` with regex pattern matching
- ✅ **Parameter Extraction**: `extractPathParams(routePath, requestPath)` pure function
- ✅ **Dynamic Segments**: Support for `:param` syntax
- ✅ **Exact Match Priority**: Exact routes prioritized over patterns

### Validation & Error Handling

- ✅ **Same Zod Schemas**: Works identically in REST and Lambda modes
- ✅ **Validation Pipeline**: Body, params, and query validation
- ✅ **Error Responses**: Consistent error format across modes
- ✅ **404 Handling**: Proper not found responses for missing routes

---

## 📦 Package Exports

### New Lambda Module Export

```json
{
  "exports": {
    "./lambda": {
      "types": "./dist/lambda/index.d.ts",
      "import": "./dist/lambda/index.js"
    }
  }
}
```

**Tree-shaking**: Import only Lambda adapters when needed:
```typescript
import { LambdaHandler } from 'syntrojs/lambda';
```

---

## 🧪 Testing

### Comprehensive Test Suite

**82 tests passing** across Lambda functionality:

- ✅ `LambdaAdapterFactory.test.ts` (22 tests) - Factory pattern tests
- ✅ `RouteRegistry-pattern-matching.test.ts` (12 tests) - Pattern matching tests
- ✅ `ApiGatewayAdapter-unit.test.ts` (15 tests) - Isolated adapter tests
- ✅ `LambdaHandler.test.ts` (11 tests) - Handler tests
- ✅ `ApiGatewayAdapter.test.ts` (12 tests) - Integration tests
- ✅ `SyntroJS-lambda-integration.test.ts` (10 tests) - End-to-end tests

**Test Coverage**:
- Unit tests for adapters (isolated, no framework dependency)
- Integration tests with RouteRegistry and SchemaValidator
- End-to-end tests with full SyntroJS instance
- Pattern matching and parameter extraction tests

---

## 📚 Documentation

### New Documentation Files

- ✅ `docs/LAMBDA_USAGE.md` - Comprehensive Lambda usage guide
- ✅ `docs/LAMBDA_ADAPTERS_EXTRACTION.md` - Architecture and extraction guide
- ✅ `examples/lambda-example/` - Complete Lambda deployment example

### Updated Documentation

- ✅ `README.md` - Lambda mode prominently featured
- ✅ API Reference - `handler()` method documented
- ✅ Configuration - `rest` flag documented

---

## 🔧 Technical Details

### Request/Response Flow

```
API Gateway Event
  ↓
ApiGatewayAdapter.toRequestDTO() (pure function)
  ↓
RequestDTO
  ↓
RouteRegistry.find() (pattern matching)
  ↓
SchemaValidator.validate() (body, params, query)
  ↓
RequestContext (with validated data)
  ↓
Handler execution
  ↓
ApiGatewayAdapter.toLambdaResponse() (pure function)
  ↓
LambdaResponse
```

### Pure Functions

All transformation functions are pure (no side effects):
- `toRequestDTO()` - Event → DTO transformation
- `toLambdaResponse()` - Result → Lambda response
- `extractPathParams()` - Path parameter extraction
- `canHandle()` - Event type detection

### Guard Clauses

Early validation throughout:
- Event validation before processing
- Route existence checks
- Validation result checks
- Mode validation (REST vs Lambda)

---

## 📊 Quality Metrics

- ✅ **82 Lambda tests** passing
- ✅ **100% backward compatible** - No breaking changes
- ✅ **SOLID principles** - All adapters follow SOLID
- ✅ **DDD structure** - Domain interfaces in domain layer
- ✅ **Functional programming** - Pure functions throughout
- ✅ **Guard clauses** - Early validation everywhere

---

## 🚀 Migration Guide

### From REST Mode to Lambda Mode

**Before** (REST mode):
```typescript
const app = new SyntroJS({ title: 'My API' });
await app.listen(3000);
```

**After** (Lambda mode):
```typescript
const app = new SyntroJS({ rest: false, title: 'My API' });
export const handler = app.handler();
```

**That's it!** No code changes needed. Same routes, same validation, same handlers.

---

## 🔮 Future Enhancements

### Planned Adapters

- 🔜 API Gateway v2 (HTTP API) adapter
- 🔜 SQS adapter
- 🔜 S3 adapter
- 🔜 EventBridge adapter

### Extraction Path

Adapters are prepared for extraction to `@syntrojs/lambda-adapters` package:
- Interface-based design (`ILambdaAdapter`)
- Factory pattern for registration
- Independent testability
- See `docs/LAMBDA_ADAPTERS_EXTRACTION.md` for details

---

## 🎓 Principles Applied

### SOLID
- ✅ Single Responsibility - Each adapter handles one event type
- ✅ Open/Closed - Easy to extend without modifying core
- ✅ Liskov Substitution - All adapters interchangeable
- ✅ Interface Segregation - Small, focused interface
- ✅ Dependency Inversion - Depend on abstractions

### DDD
- ✅ Domain Interface - `ILambdaAdapter` in domain layer
- ✅ Application Services - Factory in application layer
- ✅ Infrastructure - Adapters in infrastructure layer

### Functional Programming
- ✅ Pure Functions - All transformations are pure
- ✅ Immutability - No mutations in transformations
- ✅ Composition - Functions compose cleanly

### Guard Clauses
- ✅ Early Validation - Fail fast on invalid input
- ✅ Clear Errors - Descriptive error messages
- ✅ Defensive Programming - Validate at boundaries

---

## 📝 Breaking Changes

**None** - 100% backward compatible. REST mode remains default (`rest: true`).

---

## 🙏 Acknowledgments

This release brings SyntroJS to serverless architectures while maintaining the same developer experience and code quality standards.

---

**Next Release**: v0.7.0 - Router + Advanced Middleware

