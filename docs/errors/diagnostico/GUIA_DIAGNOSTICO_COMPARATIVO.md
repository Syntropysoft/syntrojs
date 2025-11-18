# Guía de Diagnóstico Comparativo - REST vs Lambda

## 🎯 Objetivo

Comparar y contrastar el diagnóstico de CORS entre REST Mode y Lambda Mode para identificar problemas específicos de cada flujo.

## 📊 Tabla Comparativa

| Aspecto | REST Mode | Lambda Mode |
|---------|-----------|-------------|
| **Configuración** | `fluentConfig.cors` | `lambdaCors` |
| **Versión mínima** | v0.6.7+ | v0.6.8-alpha.0+ |
| **Plugin usado** | `@fastify/cors` | Headers manuales |
| **Manejo OPTIONS** | Automático por plugin | Manual en `ApiGatewayAdapter` |
| **Orden crítico** | CORS después de rutas | No aplica (no hay plugin) |
| **Headers CORS** | Agregados por plugin | Agregados manualmente |

## 🔍 Flujos de Diagnóstico Separados

### REST Mode - Flujo Completo

```
1. Crear SyntroJS con fluentConfig.cors
   ↓
2. Registrar rutas (app.post(), app.get(), etc.)
   ↓
3. app.listen() → registra rutas primero
   ↓
4. app.listen() → registra CORS plugin después
   ↓
5. @fastify/cors maneja OPTIONS automáticamente
   ↓
6. Todas las respuestas incluyen CORS (por plugin)
```

**Puntos de fallo**:
- ❌ CORS registrado antes de rutas (v0.6.6 y anteriores)
- ❌ Plugin CORS no instalado
- ❌ Configuración CORS incorrecta

### Lambda Mode - Flujo Completo

```
1. Crear SyntroJS con rest: false y lambdaCors
   ↓
2. Registrar rutas (app.post(), app.get(), etc.)
   ↓
3. Export handler = app.handler()
   ↓
4. Lambda recibe evento
   ↓
5. ApiGatewayAdapter.handle() detecta OPTIONS
   ↓
6. handleOptionsRequest() responde con CORS
   ↓
7. Otras respuestas → toLambdaResponse() agrega CORS
```

**Puntos de fallo**:
- ❌ `lambdaCors` no configurado
- ❌ Versión anterior a 0.6.8-alpha.0
- ❌ Handler no usa `app.handler()`

## 🧪 Tests Comparativos

### Test 1: Verificar Configuración

**REST Mode**:
```typescript
const app = new SyntroJS({
  fluentConfig: { cors: true }, // ← Verificar esto
});
```

**Lambda Mode**:
```typescript
const app = new SyntroJS({
  rest: false,
  lambdaCors: true, // ← Verificar esto
});
```

### Test 2: Verificar OPTIONS

**REST Mode**:
```bash
curl -X OPTIONS http://localhost:3000/users \
  -H "Origin: http://localhost:3001" \
  -v
# Esperado: 204 con headers CORS (v0.6.7+)
```

**Lambda Mode**:
```bash
curl -X OPTIONS https://api.execute-api.us-east-1.amazonaws.com/Prod/users \
  -H "Origin: https://example.com" \
  -v
# Esperado: 204 con headers CORS (v0.6.8-alpha.0+)
```

### Test 3: Verificar Headers en Respuestas

**REST Mode**:
- Headers agregados por `@fastify/cors` plugin
- Automático para todas las respuestas
- Verificar en respuesta HTTP

**Lambda Mode**:
- Headers agregados manualmente en `toLambdaResponse()`
- Verificar en objeto `LambdaResponse.headers`
- Debe estar presente en todas las respuestas

## 🔬 Diagnóstico Paso a Paso

### Paso 1: Identificar el Modo

```typescript
// ¿Qué modo estás usando?
const app = new SyntroJS({
  rest: true,  // ← REST Mode
  // o
  rest: false, // ← Lambda Mode
});
```

### Paso 2: Verificar Configuración Específica

