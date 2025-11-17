# SyntroJS Lambda - Guía de Uso

## 📋 Resumen

SyntroJS soporta dos modos de operación:
- **REST Mode** (`rest: true`): Servidor HTTP completo (default)
- **Lambda Mode** (`rest: false`): Handler Lambda para AWS Lambda

El mismo código funciona en ambos modos sin cambios.

---

## 🚀 Quick Start

### Modo REST (Desarrollo Local)

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

### Modo Lambda (Producción AWS)

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

## 📝 Ejemplos Completos

### Ejemplo 1: API RESTful Simple

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

### Ejemplo 2: Validación Completa

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
    // body y query están validados automáticamente
    return {
      orderId: 'order-123',
      items: body.items,
      source: query.source || 'api',
    };
  },
});

export const handler = app.handler();
```

### Ejemplo 3: Rutas Dinámicas

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

### Ejemplo 4: Manejo de Errores

```typescript
import { SyntroJS, HTTPException } from 'syntrojs';
import { z } from 'zod';

const app = new SyntroJS({ rest: false });

app.get('/users/:id', {
  params: z.object({
    id: z.string().uuid(),
  }),
  handler: async ({ params }) => {
    // Simular búsqueda de usuario
    const user = await findUser(params.id);
    
    if (!user) {
      throw new HTTPException(404, 'User not found');
    }
    
    return user;
  },
});

// Manejo de errores personalizado
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

## 🔧 Configuración

### Opciones de Configuración

```typescript
const app = new SyntroJS({
  rest: false, // Requerido para Lambda mode
  title: 'My API',
  version: '1.0.0',
  description: 'API description',
  // docs: false, // Documentación deshabilitada en Lambda (recomendado)
});
```

### Configuración Recomendada para Lambda

```typescript
const app = new SyntroJS({
  rest: false,
  title: 'My API',
  docs: false, // Deshabilitar docs en producción Lambda
});
```

---

## 📦 Despliegue en AWS Lambda

### 1. Estructura del Proyecto

```
my-lambda-function/
├── index.ts          # Handler Lambda
├── package.json
└── tsconfig.json
```

### 2. Handler Lambda (`index.ts`)

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
    "syntrojs": "^0.5.0",
    "zod": "^3.22.4"
  }
}
```

### 4. Build y Deploy

```bash
# Build
npm run build

# Deploy con AWS SAM
sam build
sam deploy

# O con Serverless Framework
serverless deploy
```

### 5. Configuración SAM Template (`template.yaml`)

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

## 🎯 Características Lambda

### ✅ Soportado

- ✅ API Gateway REST API (v1)
- ✅ Validación automática con Zod
- ✅ Rutas dinámicas (`/users/:id`)
- ✅ Manejo de errores
- ✅ Type safety completo
- ✅ Query parameters
- ✅ Path parameters
- ✅ Request body parsing

### 🚧 Próximamente

- ⏳ API Gateway HTTP API (v2)
- ⏳ SQS adapter
- ⏳ S3 adapter
- ⏳ EventBridge adapter

---

## 🔍 Debugging

### Logs en CloudWatch

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

### Errores de Validación

Los errores de validación se retornan automáticamente con formato:

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

## 📚 Más Información

- [Arquitectura Lambda](./ARQUITECTURA_SYNTROJS_LAMBDA.md)
- [Integración SyntroJS](./INTEGRACION_SYNTROJS.md)
- [Plan SyntroJS](./PLAN_SYNTROJS.md)

---

## ❓ FAQ

### ¿Puedo usar el mismo código en desarrollo y producción?

Sí, solo cambia el flag `rest`:

```typescript
const isProduction = process.env.NODE_ENV === 'production';
const app = new SyntroJS({ 
  rest: !isProduction // false en producción (Lambda)
});
```

### ¿Funciona con Serverless Framework?

Sí, funciona con cualquier framework que soporte AWS Lambda.

### ¿Puedo usar middleware?

Sí, el sistema de middleware funciona igual en ambos modos:

```typescript
app.use(async (ctx) => {
  console.log(`${ctx.method} ${ctx.path}`);
});
```

### ¿Cómo manejo CORS en Lambda?

CORS se maneja en API Gateway, no en el handler Lambda. Configura CORS en tu API Gateway.

---

**Última actualización**: 2024-11-17

