# Diagnóstico CORS - REST Mode

## 🎯 Objetivo

Identificar problemas específicos de CORS en **REST Mode** (`rest: true` o por defecto) de SyntroJS.

## 📋 Checklist de Diagnóstico

### 1. Verificar Versión

```bash
npm list syntrojs
```

**Versiones esperadas**:
- ✅ v0.6.7+ - CORS debería funcionar correctamente
- ❌ v0.6.4-v0.6.6 - Problema conocido con OPTIONS

### 2. Verificar Configuración

```typescript
const app = new SyntroJS({
  rest: true, // o omitir (default)
  fluentConfig: {
    cors: true, // ← Debe estar presente
    // O
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    },
  },
});
```

**Verificar**:
- [ ] ¿`fluentConfig.cors` está configurado?
- [ ] ¿Es `true` o un objeto `CorsOptions`?
- [ ] ¿Los métodos incluyen `OPTIONS`?

### 3. Verificar Orden de Registro

**Orden correcto** (v0.6.7+):
1. Crear instancia de SyntroJS
2. Registrar rutas (`app.post()`, `app.get()`, etc.)
3. Llamar `app.listen()` - esto registra CORS **después** de rutas automáticamente

```typescript
// ✅ Correcto
const app = new SyntroJS({ fluentConfig: { cors: true } });
app.post('/users', { handler: ... });
await app.listen(3000); // CORS se registra después de rutas

// ❌ Incorrecto - No llamar listen() antes de registrar rutas
const app = new SyntroJS({ fluentConfig: { cors: true } });
await app.listen(3000); // CORS se registra antes de rutas
app.post('/users', { handler: ... });
```

### 4. Test OPTIONS Preflight

```bash
curl -X OPTIONS http://localhost:3000/users \
  -H "Origin: http://localhost:3001" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type" \
  -v
```

**Resultado esperado** (v0.6.7+):
```
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: http://localhost:3001
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: content-type
```

**Resultado problemático**:
```
HTTP/1.1 404 Not Found
(No headers CORS)
```

### 5. Test POST después de OPTIONS

```bash
curl -X POST http://localhost:3000/users \
  -H "Origin: http://localhost:3001" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test"}' \
  -v
```

**Resultado esperado**:
```
HTTP/1.1 200 OK
Access-Control-Allow-Origin: http://localhost:3001
Content-Type: application/json
```

### 6. Verificar Logs del Servidor

**Logs esperados** (v0.6.7+):
- No debería haber errores relacionados con CORS
- OPTIONS debería aparecer en logs como petición normal

**Logs problemáticos**:
- Errores sobre plugin CORS no encontrado
- OPTIONS devolviendo 404 en logs
- Warnings sobre orden de registro

## 🔍 Áreas Específicas de REST Mode

### Plugin @fastify/cors

**Verificar**:
- [ ] ¿El plugin está instalado? (`npm list @fastify/cors`)
- [ ] ¿Se registra correctamente?
- [ ] ¿Se registra **después** de rutas?

**Código relevante**:
- `src/core/SyntroJS.ts` - `registerCorsPluginIfEnabled()`
- `src/infrastructure/FluentAdapter.ts` - `registerCorsPlugin()`

### Orden de Inicialización

**Flujo correcto** (v0.6.7+):
```typescript
// 1. Crear instancia
const app = new SyntroJS({ fluentConfig: { cors: true } });

// 2. Registrar rutas
app.post('/users', { handler: ... });

// 3. listen() registra CORS después de rutas
await app.listen(3000);
// Internamente:
// - registerAllRoutes() → registra POST /users
// - registerCorsPluginIfEnabled() → registra CORS plugin
// - @fastify/cors maneja OPTIONS automáticamente
```

## 🐛 Problemas Conocidos por Versión

### v0.6.4 - v0.6.6
- ❌ CORS plugin registrado **antes** de rutas
- ❌ OPTIONS devuelve 404
- **Causa**: Orden incorrecto de registro

### v0.6.7+
- ✅ CORS plugin registrado **después** de rutas
- ✅ OPTIONS funciona correctamente
- **Solución**: Orden corregido en `SyntroJS.listen()`

## 🧪 Script de Prueba Completo

```bash
#!/bin/bash
# test-rest-cors.sh

URL="http://localhost:3000"

echo "=== Testing REST Mode CORS ==="
echo ""

echo "1. Testing OPTIONS preflight..."
curl -X OPTIONS "$URL/users" \
  -H "Origin: http://localhost:3001" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type" \
  -v 2>&1 | grep -E "(HTTP|Access-Control|404|204)"

echo ""
echo "2. Testing POST after preflight..."
curl -X POST "$URL/users" \
  -H "Origin: http://localhost:3001" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test"}' \
  -v 2>&1 | grep -E "(HTTP|Access-Control|200|404)"
```

## 📊 Matriz de Diagnóstico

| Síntoma | Posible Causa | Solución |
|---------|---------------|----------|
| OPTIONS → 404 | CORS registrado antes de rutas | Usar v0.6.7+ |
| OPTIONS → 204 sin headers CORS | Configuración CORS incorrecta | Verificar `fluentConfig.cors` |
| POST funciona pero sin headers CORS | Plugin CORS no registrado | Verificar que `cors: true` está presente |
| Error "Plugin not found" | `@fastify/cors` no instalado | `npm install @fastify/cors` |

## 🎯 Próximos Pasos si el Problema Persiste

1. **Capturar logs completos** del servidor durante petición OPTIONS
2. **Verificar versión exacta** de SyntroJS y @fastify/cors
3. **Probar con configuración mínima**:
   ```typescript
   const app = new SyntroJS({
     fluentConfig: { cors: true },
   });
   app.get('/test', { handler: () => ({}) });
   await app.listen(3000);
   ```
4. **Documentar resultados** en `ERROR_REST_[VERSION].md`

## 📚 Referencias

- [CHANGELOG_v0.6.7.md](../../CHANGELOG_v0.6.7.md) - Fix para REST mode
- [CorsOptionsRegression.test.ts](../../../tests/universal/cors/CorsOptionsRegression.test.ts) - Tests de regresión
- [Problema General](../PROBLEMA_GENERAL_CORS.md) - Análisis completo del problema
- [Guía Comparativa](./GUIA_DIAGNOSTICO_COMPARATIVO.md) - Comparación REST vs Lambda

