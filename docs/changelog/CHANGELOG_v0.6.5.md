# Changelog v0.6.5

**Release Date:** 2024-12-17

## 🎯 Summary

This release refactors the server creation process to be more functional and clean, ensuring that plugins (including CORS) are completely registered before routes are registered. This improves code quality, maintainability, and ensures proper plugin initialization order.

## ✨ Changes

### 🔧 Refactoring

#### Async Server Creation

- **`FluentAdapter.create()` is now async**: The method now properly awaits plugin registration before returning the Fastify instance, ensuring all plugins (including CORS) are fully initialized.
- **Lazy server initialization**: The server instance in `SyntroJS` is now created lazily when `listen()` is called, rather than during constructor initialization. This ensures:
  - Plugins are completely registered before routes
  - Better separation of concerns
  - More functional approach (no mutations after creation)

#### Code Quality Improvements

- **More functional approach**: Server instances are created with all configuration applied upfront, avoiding mutations after creation.
- **Better plugin initialization order**: Plugins (especially CORS) are guaranteed to be registered before routes, preventing potential race conditions.
- **Improved testability**: Async creation makes it explicit when plugins are ready, improving test reliability.

### 📝 Technical Details

#### Changed Methods

- `FluentAdapter.create()`: Now returns `Promise<FastifyInstance>` instead of `FastifyInstance`
- `FluentAdapter.create()` (static): Now async
- `SyntroJS.createServerInstance()`: Now async
- `SyntroJS.createFluentAdapter()`: Now async
- `SyntroJS.listen()`: Now creates server instance lazily if not already created

#### Property Changes

- `SyntroJS.server`: Changed from `readonly` to mutable to support lazy initialization

### 🧪 Testing

- Updated all tests that use `FluentAdapter.create()` to use `await`
- All existing tests pass with the new async implementation
- CORS tests continue to pass, confirming proper plugin initialization

### 📚 Documentation

- Updated code comments to reflect async nature of server creation
- Added documentation about lazy initialization pattern

## 🔄 Migration Guide

### Breaking Changes

**None** - This is a non-breaking change. The async nature is internal to the framework and doesn't affect the public API.

### Code Updates

If you have custom code that directly calls `FluentAdapter.create()`, you'll need to update it:

```typescript
// Before
const server = FluentAdapter.create();

// After
const server = await FluentAdapter.create();
```

However, this should only affect internal tests or advanced usage. Normal `SyntroJS` usage remains unchanged:

```typescript
// This still works exactly the same
const app = new SyntroJS({ cors: true });
await app.listen(3000);
```

## 🐛 Bug Fixes

- Fixed potential race condition where routes could be registered before plugins were fully initialized
- Ensured CORS plugin is completely registered before routes are added

## 📊 Impact

- **Performance**: No performance impact, async overhead is minimal
- **Compatibility**: Fully backward compatible for normal usage
- **Code Quality**: Improved functional programming approach, better separation of concerns
- **Reliability**: More reliable plugin initialization order

## 🙏 Acknowledgments

This refactoring improves the codebase's adherence to functional programming principles and ensures proper plugin initialization order, making the framework more robust and maintainable.

---

## [0.6.6] - 2024-12-17

### Fixed

- 🐛 **Dependency Versioning**: Fixed `@fastify/cors` version compatibility issue
- 🐛 **Peer Dependencies**: Updated `peerDependencies` to only allow `@fastify/cors@^9.0.0` (compatible with Fastify v4)

### Changed

- 🔄 **devDependencies**: Updated `@fastify/cors` from `^9.0.0` to `^9.0.1` for better version pinning
- 🔄 **peerDependencies**: Removed `^10.0.0` and `^11.0.0` from `@fastify/cors` peer dependencies (these require Fastify v5)

### Technical Details

**Problem**: The server had `@fastify/cors@11.1.0` installed, but the project uses Fastify v4 (`^4.26.0`). `@fastify/cors` v11 requires Fastify v5, causing incompatibility.

**Solution**: 
- Updated `devDependencies` to use `@fastify/cors@^9.0.1` (compatible with Fastify v4)
- Updated `peerDependencies` to only allow `^9.0.0` to prevent users from installing incompatible versions

**Compatibility Matrix**:
- `@fastify/cors` v9 → Fastify v4 ✅ (current)
- `@fastify/cors` v10 → Fastify v5 ❌ (not supported)
- `@fastify/cors` v11 → Fastify v5 ❌ (not supported)

### Benefits

- ✅ Prevents version conflicts
- ✅ Clear compatibility requirements
- ✅ Better error messages when incompatible versions are installed
- ✅ Stable and tested version combination

