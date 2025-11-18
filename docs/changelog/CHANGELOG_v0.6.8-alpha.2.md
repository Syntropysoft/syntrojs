# Changelog v0.6.8-alpha.2

**Release Date**: 2024-11-18

## 🐛 Bug Fixes

### Lambda CORS multiValueHeaders Support

**Problema**: API Gateway puede enviar headers en dos formatos (`headers` y `multiValueHeaders`). El código solo buscaba en `headers`, causando que cuando el origin venía en `multiValueHeaders`, se devolviera `"*"` en lugar del origin real.

**Solución**:
- ✅ Nueva función `mergeHeaders()` que combina ambos formatos
- ✅ `toRequestDTO()` ahora usa `mergeHeaders()` antes de crear el RequestDTO
- ✅ Manejo de errores también usa `mergeHeaders()` para extraer origin correctamente
- ✅ Case-insensitive header matching para evitar duplicados

**Archivos Modificados**:
- `src/lambda/adapters/ApiGatewayAdapter.ts`
  - Nueva función `hasKeyCaseInsensitive()` (pure predicate function)
  - Nueva función `mergeHeaders()` (pure function)
  - Actualizado `toRequestDTO()` para usar `mergeHeaders()`
  - Actualizado catch block para usar `mergeHeaders()`

## ✨ Improvements

### Code Quality & Principles

- ✅ **extractCookies()**: Ahora case-insensitive (igual que `extractOrigin`)
- ✅ **extractQueryParameters()**: Guard clauses para arrays vacíos, inmutabilidad mejorada
- ✅ **parseBody()**: Guard clause adicional para body vacío
- ✅ **buildRequestContext()**: Guard clauses adicionales (method, path)
- ✅ **validateAndGetData()**: Ahora pasa `requestOrigin` a todos los errores de validación
- ✅ **Documentación completa**: Todos los métodos documentan principios aplicados (SOLID, DDD, FP, Guard Clauses)

### Principles Applied

- ✅ **SOLID**: Single Responsibility, Open/Closed, Dependency Inversion
- ✅ **DDD**: Value Object transformations, Domain Service delegation
- ✅ **Functional Programming**: Pure functions, immutability, composition
- ✅ **Guard Clauses**: Early validation en todos los métodos (54+ guard clauses)

## 🧪 Tests

- ✅ 14 tests pasando (6 REST + 8 Lambda)
- ✅ Nuevos tests para `multiValueHeaders` support
- ✅ Todos los tests existentes siguen funcionando

## 📊 Resultados

- ✅ CORS headers ahora reflejan correctamente el origin real del request
- ✅ Compatible con ambos formatos de API Gateway (`headers` y `multiValueHeaders`)
- ✅ Código completamente alineado con principios arquitectónicos

## ⚠️ Alpha Status

Esta versión corrige el bug de `multiValueHeaders` y mejora la calidad del código. Lambda mode sigue en **alpha** y requiere pruebas exhaustivas antes de usar en producción.

## 🔗 Referencias

- Issue: CORS headers devolvían `"*"` cuando origin estaba en `multiValueHeaders`
- Fix: Implementación de `mergeHeaders()` con soporte case-insensitive
- Tests: Suite completa de tests para `multiValueHeaders`

