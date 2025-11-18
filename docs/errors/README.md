# Errores de SyntroJS - Documentación

Esta carpeta contiene documentación sobre los errores encontrados al probar SyntroJS, especialmente relacionados con el manejo de OPTIONS (preflight CORS).

## 📁 Estructura

### 🎯 Área de Diagnóstico (Para Pruebas)
- `diagnostico/` - ✅ **TODA LA DOCUMENTACIÓN DE DIAGNÓSTICO**
  - `INDICE_DIAGNOSTICO.md` - ⭐ **EMPEZAR AQUÍ** - Índice visual y guía rápida
  - `DIAGNOSTICO_REST_MODE.md` - Diagnóstico específico para REST Mode
  - `DIAGNOSTICO_LAMBDA_MODE.md` - Diagnóstico específico para Lambda Mode
  - `GUIA_DIAGNOSTICO_COMPARATIVO.md` - Comparación REST vs Lambda
  - `COMO_CAPTURAR_ERRORES.md` - Guía para capturar información de errores
  - `INSTRUCCIONES_CAPTURA.md` - Instrucciones detalladas para capturar errores
  - `QUICK_TEST.md` - Guía rápida para probar
  - `README.md` - Índice de la carpeta de diagnóstico

### Análisis General
- `PROBLEMA_GENERAL_CORS.md` - Análisis del problema general (REST + Lambda)
- `ANALISIS_PROBLEMA_BASE.md` - Análisis técnico del problema base

### Soluciones
- `SOLUCION_CORS_LAMBDA.md` - Solución implementada para CORS en Lambda

### Errores Reportados
- `ERROR_0.6.8-alpha.0.md` - Errores encontrados con la versión 0.6.8-alpha.0

### Índice
- `README.md` - Este archivo

## 🎯 Objetivo

Documentar los problemas encontrados para:
1. Diagnosticar la causa raíz
2. Reportar bugs al equipo de SyntroJS si es necesario
3. Encontrar workarounds mientras se resuelve
4. Tener un historial de qué versiones se probaron y qué problemas tenían

## 📝 Cómo Contribuir

Cuando encuentres un nuevo error:

1. Crear un archivo `ERROR_[VERSION].md` con:
   - Versión de SyntroJS probada
   - Error específico encontrado
   - Pasos para reproducir
   - Logs y mensajes de error
   - Comportamiento esperado vs observado

2. Actualizar este README con referencia al nuevo error

3. Si encuentras una solución o workaround, documentarlo también

## 🔍 Versiones Probadas

- [ ] 0.6.4 - Problema conocido con OPTIONS (REST + Lambda)
- [ ] 0.6.5 - Problema persiste (REST + Lambda)
- [ ] 0.6.6 - Problema persiste (REST + Lambda)
- [x] 0.6.7 - ✅ REST Mode solucionado, ❌ Lambda Mode persiste
- [x] 0.6.8-alpha.0 - ✅ Lambda Mode solución implementada (alpha)

## 📌 Estado Actual

**Última versión probada**: 0.6.8-alpha.0  
**Estado**: 
- ✅ REST Mode: Solucionado desde v0.6.7
- ⚠️ Lambda Mode: Solución implementada en v0.6.8-alpha.0 (alpha, requiere validación)

**Soluciones disponibles**: 
- REST Mode: Ver [CHANGELOG_v0.6.7.md](../CHANGELOG_v0.6.7.md)
- Lambda Mode: Ver [SOLUCION_CORS_LAMBDA.md](./SOLUCION_CORS_LAMBDA.md)

**Próximo paso**: 
- REST Mode: Ya está estable, usar `fluentConfig.cors: true`
- Lambda Mode: Probar con `lambdaCors: true` y reportar resultados

## ✅ Soluciones Implementadas

### REST Mode (v0.6.7+)
- ✅ CORS plugin registrado después de rutas
- ✅ Manejo automático de OPTIONS por `@fastify/cors`
- ✅ Configuración mediante `fluentConfig.cors`

### Lambda Mode (v0.6.8-alpha.0+)
- ✅ Headers CORS en todas las respuestas
- ✅ Manejo automático de OPTIONS preflight
- ✅ Configuración mediante `lambdaCors: true`

**Ver**:
- 📁 **[diagnostico/](./diagnostico/)** - ⭐ **ÁREA DE PRUEBAS** - Toda la documentación de diagnóstico
  - [INDICE_DIAGNOSTICO.md](./diagnostico/INDICE_DIAGNOSTICO.md) - ⭐ **EMPEZAR AQUÍ** - Índice visual y guía rápida
  - [DIAGNOSTICO_REST_MODE.md](./diagnostico/DIAGNOSTICO_REST_MODE.md) - Diagnóstico específico REST Mode
  - [DIAGNOSTICO_LAMBDA_MODE.md](./diagnostico/DIAGNOSTICO_LAMBDA_MODE.md) - Diagnóstico específico Lambda Mode
  - [GUIA_DIAGNOSTICO_COMPARATIVO.md](./diagnostico/GUIA_DIAGNOSTICO_COMPARATIVO.md) - Comparación REST vs Lambda
- [PROBLEMA_GENERAL_CORS.md](./PROBLEMA_GENERAL_CORS.md) - Análisis completo del problema
- [SOLUCION_CORS_LAMBDA.md](./SOLUCION_CORS_LAMBDA.md) - Solución específica para Lambda
- [ANALISIS_PROBLEMA_BASE.md](./ANALISIS_PROBLEMA_BASE.md) - Análisis técnico detallado

