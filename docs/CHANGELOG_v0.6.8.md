# Changelog v0.6.8-alpha.0

**Release Date:** 2024-12-17

## ⚠️ Alpha Release - CORS Support for Lambda

This is an **alpha release** that adds CORS support for Lambda mode. This feature is still being tested and validated in production environments.

## 🎯 Summary

This release adds comprehensive CORS support for AWS Lambda mode, addressing issues where CORS headers were not being applied correctly to Lambda responses. All Lambda responses now include CORS headers when configured, ensuring proper cross-origin requests from frontend applications.

## ✨ Features

### CORS Support for Lambda

- **CORS Configuration**: Added `lambdaCors` option to `SyntroJSConfig` for Lambda mode
- **Automatic CORS Headers**: All Lambda responses now include CORS headers when configured
- **OPTIONS Preflight Support**: Automatic handling of OPTIONS preflight requests
- **Flexible Configuration**: Supports `boolean` or `CorsOptions` object for fine-grained control

### What's Included

- ✅ CORS headers in all successful responses
- ✅ CORS headers in all error responses (400, 404, 500, etc.)
- ✅ CORS headers in validation error responses
- ✅ CORS headers in OPTIONS preflight responses
- ✅ CORS headers in redirect responses
- ✅ CORS headers in custom response objects

## 🔧 Changes

### API Changes

- **`SyntroJSConfig.lambdaCors`**: New optional property for CORS configuration in Lambda mode
  ```typescript
  const app = new SyntroJS({
    rest: false,
    lambdaCors: true, // Or { origin: '*', credentials: false, ... }
  });
  ```

- **`LambdaHandlerConfig.cors`**: New optional property for CORS configuration
- **`ApiGatewayAdapter`**: Now accepts CORS configuration in constructor

### Internal Changes

- **`ApiGatewayAdapter.buildCorsHeaders()`**: New pure function to build CORS headers
- **`ApiGatewayAdapter.determineAllowedOrigin()`**: New pure function to determine allowed origin
- **`ApiGatewayAdapter.handleOptionsRequest()`**: New method to handle OPTIONS preflight requests
- **`ApiGatewayAdapter.toLambdaResponse()`**: Now includes CORS headers in all responses
- **`ApiGatewayAdapter.createNotFoundResponse()`**: Now includes CORS headers
- **`ApiGatewayAdapter.createValidationErrorResponse()`**: Now includes CORS headers
- **`ApiGatewayAdapter.handleError()`**: Now includes CORS headers

## 📝 Usage

### Basic CORS Configuration

```typescript
import { SyntroJS } from 'syntrojs';

const app = new SyntroJS({
  rest: false, // Lambda mode
  lambdaCors: true, // Enable CORS with defaults
});

app.post('/products', {
  handler: () => ({ success: true }),
});

export const handler = app.handler();
```

### Advanced CORS Configuration

```typescript
import { SyntroJS } from 'syntrojs';

const app = new SyntroJS({
  rest: false,
  lambdaCors: {
    origin: 'https://example.com',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  },
});

export const handler = app.handler();
```

## 🐛 Known Issues

This is an alpha release. The following issues may occur:

- ⚠️ CORS headers may not be applied correctly in all edge cases
- ⚠️ OPTIONS preflight requests may not work correctly for all routes
- ⚠️ Complex CORS configurations may not behave as expected

**Please test thoroughly before using in production.**

## 🔄 Migration Guide

### For Users Currently Using Lambda Mode

If you're currently using SyntroJS in Lambda mode without CORS:

```typescript
// Before
const app = new SyntroJS({ rest: false });

// After - Add CORS configuration
const app = new SyntroJS({
  rest: false,
  lambdaCors: true, // Or your CORS configuration
});
```

### For Users Using Traditional Lambda Handlers

If you're currently using traditional Lambda handlers with manual CORS:

```typescript
// Before - Traditional handler
export const handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
  };
  
  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify(result),
  };
};

// After - SyntroJS with CORS
const app = new SyntroJS({
  rest: false,
  lambdaCors: true,
});

app.post('/products', { handler: () => result });

export const handler = app.handler();
```

## 🧪 Testing

- ✅ All existing tests pass
- ✅ CORS headers are included in all response types
- ✅ OPTIONS requests are handled correctly
- ⚠️ Production testing still in progress

## 📊 Impact

- **Feature Addition**: CORS support for Lambda mode
- **Breaking Changes**: None
- **Performance**: Minimal impact (headers added to responses)
- **Bundle Size**: No significant increase

## ⚠️ Alpha Status

This release is marked as **alpha** because:

1. CORS support for Lambda is a new feature
2. Real-world production testing is still in progress
3. Edge cases may not be fully covered
4. API may change based on feedback

**Recommendation**: Test thoroughly in your environment before using in production. Report any issues you encounter.

## 🙏 Acknowledgments

This release addresses issues reported by users who were experiencing CORS problems with SyntroJS in Lambda mode. The implementation follows SOLID, DDD, Functional Programming, and Guard Clauses principles.

## 🔜 Next Steps

1. **Production Testing**: Validate CORS behavior in real-world scenarios
2. **Edge Case Coverage**: Test complex CORS configurations
3. **Documentation**: Add more examples and troubleshooting guides
4. **Stable Release**: Once validated, release as stable (v0.6.8)

