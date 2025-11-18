# Changelog v0.6.9

**Release Date**: 2024-11-18

## 🎉 CORS Issues Resolved

This release resolves the CORS issues that were affecting both REST and Lambda modes. CORS is now fully functional and production-ready.

## ✨ Added

### CORS Validation System
- ✨ **CorsValidator Domain Service**: New comprehensive CORS validation system with granular guard clauses
- ✨ **Development-Time Warnings**: Automatic validation and warnings during development to prevent CORS misconfigurations
- ✨ **Dependency Checking**: Validates `@fastify/cors` installation and version compatibility
- ✨ **Configuration Validation**: Detects incorrect CORS configuration (e.g., `cors` vs `fluentConfig.cors`)

### Enhanced Guard Clauses
- ✨ **Granular Validations**: Improved guard clauses across the codebase for better error messages and control
- ✨ **Route Validation**: Enhanced `Route` constructor with granular method validation
- ✨ **RouteRegistry Validation**: Improved validation in `register()`, `get()`, and `find()` methods
- ✨ **ApiGatewayAdapter Validation**: Enhanced `toRequestDTO()` with granular event validation
- ✨ **SchemaValidator Validation**: Improved schema validation with explicit type checks
- ✨ **LambdaHandler Validation**: Enhanced constructor and method validations

## 🔧 Fixed

### CORS Issues
- 🐛 **REST Mode CORS**: Fixed OPTIONS preflight requests returning 404 - now correctly returns 204 with CORS headers
- 🐛 **Lambda Mode CORS**: Fixed origin extraction from `multiValueHeaders` - now correctly extracts and uses request origin
- 🐛 **CORS Plugin Registration**: Fixed registration order - CORS plugin now registered before routes as per `@fastify/cors` documentation
- 🐛 **Missing Dependency Warning**: Added prominent warning when `@fastify/cors` is not installed but CORS is configured

### Code Quality
- 🐛 **Route.method Normalization**: Fixed potential `toUpperCase()` error on undefined methods
- 🐛 **RouteRegistry Pattern Matching**: Fixed guard clause for `route.method` before comparison
- 🐛 **Test API Usage**: Fixed tests to use correct `Route` constructor API

## 🔄 Changed

### Code Improvements
- 🔧 **Route Method Normalization**: Methods are now normalized to uppercase in `Route` constructor for consistency
- 🔧 **RouteRegistry Comparison**: Simplified method comparison using normalized methods
- 🔧 **Error Messages**: More specific error messages throughout the codebase
- 🔧 **Guard Clauses**: More granular guard clauses for better error detection and debugging

### Documentation
- 📝 **README Updated**: Removed CORS warnings - CORS is now production-ready
- 📝 **CHANGELOG Reorganization**: Moved all version-specific CHANGELOG files to `docs/changelog/` directory

## 🏗️ Architecture

### Principles Applied
- ✅ **SOLID**: Single Responsibility, Open/Closed, Dependency Inversion
- ✅ **DDD**: Domain Services, Value Objects, Guard Clauses
- ✅ **Functional Programming**: Pure functions, Immutability, Composition
- ✅ **Guard Clauses**: Granular validations with explicit error messages

### Files Modified
- `src/domain/Route.ts`: Enhanced constructor with granular method validation
- `src/application/RouteRegistry.ts`: Improved validation in all methods
- `src/lambda/adapters/ApiGatewayAdapter.ts`: Enhanced event validation
- `src/application/SchemaValidator.ts`: Improved schema validation
- `src/application/CorsValidator.ts`: New comprehensive validation system
- `src/core/SyntroJS.ts`: Enhanced config validation
- `src/lambda/handlers/LambdaHandler.ts`: Improved constructor validation

## 📊 Testing

- ✅ **All Tests Passing**: 139/139 tests passing
- ✅ **CORS Tests**: All CORS-related tests passing
- ✅ **Guard Clause Tests**: New tests for granular validations
- ✅ **Integration Tests**: All integration tests passing

## 🚀 Migration Guide

### No Breaking Changes

This release is backward compatible. No code changes required.

### CORS Configuration

CORS now works correctly in both REST and Lambda modes:

**REST Mode:**
```javascript
const app = new SyntroJS({
  fluentConfig: {
    cors: {
      origin: true,
      credentials: true,
    }
  }
});
```

**Lambda Mode:**
```javascript
const app = new SyntroJS({
  rest: false,
  lambdaCors: {
    origin: true,
    credentials: true,
  }
});
```

### Development Warnings

If CORS is configured but `@fastify/cors` is not installed, you'll see a clear warning:
```
⚠️  CORS is configured but @fastify/cors is not installed.
   Install with: npm install @fastify/cors
```

## 📝 Notes

- CORS issues are now resolved and validated
- All guard clauses follow consistent patterns
- Error messages are more specific and helpful
- Code quality improved with granular validations

## 🔗 Related

- See [CORS Requirements](./REQUISITOS_CORS.md) for detailed CORS configuration guide
- See [Lambda Usage Guide](./LAMBDA_USAGE.md) for Lambda mode CORS configuration

