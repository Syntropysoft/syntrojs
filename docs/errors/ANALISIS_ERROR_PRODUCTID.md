# Análisis del Error de Validación de `productId`

## 📋 Resumen del Problema

**Error**: Zod está validando `productId` como requerido cuando el schema NO lo incluye.

**Mensaje de error**:
```json
{
  "error": "Validación fallida",
  "details": [{
    "code": "invalid_type",
    "expected": "string",
    "received": "undefined",
    "path": ["productId"],
    "message": "Required"
  }]
}
```

**Request enviado desde el frontend**:
```json
{
  "name": "test",
  "stock": 20,
  "description": "test",
  "category": "test",
  "price": 1
}
```

**Observación crítica**: El frontend NO está enviando `productId`, pero Zod lo está validando como requerido.

---

## 🔍 Contexto

### Arquitectura Actual

- **Backend**: SyntroJS 0.6.10 en modo Lambda (`rest: false`)
- **Frontend**: Next.js enviando requests a API Gateway de AWS
- **Validación**: Zod schemas con SyntroJS
- **Objetivo**: El backend debe generar `productId` automáticamente como UUID

### Schema Actual

```javascript
// Schema base SIN productId
const CreateProductSchemaBase = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  description: z.string().optional(),
  price: z.number().positive('Precio debe ser positivo').optional(),
  stock: z.number().int().nonnegative('Stock debe ser un número entero no negativo').default(0),
  category: z.string().optional(),
});

// Schema con preprocess para eliminar productId
const CreateProductSchema = z.preprocess((data) => {
  const cleaned = { ...data };
  delete cleaned.productId;
  return cleaned;
}, CreateProductSchemaBase);
```

### Handler Actual

```javascript
app.post('/products', {
  body: CreateProductSchema,
  handler: async ({ body }) => {
    const productId = randomUUID(); // Generar UUID
    // ... guardar en DynamoDB
  },
});
```

---

## ❓ Preguntas Sin Responder

### 1. ¿Cuándo ocurre la validación?

- ¿SyntroJS valida ANTES del preprocess?
- ¿El preprocess se ejecuta correctamente?
- ¿Hay alguna validación adicional que no vemos?

### 2. ¿De dónde viene el schema que valida `productId`?

- El error dice que Zod espera `productId` como string requerido
- Pero nuestro schema NO tiene `productId`
- ¿Hay algún schema por defecto en SyntroJS?
- ¿Hay algún schema inferido automáticamente?

### 3. ¿Cómo maneja SyntroJS el preprocess en modo Lambda?

- ¿El preprocess se ejecuta antes de la validación?
- ¿Hay alguna diferencia entre modo REST y modo Lambda?
- ¿SyntroJS está usando el schema correcto?

### 4. ¿Qué está recibiendo realmente SyntroJS?

- ¿El body parseado tiene `productId: undefined`?
- ¿El frontend está enviando `productId` implícitamente?
- ¿Hay algún middleware que agrega campos?

---

## 🧪 Lo Que Hemos Intentado

### Intento 1: Preprocess con destructuring
```javascript
const { productId, ...rest } = data;
return rest;
```
**Resultado**: ❌ No funcionó

### Intento 2: Preprocess con delete explícito
```javascript
const cleaned = { ...data };
delete cleaned.productId;
return cleaned;
```
**Resultado**: ❌ No funcionó

### Intento 3: Schema con `.strip()`
```javascript
z.object({...}).strip()
```
**Resultado**: ❌ No funcionó

### Intento 4: Schema con `.passthrough()`
```javascript
z.object({...}).passthrough()
```
**Resultado**: ❌ No funcionó

### Intento 5: Validación manual sin schema en SyntroJS
```javascript
// Sin body: CreateProductSchema
handler: async ({ body: rawBody }) => {
  const body = { ...rawBody };
  delete body.productId;
  const validatedBody = CreateProductSchemaBase.parse(body);
  // ...
}
```
**Resultado**: ❌ No funcionó (aún valida antes)

### Intento 6: Eliminar productId en el frontend
```javascript
const { productId, ...dataWithoutId } = data;
```
**Resultado**: ❌ No funcionó

---

## 🔬 Hipótesis