**Si REST Mode**:
- [ ] ¿`fluentConfig.cors` está presente?
- [ ] ¿Versión es v0.6.7+?
- [ ] ¿`@fastify/cors` está instalado?

**Si Lambda Mode**:
- [ ] ¿`lambdaCors` está presente?
- [ ] ¿Versión es v0.6.8-alpha.0+?
- [ ] ¿`rest: false` está configurado?

### Paso 3: Ejecutar Test Específico

**REST Mode**: Ver [DIAGNOSTICO_REST_MODE.md](./DIAGNOSTICO_REST_MODE.md)
**Lambda Mode**: Ver [DIAGNOSTICO_LAMBDA_MODE.md](./DIAGNOSTICO_LAMBDA_MODE.md)

### Paso 4: Comparar Resultados

| Resultado | REST Mode | Lambda Mode |
|-----------|-----------|-------------|
| OPTIONS → 404 | Plugin antes de rutas | `lambdaCors` no configurado |
| OPTIONS → 204 sin CORS | Configuración incorrecta | `lambdaCors` no se aplica |
| POST sin CORS | Plugin no registrado | `lambdaCors` no configurado |

## 📋 Checklist Unificado

### Pre-requisitos Comunes
- [ ] Versión de SyntroJS correcta
- [ ] Configuración CORS presente
- [ ] Rutas registradas correctamente

### REST Mode Específico
- [ ] `fluentConfig.cors` configurado
- [ ] `@fastify/cors` instalado
- [ ] Versión v0.6.7+
- [ ] CORS registrado después de rutas

### Lambda Mode Específico
- [ ] `rest: false` configurado
- [ ] `lambdaCors` configurado
- [ ] Versión v0.6.8-alpha.0+
- [ ] Handler exportado con `app.handler()`

## 🎯 Decision Tree

```
¿Qué modo estás usando?
│
├─ REST Mode (rest: true o default)
│  │
│  ├─ ¿Versión >= 0.6.7?
│  │  ├─ Sí → Verificar fluentConfig.cors
│  │  └─ No → Actualizar a v0.6.7+
│  │
│  └─ ¿OPTIONS funciona?
│     ├─ Sí → ✅ Problema resuelto
│     └─ No → Ver DIAGNOSTICO_REST_MODE.md
│
└─ Lambda Mode (rest: false)
   │
   ├─ ¿Versión >= 0.6.8-alpha.0?
   │  ├─ Sí → Verificar lambdaCors
   │  └─ No → Actualizar a v0.6.8-alpha.0+
   │
   └─ ¿OPTIONS funciona?
      ├─ Sí → ✅ Problema resuelto
      └─ No → Ver DIAGNOSTICO_LAMBDA_MODE.md
```

## 📚 Referencias por Modo

### REST Mode
- [DIAGNOSTICO_REST_MODE.md](./DIAGNOSTICO_REST_MODE.md) - Diagnóstico específico
- [CHANGELOG_v0.6.7.md](../../CHANGELOG_v0.6.7.md) - Fix implementado
- [CorsOptionsRegression.test.ts](../../../tests/universal/cors/CorsOptionsRegression.test.ts) - Tests

### Lambda Mode
- [DIAGNOSTICO_LAMBDA_MODE.md](./DIAGNOSTICO_LAMBDA_MODE.md) - Diagnóstico específico
- [SOLUCION_CORS_LAMBDA.md](../SOLUCION_CORS_LAMBDA.md) - Solución completa
- [CHANGELOG_v0.6.8.md](../../CHANGELOG_v0.6.8.md) - Implementación

## 🔄 Flujo de Resolución

1. **Identificar modo** → REST o Lambda
2. **Verificar versión** → ¿Es la versión correcta?
3. **Verificar configuración** → ¿CORS está configurado?
4. **Ejecutar test específico** → Seguir guía del modo correspondiente
5. **Comparar resultados** → ¿Coincide con comportamiento esperado?
6. **Documentar** → Crear `ERROR_[MODO]_[VERSION].md` si persiste

