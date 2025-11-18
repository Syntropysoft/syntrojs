# Diagnóstico CORS - Lambda Mode

## 🎯 Objetivo

Identificar problemas específicos de CORS en **Lambda Mode** (`rest: false`) de SyntroJS.

## 📋 Checklist de Diagnóstico

### 1. Verificar Versión

```bash
npm list syntrojs
```

**Versiones esperadas**:
- ✅ v0.6.8-alpha.0+ - CORS debería funcionar con `lambdaCors: true`
- ❌ v0.6.7 y anteriores - No hay soporte CORS para Lambda

### 2. Verificar Configuración

```typescript
const app = new SyntroJS({
  rest: false, // ← Modo Lambda
  lambdaCors: true, // ← Debe estar presente
  // O
  lambdaCors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  },
});
```

**Verificar**:
- [ ] ¿`rest: false` está configurado?
- [ ] ¿`lambdaCors` está presente?
- [ ] ¿Es `true` o un objeto `CorsOptions`?
- [ ] ¿Los métodos incluyen `OPTIONS`?

### 3. Verificar Handler Export

```typescript
// ✅ Correcto
const app = new SyntroJS({ rest: false, lambdaCors: true });
app.post('/users', { handler: ... });
export const handler = app.handler(); // ← Usar app.handler()

// ❌ Incorrecto - No usar handler manual
export const handler = async (event) => {
  // Esto bypassa SyntroJS y no incluye CORS
};
```

### 4. Test OPTIONS Preflight (Local con SAM/LocalStack)

```bash
# Con SAM Local
sam local start-api
curl -X OPTIONS http://localhost:3000/users \
  -H "Origin: https://example.com" \
  -H "Access-Control-Request-Method: POST" \
  -v

# O directamente con Lambda
aws lambda invoke \
  --function-name your-function \
  --payload '{"httpMethod":"OPTIONS","path":"/users","headers":{"origin":"https://example.com","access-control-request-method":"POST"}}' \
  response.json
cat response.json
```

**Resultado esperado** (v0.6.8-alpha.0+):
```json
{
  "statusCode": 204,
  "headers": {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  },
  "body": ""
}
```

**Resultado problemático**:
```json
{
  "statusCode": 404,
  "body": "{\"error\":\"Not Found\"}"
}
```

### 5. Test POST después de OPTIONS

```bash
curl -X POST https://your-api.execute-api.us-east-1.amazonaws.com/Prod/users \
  -H "Origin: https://example.com" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test"}' \
  -v
```

**Resultado esperado**:
```
HTTP/1.1 200 OK
Access-Control-Allow-Origin: *
Content-Type: application/json
```

### 6. Verificar Logs de CloudWatch

**Logs esperados** (v0.6.8-alpha.0+):
- OPTIONS debería ser manejado por `handleOptionsRequest()`
- Headers CORS deberían estar presentes en todas las respuestas

**Logs problemáticos**:
- OPTIONS devolviendo 404
- Respuestas sin headers CORS
- Errores sobre `lambdaCors` no configurado

## 🔍 Áreas Específicas de Lambda Mode

### ApiGatewayAdapter

**Verificar**:
- [ ] ¿`lambdaCors` se pasa al constructor de `ApiGatewayAdapter`?
- [ ] ¿`buildCorsHeaders()` se llama en todas las respuestas?
- [ ] ¿`handleOptionsRequest()` maneja OPTIONS correctamente?

**Código relevante**:
- `src/lambda/adapters/ApiGatewayAdapter.ts` - Manejo de CORS
- `src/lambda/handlers/LambdaHandler.ts` - Pasa configuración CORS

### Flujo de Respuesta Lambda

**Flujo correcto** (v0.6.8-alpha.0+):
```typescript
// 1. Request llega a Lambda
event = { httpMethod: 'OPTIONS', path: '/users', ... }

// 2. LambdaHandler detecta tipo de evento
adapter = ApiGatewayAdapter

// 3. ApiGatewayAdapter.handle()
if (method === 'OPTIONS') {
  return handleOptionsRequest() // ← Maneja OPTIONS
}

// 4. Para otras respuestas
return toLambdaResponse(result, statusCode, requestOrigin)
// ← buildCorsHeaders() agrega CORS a todas las respuestas
```

## 🐛 Problemas Conocidos por Versión

