# Integración con SyntroJS

## ¿Por qué usar SyntroJS?

SyntroJS nos da:
- ✅ **Validación automática** con Zod (como FastAPI)
- ✅ **Mejor Developer Experience** (código más limpio)
- ✅ **Type safety** completo
- ✅ **Documentación automática** (OpenAPI/Swagger)
- ✅ **Manejo de errores elegante**

## Arquitectura

```
Lambda Handler (index-syntrojs.js)
    ↓
Validación Zod (SyntroJS-style)
    ↓
Lógica de Negocio
    ↓
DynamoDB + SQS
```

## Ventajas vs código plano

### Antes (código plano):
```javascript
// Validación manual
if (!orderData.items || !Array.isArray(orderData.items)) {
  return { statusCode: 400, ... };
}
// Sin type safety
// Sin documentación automática
```

### Ahora (con SyntroJS):
```javascript
// Validación automática con Zod
const validatedData = CreateOrderSchema.parse(orderData);
// Type safety completo
// Documentación automática disponible
```

## Uso

### Desarrollo Local (LocalStack)
```bash
# Las funciones Lambda usan SyntroJS para validación
# Mismo código funciona en LocalStack y AWS
```

### Deploy a AWS
```bash
cd backend
sam build
sam deploy
```

## Próximos pasos

1. ✅ Validación con Zod (implementado)
2. 🔄 Crear adapter completo para usar SyntroJS como servidor HTTP en Lambda
3. 🔄 Documentación automática (OpenAPI)
4. 🔄 Type-safe client generation

## Notas

- SyntroJS está diseñado para servidores HTTP tradicionales
- Para Lambda, usamos sus patrones (validación Zod) pero mantenemos handler Lambda tradicional
- En el futuro podríamos crear un adapter Lambda completo para usar SyntroJS como servidor

