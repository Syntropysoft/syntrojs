# Changelog v0.6.4 - CORS Configuration Fix

**Release Date**: 2024-11-17  
**Status**: ✅ Complete (100%)

---

## 🐛 Bug Fix

### CORS Configuration

- 🐛 **Fixed**: CORS plugin now receives proper configuration options
- 🐛 **Fixed**: OPTIONS (preflight) requests now handled correctly
- 🐛 **Fixed**: CORS headers properly configured when `cors: true`

**Problem**: When `cors: true` was enabled, the `@fastify/cors` plugin was registered without options, causing:
- ❌ OPTIONS requests not handled correctly
- ❌ CORS headers not configured properly
- ❌ Preflight requests failing with 404

**Solution**: CORS plugin now receives proper configuration:
- ✅ Default options when `cors: true` (includes OPTIONS method)
- ✅ Custom options when `cors: CorsOptions` is provided
- ✅ All CORS options properly passed to plugin

---

## ✨ New Features

### Enhanced CORS Configuration

- ✨ **`cors: boolean | CorsOptions`** - Support for both simple and advanced CORS configuration
- ✨ **Default CORS options** - Sensible defaults when `cors: true`:
  - `origin: true` (allow all origins)
  - `credentials: false`
  - `methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS']` (includes OPTIONS for preflight)

### Configuration Options

- ✨ **SyntroJSConfig.fluentConfig.cors** - Now accepts `boolean | CorsOptions`
- ✨ **FluentAdapter.withCors()** - Now accepts `boolean | CorsOptions`

---

## 🔧 Changes

### Modified

- `FluentAdapterConfig.cors` - Changed from `boolean` to `boolean | CorsOptions`
- `SyntroJSConfig.fluentConfig.cors` - Changed from `boolean` to `boolean | CorsOptions`
- `FluentAdapter.withCors()` - Now accepts `boolean | CorsOptions`
- `FluentAdapter` CORS registration - Now passes options to `@fastify/cors` plugin

### Added

- `tests/universal/cors/CorsConfiguration.test.ts` - 4 tests for CORS configuration

---

## 📝 Breaking Changes

**None** - This is a backward-compatible bug fix. Existing code with `cors: true` continues to work, now with proper CORS handling.

---

## 🚀 Migration Guide

No migration required. Existing code works as-is, but now with proper CORS support.

### Using Enhanced CORS

```typescript
// Simple CORS (now works correctly with preflight)
const app = new SyntroJS({
  fluentConfig: {
    cors: true  // ✅ Now includes OPTIONS for preflight
  }
});

// Advanced CORS configuration
const app = new SyntroJS({
  fluentConfig: {
    cors: {
      origin: 'http://localhost:3000',
      credentials: true,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }
  }
});

// Using FluentAdapter directly
const adapter = new FluentAdapter();
adapter.withCors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
});
```

---

## 🧪 Testing

### New Tests

- ✅ **CorsConfiguration.test.ts** - 4 tests passing
  - Boolean CORS configuration
  - CORS Options configuration
  - CORS preflight requests (OPTIONS)
  - CORS disabled verification

---

## 🎯 Benefits

1. **Fixed Bug** - OPTIONS requests now handled correctly
2. **Better DX** - Clear configuration options
3. **More Flexible** - Full CORS configuration support
4. **Backward Compatible** - Existing code works without changes

---

**Next Release**: v0.7.0 - Router + Advanced Middleware

