# Documentación de Diagnóstico - Área de Pruebas

Esta carpeta contiene toda la documentación necesaria para diagnosticar problemas de CORS en SyntroJS.

## 🎯 Punto de Entrada

**⭐ EMPEZAR AQUÍ**: [INDICE_DIAGNOSTICO.md](./INDICE_DIAGNOSTICO.md)

## 📁 Estructura

### Guías de Diagnóstico
- `INDICE_DIAGNOSTICO.md` - ⭐ **EMPEZAR AQUÍ** - Índice visual y guía rápida
- `DIAGNOSTICO_REST_MODE.md` - Diagnóstico específico para REST Mode
- `DIAGNOSTICO_LAMBDA_MODE.md` - Diagnóstico específico para Lambda Mode
- `GUIA_DIAGNOSTICO_COMPARATIVO.md` - Comparación REST vs Lambda

### Guías de Captura
- `COMO_CAPTURAR_ERRORES.md` - Guía para capturar información de errores
- `INSTRUCCIONES_CAPTURA.md` - Instrucciones detalladas para capturar errores
- `QUICK_TEST.md` - Guía rápida para probar

## 🚀 Uso Rápido

### 1. Identificar el Modo

```typescript
// REST Mode
const app = new SyntroJS({ fluentConfig: { cors: true } });

// Lambda Mode
const app = new SyntroJS({ rest: false, lambdaCors: true });
```

### 2. Seguir la Guía Específica

- **REST Mode** → `DIAGNOSTICO_REST_MODE.md`
- **Lambda Mode** → `DIAGNOSTICO_LAMBDA_MODE.md`
- **Comparar ambos** → `GUIA_DIAGNOSTICO_COMPARATIVO.md`

### 3. Capturar Errores

Si encuentras problemas, usar:
- `COMO_CAPTURAR_ERRORES.md` - Guía completa
- `QUICK_TEST.md` - Test rápido (5 minutos)

## 📊 Estado Actual

- ✅ REST Mode: Solucionado desde v0.6.7
- ⚠️ Lambda Mode: Solución implementada en v0.6.8-alpha.0 (alpha)

## 🔗 Referencias Externas

- `../PROBLEMA_GENERAL_CORS.md` - Análisis general del problema
- `../SOLUCION_CORS_LAMBDA.md` - Solución específica para Lambda
- `../ERROR_0.6.8-alpha.0.md` - Errores reportados

