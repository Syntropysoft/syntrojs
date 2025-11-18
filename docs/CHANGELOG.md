# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.6.8-alpha.2] - 2024-11-18

### Fixed

- 🐛 **Lambda CORS multiValueHeaders**: Fixed bug where CORS headers returned `"*"` when origin was in `multiValueHeaders`
- 🐛 **Case-Insensitive Headers**: Improved header extraction to handle both `headers` and `multiValueHeaders` formats

### Added

- ✨ **mergeHeaders() Function**: New pure function for merging headers from both API Gateway formats
- ✨ **hasKeyCaseInsensitive() Function**: New pure predicate function for case-insensitive key checking
- ✨ **Comprehensive Documentation**: All methods now document applied principles (SOLID, DDD, FP, Guard Clauses)

### Changed

- 🔧 **extractCookies()**: Now case-insensitive (consistent with `extractOrigin`)
- 🔧 **extractQueryParameters()**: Improved guard clauses and immutability
- 🔧 **parseBody()**: Additional guard clause for empty body
- 🔧 **buildRequestContext()**: Additional guard clauses (method, path)
- 🔧 **validateAndGetData()**: Now passes `requestOrigin` to all validation errors
- 🔧 **ApiGatewayAdapter**: All methods now fully comply with SOLID, DDD, FP, and Guard Clauses

### Alpha Status

⚠️ **This is an alpha release**. Lambda mode CORS bug fix and code quality improvements. Please test thoroughly before using in production.

See [CHANGELOG_v0.6.8-alpha.2.md](./CHANGELOG_v0.6.8-alpha.2.md) for complete details.

## [0.6.8-alpha.1] - 2024-11-18

### Fixed

- 🐛 **Lambda CORS Origin Extraction**: Fixed bug where CORS headers returned `'*'` instead of actual request origin
- 🐛 **Case-Insensitive Headers**: Fixed API Gateway header extraction to handle case-insensitive `Origin` header

### Added

- ✨ **extractOrigin() Function**: New pure function for case-insensitive origin extraction from API Gateway headers
- ✨ **Lambda CORS Integration Tests**: 8 new integration tests for CORS in Lambda mode

### Changed

- 🔧 **ApiGatewayAdapter**: Now uses `extractOrigin()` for consistent origin extraction throughout
- 🔧 **CORS Headers**: All Lambda responses now correctly reflect request origin when `origin: true` is configured

### Alpha Status

⚠️ **This is an alpha release**. Lambda mode CORS bug fix. Please test thoroughly before using in production.

See [CHANGELOG_v0.6.8-alpha.1.md](./CHANGELOG_v0.6.8-alpha.1.md) for complete details.

## [0.6.8-alpha.0] - 2024-12-17

### Added

- ✨ **CORS Support for Lambda**: Added `lambdaCors` configuration option for Lambda mode
- ✨ **Automatic CORS Headers**: All Lambda responses now include CORS headers when configured
- ✨ **OPTIONS Preflight Support**: Automatic handling of OPTIONS preflight requests
- ✨ **Pure Functions**: `buildCorsHeaders()` and `determineAllowedOrigin()` for CORS header generation
- ✨ **OPTIONS Handler**: `handleOptionsRequest()` for preflight request handling

### Changed

- 🔧 **ApiGatewayAdapter**: Now accepts CORS configuration and includes headers in all responses
- 🔧 **LambdaHandler**: Now accepts and passes CORS configuration to adapters
- 🔧 **SyntroJS**: Added `lambdaCors` option to `SyntroJSConfig`

### Alpha Status

⚠️ **This is an alpha release**. CORS support for Lambda is still being tested in production environments. Please test thoroughly before using in production.

See [CHANGELOG_v0.6.8.md](./CHANGELOG_v0.6.8.md) for complete details.

## [0.6.7] - 2024-12-17

### Fixed

- 🐛 **CORS OPTIONS Preflight**: Fixed critical bug where OPTIONS requests returned 404
- 🐛 **CORS Plugin Registration**: Fixed plugin registration order (now registers after routes)
- 🐛 **CORS Headers**: Fixed CORS headers not being added to OPTIONS responses

### Refactoring

- 🔧 **Functional Programming**: Refactored CORS registration to use pure functions
- 🔧 **SOLID Principles**: Improved adherence to Single Responsibility and Dependency Inversion
- 🔧 **DDD**: Better separation of concerns between `SyntroJS` and `FluentAdapter`
- 🔧 **Guard Clauses**: All methods now use early validation with guard clauses

### Added

- ✨ **Pure Functions**: `buildCorsOptions()` - pure function for building CORS options
- ✨ **Pure Predicates**: `shouldRegisterCors()` - pure boolean predicate function
- ✨ **Orchestration Method**: `registerCorsPluginIfEnabled()` - orchestrates CORS registration
- ✨ **State Tracking**: `corsPluginRegistered` flag prevents double registration
- ✨ **Regression Tests**: 6 comprehensive tests to prevent bug from reappearing

### Benefits

- ✅ Fixed critical CORS OPTIONS bug
- ✅ Better code quality following SOLID, DDD, FP principles
- ✅ Improved testability with pure functions
- ✅ Better maintainability with clear separation of concerns
- ✅ Regression prevention through architecture and tests
- ✅ No breaking changes

