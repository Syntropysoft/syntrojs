# Solución: Soporte para multiValueHeaders en Lambda

**Fecha**: 2024-11-18
**Versión**: v0.6.8-alpha.1 (fix adicional)

## 🐛 Problema Identificado

El usuario reportó que en Lambda Mode, el header `Access-Control-Allow-Origin` estaba devolviendo `"*"` en lugar del origin real del request (`"http://localhost:3001"`).

### Causa Raíz

API Gateway puede enviar headers en dos formatos:
1. `event.headers` - Objeto simple: `{ "Origin": "http://localhost:3001" }`
2. `event.multiValueHeaders` - Objeto con arrays: `{ "Origin": ["http://localhost:3001"] }`

El código original solo buscaba en `event.headers`, pero cuando API Gateway envía headers en `multiValueHeaders`, el origin no se encontraba y se devolvía `"*"`.

## ✅ Solución Implementada

### 1. Nueva Función `mergeHeaders()`

Función pura que combina headers de ambos formatos:

```typescript
private mergeHeaders(
  headers: Record<string, string> | undefined,
  multiValueHeaders: Record<string, string[]> | undefined,
): Record<string, string>
```

**Características**:
- ✅ Combina `headers` y `multiValueHeaders`
- ✅ `headers` tiene precedencia sobre `multiValueHeaders`
- ✅ Maneja case-insensitive para evitar duplicados
- ✅ Toma el primer valor de arrays en `multiValueHeaders`

### 2. Actualización de `toRequestDTO()`

Ahora usa `mergeHeaders()` para combinar ambos formatos antes de crear el `RequestDTO`:

```typescript
const mergedHeaders = this.mergeHeaders(event.headers, event.multiValueHeaders);
return {
  // ...
  headers: mergedHeaders, // Usa headers merged
  // ...
};
```

### 3. Actualización del Manejo de Errores

El catch block también usa `mergeHeaders()` para extraer el origin correctamente:

```typescript
catch (error) {
  const mergedHeaders = this.mergeHeaders(apiGatewayEvent.headers, apiGatewayEvent.multiValueHeaders);
  const requestOrigin = this.extractOrigin(mergedHeaders);
  return await this.handleError(error as Error, requestOrigin);
}
```

## 🧪 Tests Agregados

Nuevos tests en `tests/universal/lambda/ApiGatewayAdapter-multiValueHeaders.test.ts`:
1. ✅ Extraer Origin desde `multiValueHeaders` cuando `headers` está vacío
2. ✅ Preferir `headers` sobre `multiValueHeaders` cuando ambos están presentes
3. ✅ Manejar case-insensitive Origin en `multiValueHeaders`

## 📊 Resultado

- ✅ `extractOrigin()` ahora encuentra el header `Origin` en ambos formatos
- ✅ CORS headers reflejan correctamente el origin real del request
- ✅ Compatible con ambos formatos de API Gateway

## 🔗 Archivos Modificados

- `src/lambda/adapters/ApiGatewayAdapter.ts`
  - Nueva función `mergeHeaders()` (pure function)
  - Actualizado `toRequestDTO()` para usar `mergeHeaders()`
  - Actualizado catch block para usar `mergeHeaders()`

## ⚠️ Nota

Este fix complementa el fix anterior de case-insensitive header extraction. Ambos trabajan juntos para asegurar que el origin se extraiga correctamente sin importar:
- El formato del header (`headers` vs `multiValueHeaders`)
- El case del header (`Origin` vs `origin` vs `ORIGIN`)

