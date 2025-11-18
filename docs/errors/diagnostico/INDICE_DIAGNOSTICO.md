# Índice de Diagnóstico CORS - SyntroJS

## 🎯 Punto de Entrada Rápido

**¿Tienes un problema con CORS?**

1. **Identifica tu modo** → REST o Lambda
2. **Sigue la guía específica** → Ver abajo
3. **Compara resultados** → Usa guía comparativa

## 🚀 Inicio Rápido

### ¿Qué modo estás usando?

```typescript
// REST Mode
const app = new SyntroJS({
  fluentConfig: { cors: true },
});

// Lambda Mode
const app = new SyntroJS({
  rest: false,
  lambdaCors: true,
});
```

## 📚 Guías por Modo

### 🔵 REST Mode

**Guía específica**: [DIAGNOSTICO_REST_MODE.md](./DIAGNOSTICO_REST_MODE.md)

**Checklist rápido**:
- [ ] Versión v0.6.7+ ✅
- [ ] `fluentConfig.cors: true` configurado
- [ ] `@fastify/cors` instalado
- [ ] Rutas registradas antes de `listen()`

**Problema común**: OPTIONS devuelve 404
**Solución**: Usar v0.6.7+ (CORS se registra después de rutas)

### 🟢 Lambda Mode

**Guía específica**: [DIAGNOSTICO_LAMBDA_MODE.md](./DIAGNOSTICO_LAMBDA_MODE.md)

**Checklist rápido**:
- [ ] Versión v0.6.8-alpha.0+ ✅
- [ ] `rest: false` configurado
- [ ] `lambdaCors: true` configurado
- [ ] Handler exportado con `app.handler()`

**Problema común**: OPTIONS devuelve 404 o sin headers CORS
**Solución**: Agregar `lambdaCors: true` en configuración

## 🔄 Comparación Lado a Lado

**Guía comparativa**: [GUIA_DIAGNOSTICO_COMPARATIVO.md](./GUIA_DIAGNOSTICO_COMPARATIVO.md)

| Aspecto | REST Mode | Lambda Mode |
|---------|-----------|-------------|
| Config | `fluentConfig.cors` | `lambdaCors` |
| Versión mínima | v0.6.7+ | v0.6.8-alpha.0+ |
| Manejo OPTIONS | Plugin automático | Manual en adapter |
| Headers CORS | Por plugin | Manual en respuestas |

## 📋 Flujo de Diagnóstico

```
┌─────────────────────────────────────┐
│   ¿Tienes problema con CORS?        │
└──────────────┬──────────────────────┘
               │
               ▼
    ┌──────────────────────┐
    │ ¿Qué modo usas?       │
    └──────┬────────┬────────┘
           │        │
    ┌──────▼──┐  ┌─▼──────────┐
    │ REST     │  │ Lambda     │
    └──────┬──┘  └─┬──────────┘
           │        │
    ┌──────▼──┐  ┌─▼──────────┐
    │ Ver      │  │ Ver        │
    │ DIAGNOSTICO_REST_MODE.md │
    │          │  │ DIAGNOSTICO_LAMBDA_MODE.md │
    └──────────┘  └────────────┘
```

## 🧪 Tests Rápidos

### Test REST Mode

```bash
# Debería devolver 204 con headers CORS
curl -X OPTIONS http://localhost:3000/users \
  -H "Origin: http://localhost:3001" \
  -v
```

### Test Lambda Mode

```bash
# Debería devolver 204 con headers CORS
curl -X OPTIONS https://your-api.execute-api.us-east-1.amazonaws.com/Prod/users \
  -H "Origin: https://example.com" \
  -v
```

## 📊 Matriz de Problemas Comunes

| Problema | REST Mode | Lambda Mode |
|----------|-----------|-------------|
| OPTIONS → 404 | Versión < 0.6.7 | `lambdaCors` no configurado |
| Sin headers CORS | Plugin no registrado | `lambdaCors` no configurado |
| POST funciona, OPTIONS no | Orden de registro | `lambdaCors` no configurado |