See [CHANGELOG_v0.6.7.md](./CHANGELOG_v0.6.7.md) for complete details.

## [0.6.6] - 2024-12-17

### Fixed

- 🐛 **Dependency Versioning**: Fixed `@fastify/cors` version compatibility issue
- 🐛 **Peer Dependencies**: Updated `peerDependencies` to only allow `@fastify/cors@^9.0.0` (compatible with Fastify v4)
- 🐛 **Test Failures**: Fixed tests failing due to lazy server initialization

### Changed

- 🔄 **devDependencies**: Updated `@fastify/cors` from `^9.0.0` to `^9.0.1` for better version pinning
- 🔄 **peerDependencies**: Removed `^10.0.0` and `^11.0.0` from `@fastify/cors` peer dependencies (these require Fastify v5)
- 🔄 **API**: `SyntroJS.getRawFastify()` is now async (returns `Promise<FastifyInstance>`) to support lazy initialization

### Benefits

- ✅ Prevents version conflicts
- ✅ Clear compatibility requirements
- ✅ Better error messages when incompatible versions are installed
- ✅ Stable and tested version combination

See [CHANGELOG_v0.6.6.md](./CHANGELOG_v0.6.6.md) for complete details.

## [0.6.5] - 2024-12-17

### Changed

- 🔄 **Async Server Creation**: `FluentAdapter.create()` is now async to ensure plugins are fully registered
- 🔄 **Lazy Server Initialization**: Server instance created lazily when `listen()` is called
- 🔄 **SyntroJS.server**: Changed from `readonly` to mutable for lazy initialization support

### Refactoring

- 🔧 **More Functional Approach**: Server instances created with all configuration applied upfront
- 🔧 **Better Plugin Initialization Order**: Plugins guaranteed to be registered before routes
- 🔧 **Improved Code Quality**: Better adherence to functional programming principles

### Fixed

- 🐛 **Plugin Initialization Race Condition**: Fixed potential race where routes could be registered before plugins were ready
- 🐛 **CORS Plugin Timing**: Ensured CORS plugin is completely registered before routes are added

### Benefits

- ✅ More reliable plugin initialization
- ✅ Better separation of concerns
- ✅ Improved testability with explicit async creation
- ✅ No breaking changes for normal usage

See [CHANGELOG_v0.6.5.md](./CHANGELOG_v0.6.5.md) for complete details.

## [0.6.4] - 2024-11-17

### Fixed

- 🐛 **CORS Configuration**: Fixed CORS plugin registration to include proper options
- 🐛 **OPTIONS Requests**: Fixed preflight CORS requests (OPTIONS) handling
- 🐛 **CORS Headers**: Fixed CORS headers configuration when `cors: true`

### Added

- ✨ **Enhanced CORS**: `cors` now accepts `boolean | CorsOptions` for flexible configuration
- ✨ **Default CORS Options**: Sensible defaults when `cors: true` (includes OPTIONS method)
- 🧪 **4 new tests** for CORS configuration

### Changed

- 🔄 **FluentAdapterConfig.cors**: Changed from `boolean` to `boolean | CorsOptions`
- 🔄 **SyntroJSConfig.fluentConfig.cors**: Changed from `boolean` to `boolean | CorsOptions`
- 🔄 **FluentAdapter.withCors()**: Now accepts `boolean | CorsOptions`

### Benefits

- ✅ Fixed bug with OPTIONS preflight requests
- ✅ Better Developer Experience with clear configuration
- ✅ More flexible CORS configuration support
- ✅ Backward compatible - existing code works without changes

See [CHANGELOG_v0.6.4.md](./CHANGELOG_v0.6.4.md) for complete details.

## [0.6.3] - 2024-11-17

### Added

- ✨ **LambdaAdapterFactory improvements**: `replace()`, `registerOrReplace()`, `getAdapterConfig()`, `hasCustomHandler()` methods
- ✨ **Factory isolation**: `createLambdaAdapterFactory()` function for isolated instances
- ✨ **Adapter inspection**: `hasHandler()` and `getConfig()` methods on SQS, S3, EventBridge adapters
- ✨ **LambdaHandler configuration**: Support for adapter configs and custom factory instances
- ✨ **SyntroJS integration**: `lambdaAdapters` config option for configuring adapters at creation

### Changed

- 🔄 **LambdaHandler**: Now accepts adapter configuration and custom factory
- 🔄 **LambdaHandler**: Uses `registerOrReplace()` instead of `register()` for better flexibility

### Testing

- 🧪 **28 new tests** for factory improvements and configuration features

### Benefits

- ✅ Better Developer Experience - Simpler configuration, less boilerplate
- ✅ Fewer Errors - No need to re-register all adapters
- ✅ Better Testing - Isolated factory instances for test isolation
- ✅ More Maintainable - Cleaner, easier to understand code

See [CHANGELOG_v0.6.3.md](./CHANGELOG_v0.6.3.md) for complete details.

## [0.6.2] - 2024-11-17

### Added