### Hipótesis 1: SyntroJS valida antes del preprocess
- **Evidencia**: El error ocurre antes de llegar al handler
- **Prueba necesaria**: Ver logs del preprocess para confirmar si se ejecuta

### Hipótesis 2: Hay un schema por defecto o inferido
- **Evidencia**: Zod valida `productId` aunque no esté en nuestro schema
- **Prueba necesaria**: Revisar código fuente de SyntroJS o documentación

### Hipótesis 3: El frontend está enviando `productId: undefined` explícitamente
- **Evidencia**: El error dice "received: undefined"
- **Prueba necesaria**: Ver el request completo en Network tab

### Hipótesis 4: SyntroJS en modo Lambda maneja la validación diferente
- **Evidencia**: Funciona en modo REST pero no en Lambda
- **Prueba necesaria**: Comparar comportamiento entre modos

---

## 📊 Información que Necesitamos

### 1. Logs de CloudWatch
- ¿Se ejecuta el preprocess?
- ¿Qué datos recibe el preprocess?
- ¿Qué datos recibe el handler?
- ¿Hay algún error antes del handler?

### 2. Request completo desde el frontend
- Headers completos
- Body completo (antes de JSON.stringify)
- ¿Hay algún middleware que modifica el request?

### 3. Código fuente de SyntroJS
- ¿Cómo valida SyntroJS en modo Lambda?
- ¿Cuándo se ejecuta el preprocess?
- ¿Hay algún schema por defecto?

### 4. Comparación con modo REST
- ¿Funciona en modo REST?
- ¿Cuál es la diferencia en la validación?

---

## 🎯 Plan de Investigación

### Paso 1: Verificar qué recibe realmente SyntroJS
- [ ] Agregar logs detallados en el preprocess
- [ ] Agregar logs en el handler
- [ ] Revisar logs de CloudWatch después del deploy

### Paso 2: Verificar el request del frontend
- [ ] Ver Network tab completo
- [ ] Ver qué se envía exactamente en el body
- [ ] Verificar si hay algún middleware que agrega campos

### Paso 3: Investigar SyntroJS
- [ ] Revisar documentación de SyntroJS 0.6.10
- [ ] Buscar issues similares en GitHub
- [ ] Revisar código fuente si es posible

### Paso 4: Probar en modo REST
- [ ] Probar el mismo código en modo REST
- [ ] Comparar comportamiento
- [ ] Identificar diferencias

---

## 📝 Notas Importantes

1. **El frontend NO envía `productId`**: Confirmado en el código del frontend
2. **El schema NO tiene `productId`**: Confirmado en `CreateProductSchemaBase`
3. **El error dice que Zod espera `productId`**: Esto es contradictorio
4. **El preprocess debería eliminarlo**: Pero parece que no se ejecuta o no funciona

---

## 🚨 Conclusión Temporal

**Problema**: Hay una desconexión entre:
- Lo que el schema define (sin `productId`)
- Lo que Zod está validando (`productId` requerido)
- Lo que el frontend envía (sin `productId`)

**Causa probable**: SyntroJS en modo Lambda puede estar:
1. Validando antes del preprocess
2. Usando un schema diferente o inferido
3. No ejecutando el preprocess correctamente

**Próximo paso**: Revisar logs de CloudWatch con los debug logs agregados para entender QUÉ está pasando realmente.

---

## 🔍 Diagnóstico del Código Fuente

### Flujo de Validación en SyntroJS Lambda

Después de revisar el código fuente de SyntroJS, el flujo es:

1. **`ApiGatewayAdapter.toRequestDTO()`** (línea 206-272):
   - Parsea el body con `JSON.parse(event.body)` (línea 974)
   - Retorna un `RequestDTO` con el body parseado

2. **`ApiGatewayAdapter.validateAndGetData()`** (línea 658-740):
   - Llama a `this.validator.validate(route.config.body, requestDTO.body)` (línea 690-693)
   - Si falla, retorna un error de validación

3. **`SchemaValidator.validate()`** (línea 33-68):
   - Llama directamente a `schema.safeParse(data)` (línea 50)
   - Zod debería ejecutar el `preprocess` automáticamente aquí

### ✅ Confirmación: Zod Ejecuta Preprocess Correctamente

