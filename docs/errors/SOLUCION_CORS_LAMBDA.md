# Solución CORS para Lambda - v0.6.8-alpha.0

## 🎯 Problema Identificado

Los documentos anteriores (`ERROR_0.6.8-alpha.0.md`, `COMO_CAPTURAR_ERRORES.md`) reportan problemas con:

1. **OPTIONS devuelve 404** - Las peticiones preflight CORS no se manejan correctamente
2. **Headers CORS no aplicados** - Las respuestas Lambda no incluyen headers CORS
3. **Formato de respuestas inconsistente** - Problemas con el formato de respuestas Lambda

## ✅ Solución Implementada en v0.6.8-alpha.0

### CORS Completo para Lambda

La versión `0.6.8-alpha.0` incluye soporte completo de CORS para Lambda mode:

- ✅ **Headers CORS en TODAS las respuestas** (éxito, error, validación, 404, etc.)
- ✅ **Manejo automático de OPTIONS** - Las peticiones preflight se manejan automáticamente
- ✅ **Configuración flexible** - Soporta `boolean` o `CorsOptions` object
- ✅ **Funciones puras** - Implementación siguiendo SOLID, DDD, FP

## 📝 Cómo Usar

### Configuración Básica

```typescript
import { SyntroJS } from 'syntrojs';

const app = new SyntroJS({
  rest: false, // Lambda mode
  lambdaCors: true, // Habilita CORS con configuración por defecto
});

app.post('/products', {
  handler: () => ({ success: true }),
});

export const handler = app.handler();
```

### Configuración Avanzada

```typescript
import { SyntroJS } from 'syntrojs';

const app = new SyntroJS({
  rest: false,
  lambdaCors: {
    origin: 'https://example.com', // O '*' para permitir todos
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id'],
    maxAge: 86400, // 24 horas
  },
});

export const handler = app.handler();
```

## 🔍 Qué Resuelve

### 1. OPTIONS Preflight (404 → 204)

**Antes** (sin `lambdaCors`):
```
OPTIONS /products → 404 Not Found
```

**Ahora** (con `lambdaCors: true`):
```
OPTIONS /products → 204 No Content
Headers:
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
  Access-Control-Allow-Headers: Content-Type
```

### 2. Headers CORS en Todas las Respuestas

**Antes**:
```json
{
  "statusCode": 200,
  "headers": {
    "Content-Type": "application/json"
  },
  "body": "{\"success\": true}"
}
```

**Ahora**:
```json
{
  "statusCode": 200,
  "headers": {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  },
  "body": "{\"success\": true}"
}
```

### 3. Respuestas de Error con CORS

Todas las respuestas de error ahora incluyen headers CORS:

- ✅ **400 Bad Request** (validación) - Incluye CORS
- ✅ **404 Not Found** - Incluye CORS
- ✅ **500 Internal Server Error** - Incluye CORS
- ✅ **OPTIONS Preflight** - Manejo automático con CORS

## 🧪 Cómo Probar

### 1. Probar OPTIONS Preflight

```bash
curl -X OPTIONS https://your-api.execute-api.us-east-1.amazonaws.com/Prod/products \
  -H "Origin: https://example.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type" \
  -v
```

**Resultado esperado**:
- Status: `204 No Content`
- Headers CORS presentes
- No body

### 2. Probar POST después de OPTIONS

```bash
curl -X POST https://your-api.execute-api.us-east-1.amazonaws.com/Prod/products \
  -H "Origin: https://example.com" \
  -H "Content-Type: application/json" \
  -d '{"name":"Product","price":10}' \
  -v
```

**Resultado esperado**:
- Status: `200 OK` (o el código apropiado)
- Headers CORS presentes
- Body con la respuesta

### 3. Probar desde el Navegador

```javascript
fetch('https://your-api.execute-api.us-east-1.amazonaws.com/Prod/products', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ name: 'Product', price: 10 }),
})
  .then(response => response.json())
  .then(data => console.log('Success:', data))
  .catch(error => console.error('Error:', error));
```

**Resultado esperado**:
- No errores de CORS
- Petición OPTIONS automática funciona
- Petición POST funciona después del preflight

## ⚠️ Notas Importantes

### Alpha Status

Esta funcionalidad está en **alpha** (`v0.6.8-alpha.0`):

- ✅ Funcionalidad completa implementada
- ✅ Tests pasando
- ⚠️ Requiere pruebas en producción
- ⚠️ API puede cambiar basado en feedback

### Diferencias con REST Mode

**REST Mode** (`rest: true`):
- Usa `@fastify/cors` plugin
- Configuración en `fluentConfig.cors`
- Manejo automático por Fastify

**Lambda Mode** (`rest: false`):
- Headers CORS agregados manualmente
- Configuración en `lambdaCors`
- Manejo explícito en `ApiGatewayAdapter`

### Migración desde Handler Tradicional

Si estás usando un handler Lambda tradicional con CORS manual:

```typescript
// Antes - Handler tradicional
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

// Ahora - SyntroJS con CORS automático
const app = new SyntroJS({
  rest: false,
  lambdaCors: true, // CORS automático en todas las respuestas
});

app.post('/products', { handler: () => result });

export const handler = app.handler();
```

## 🔧 Troubleshooting

### OPTIONS sigue devolviendo 404

**Verificar**:
1. ¿Estás usando `lambdaCors: true` o `lambdaCors: { ... }`?
2. ¿El endpoint está registrado correctamente?
3. ¿La ruta coincide exactamente?

**Solución**:
```typescript
// Asegúrate de que lambdaCors esté configurado
const app = new SyntroJS({
  rest: false,
  lambdaCors: true, // ← Esto es necesario
});
```

### Headers CORS no aparecen

**Verificar**:
1. ¿La configuración `lambdaCors` está presente?
2. ¿El origin del request coincide con la configuración?

**Solución**:
```typescript
// Para desarrollo, usa origin: true o '*'
const app = new SyntroJS({
  rest: false,
  lambdaCors: {
    origin: '*', // O true para permitir todos
    credentials: false,
  },
});
```

### Error en producción pero funciona localmente

**Posibles causas**:
1. Código no desplegado correctamente
2. Configuración diferente entre local y producción
3. Cache de API Gateway

**Solución**:
1. Verificar que el código desplegado incluye `lambdaCors`
2. Verificar logs de CloudWatch
3. Invalidar cache de API Gateway si es necesario

## 📊 Comparación: Antes vs Ahora

| Aspecto | Antes (sin lambdaCors) | Ahora (con lambdaCors) |
|---------|----------------------|------------------------|
| OPTIONS | 404 Not Found | 204 No Content con CORS |
| Respuestas exitosas | Sin CORS | Con CORS |
| Respuestas de error | Sin CORS | Con CORS |
| Configuración | Manual en cada respuesta | Automático |
| Preflight | No funciona | Funciona automáticamente |

## 🎯 Próximos Pasos

1. **Probar en tu entorno**: Usar `lambdaCors: true` y verificar que funciona
2. **Reportar problemas**: Si encuentras issues, documentarlos en `ERROR_[VERSION].md`
3. **Validar en producción**: Una vez validado, podemos liberar como estable

## 📚 Referencias

- [Lambda Usage Guide](../LAMBDA_USAGE.md) - Guía completa de uso de Lambda
- [CHANGELOG_v0.6.8.md](../CHANGELOG_v0.6.8.md) - Detalles técnicos de la implementación
- [COMO_CAPTURAR_ERRORES.md](./COMO_CAPTURAR_ERRORES.md) - Cómo reportar problemas