- ✨ **SQS Adapter**: Full support for AWS SQS events with message processing
- ✨ **S3 Adapter**: Full support for AWS S3 events with object event processing
- ✨ **EventBridge Adapter**: Full support for AWS EventBridge events with custom event processing
- 🧪 **37 unit tests** for new adapters
- 🧪 **7 integration tests** for LambdaHandler with new adapters

### Changed

- 🔄 **LambdaHandler**: Automatically registers SQS, S3, and EventBridge adapters
- 📚 **Documentation**: Updated Lambda adapters status in README and usage guides

### Implementation

- ✅ All adapters follow SOLID, DDD, Functional Programming, and Guard Clauses principles
- ✅ Adapters implement `ILambdaAdapter` interface for easy extraction
- ✅ Independent unit tests (no dependencies on SyntroJS core)
- ✅ Factory pattern for adapter management

See [CHANGELOG_v0.6.2.md](./CHANGELOG_v0.6.2.md) for complete details.

## [0.6.1] - 2024-11-17

### Changed

- 🔄 **README.md** - Complete reorganization (911 → 591 lines) for better readability
- 🔄 **Documentation** - Translated Lambda documentation to English
- 🔄 **Version references** - Updated to use `0.6.x` for flexibility

### Documentation

- 📚 README reorganization with better structure
- 📚 Lambda usage guide translated to English
- 📚 Lambda adapters extraction guide translated to English
- 📚 Examples README translated to English

See [CHANGELOG_v0.6.1.md](./CHANGELOG_v0.6.1.md) for complete details.

## [0.6.0] - 2024-11-17

### Added

- ✨ **AWS Lambda Support**: Native Lambda support with `rest: false` flag
  - Same code works in REST mode (development) and Lambda mode (production)
  - Full API Gateway v1 (REST API) integration
  - Dynamic routes with pattern matching (`/users/:id`)
  - Path parameter extraction
  - Tree-shaking optimized bundle exports
- ✨ **Lambda Adapter Architecture**: Clean, extensible adapter system
  - `ILambdaAdapter` interface in domain layer (DDD)
  - `LambdaAdapterFactory` for adapter management
  - `ApiGatewayAdapter` for API Gateway events
  - Prepared for extraction to separate package
- ✨ **Route Registry Enhancements**: Pattern matching and parameter extraction
  - `find(method, path)` with regex pattern matching
  - `extractPathParams()` pure function
  - Support for dynamic route segments (`:param`)
- ✨ **Lambda Module Export**: New `./lambda` export for tree-shaking
- ✨ **Comprehensive Documentation**: Lambda usage guides and examples
  - `docs/LAMBDA_USAGE.md` - Complete usage guide
  - `docs/LAMBDA_ADAPTERS_EXTRACTION.md` - Architecture guide
  - `examples/lambda-example/` - Deployment example

### Changed

- 🔄 **SyntroJS Constructor**: Added `rest?: boolean` config option (default: `true`)
- 🔄 **Route Registry**: Enhanced with pattern matching capabilities
- 🔄 **README**: Lambda mode prominently featured in Quick Start

### Testing

- ✅ **82 Lambda tests** added and passing
- ✅ Unit tests for adapters (isolated)
- ✅ Integration tests with RouteRegistry
- ✅ End-to-end tests with SyntroJS

### Documentation

- 📚 Lambda usage guide
- 📚 Lambda architecture guide
- 📚 Lambda deployment example
- 📚 Updated README with Lambda features

See [CHANGELOG_v0.6.0.md](./CHANGELOG_v0.6.0.md) for complete details.

## [0.5.0] - 2025-11-08

### Added

- ✨ **TOON Format Support**: 40-60% payload reduction
- ✨ **Serialization Architecture Refactor**: ResponseHandler centralized

See [CHANGELOG_v0.5.0.md](./CHANGELOG_v0.5.0.md) for complete details.

## [0.4.0-alpha.3] - 2025-11-05

### 🎯 Critical Bugs Fixed + SOLID Refactoring

This release fixes **2 critical bugs** that broke core functionality in Bun runtime and includes a complete architectural refactoring applying SOLID + DDD principles.

### 🐛 Critical Fixes

#### Bug #1: Path Parameters Never Worked in Bun 🚨
- **Problem**: Routes like `/users/:id` returned empty params `{}`
- **Root Cause**: `buildContext()` didn't receive route, couldn't extract params
- **Impact**: 100% of dynamic routes broken in Bun runtime
- **Fix**: Created pure function `extractPathParams(pathname, routePath)` and injected route
- **Result**: 13 tests recovered, all dynamic routes now work ✅

#### Bug #2: Port Detection Broken 🚨
- **Problem**: `TinyTest` couldn't connect to server (ConnectionRefused errors)
- **Root Cause**: Returned input port (0) instead of actual assigned port from Bun
- **Impact**: 103 E2E tests failing, TinyTest completely unusable in Bun
- **Fix**: Use `this.server.port` (actual port) instead of input parameter
- **Result**: 103 tests recovered (72% improvement) ✅

#### Bug #3: Bun Test Configuration
- **Problem**: `error: preload not found "./vitest.setup.ts"`
- **Root Cause**: bunfig.toml referenced non-existent setup file
- **Fix**: Removed preload line from bunfig.toml
- **Result**: Tests run without errors ✅