**Zod ejecuta el `preprocess` ANTES de la validación** cuando se llama a `safeParse()`. Esto significa que el problema NO es que SyntroJS valide antes del preprocess.

### 🎯 Causa Raíz Probable

Basándome en el análisis del código, hay **dos posibles causas**:

#### Causa 1: El Schema Realmente Tiene `productId` (Más Probable)

El error dice que Zod espera `productId` como string requerido. Esto sugiere que:

- **El schema que se está usando SÍ tiene `productId` definido**
- Puede haber un schema diferente al que se muestra en el análisis
- Puede haber un schema base o extendido que incluye `productId`

**Solución**: Verificar que el schema usado en `app.post('/products', { body: CreateProductSchema })` realmente sea el correcto.

#### Causa 2: El Body Tiene `productId: undefined` Explícitamente

Si el frontend envía `{ productId: undefined, ... }`, Zod lo ve como un campo presente pero con valor `undefined`, lo cual falla la validación si el schema espera un string.

**Solución**: Asegurarse de que el frontend NO incluya `productId` en el objeto (ni siquiera como `undefined`).

---

## ✅ Soluciones Propuestas

### Solución 1: Usar `.omit()` en lugar de `preprocess` (Recomendada)

En lugar de usar `preprocess` para eliminar `productId`, usa `.omit()` para crear un schema sin ese campo:

```javascript
const CreateProductSchemaBase = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  description: z.string().optional(),
  price: z.number().positive('Precio debe ser positivo').optional(),
  stock: z.number().int().nonnegative('Stock debe ser un número entero no negativo').default(0),
  category: z.string().optional(),
  productId: z.string().optional(), // Incluir pero hacerlo opcional
});

// Crear schema sin productId usando omit
const CreateProductSchema = CreateProductSchemaBase.omit({ productId: true });
```

**Ventajas**:
- Más explícito y claro
- No depende del preprocess
- Funciona igual en REST y Lambda

### Solución 2: Usar `.strip()` después del schema base

```javascript
const CreateProductSchemaBase = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  description: z.string().optional(),
  price: z.number().positive('Precio debe ser positivo').optional(),
  stock: z.number().int().nonnegative('Stock debe ser un número entero no negativo').default(0),
  category: z.string().optional(),
});

// Permitir productId pero eliminarlo después de la validación
const CreateProductSchema = CreateProductSchemaBase.extend({
  productId: z.string().optional(),
}).strip();
```

**Nota**: `.strip()` elimina campos desconocidos DESPUÉS de la validación, pero si `productId` está en el schema (aunque sea opcional), no debería causar el error.

### Solución 3: Verificar el Schema Realmente Usado

Agregar logs para verificar qué schema se está usando:

```javascript
app.post('/products', {
  body: CreateProductSchema,
  handler: async ({ body }) => {
    console.log('Schema usado:', CreateProductSchema);
    console.log('Body recibido:', body);
    const productId = randomUUID();
    // ...
  },
});
```

### Solución 4: Usar `.passthrough()` y eliminar manualmente

```javascript
const CreateProductSchema = CreateProductSchemaBase.passthrough().transform((data) => {
  const { productId, ...rest } = data;
  return rest;
});
```

---

## 🧪 Test para Reproducir el Problema

Crear un test que reproduzca el problema:

```javascript
import { SyntroJS } from 'syntrojs';
import { z } from 'zod';

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

    const CreateProductSchema = z.preprocess((data) => {
      const cleaned = { ...data };
      delete cleaned.productId;
      return cleaned;
    }, CreateProductSchemaBase);

    app.post('/products', {
      body: CreateProductSchema,
      handler: async ({ body }) => body,
    });

    const handler = app.handler();

    const event = {
      httpMethod: 'POST',
      path: '/products',
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
    expect(response.statusCode).toBe(200); // Debería pasar, no fallar
  });
});
```

---

## 📚 Referencias

- SyntroJS 0.6.10
- Zod documentation: https://zod.dev/
- Error original: `invalid_type` con `productId: Required`
- Request: `{name, stock, description, category, price}` (sin productId)
- Código fuente revisado:
  - `src/lambda/adapters/ApiGatewayAdapter.ts` (líneas 658-740, 951-980)
  - `src/application/SchemaValidator.ts` (líneas 33-68)

