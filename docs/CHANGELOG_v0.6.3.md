# Changelog v0.6.3 - Lambda Adapters Configuration Improvements

**Release Date**: 2024-11-17  
**Status**: ✅ Complete (100%)

---

## ✨ New Features

### Lambda Adapter Factory Improvements

- ✨ **`replace()` method** - Replace existing adapters without clearing the factory
- ✨ **`registerOrReplace()` method** - Register or replace adapters in one call
- ✨ **`getAdapterConfig()` method** - Inspect adapter configuration
- ✨ **`hasCustomHandler()` method** - Check if adapter has custom handler
- ✨ **`createLambdaAdapterFactory()` function** - Create isolated factory instances for testing

### Adapter Inspection Methods

- ✨ **`hasHandler()` method** - Added to SQS, S3, and EventBridge adapters
- ✨ **`getConfig()` method** - Added to SQS, S3, and EventBridge adapters

### Lambda Handler Configuration

- ✨ **Adapter configuration** - Pass adapter configs directly to `LambdaHandler`
- ✨ **Factory isolation** - Support for custom factory instances
- ✨ **`LambdaAdaptersConfig` interface** - Type-safe adapter configuration

### SyntroJS Integration

- ✨ **`lambdaAdapters` config** - Configure adapters when creating SyntroJS instance
- ✨ **Seamless integration** - Configuration passed automatically to LambdaHandler

---

## 🔧 Improvements

### Better Developer Experience

**Before:**
```typescript
const app = new SyntroJS({ rest: false });
const sqsAdapter = new SQSAdapter({ handler: async (m) => {...} });
lambdaAdapterFactory.clear();
lambdaAdapterFactory.register('api-gateway', new ApiGatewayAdapter(...));
lambdaAdapterFactory.register('sqs', sqsAdapter);
// ... re-register all adapters
```

**After:**
```typescript
// Option 1: Configure at creation
const app = new SyntroJS({
  rest: false,
  lambdaAdapters: {
    sqs: {
      handler: async (message) => {
        return { processed: message.messageId };
      }
    }
  }
});

// Option 2: Replace existing adapter
lambdaAdapterFactory.replace('sqs', sqsAdapter);
```

### Factory Isolation

- ✅ **Isolated instances** - Each `LambdaHandler` can use its own factory
- ✅ **Better testing** - Tests don't interfere with each other
- ✅ **Backward compatible** - Singleton factory still available

### Adapter Inspection

- ✅ **Configuration inspection** - Check adapter configs at runtime
- ✅ **Handler detection** - Verify if adapters have custom handlers
- ✅ **Better debugging** - Understand adapter state easily

---

## 🧪 Testing

### New Tests

- ✅ **LambdaAdapterFactory-improvements.test.ts** - 18 tests for new factory methods
- ✅ **LambdaHandler-config.test.ts** - 6 tests for handler configuration
- ✅ **SyntroJS-lambda-config.test.ts** - 4 tests for SyntroJS integration

**Total**: 28 new tests passing

---

## 📚 Documentation

### Updated

- ✅ **Type exports** - All adapter configs exported for convenience
- ✅ **API documentation** - New methods documented with examples

---

## 🔄 Changes

### Added

- `LambdaAdapterFactory.replace()` - Replace existing adapter
- `LambdaAdapterFactory.registerOrReplace()` - Register or replace adapter
- `LambdaAdapterFactory.getAdapterConfig()` - Get adapter configuration
- `LambdaAdapterFactory.hasCustomHandler()` - Check for custom handler
- `createLambdaAdapterFactory()` - Create isolated factory instance
- `SQSAdapter.hasHandler()` - Check if handler is configured
- `SQSAdapter.getConfig()` - Get adapter configuration
- `S3Adapter.hasHandler()` - Check if handler is configured
- `S3Adapter.getConfig()` - Get adapter configuration
- `EventBridgeAdapter.hasHandler()` - Check if handler is configured
- `EventBridgeAdapter.getConfig()` - Get adapter configuration
- `LambdaHandlerConfig.adapters` - Adapter configuration option
- `LambdaHandlerConfig.adapterFactory` - Custom factory option
- `SyntroJSConfig.lambdaAdapters` - Lambda adapters configuration

### Modified

- `LambdaHandler` - Now accepts adapter configuration and custom factory
- `LambdaHandler` - Uses `registerOrReplace()` instead of `register()`
- `SyntroJS` - Passes `lambdaAdapters` config to `LambdaHandler`

---

## 📝 Breaking Changes

**None** - This is a backward-compatible enhancement. All existing code continues to work.

---

## 🚀 Migration Guide

No migration required. Existing code works as-is. New features are opt-in.

### Using New Features

```typescript
// Configure adapters at creation (recommended)
const app = new SyntroJS({
  rest: false,
  lambdaAdapters: {
    sqs: {
      handler: async (message) => {
        // Your custom handler
        return { processed: message.messageId };
      }
    }
  }
});

// Or replace adapter after creation
const customAdapter = new SQSAdapter({
  handler: async (message) => {
    return { processed: message.messageId };
  }
});
lambdaAdapterFactory.replace('sqs', customAdapter);

// Or use registerOrReplace for simplicity
lambdaAdapterFactory.registerOrReplace('sqs', customAdapter);
```

### Factory Isolation for Testing

```typescript
// Create isolated factory for tests
const testFactory = createLambdaAdapterFactory();
const handler = new LambdaHandler({
  adapterFactory: testFactory,
  adapters: {
    sqs: { handler: async (m) => ({ test: true }) }
  }
});
```

---

## 🎯 Benefits

1. **Better DX** - Simpler configuration, less boilerplate
2. **Fewer Errors** - No need to re-register all adapters
3. **More Flexible** - Easy to extend and customize
4. **Better Testing** - Isolated instances for test isolation
5. **More Maintainable** - Cleaner, easier to understand code
6. **Observability** - Inspection methods for debugging

---

**Next Release**: v0.7.0 - Router + Advanced Middleware