#### Bug #4: Benchmark Commands Broken
- **Problem**: All benchmark scripts failed with "file not found"
- **Root Cause**: package.json looked for .cjs files in root, but they're in benchmarks/
- **Fix**: Updated all paths to include benchmarks/ directory
- **Result**: All 5 benchmark commands now work ✅

### ✨ Features

#### File Downloads Support
- **Added**: `FileDownloadHelper` with ergonomic API
  - `createFileDownload()` - Pure function with guard clauses and MIME type detection
  - `ctx.download()` - Context helper for ergonomic API
  - Auto-detection in all adapters (FluentAdapter, FastifyAdapter, BunAdapter)
  - Security: Path traversal protection (blocks `..`, `/`, `\`)
  - Supports Buffer, Stream, and string data
  - Custom MIME types and disposition (attachment/inline)
- **Tests**: 81 tests passing (51 unit + 30 E2E) ✅

#### TinyTest Evolution
- **Added**: `rawRequest()` method for low-level HTTP testing
  - Returns native Fetch `Response` object for fine-grained control
  - Perfect for testing file downloads, headers, and binary data
  - `request()` now uses `rawRequest()` internally (DRY + composition)
  - Backward compatible - existing tests unchanged

### 🏗️ Architectural Improvements

#### SOLID + DDD Refactoring (Complete Overhaul)

**1. Dependency Inversion Principle ✅**
- **Before**: BunAdapter imported concrete implementations directly
  ```typescript
  import { SchemaValidator } from '../application/SchemaValidator'
  SchemaValidator.validateOrThrow(...)
  ```
- **After**: BunAdapter depends on abstractions via constructor injection
  ```typescript
  constructor(
    private validator: IValidator,
    private parser: IRequestParser,
    private serializers: IResponseSerializer[]
  )
  ```

**2. Single Responsibility Principle ✅**
- **Before**: `handleRequest()` was GOD METHOD with 8 responsibilities
- **After**: Specialized services
  - `BunRequestParser`: Only request parsing
  - `SchemaValidator`: Only validation
  - `FileDownloadSerializer`, `StreamSerializer`, `BufferSerializer`, `JsonSerializer`: Only serialization
  - `BunAdapter`: Only orchestration (pipeline)

**3. Open/Closed Principle ✅**
- **Before**: To add new Content-Type, had to modify BunAdapter
- **After**: Strategy Pattern
  - New serializers can be added WITHOUT modifying adapter
  - `serializers.find(s => s.canSerialize(result))`

**4. Pure Functions + Guard Clauses ✅**
- `parsePathParams(pathname, routePath): Record<string, string>` - Pure, testable
- `parseFormData(formData): Record<string, any>` - Pure, testable
- Guard clauses in every flow for defensive programming

**5. DDD Structure ✅**
```
domain/
  ├── interfaces/           # Contracts (Dependency Inversion)
  │   ├── IRequestParser.ts
  │   ├── IValidator.ts
  │   └── IResponseSerializer.ts
application/
  ├── BunRequestParser.ts   # Service implementation
  ├── serializers/          # Strategy implementations
  │   ├── FileDownloadSerializer.ts
  │   ├── StreamSerializer.ts
  │   ├── BufferSerializer.ts
  │   └── JsonSerializer.ts
infrastructure/
  └── BunAdapter.ts         # Depends on abstractions
```

### 📊 Test Results

#### Node.js Runtime
- **728/728 tests passing (100%)** ✅
- Full compatibility with all features
- All plugins working (CORS, Helmet, Compression, RateLimit)

#### Bun Runtime
- **458/487 tests passing (94.0% compatibility)** ✅
- **116 tests recovered** (from 142 failing → 26 failing)
- Core functionality 100% compatible
- 26 failures are Fastify-specific features (plugins, static files)

### 📈 Quality Metrics

- **Coverage**: 77.14% (Statements: 77.14%, Branch: 80.73%, Functions: 73.21%)
- **Mutation Score**: 58.72% (742 killed, 144 survived, 379 no coverage)
- **Performance**: 89.5% of Fastify (Node.js), ~3.8x faster with Bun
- **Code Quality**: 100% SOLID + DDD + Functional Programming + Dependency Injection

#### Top Performers (Mutation Testing)
- `RouteRegistry.ts`: 100% (27 killed, 0 survived)
- `ZodAdapter.ts`: 100% (11 killed, 0 survived)
- `Route.ts`: 100% (8 killed, 0 survived)
- `DependencyInjector.ts`: 95.83% (23 killed, 0 survived)
- `APIKey.ts`: 96.88% (31 killed, 1 survived)
- `BackgroundTasks.ts`: 92.31% (24 killed, 2 survived)

### 🎓 Lessons Learned

1. **Tests Reveal Real Problems**: Tests revealed path params NEVER worked, not just coverage gaps
2. **SOLID Is Practice, Not Theory**: Refactoring to SOLID made code infinitely extensible
3. **Don't Reinvent the Wheel**: Used native Web Standards API instead of custom parsers
4. **Guard Clauses > Nested Ifs**: Defensive programming for clarity
5. **Pure Functions = Testable**: Functions can be tested in isolation

### 📚 Documentation

- **README**: Updated with metrics, condensed for quick reading (640 → 270 lines)
- **Benchmarks**: Updated with latest performance results
- **Bun Limitations**: Documented clearly with comparison tables

### ⚠️ Known Limitations (Bun Runtime)

| Feature | Node.js | Bun | Notes |
|---------|---------|-----|-------|
| Core API | ✅ Full | ✅ Full | 100% compatible |
| Plugins (CORS, Helmet, etc.) | ✅ Full | ⚠️ Warnings | Native impl v0.5.0 |
| Static files | ✅ Full | ❌ Not available | Native impl v0.5.0 |
| `getRawFastify()` | ✅ Works | ❌ Use `getRawServer()` | Type casting issue |

### 🔧 Breaking Changes

None - 100% backward compatible

### 📦 Migration from v0.4.0-alpha.2

No changes required. All existing code continues to work.

## [0.4.0-alpha.2] - 2025-11-04

### 🐛 Critical Fixes

#### ErrorHandler - Dynamic Imports Compatibility
- **FIXED**: `instanceof` paradox with dynamic imports in `FluentAdapter`
  - **Problem**: When `FluentAdapter` uses `createErrorHandlerFactory()` with dynamic imports, `instanceof` checks fail because classes are loaded in different module contexts
  - **Root Cause**: Default exception handlers registered with `.register()` rely on `instanceof` which breaks across module boundaries
  - **Solution**: Removed default handler registration, implemented structural typing (NestJS-style)
  - **Implementation**: Check `statusCode` property instead of `instanceof` for HTTPException detection
  - **Result**: Works reliably with both regular imports AND dynamic imports
  - **Principle**: SOLID - Dependency on abstraction (statusCode property) not implementation (instanceof)

#### Test Suite Updates
- **Updated**: Background tasks E2E test timeout (100ms → 200ms) for system overhead
- **Fixed**: Form-urlencoded test expectations to match `@fastify/formbody` behavior
- **Updated**: ErrorHandler tests to reflect new structural typing approach

### ✅ Test Coverage

- **647 tests passing** in syntrojs core (100%)
- **114 E2E tests passing** (100%)  
- **16 tests passing** in syntrojs-examples (100%)
- **All functionality validated** with version local workspace

### 🛠️ Developer Experience

#### New Testing Tools
- ✨ **test-version.sh** - Automated script for testing local vs npm versions
  - `./test-version.sh local` - Test with workspace version
  - `./test-version.sh npm 0.4.0-alpha.1` - Test with npm version
  - `./test-version.sh both` - Test both versions
- ✨ **TEST-GUIDE.md** - Complete documentation for testing workflow

#### Workspace Configuration
- **Updated**: `pnpm-workspace.yaml` - Added `syntrojs-examples` to workspace
- **Updated**: `syntrojs-examples/package.json` - Now uses `workspace:*` for local development

### 📚 Documentation Updates

#### README.md
- **Updated**: v0.4.0 roadmap progress (40% → 60%)
- **Marked Complete**:
  - ✅ File uploads (multipart/form-data) with FileValidator
  - ✅ Form data (application/x-www-form-urlencoded)
  - ✅ Raw text/binary support (Buffer responses)
  - ✅ File download responses (Streaming + Buffer)

### 🔧 Technical Details

**ErrorHandler Priority Order** (NestJS-inspired):
1. Custom handlers (`.register()`) - Allows user overrides
2. HTTPException with `statusCode` - Structural typing (works with dynamic imports)
3. Fallback `instanceof` checks - Backward compatibility

**Key Architectural Decisions**:
- Structural typing over `instanceof` for cross-module reliability
- No default handlers to avoid paradox
- Custom handlers for explicit overrides only
- Follows SOLID principles and functional programming

### 🎯 Validation

All tests passing with local workspace version:
- ✅ Core library (syntrojs)
- ✅ Examples (syntrojs-examples)
- ✅ E2E tests complete
- ✅ Ready for npm publish

## [0.3.0] - 2025-01-17

### 🏗️ Architectural Evolution Release

Major architectural refactoring implementing SOLID, DDD, Functional Programming, and Guard Clauses throughout the entire codebase. This release introduces the Factory Pattern for type safety, eliminates imperative code, and maintains the simple public API while providing robust internal architecture.

### Added

#### Factory Pattern Implementation
- ✨ **Factory Pattern** - Complete implementation for type safety
  - `SchemaFactory` - Type-safe schema validation with Zod optimization
  - `DependencyResolverFactory` - Type-safe dependency injection
  - `ErrorHandlerFactory` - Centralized error handling with validation detection
  - `MiddlewareFactory` - Type-safe middleware management
- ✨ **Type Safety** - Eliminated all `any` type casts
- ✨ **Pure Functions** - All factory methods are pure functions
- ✨ **Immutable Configurations** - All factory configs are immutable

#### Middleware System
- ✨ **Functional Middleware** - Simple, conversational API
  - `app.use(middleware)` - Global middleware
  - `app.use('/path', middleware)` - Path-specific middleware
  - `app.use(middleware, { priority: 10 })` - Priority-based execution
- ✨ **MiddlewareRegistry** - Immutable registry with functional operations
- ✨ **Guard Clauses** - Robust validation for all middleware operations
- ✨ **Composition** - Functional composition of middleware chains

#### WebSocket System
- ✨ **Conversational WebSocket API** - Simple, fun coding style
  - `app.ws('/chat', handler)` - Register WebSocket handlers
  - `ws.on('message', callback)` - Event-based handling
  - `ws.on('disconnect', callback)` - Connection lifecycle
- ✨ **WebSocketRegistry** - Immutable registry for WebSocket handlers
- ✨ **Room Management** - Basic broadcasting and room functionality
- ✨ **Path Parameters** - Support for dynamic WebSocket paths

#### Architectural Principles
- ✨ **SOLID Principles** - Applied throughout entire codebase
  - Single Responsibility - Each class has one clear purpose
  - Open/Closed - Extensible without modification
  - Liskov Substitution - Consistent interfaces
  - Interface Segregation - Specific interfaces for each operation
  - Dependency Inversion - Depend on abstractions
- ✨ **Domain-Driven Design (DDD)** - Clean domain boundaries
  - Domain Services - Business logic encapsulation
  - Value Objects - Immutable data structures
  - Aggregates - Consistent data boundaries
- ✨ **Functional Programming** - Pure functions and immutability
  - Pure Functions - No side effects
  - Immutability - Data cannot be modified after creation
  - Composition - Building complex behavior from simple functions
  - Higher-Order Functions - Functions that operate on functions
- ✨ **Guard Clauses** - Early validation and fail-fast patterns
  - Input validation at method boundaries
  - Clear error messages for invalid inputs
  - Consistent validation patterns

#### Dead Code Elimination
- ✨ **Code Cleanup** - Removed unused files and exports
  - Removed `SmartSyntroJS.ts` - Superseded by `FluentAdapter`
  - Removed `SmartAdapter.ts` - Superseded by `FluentAdapter`
  - Removed `SyntroWebSocket.ts` - Dead code
  - Removed `functional-utils.ts` - Utilities integrated elsewhere
  - Removed `guard-clauses.ts` - Clauses integrated into methods
  - Removed `solid-improvements.ts` - Concepts integrated into architecture
  - Removed `SmartMutatorWrapper.ts` - Redundant functionality
  - Removed `FLUENT_API_IMPROVEMENTS.md` - Obsolete documentation
- ✨ **Export Cleanup** - Removed unused exports
  - Removed `SmartMutatorSingleton` and `createSmartMutator` exports
  - Cleaned up `src/testing/index.ts` exports

### Changed

#### Internal Architecture
- 🔄 **Complete Refactoring** - All core modules refactored
  - `TinyApi.ts` - Applied SOLID, DDD, Functional Programming
  - `FluentAdapter.ts` - Factory Pattern integration
  - `MiddlewareRegistry.ts` - Immutable operations
  - `WebSocketRegistry.ts` - Immutable operations
  - `factories.ts` - Pure functions and immutability
- 🔄 **Type Safety** - Eliminated all `any` casts
- 🔄 **Error Handling** - Centralized with Factory Pattern
- 🔄 **Dependency Injection** - Type-safe with Factory Pattern
- 🔄 **Schema Validation** - Optimized with Factory Pattern

#### Test Coverage
- 🔄 **Comprehensive Testing** - New test files for increased coverage
  - `TinyApi-comprehensive.test.ts` - Complete TinyApi coverage
  - `FluentAdapter-comprehensive.test.ts` - Complete FluentAdapter coverage
  - `MiddlewareRegistry-comprehensive.test.ts` - Complete MiddlewareRegistry coverage
  - `WebSocketRegistry-comprehensive.test.ts` - Complete WebSocketRegistry coverage
- 🔄 **Functional Test Helpers** - Pure functions for test setup
- 🔄 **E2E Tests** - All passing with new architecture

### Fixed

#### Type Safety
- 🐛 **Factory Pattern Types** - Correct return types for all factories
- 🐛 **Error Response Structure** - Proper `detail` and `errors` fields
- 🐛 **Dependency Resolution** - Correct cleanup function handling
- 🐛 **Schema Validation** - Zod optimization without `Object.freeze`

#### Test Failures
- 🐛 **All Tests Passing** - 552 tests passed, 2 skipped
- 🐛 **E2E Tests** - All integration tests working
- 🐛 **Unit Tests** - All unit tests working
- 🐛 **Coverage** - 80.54% statements, 83.62% branch coverage

### Performance

#### Maintained Performance
- ⚡ **Same Performance** - No performance regression
- ⚡ **Type Safety Overhead** - Minimal impact from Factory Pattern
- ⚡ **Tree Shaking** - Still works with new architecture
- ⚡ **Dual Runtime** - Node.js and Bun support maintained

### Documentation

#### Updated Documentation
- 📚 **README.md** - Updated with Middleware and WebSocket features
- 📚 **Performance Claims** - Corrected to realistic 3.8x Bun performance
- 📚 **Test Coverage** - Updated coverage percentages
- 📚 **Architecture** - Documented new architectural principles

## [0.2.0] - 2025-10-17

### 🚀 Advanced Features Release

Major update bringing TinyApi to feature parity with FastAPI's advanced capabilities. This release adds Dependency Injection, Background Tasks, complete Security modules, Testing utilities, and Production-ready plugins.

### Added

#### Security & Authentication
- ✨ **OAuth2PasswordBearer** - Complete OAuth2 password flow implementation
  - Bearer token extraction and validation
  - WWW-Authenticate headers
  - Integration with JWT utilities
- ✨ **HTTPBearer** - Generic Bearer token authentication
- ✨ **HTTPBasic** - HTTP Basic authentication with Base64 decoding
  - Username/password extraction
  - Support for special characters in credentials
- ✨ **APIKey Authentication** - Three variants:
  - `APIKeyHeader` - API keys in custom headers
  - `APIKeyCookie` - API keys in cookies
  - `APIKeyQuery` - API keys in query parameters
- ✨ **JWT Utilities** - Complete JWT implementation
  - `signJWT()` - Create JWTs with multiple algorithms (HS256, HS384, HS512)
  - `verifyJWT()` - Verify JWT signatures and expiration
  - `decodeJWT()` - Decode without verification
  - Support for custom claims and expiration times

#### Dependency Injection
- ✨ **DI System** - Simple and powerful dependency injection
  - Singleton scope - Share instances across all requests
  - Request scope - Fresh instance per request
  - Automatic cleanup after requests
  - Support for async factories
  - Type-safe injection with `inject()` helper
- ✨ **Context Access** - Dependencies can access request context
- ✨ **Cleanup Hooks** - Automatic resource cleanup (DB connections, file handles)

#### Background Tasks
- ✨ **BackgroundTasks** - In-process non-blocking task execution
  - Fire-and-forget pattern
  - Access to request context
  - Automatic error handling
  - Performance warnings for slow tasks (>100ms)
  - Available in handler context as `background`
- ⚠️ **Documentation** - Clear guidance on when to use external queues (BullMQ, RabbitMQ)

#### Plugins
- ✨ **CORS Plugin** - Cross-Origin Resource Sharing
  - Wrapper for `@fastify/cors`
  - Configurable origins, methods, headers
  - Credentials support
- ✨ **Helmet Plugin** - Security headers
  - Wrapper for `@fastify/helmet`
  - Content Security Policy
  - HSTS, X-Frame-Options, and more
- ✨ **Compression Plugin** - Response compression
  - Wrapper for `@fastify/compress`
  - Gzip, Deflate, Brotli support
  - Configurable threshold
- ✨ **Rate Limiting Plugin** - Request rate limiting
  - Wrapper for `@fastify/rate-limit`
  - Configurable limits and time windows
  - Custom key generators
  - Ban support

#### Testing Utilities
- ✨ **TinyTest** - Testing wrapper for TinyApi
  - `expectSuccess()` - Test successful responses
  - `expectError()` - Test error responses
  - `testBoundaries()` - Automatic boundary testing
  - `testContract()` - Schema contract validation
  - `testProperty()` - Property-based testing
  - Server lifecycle management
- ✨ **SmartMutator** - Optimized mutation testing
  - Route-aware mutation analysis
  - 100x faster than vanilla Stryker
  - Stryker-compatible (same results, auditable)
  - Incremental mode support
  - Watch mode support

### Changed

- 🔧 **Server Binding** - Changed default host from `0.0.0.0` to `::` for dual-stack IPv4/IPv6 support
  - Fixes connection issues on macOS and modern systems
  - Better compatibility across platforms
- 🔧 **Error Response Format** - Consistent use of `detail` field (FastAPI-style)
- 🔧 **Version** - Bumped to 0.2.0 in exports

### Improved

- 📈 **Test Coverage** - Increased from 278 to 554 tests
  - Unit tests for all security modules
  - E2E tests for authentication flows
  - Plugin integration tests
- 📈 **Coverage Metrics** - Improved from 90% to 98%+
  - Statements: 98.05%
  - Branches: 94.03%
  - Functions: 99.29%
  - Lines: 98.05%

### Fixed

- 🐛 **IPv6 Support** - Server now listens on both IPv4 and IPv6
- 🐛 **TypeScript Strict Mode** - Fixed all undefined handling in JWT utilities
- 🐛 **Fastify Cookies** - Proper type handling for cookie plugin integration

### Documentation

- 📖 **docs/BACKGROUND_TASKS.md** - Complete guide for background tasks
- 📖 **docs/TINYTEST.md** - Testing utilities documentation
- 📖 **Example Apps**:
  - `example-app/src/security-example.ts` - Security modules showcase
  - `example-app/src/plugins-example.ts` - Plugins usage examples
  - `example-app/src/advanced-example.ts` - DI + Background tasks

### Dependencies

- ➕ **Added dev dependencies**:
  - `@fastify/cors` ^9.0.0
  - `@fastify/helmet` ^11.1.1
  - `@fastify/compress` ^7.0.0
  - `@fastify/rate-limit` ^9.1.0
- ➕ **Declared peer dependencies** (all optional) for plugins

### Quality Metrics

- ✅ **98.05%** Statement Coverage (↑ from 90.71%)
- ✅ **94.03%** Branch Coverage (↑ from 91.57%)
- ✅ **99.29%** Function Coverage (↑ from 94.04%)
- ✅ **554 Tests** Passing (↑ from 278)
- ✅ **0 Known Vulnerabilities**
- ✅ **~87%** Estimated Mutation Score (SmartMutator)

### Breaking Changes

None - Fully backward compatible with v0.1.0

### Migration from v0.1.0

No changes required. All v0.1.0 code continues to work. New features are additive.

---

## [0.1.0] - 2025-10-15

### 🎉 Initial Release - MVP Core

TinyApi's first release! A FastAPI-inspired framework for Node.js with complete type-safety, automatic validation, and automatic OpenAPI documentation.

### Added

#### Core Features
- ✨ **TinyApi Class** - Main facade for building APIs
- ✨ **Route Registration** - Support for GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS
- ✨ **Automatic Validation** - Zod schema validation for params, query, body, and response
- ✨ **Type Safety** - Full TypeScript type inference from Zod schemas
- ✨ **Error Handling** - FastAPI-style HTTPException hierarchy
  - `HTTPException` (base class)
  - `BadRequestException` (400)
  - `UnauthorizedException` (401)
  - `ForbiddenException` (403)
  - `NotFoundException` (404)
  - `ConflictException` (409)
  - `ValidationException` (422)
  - `InternalServerException` (500)
  - `ServiceUnavailableException` (503)
- ✨ **Custom Exception Handlers** - Register handlers for specific error types

#### Documentation
- 📚 **OpenAPI 3.1 Generation** - Automatic spec generation from Zod schemas
- 📚 **Swagger UI** - Interactive API docs at `/docs`
- 📚 **ReDoc** - Alternative docs UI at `/redoc`
- 📚 **OpenAPI JSON** - Spec available at `/openapi.json`
- 📚 **Metadata Support** - Tags, summary, description, operationId, deprecated

#### Infrastructure
- ⚡ **Fastify Integration** - High-performance HTTP server
- 🔒 **SOLID Architecture** - Domain-Driven Design with clear layer separation
- 🧪 **Comprehensive Tests** - 278 tests with >90% coverage
  - Unit tests (domain, application, infrastructure)
  - Integration tests
  - End-to-end tests
- 🏗️ **Singletons** - Module pattern for all services
- 🛡️ **Guard Clauses** - Fail-fast validation everywhere
- 🎯 **Functional Programming** - Immutability and pure functions

### Architecture

```
src/
├── domain/           # Pure entities (Route, HTTPException, types)
├── application/      # Business logic (RouteRegistry, SchemaValidator, ErrorHandler, OpenAPIGenerator, DocsRenderer)
├── infrastructure/   # External adapters (FastifyAdapter, ZodAdapter)
└── core/             # Public API (TinyApi class)
```

### Quality Metrics

- ✅ **90.71%** Statement Coverage
- ✅ **91.57%** Branch Coverage
- ✅ **94.04%** Function Coverage
- ✅ **90.71%** Line Coverage
- ✅ **278 Tests** Passing
- ✅ **0 Known Vulnerabilities**

### Documentation

- 📖 [README.md](./README.md) - Quick start and overview
- 📖 [ROADMAP.md](./ROADMAP.md) - Complete implementation plan
- 📖 [PHILOSOPHY.md](./PHILOSOPHY.md) - Project philosophy and principles
- 📖 [SMART_MUTATOR.md](./SMART_MUTATOR.md) - Mutation testing strategy
- 📖 [examples/](./examples/) - Code examples

### Developer Experience

- 🚀 Zero configuration required
- 🚀 TypeScript strict mode by default
- 🚀 Automatic type inference
- 🚀 Clear error messages
- 🚀 Hot reload support

### Performance

- ⚡ Built on Fastify (one of the fastest Node.js frameworks)
- ⚡ No overhead from validation (Zod is highly optimized)
- ⚡ Minimal boilerplate

### Known Limitations

- ⚠️ **Background Tasks** - Not implemented yet (planned for v0.2.0)
- ⚠️ **Dependency Injection** - Not implemented yet (planned for v0.2.0)
- ⚠️ **Security Utilities** - OAuth2, API Keys not implemented yet (planned for v0.2.0)
- ⚠️ **File Uploads** - Not implemented yet (planned for v0.3.0)
- ⚠️ **WebSockets** - Not implemented yet (planned for v0.3.0)

### Breaking Changes

N/A - First release

### Migration Guide

N/A - First release

---

## Roadmap

### v0.2.0 - Advanced Features (Planned)
- Dependency Injection
- Background Tasks
- Security (OAuth2, API Keys)
- Plugins (CORS, Helmet, Compression, Rate Limiting)
- TinyTest wrapper
- SmartMutator MVP

### v1.0.0 - Production Ready (Planned)
- File uploads
- WebSockets
- Performance benchmarks
- Complete documentation
- Migration guides
- >90% coverage + >85% mutation score

See [ROADMAP.md](./ROADMAP.md) for the complete plan.

---

## Credits

TinyApi is heavily inspired by:
- [FastAPI](https://fastapi.tiangolo.com/) (Python) - For the amazing DX
- [Fastify](https://www.fastify.io/) (Node.js) - For the performance
- [Zod](https://zod.dev/) (TypeScript) - For the validation

---

**Thank you to all contributors and early adopters! 🙏**

[unreleased]: https://github.com/yourusername/tinyapi/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/yourusername/tinyapi/releases/tag/v0.1.0

