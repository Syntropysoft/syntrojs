# Changelog v0.6.8-alpha.3

**Release Date**: 2024-11-18

## 🐛 Bug Fixes

### REST Mode CORS Registration Order Fix

**Problema**: OPTIONS preflight requests devolvían `404 Not Found` porque el plugin `@fastify/cors` se registraba DESPUÉS de las rutas, violando la documentación oficial de `@fastify/cors`.

**Solución**:
- ✅ CORS plugin ahora se registra en `registerPlugins()` ANTES de las rutas
- ✅ Orden correcto según documentación oficial de `@fastify/cors`
- ✅ Eliminado registro duplicado después de rutas
- ✅ `registerCorsPlugin()` marcado como deprecated (mantenido por compatibilidad)

**Archivos Modificados**:
- `src/infrastructure/FluentAdapter.ts`
  - CORS registration movido a `registerPlugins()` antes de rutas
  - `registerCorsPlugin()` marcado como deprecated
- `src/core/SyntroJS.ts`
  - Eliminado `registerCorsPluginIfEnabled()` (ya no necesario)
  - Comentarios actualizados sobre orden de registro

## 📝 Documentation Updates

### README Completamente Actualizado

- ✅ **Estado cambiado**: De "Stable Core - Lambda Alpha" a "Pre-1.0 (Known Issues)"
- ✅ **Nueva sección "Known Issues"**: Documentación completa de problemas conocidos
- ✅ **Avisos críticos**: Advertencias claras sobre CORS en REST Mode
- ✅ **Workarounds documentados**: Soluciones temporales para usuarios
- ✅ **Estado del fix**: Claramente indicado como "in progress"

**Cambios en README**:
- Sección de estado con advertencias claras
- Tabla de características actualizada (Plugins marcados como "Known Issues")
- Roadmap actualizado (CORS bugs como requisito para v1.0.0)
- Referencias a Known Issues en múltiples secciones

## ✨ Improvements

### Code Quality & Principles

- ✅ **SOLID**: Single Responsibility mantenido (registerPlugins maneja todos los plugins)
- ✅ **DDD**: Lógica encapsulada en FluentAdapter
- ✅ **Functional Programming**: Pure functions (shouldRegisterCors, buildCorsOptions)
- ✅ **Guard Clauses**: Validación temprana en todos los métodos

### Transparency

- ✅ **Honestidad con usuarios**: Problemas conocidos claramente documentados
- ✅ **Estado real**: No se oculta que hay bugs activos
- ✅ **Recomendaciones claras**: Testing requerido antes de producción

## 🧪 Tests

- ✅ 18 tests pasando (6 REST + 4 CORS + 8 Lambda)
- ✅ Todos los tests de regresión CORS pasando
- ✅ Sin errores de linter

## ⚠️ Alpha Status

Esta versión corrige el orden de registro de CORS según la documentación oficial, pero **requiere validación en producción** antes de considerar el bug resuelto. El README ahora comunica claramente los problemas conocidos a los usuarios.

## 🔗 Referencias

- Issue: CORS OPTIONS devolvía 404 en REST Mode
- Fix: Registro de CORS movido a `registerPlugins()` antes de rutas
- Documentation: README actualizado con Known Issues completo

