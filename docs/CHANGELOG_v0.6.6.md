# Changelog v0.6.6

**Release Date:** 2024-12-17

## 🎯 Summary

This release fixes a dependency versioning issue with `@fastify/cors` to ensure compatibility with Fastify v4. The peer dependencies have been updated to prevent installation of incompatible versions.

## 🐛 Bug Fixes

### Dependency Versioning

- **Fixed**: `@fastify/cors` version compatibility issue
- **Fixed**: Updated `peerDependencies` to only allow `@fastify/cors@^9.0.0` (compatible with Fastify v4)

**Problem**: The server had `@fastify/cors@11.1.0` installed, but the project uses Fastify v4 (`^4.26.0`). `@fastify/cors` v11 requires Fastify v5, causing incompatibility.

**Solution**: 
- Updated `devDependencies` to use `@fastify/cors@^9.0.1` (compatible with Fastify v4)
- Updated `peerDependencies` to only allow `^9.0.0` to prevent users from installing incompatible versions

## 🔄 Changes

### Dependencies

- **devDependencies**: Updated `@fastify/cors` from `^9.0.0` to `^9.0.1` for better version pinning
- **peerDependencies**: Removed `^10.0.0` and `^11.0.0` from `@fastify/cors` peer dependencies

### Compatibility Matrix

| `@fastify/cors` Version | Fastify Version | Status |
|------------------------|-----------------|--------|
| v9                      | v4              | ✅ Supported (current) |
| v10                     | v5              | ❌ Not supported |
| v11                     | v5              | ❌ Not supported |

## 📝 Technical Details

### Before

```json
{
  "devDependencies": {
    "@fastify/cors": "^9.0.0"
  },
  "peerDependencies": {
    "@fastify/cors": "^9.0.0 || ^10.0.0 || ^11.0.0"
  }
}
```

### After

```json
{
  "devDependencies": {
    "@fastify/cors": "^9.0.1"
  },
  "peerDependencies": {
    "@fastify/cors": "^9.0.0"
  }
}
```

## ✅ Benefits

- ✅ Prevents version conflicts
- ✅ Clear compatibility requirements
- ✅ Better error messages when incompatible versions are installed
- ✅ Stable and tested version combination
- ✅ No breaking changes for existing users

## 🔄 Migration Guide

### For Users

**No action required** - This is a maintenance release that fixes version compatibility. If you're using SyntroJS with Fastify v4, ensure you have `@fastify/cors@^9.0.0` installed:

```bash
pnpm add -D @fastify/cors@^9.0.0
# or
npm install --save-dev @fastify/cors@^9.0.0
```

### For Future Fastify v5 Migration

If you plan to migrate to Fastify v5 in the future, you'll need to:
1. Update Fastify to v5
2. Update `@fastify/cors` to v11
3. Check for breaking changes in Fastify v5

However, SyntroJS currently supports Fastify v4, so this migration would be a major version change.

## 🧪 Testing

- ✅ All existing tests pass
- ✅ CORS tests verify correct plugin registration
- ✅ Version compatibility verified

## 📊 Impact

- **Compatibility**: Ensures compatibility with Fastify v4
- **Stability**: Prevents accidental installation of incompatible versions
- **Developer Experience**: Clear error messages when wrong versions are installed

