# SyntroJS Lambda - Usage Guide

## 📋 Overview

SyntroJS supports two operation modes:

- **REST Mode** (`rest: true`): Full HTTP server (default)
- **Lambda Mode** (`rest: false`): Lambda handler for AWS Lambda

The same code works in both modes without changes.

---

## 🚀 Quick Start

### REST Mode (Local Development)

```typescript
import { SyntroJS } from 'syntrojs';
import { z } from 'zod';

const app = new SyntroJS({ 
  rest: true, // Default
  title: 'My API' 
});

app.post('/users', {
  body: z.object({
    name: z.string().min(1),
    email: z.string().email(),
  }),
  handler: async ({ body }) => {
    return { id: 1, ...body };
  },
});

await app.listen(3000);
```

### Lambda Mode (AWS Production)

```typescript
import { SyntroJS } from 'syntrojs';
import { z } from 'zod';

const app = new SyntroJS({ 
  rest: false, // Lambda mode
  title: 'My API' 
});

app.post('/users', {
  body: z.object({
    name: z.string().min(1),
    email: z.string().email(),
  }),
  handler: async ({ body }) => {
    return { id: 1, ...body };
  },
});

// Export handler for AWS Lambda
export const handler = app.handler();
```

---

## 📝 Complete Examples

### Example 1: Simple RESTful API

```typescript
import { SyntroJS } from 'syntrojs';
import { z } from 'zod';

const app = new SyntroJS({ rest: false });

// GET /users
app.get('/users', {
  handler: async () => {
    return [
      { id: 1, name: 'John' },
      { id: 2, name: 'Jane' },
    ];
  },
});

// GET /users/:id
app.get('/users/:id', {
  params: z.object({
    id: z.string().uuid(),
  }),
  handler: async ({ params }) => {
    return { id: params.id, name: 'John' };
  },
});

// POST /users
app.post('/users', {
  body: z.object({
    name: z.string().min(1),
    email: z.string().email(),
  }),
  handler: async ({ body }) => {
    return { id: Math.random(), ...body };
  },
});

export const handler = app.handler();
```

### Example 2: Complete Validation

```typescript
import { SyntroJS } from 'syntrojs';
import { z } from 'zod';

const app = new SyntroJS({ rest: false });

const CreateOrderSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().min(1),
      quantity: z.number().int().positive(),
    })
  ).min(1),
  customerId: z.string().uuid(),
});

app.post('/orders', {
  body: CreateOrderSchema,
  query: z.object({
    source: z.enum(['web', 'mobile', 'api']).optional(),
  }),
  handler: async ({ body, query }) => {
    // body and query are automatically validated
    return {
      orderId: 'order-123',
      items: body.items,
      source: query.source || 'api',
    };
  },
});

export const handler = app.handler();
```

### Example 3: Dynamic Routes

```typescript
import { SyntroJS } from 'syntrojs';
import { z } from 'zod';

const app = new SyntroJS({ rest: false });

// /users/:userId/posts/:postId
app.get('/users/:userId/posts/:postId', {
  params: z.object({
    userId: z.string().uuid(),
    postId: z.string().uuid(),
  }),
  handler: async ({ params }) => {
    return {
      userId: params.userId,
      postId: params.postId,
      title: 'Post Title',
    };
  },
});

export const handler = app.handler();
```

### Example 4: Error Handling

```typescript
import { SyntroJS, HTTPException } from 'syntrojs';
import { z } from 'zod';

const app = new SyntroJS({ rest: false });

app.get('/users/:id', {
  params: z.object({
    id: z.string().uuid(),
  }),
  handler: async ({ params }) => {
    // Simulate user lookup
    const user = await findUser(params.id);
    
    if (!user) {
      throw new HTTPException(404, 'User not found');
    }
    
    return user;
  },
});

// Custom error handling
app.exceptionHandler(HTTPException, async (error, context) => {
  return {
    status: error.statusCode,
    body: {
      error: error.message,
      path: context.path,
    },
  };
});

export const handler = app.handler();
```

---

## 🔧 Configuration

### Configuration Options

