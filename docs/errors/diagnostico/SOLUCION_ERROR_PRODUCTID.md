# Solución al Error de Validación de `productId`

## 🎯 Resumen Ejecutivo

Después de revisar el código fuente de SyntroJS, el problema **NO es que SyntroJS valide antes del preprocess**. Zod ejecuta el `preprocess` correctamente cuando se llama a `safeParse()`.

El problema más probable es que **el schema que se está usando realmente tiene `productId` definido**, o que el frontend está enviando `productId: undefined` explícitamente.

---

## ✅ Solución Recomendada: Usar `.omit()`

La solución más limpia y explícita es usar `.omit()` en lugar de `preprocess`:

```javascript
import { z } from 'zod';

// Schema base con todos los campos (incluyendo productId como opcional)
const ProductSchemaBase = z.object({
  productId: z.string().uuid().optional(),
  name: z.string().min(1, 'Nombre requerido'),
  description: z.string().optional(),
  price: z.number().positive('Precio debe ser positivo').optional(),
  stock: z.number().int().nonnegative('Stock debe ser un número entero no negativo').default(0),
  category: z.string().optional(),
});

// Schema para crear producto (sin productId)
const CreateProductSchema = ProductSchemaBase.omit({ productId: true });

// Schema para actualizar producto (con productId opcional)
const UpdateProductSchema = ProductSchemaBase.partial();
```

**Ventajas**:
- ✅ Más explícito y claro
- ✅ No depende del preprocess
- ✅ Funciona igual en REST y Lambda
- ✅ Type-safe completo
- ✅ Reutilizable para otros casos

---

## 🔍 Pasos de Debugging

Si la solución anterior no funciona, sigue estos pasos:

### Paso 1: Verificar el Schema Realmente Usado

Agregar logs para verificar qué schema se está usando:

```javascript
app.post('/products', {
  body: CreateProductSchema,
  handler: async ({ body }) => {
    // Log del schema
    console.log('Schema usado:', JSON.stringify(CreateProductSchema._def, null, 2));
    
    // Log del body recibido
    console.log('Body recibido:', JSON.stringify(body, null, 2));
    
    // Log del tipo del schema
    console.log('Tipo de schema:', CreateProductSchema.constructor.name);
    
    const productId = randomUUID();
    // ...
  },
});
```

### Paso 2: Verificar el Request del Frontend

En el frontend, agregar logs antes de enviar:

```javascript
const data = {
  name: 'test',
  stock: 20,
  description: 'test',
  category: 'test',
  price: 1,
};

// Verificar que NO tenga productId
console.log('Data antes de enviar:', JSON.stringify(data));
console.log('Tiene productId?', 'productId' in data);

// Asegurarse de eliminar productId si existe
const { productId, ...dataWithoutId } = data;
console.log('Data sin productId:', JSON.stringify(dataWithoutId));

// Enviar request
const response = await fetch('/api/products', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(dataWithoutId),
});
```

### Paso 3: Verificar en CloudWatch Logs

Después de hacer deploy, revisar los logs de CloudWatch:

1. Buscar el log del schema usado
2. Buscar el log del body recibido
3. Verificar si `productId` está presente en el body
4. Verificar si el error ocurre antes o después del handler

### Paso 4: Probar con Schema Mínimo

Probar con un schema mínimo para aislar el problema:

```javascript
// Schema mínimo para probar
const MinimalSchema = z.object({
  name: z.string(),
});

app.post('/products/test', {
  body: MinimalSchema,
  handler: async ({ body }) => {
    console.log('Body recibido:', body);
    return { success: true };
  },
});
```

Si este funciona, el problema está en el schema específico.

---

## 🧪 Test para Reproducir el Problema

Crear un test que reproduzca el problema exacto:

```typescript
import { SyntroJS } from 'syntrojs';
import { z } from 'zod';
import type { APIGatewayProxyEvent } from '@types/aws-lambda';

describe('ProductId Validation Issue', () => {
  it('should not validate productId when not in schema', async () => {
    const app = new SyntroJS({ rest: false });

    const CreateProductSchemaBase = z.object({
      name: z.string().min(1),
      stock: z.number().int().nonnegative().default(0),
      description: z.string().optional(),
      category: z.string().optional(),
      price: z.number().positive().optional(),
    });

    // Probar con preprocess (el que está fallando)
    const CreateProductSchemaWithPreprocess = z.preprocess((data) => {
      const cleaned = { ...data };
      delete cleaned.productId;
      return cleaned;
    }, CreateProductSchemaBase);

    // Probar con omit (la solución recomendada)
    const CreateProductSchemaWithOmit = CreateProductSchemaBase.omit({ productId: true });

    // Test 1: Con preprocess
    app.post('/products/preprocess', {
      body: CreateProductSchemaWithPreprocess,
      handler: async ({ body }) => body,
    });

    // Test 2: Con omit
    app.post('/products/omit', {
      body: CreateProductSchemaWithOmit,
      handler: async ({ body }) => body,
    });

    const handler = app.handler();

    const event: APIGatewayProxyEvent = {
      httpMethod: 'POST',
      path: '/products/preprocess', // Cambiar a /products/omit para probar la otra solución
      pathParameters: null,
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      headers: { 'Content-Type': 'application/json' },
      multiValueHeaders: undefined,
      body: JSON.stringify({
        name: 'test',
        stock: 20,
        description: 'test',
        category: 'test',
        price: 1,
      }),
      isBase64Encoded: false,
      requestContext: {
        requestId: 'test-id',
        stage: 'prod',
        resourceId: 'resource-id',
        resourcePath: '/products/preprocess',
        httpMethod: 'POST',
        requestTime: '2024-01-01T00:00:00Z',
        requestTimeEpoch: 1704067200000,
        identity: {
          sourceIp: '127.0.0.1',
          userAgent: 'test-agent',
        },
      },
    };

    const response = await handler(event);
    
    // Debería pasar, no fallar
    expect(response.statusCode).toBe(200);
    
    const body = JSON.parse(response.body);
    expect(body).not.toHaveProperty('productId');
  });

  it('should handle productId: undefined correctly', async () => {
    const app = new SyntroJS({ rest: false });

    const CreateProductSchema = z.object({
      name: z.string().min(1),
      stock: z.number().int().nonnegative().default(0),
    }).omit({ productId: true });

    app.post('/products', {
      body: CreateProductSchema,
      handler: async ({ body }) => body,
    });

    const handler = app.handler();

    // Test con productId: undefined explícitamente
    const event: APIGatewayProxyEvent = {
      httpMethod: 'POST',
      path: '/products',
      pathParameters: null,
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      headers: { 'Content-Type': 'application/json' },
      multiValueHeaders: undefined,
      body: JSON.stringify({
        productId: undefined, // Esto puede causar problemas
        name: 'test',
        stock: 20,
      }),
      isBase64Encoded: false,
      requestContext: {
        requestId: 'test-id',
        stage: 'prod',
        resourceId: 'resource-id',
        resourcePath: '/products',
        httpMethod: 'POST',
        requestTime: '2024-01-01T00:00:00Z',
        requestTimeEpoch: 1704067200000,
        identity: {
          sourceIp: '127.0.0.1',
          userAgent: 'test-agent',
        },
      },
    };

    const response = await handler(event);
    
    // Debería pasar porque omit elimina productId
    expect(response.statusCode).toBe(200);
  });
});
```

---

## 📋 Checklist de Verificación

Antes de reportar el problema como bug, verifica:

- [ ] El schema usado realmente NO tiene `productId` definido
- [ ] El frontend NO está enviando `productId` (ni siquiera como `undefined`)
- [ ] El schema usado es el correcto (no hay otro schema siendo usado)
- [ ] Se probó con `.omit()` y sigue fallando
- [ ] Se probó en modo REST y funciona correctamente
- [ ] Los logs de CloudWatch muestran el body recibido sin `productId`
- [ ] Se probó con un schema mínimo y funciona

---

## 🐛 Si el Problema Persiste

Si después de seguir todos los pasos el problema persiste, puede ser un bug en SyntroJS. En ese caso:

1. Crear un test mínimo que reproduzca el problema
2. Incluir los logs de CloudWatch
3. Incluir la versión de SyntroJS y Zod
4. Reportar el issue en GitHub con toda la información

---

## 📚 Referencias

- [Zod Documentation - omit()](https://zod.dev/?id=omit)
- [Zod Documentation - preprocess()](https://zod.dev/?id=preprocess)
- SyntroJS Lambda Handler: `src/lambda/adapters/ApiGatewayAdapter.ts`
- Schema Validator: `src/application/SchemaValidator.ts`