### v0.6.7 y anteriores
- ❌ No hay soporte CORS para Lambda
- ❌ OPTIONS devuelve 404
- ❌ Respuestas sin headers CORS
- **Causa**: No había implementación de CORS para Lambda

### v0.6.8-alpha.0+
- ✅ Soporte CORS con `lambdaCors: true`
- ✅ OPTIONS manejado automáticamente
- ✅ Headers CORS en todas las respuestas
- ⚠️ **Estado**: Alpha - Requiere validación

## 🧪 Script de Prueba Completo

```bash
#!/bin/bash
# test-lambda-cors.sh

API_URL="https://your-api.execute-api.us-east-1.amazonaws.com/Prod"

echo "=== Testing Lambda Mode CORS ==="
echo ""

echo "1. Testing OPTIONS preflight..."
curl -X OPTIONS "$API_URL/users" \
  -H "Origin: https://example.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type" \
  -v 2>&1 | grep -E "(HTTP|Access-Control|404|204)"

echo ""
echo "2. Testing POST after preflight..."
curl -X POST "$API_URL/users" \
  -H "Origin: https://example.com" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test"}' \
  -v 2>&1 | grep -E "(HTTP|Access-Control|200|404)"
```

## 📊 Matriz de Diagnóstico

| Síntoma | Posible Causa | Solución |
|---------|---------------|----------|
| OPTIONS → 404 | `lambdaCors` no configurado | Agregar `lambdaCors: true` |
| OPTIONS → 204 sin headers CORS | `lambdaCors` configurado pero no se aplica | Verificar versión (0.6.8-alpha.0+) |
| POST funciona pero sin headers CORS | `lambdaCors` no configurado | Agregar `lambdaCors: true` |
| Todas las respuestas sin CORS | Código no desplegado o versión incorrecta | Verificar versión y redesplegar |

## 🔍 Verificaciones Específicas

### 1. Verificar que lambdaCors se aplica

```typescript
// En tu código Lambda
const app = new SyntroJS({
  rest: false,
  lambdaCors: true, // ← Verificar que está presente
});

// Verificar que se pasa al handler
console.log('CORS Config:', app.config.lambdaCors); // Debería mostrar true o objeto
```

### 2. Verificar respuesta de OPTIONS

```typescript
// Agregar log temporal en ApiGatewayAdapter.handleOptionsRequest()
console.log('Handling OPTIONS request');
console.log('CORS Config:', this.corsConfig);
console.log('Response:', response);
```

### 3. Verificar headers en todas las respuestas

```typescript
// Agregar log temporal en ApiGatewayAdapter.toLambdaResponse()
console.log('Building response with CORS');
console.log('CORS Headers:', corsHeaders);
console.log('Final Headers:', response.headers);
```

## 🎯 Próximos Pasos si el Problema Persiste

1. **Verificar código desplegado**:
   - ¿La versión en AWS es 0.6.8-alpha.0+?
   - ¿El código incluye `lambdaCors`?

2. **Capturar evento completo**:
   ```typescript
   export const handler = async (event) => {
     console.log('Event:', JSON.stringify(event, null, 2));
     return app.handler()(event);
   };
   ```

3. **Verificar CloudWatch Logs**:
   - Buscar logs de `handleOptionsRequest`
   - Buscar logs de `buildCorsHeaders`
   - Verificar errores

4. **Probar con configuración mínima**:
   ```typescript
   const app = new SyntroJS({
     rest: false,
     lambdaCors: true, // Configuración mínima
   });
   app.get('/test', { handler: () => ({ success: true }) });
   export const handler = app.handler();
   ```

5. **Documentar resultados** en `ERROR_LAMBDA_[VERSION].md`

## 📚 Referencias

- [SOLUCION_CORS_LAMBDA.md](../SOLUCION_CORS_LAMBDA.md) - Solución completa para Lambda
- [CHANGELOG_v0.6.8.md](../../CHANGELOG_v0.6.8.md) - Detalles de implementación
- [LAMBDA_USAGE.md](../../LAMBDA_USAGE.md) - Guía de uso de Lambda
- [Problema General](../PROBLEMA_GENERAL_CORS.md) - Análisis completo del problema
- [Guía Comparativa](./GUIA_DIAGNOSTICO_COMPARATIVO.md) - Comparación REST vs Lambda

