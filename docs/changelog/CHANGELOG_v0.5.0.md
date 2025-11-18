# Changelog v0.5.0 - TOON Format + Serialization Refactor

**Release Date**: 2025-11-08  
**Status**: ✅ Complete (100%)

---

## 🎯 Major Features

### TOON Format Support (40-60% Bandwidth Reduction)

SyntroJS now supports TOON format - the sweet spot between JSON's simplicity and gRPC's efficiency.

**Key Benefits**:
- 40-60% smaller payloads than JSON
- Human-readable (debug with curl)
- No compilation needed (unlike protobuf)
- Zero tooling required
- Works with any HTTP client

**Implementation**:
```typescript
import { SyntroJS, TOONSerializer } from 'syntrojs';

const app = new SyntroJS();

// Register TOON serializer
app.getSerializerRegistry().register(
  new TOONSerializer(), 
  'TOON', 
  ['application/toon']
);

// Use via Accept header
// curl -H "Accept: application/toon" http://localhost:3000/users
```

**Package**: Uses official `@toon-format/toon` package (11.8k stars)

---

## 🏗️ Architecture Refactor (SOLID)

### ResponseHandler Centralization

Created `ResponseHandler` class that all adapters use via composition:

**Benefits**:
- Single source of truth for serialization
- Eliminates code duplication
- Runtime-agnostic design
- O(1) content negotiation

### Serialization Interface Redesign

Changed `IResponseSerializer` to return DTOs instead of Web Standard Response:

**Before**:
```typescript
serialize(result, statusCode, request): Response | null
```

**After**:
```typescript
serialize(result, statusCode, request): SerializedResponseDTO | null
```

**Why**: Removes coupling to Web Standard API, enables true runtime-agnosticism.

### Adapter Unification

**Removed** (duplicate implementations):
- FastifyAdapter
- UltraFastifyAdapter
- UltraFastAdapter
- UltraMinimalAdapter

**Kept** (clean separation):
- FluentAdapter (Node.js) - Configurable, tree-shakeable
- BunAdapter (Bun) - Maximum performance

**Result**: Bundle reduced from 211KB → 190KB (-21KB, -10%)

---

## 🐛 Bug Fixes

### FluentAdapter Builder Pattern

Fixed `createWithConfig()` not copying all instance properties:

**Issue**: Builder created new instances but only copied `middlewareRegistry`, leaving `schemaFactories`, `dependencyFactories`, and `responseHandler` as undefined.

**Fix**: Now copies ALL instance properties correctly.

**Impact**: Fixed 42 failing tests related to validation and dependency injection.

### Logger Configuration

Fixed logger ignoring user configuration:

**Issue**: `standard()` preset forced `logger: true`, overriding user config.

**Fix**: Respect user config, default to `false` (quiet).

**Philosophy**: Convention over Configuration - sensible defaults that can be overridden.

### Content Negotiation

Fixed Accept header parsing for multiple content types:

**Issue**: `"application/toon, application/json"` only checked first serializer.

**Fix**: Parse all content types in priority order, try each in sequence.

---

## 📊 Test Results

### Before Refactor
- syntrojs: 672 passed, 42 failed
- syntrojs-examples: 48 passed, 36 failed
- **Total**: 720 passed, 78 failed

### After Refactor
- syntrojs: 714 passed, 0 failed, 3 skipped ✅
- syntrojs-examples: 84 passed, 0 failed ✅
- **Total**: 798 passed, 0 failed (100%)

**Improvement**: +78 tests fixed

---

## 📦 Bundle Size

- **Before**: 211KB
- **After**: 190KB
- **Reduction**: -21KB (-10%)

---

## 🔄 Breaking Changes

**None for end users**. Public `SyntroJS` API remains unchanged.

**For custom serializer authors**: Update return type from `Response | null` to `SerializedResponseDTO | null`.

---

## 🎯 Files Changed

**Added**:
- `src/application/ResponseHandler.ts` - Centralized serialization
- `src/application/serializers/TOONSerializer.ts` - TOON support

**Modified**:
- `src/domain/interfaces/IResponseSerializer.ts` - DTO-based interface
- All serializers (JSON, Custom, Redirect, etc.) - Return DTOs
- `src/infrastructure/FluentAdapter.ts` - Uses ResponseHandler, builder fix
- `src/infrastructure/BunAdapter.ts` - Uses ResponseHandler
- `src/application/SerializerRegistry.ts` - O(1) content negotiation
- `src/core/SyntroJS.ts` - Simplified adapter selection

**Removed**:
- `src/infrastructure/FastifyAdapter.ts`
- `src/infrastructure/UltraFastifyAdapter.ts`
- `src/infrastructure/UltraFastAdapter.ts`
- `src/infrastructure/UltraMinimalAdapter.ts`
- 10 obsolete tests (TinyTest references)

**Stats**:
- 39 files changed
- +918 insertions
- -5,879 deletions

---

## 📚 Documentation

- New: `REFACTOR-SERIALIZATION.md` - Technical architecture documentation
- New: `.changeset/serialization-refactor.md` - Release changeset
- Updated: `README.md` - Complete API Reference with all features

---

## 🙏 Credits

This release represents a complete architectural overhaul applying SOLID principles throughout. Special thanks to the TOON Format team for their excellent package.

---

## 🚀 What's Next?

**v0.6.0** will focus on:
- Native Bun plugins
- Server-Sent Events (SSE)
- CSRF protection
- Performance optimizations

