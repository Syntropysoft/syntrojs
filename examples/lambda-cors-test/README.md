# Lambda CORS Test Application

End-to-end test application to verify the CORS origin extraction fix in Lambda mode.

## 🎯 Purpose

This application tests the fix for case-insensitive `Origin` header extraction in API Gateway events. The fix ensures that CORS headers correctly reflect the actual request origin instead of always returning `'*'`.

## 🚀 Quick Test

```bash
# From the project root
cd examples/lambda-cors-test
node test-local.js
```

## 📋 Test Cases

1. **POST Request with Origin header** - Tests normal CORS behavior
2. **OPTIONS Preflight Request** - Tests preflight CORS handling
3. **POST Request with uppercase ORIGIN** - Tests case-insensitive header extraction (THE FIX)

## ✅ Expected Results

All tests should show:
- ✅ `Access-Control-Allow-Origin` matches the request origin (not `'*'`)
- ✅ `Access-Control-Allow-Credentials: true` when origin matches
- ✅ `Access-Control-Allow-Methods` includes the requested method

## 🔍 What This Tests

### Before Fix
- Headers with `Origin` (capital O) would not be found
- CORS headers would return `'*'` instead of the actual origin
- Case-insensitive header matching was not implemented

### After Fix
- `extractOrigin()` function finds headers regardless of case (`Origin`, `origin`, `ORIGIN`)
- CORS headers correctly reflect the request origin
- All CORS functionality works as expected

## 📁 Files

- `app.js` - Lambda handler application
- `test-local.js` - Local test runner
- `test-event.json` - Normal POST request event
- `test-event-options.json` - OPTIONS preflight event
- `test-event-case-insensitive.json` - Test case for uppercase ORIGIN header

## 🧪 Running Tests

```bash
# Install dependencies (if needed)
npm install

# Run local tests
node test-local.js
```

## 📊 Verification

After running tests, verify:
1. ✅ Origin header is extracted correctly regardless of case
2. ✅ CORS headers match the request origin
3. ✅ OPTIONS requests return 204 with proper CORS headers
4. ✅ All responses include CORS headers when configured