```typescript
const app = new SyntroJS({
  rest: false, // Required for Lambda mode
  title: 'My API',
  version: '1.0.0',
  description: 'API description',
  // docs: false, // Documentation disabled in Lambda (recommended)
});
```

### Recommended Lambda Configuration

```typescript
const app = new SyntroJS({
  rest: false,
  title: 'My API',
  docs: false, // Disable docs in Lambda production
});
```

---

## 📦 AWS Lambda Deployment

### 1. Project Structure

```text
my-lambda-function/
├── index.ts          # Lambda handler
├── package.json
└── tsconfig.json
```

### 2. Lambda Handler (`index.ts`)

```typescript
import { SyntroJS } from 'syntrojs';
import { z } from 'zod';

const app = new SyntroJS({ rest: false });

app.get('/hello', {
  handler: async () => {
    return { message: 'Hello from Lambda!' };
  },
});

export const handler = app.handler();
```

### 3. `package.json`

```json
{
  "name": "my-lambda-function",
  "version": "1.0.0",
  "type": "module",
  "main": "index.js",
  "dependencies": {
    "syntrojs": "^0.6.x",
    "zod": "^3.22.4"
  }
}
```

### 4. Build and Deploy

```bash
# Build
npm run build

# Deploy with AWS SAM
sam build
sam deploy

# Or with Serverless Framework
serverless deploy
```

### 5. SAM Template Configuration (`template.yaml`)

```yaml
Resources:
  ApiFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: index.handler
      Runtime: nodejs18.x
      Events:
        Api:
          Type: Api
          Properties:
            Path: /{proxy+}
            Method: ANY
```

---

## 🎯 Lambda Features

### ✅ Supported

- ✅ API Gateway REST API (v1)
- ✅ Automatic validation with Zod
- ✅ Dynamic routes (`/users/:id`)
- ✅ Error handling
- ✅ Full type safety
- ✅ Query parameters
- ✅ Path parameters
- ✅ Request body parsing

### 🚧 Coming Soon

- ⏳ API Gateway HTTP API (v2)

---

## 🔌 Lambda Adapters Status

### ✅ Implemented

- ✅ **API Gateway**: Full support for API Gateway REST API (v1) events
- ✅ **SQS**: SQS event adapter with message processing support
- ✅ **S3**: S3 event adapter with object event processing support
- ✅ **EventBridge**: EventBridge event adapter with custom event processing support

### ⏳ Coming Soon

- ⏳ **API Gateway HTTP API (v2)**: HTTP API v2 adapter (planned)

---

## 🔍 Debugging

### CloudWatch Logs

```typescript
app.post('/users', {
  body: UserSchema,
  handler: async ({ body, correlationId }) => {
    console.log('Request ID:', correlationId);
    console.log('Body:', body);
    
    return { id: 1, ...body };
  },
});
```

### Validation Errors

Validation errors are automatically returned in the following format:

```json
{
  "error": "Validation Error",
  "details": [
    {
      "field": "email",
      "message": "Invalid email"
    }
  ]
}
```

---

## 📚 More Information

- [Lambda Architecture](./ARQUITECTURA_SYNTROJS_LAMBDA.md) - Architecture documentation (Spanish)
- [Lambda Adapters Extraction](./LAMBDA_ADAPTERS_EXTRACTION.md) - Adapter extraction guide

---

## ❓ FAQ

### Can I use the same code in development and production?

Yes, just change the `rest` flag:

```typescript
const isProduction = process.env.NODE_ENV === 'production';
const app = new SyntroJS({ 
  rest: !isProduction // false in production (Lambda)
});
```

### Does it work with Serverless Framework?

Yes, it works with any framework that supports AWS Lambda.

### Can I use middleware?

Yes, the middleware system works the same in both modes:

```typescript
app.use(async (ctx) => {
  console.log(`${ctx.method} ${ctx.path}`);
});
```

### How do I handle CORS in Lambda?

CORS is handled in API Gateway, not in the Lambda handler. Configure CORS in your API Gateway.

---

**Last updated**: 2024-11-17