## 🎯 Decision Tree Visual

```
Problema con CORS
│
├─ ¿Qué modo?
│  │
│  ├─ REST Mode
│  │  ├─ ¿Versión >= 0.6.7?
│  │  │  ├─ Sí → Verificar fluentConfig.cors
│  │  │  └─ No → Actualizar
│  │  └─ ¿OPTIONS funciona?
│  │     ├─ Sí → ✅ Resuelto
│  │     └─ No → Ver DIAGNOSTICO_REST_MODE.md
│  │
│  └─ Lambda Mode
│     ├─ ¿Versión >= 0.6.8-alpha.0?
│     │  ├─ Sí → Verificar lambdaCors
│     │  └─ No → Actualizar
│     └─ ¿OPTIONS funciona?
│        ├─ Sí → ✅ Resuelto
│        └─ No → Ver DIAGNOSTICO_LAMBDA_MODE.md
```

## 📁 Estructura de Documentación

```
docs/errors/
│
├─ 🎯 INICIO
│  ├─ INDICE_DIAGNOSTICO.md (este archivo)
│  └─ README.md
│
├─ 🔍 DIAGNÓSTICO POR MODO
│  ├─ DIAGNOSTICO_REST_MODE.md
│  ├─ DIAGNOSTICO_LAMBDA_MODE.md
│  └─ GUIA_DIAGNOSTICO_COMPARATIVO.md
│
├─ 📊 ANÁLISIS
│  ├─ PROBLEMA_GENERAL_CORS.md
│  └─ ANALISIS_PROBLEMA_BASE.md
│
├─ ✅ SOLUCIONES
│  └─ SOLUCION_CORS_LAMBDA.md
│
├─ 🐛 ERRORES REPORTADOS
│  └─ ERROR_0.6.8-alpha.0.md
│
└─ 📝 GUÍAS DE CAPTURA
   ├─ COMO_CAPTURAR_ERRORES.md
   ├─ INSTRUCCIONES_CAPTURA.md
   └─ QUICK_TEST.md
```

## 🚨 Problemas Urgentes

### REST Mode - OPTIONS devuelve 404

**Causa más probable**: Versión anterior a v0.6.7
**Solución**: Actualizar a v0.6.7+ y verificar `fluentConfig.cors: true`

### Lambda Mode - OPTIONS devuelve 404

**Causa más probable**: `lambdaCors` no configurado o versión anterior
**Solución**: Agregar `lambdaCors: true` y usar v0.6.8-alpha.0+

### Sin headers CORS en respuestas

**REST Mode**: Verificar que `@fastify/cors` está instalado y `fluentConfig.cors` está configurado
**Lambda Mode**: Verificar que `lambdaCors: true` está configurado y versión es 0.6.8-alpha.0+

## 📞 Siguiente Paso

1. **Identifica tu modo** (REST o Lambda)
2. **Abre la guía específica** correspondiente
3. **Sigue el checklist** paso a paso
4. **Documenta resultados** si el problema persiste

## 🔗 Enlaces Rápidos

- ⭐ [Guía Comparativa](./GUIA_DIAGNOSTICO_COMPARATIVO.md) - Comparación REST vs Lambda
- 🔵 [Diagnóstico REST](./DIAGNOSTICO_REST_MODE.md) - Guía específica REST
- 🟢 [Diagnóstico Lambda](./DIAGNOSTICO_LAMBDA_MODE.md) - Guía específica Lambda
- ✅ [Solución Lambda](../SOLUCION_CORS_LAMBDA.md) - Cómo usar `lambdaCors`
- 📊 [Problema General](../PROBLEMA_GENERAL_CORS.md) - Análisis completo
- 🔍 [Análisis Técnico](../ANALISIS_PROBLEMA_BASE.md) - Análisis detallado

