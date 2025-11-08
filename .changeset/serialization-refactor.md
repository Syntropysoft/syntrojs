---
"syntrojs": major
---

# Serialization Architecture Refactor

## 🎯 Major Improvements

### ResponseHandler Centralization
- Created `ResponseHandler` class for centralized serialization
- All adapters use it via composition (SOLID principle)
- Eliminates code duplication across adapters

### Interface Redesign
- `IResponseSerializer` now returns `SerializedResponseDTO` instead of `Response`
- Runtime-agnostic design enables true portability
- JSON serializers return raw objects (runtime serializes efficiently)
- Text serializers (TOON, HTML) return pre-serialized strings

### Adapter Unification
- **Removed**: FastifyAdapter, UltraFastifyAdapter, UltraFastAdapter, UltraMinimalAdapter
- **Kept**: FluentAdapter (Node.js), BunAdapter (Bun)
- Reduced bundle size: 211KB → 190KB (-10%)

### Content Negotiation
- O(1) lookup by content-type
- Proper Accept header parsing (handles multiple types)
- Serializers can decline via `null` return (chain pattern)

### TOON Support
- Integrated official `@toon-format/toon` package
- 40-60% bandwidth reduction for uniform data
- Full content negotiation support

## 🐛 Bug Fixes

- Fixed FluentAdapter builder not copying instance properties
- Fixed standard preset to enable DI and BackgroundTasks by default
- Fixed content negotiation for multi-value Accept headers

## 📊 Test Results

- **syntrojs**: 100% passing (714/717 tests, 3 skipped)
- **syntrojs-examples**: 100% passing (84/84 tests)
- **Fixed**: 78 previously failing tests

## 🔄 Migration

No breaking changes for end users. Internal adapter APIs changed but public SyntroJS API is unchanged.

Custom serializers need to update their return type from `Response | null` to `SerializedResponseDTO | null`.

## 💡 Design Principles Applied

- **Single Responsibility**: Serializers choose format, adapters handle runtime
- **Composition over Inheritance**: Adapters compose ResponseHandler
- **Convention over Configuration**: Sensible defaults, customization available
- **Open/Closed**: New serializers without modifying adapters
- **Dependency Inversion**: Adapters depend on abstractions (ResponseHandler)

