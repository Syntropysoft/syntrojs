# Changelog v0.6.8-alpha.1

**Release Date**: 2024-11-18

## 🐛 Bug Fixes

### Lambda CORS Origin Extraction

**Problema**: Los headers de API Gateway son case-insensitive, pero el código accedía directamente a `headers.origin`. Cuando el header venía como `Origin` o `ORIGIN`, no se encontraba y se devolvía `'*'` en lugar del origin real del request.

**Solución**:
- ✅ Nueva función `extractOrigin()` que busca el header `Origin` de forma case-insensitive
- ✅ Reemplazadas todas las referencias a `headers.origin` por `extractOrigin(headers)`
- ✅ CORS headers ahora reflejan correctamente el origin del request cuando `origin: true` está configurado

**Archivos Modificados**:
- `src/lambda/adapters/ApiGatewayAdapter.ts`
  - Nueva función `extractOrigin()` (pure function, case-insensitive)
  - Actualizado método `handle()` para usar `extractOrigin()`
  - Actualizado método `handleOptionsRequest()` para usar `extractOrigin()`
  - Todos los métodos ahora extraen el origin correctamente

**Tests Agregados**:
- `tests/universal/lambda/LambdaCorsIntegration.test.ts` (nuevo archivo)
  - 8 tests de integración para CORS en Lambda mode
  - Verifica OPTIONS preflight con diferentes configuraciones
  - Verifica CORS headers en respuestas exitosas y errores
  - Verifica edge cases (CORS deshabilitado, wildcard origin)

**Principios Aplicados**:
- ✅ SOLID: Single Responsibility (función dedicada para extraer origin)
- ✅ DDD: Pure function sin side effects
- ✅ Functional Programming: Inmutabilidad, composición
- ✅ Guard Clauses: Validación temprana

## 📊 Resultados

- ✅ 14 tests pasando (6 REST + 8 Lambda)
- ✅ Sin errores de linting
- ✅ CORS headers correctos en todas las respuestas Lambda

## ⚠️ Alpha Status

Esta versión corrige un bug crítico en la extracción del origin para CORS en Lambda mode. Sin embargo, Lambda mode sigue en **alpha** y requiere pruebas exhaustivas antes de usar en producción.

## 🔗 Referencias

- Issue: CORS headers devolvían `'*'` en lugar del origin real del request
- Fix: Implementación de `extractOrigin()` con búsqueda case-insensitive
- Tests: Suite completa de tests de integración para CORS en Lambda

