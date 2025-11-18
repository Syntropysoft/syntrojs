# Problema General de CORS en SyntroJS

## 🎯 Resumen Ejecutivo

El problema de CORS con OPTIONS (preflight) afecta **AMBOS modos** de SyntroJS:

- ❌ **REST Mode** (`rest: true`) - Problema con OPTIONS
- ❌ **Lambda Mode** (`rest: false`) - Problema con OPTIONS

Esto indica que el problema está en el **core de SyntroJS**, no en adapters específicos.

## 📊 Estado por Versión

### v0.6.4 - v0.6.6
- ❌ REST Mode: OPTIONS devuelve 404
- ❌ Lambda Mode: OPTIONS devuelve 404
- **Causa**: CORS plugin registrado antes de rutas

### v0.6.7
- ✅ **REST Mode**: Solucionado - CORS plugin ahora se registra después de rutas
- ❌ Lambda Mode: Problema persiste (sin soporte CORS)

### v0.6.8-alpha.0
- ✅ **REST Mode**: Solucionado (desde v0.6.7)
- ✅ **Lambda Mode**: Solución implementada con `lambdaCors: true`
- ⚠️ **Estado**: Alpha - Requiere validación en producción

## 🔍 Análisis del Problema

### REST Mode (v0.6.7+)

**Problema original**: CORS plugin se registraba antes de rutas, causando que OPTIONS no funcionara.

**Solución implementada**:
- CORS plugin ahora se registra **después** de rutas en `SyntroJS.listen()`
- El plugin `@fastify/cors` maneja automáticamente OPTIONS para todas las rutas registradas

**Cómo usar**:
```typescript
const app = new SyntroJS({
  rest: true, // o omitir (default)
  fluentConfig: {
    cors: true, // o { origin: '*', ... }
  },
});
```

### Lambda Mode (v0.6.8-alpha.0+)

**Problema**: No había soporte para CORS en Lambda mode.

**Solución implementada**:
- Headers CORS agregados manualmente a todas las respuestas
- Manejo explícito de OPTIONS preflight en `ApiGatewayAdapter`
- Configuración mediante `lambdaCors`

**Cómo usar**:
```typescript
const app = new SyntroJS({
  rest: false,
  lambdaCors: true, // o { origin: '*', ... }
});
```

## 🧪 Verificación

### REST Mode

```bash
# Debería devolver 204 con headers CORS
curl -X OPTIONS http://localhost:3000/users \
  -H "Origin: http://localhost:3001" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

**Resultado esperado** (v0.6.7+):
- Status: `204 No Content`
- Headers: `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, etc.

### Lambda Mode

```bash
# Debería devolver 204 con headers CORS
curl -X OPTIONS https://your-api.execute-api.us-east-1.amazonaws.com/Prod/users \
  -H "Origin: https://example.com" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

**Resultado esperado** (v0.6.8-alpha.0+):
- Status: `204 No Content`
- Headers: `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, etc.

## 📋 Checklist de Verificación

### REST Mode
- [ ] ¿Estás usando v0.6.7 o superior?
- [ ] ¿Configuraste `fluentConfig.cors: true`?
- [ ] ¿OPTIONS devuelve 204 con headers CORS?
- [ ] ¿POST funciona después del preflight?

### Lambda Mode
- [ ] ¿Estás usando v0.6.8-alpha.0 o superior?
- [ ] ¿Configuraste `lambdaCors: true`?
- [ ] ¿OPTIONS devuelve 204 con headers CORS?
- [ ] ¿POST funciona después del preflight?

## 🔧 Troubleshooting

### REST Mode - OPTIONS sigue devolviendo 404

**Verificar**:
1. Versión de SyntroJS: `npm list syntrojs`
2. Configuración CORS: `fluentConfig.cors` debe estar presente
3. Orden de registro: CORS debe registrarse después de rutas (v0.6.7+)

**Solución**:
```typescript
// Asegúrate de usar v0.6.7+
const app = new SyntroJS({
  fluentConfig: {
    cors: true, // ← Necesario
  },
});

// Registrar rutas ANTES de listen()
app.post('/users', { handler: ... });

// listen() registra CORS después de rutas automáticamente
await app.listen(3000);
```

### Lambda Mode - OPTIONS sigue devolviendo 404

**Verificar**:
1. Versión de SyntroJS: `npm list syntrojs` (debe ser 0.6.8-alpha.0+)
2. Configuración CORS: `lambdaCors` debe estar presente
3. Modo Lambda: `rest: false` debe estar configurado

**Solución**:
```typescript
// Asegúrate de usar v0.6.8-alpha.0+
const app = new SyntroJS({
  rest: false, // ← Modo Lambda
  lambdaCors: true, // ← Necesario para CORS
});

app.post('/users', { handler: ... });

export const handler = app.handler();
```

## 📚 Referencias

- [SOLUCION_CORS_LAMBDA.md](./SOLUCION_CORS_LAMBDA.md) - Solución específica para Lambda
- [CHANGELOG_v0.6.7.md](../CHANGELOG_v0.6.7.md) - Fix para REST mode
- [CHANGELOG_v0.6.8.md](../CHANGELOG_v0.6.8.md) - Solución para Lambda mode
- [ANALISIS_PROBLEMA_BASE.md](./ANALISIS_PROBLEMA_BASE.md) - Análisis técnico detallado

## 🎯 Conclusión

- ✅ **REST Mode**: Solucionado en v0.6.7
- ✅ **Lambda Mode**: Solución implementada en v0.6.8-alpha.0
- ⚠️ **Lambda Mode**: Requiere validación en producción (alpha)

Ambos modos ahora tienen soporte completo de CORS, pero Lambda mode está en alpha y requiere pruebas adicionales.

