# Plan de Integración con SyntroJS

## ⚠️ IMPORTANTE: SyntroJS NO Reemplaza Lambda

**SyntroJS es solo para desarrollo local. En producción usamos Lambda puro (bajo costo).**

Ver [COSTOS_Y_ARQUITECTURA.md](./COSTOS_Y_ARQUITECTURA.mdengo e) para detalles de costos.

## Estrategia: Dos Modos de Operación

### Modo 1: Desarrollo Local con SyntroJS como Servidor HTTP
- ✅ Usar SyntroJS como servidor HTTP completo en desarrollo
- ✅ Acceso a documentación automática (`/docs`)
- ✅ Validación automática
- ✅ Mejor DX durante desarrollo
- ✅ **Solo corre localmente, NO en AWS**

### Modo 2: Producción con Lambda (Serverless)
- ✅ Usar validación Zod (mismos schemas que SyntroJS)
- ✅ Handlers Lambda tradicionales (optimizados)
- ✅ **Bajo costo operativo (pago por uso)**
- ✅ **Sin servidores corriendo 24/7**

## Estructura Propuesta

```
backend/
├── functions/
│   ├── createOrder/
│   │   ├── index.js              # Handler Lambda tradicional
│   │   ├── handler.js            # Lógica de negocio (reutilizable)
│   │   ├── schemas.js            # Schemas Zod (como SyntroJS)
│   │   └── server.js             # Servidor SyntroJS para desarrollo local
│   └── processOrder/
│       └── ...
├── local-server/                  # Servidor SyntroJS para desarrollo
│   └── app.js                    # API completa con SyntroJS
└── template.yaml
```

## Ventajas

1. **Desarrollo Local**: SyntroJS completo con `/docs`, validación automática
2. **Lambda**: Código optimizado para Lambda, pero usando patrones SyntroJS
3. **Reutilización**: Misma lógica de negocio en ambos modos
4. **Type Safety**: Zod schemas compartidos

## Implementación

### Paso 1: Crear schemas compartidos
```javascript
// schemas.js
import { z } from 'zod';

export const OrderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
});

export const CreateOrderSchema = z.object({
  items: z.array(OrderItemSchema).min(1),
});
```

### Paso 2: Lógica de negocio reutilizable
```javascript
// handler.js
export async function createOrder(orderData, userId) {
  // Lógica compartida
  // Usa DynamoDB, SQS, etc.
}
```

### Paso 3: Servidor SyntroJS para desarrollo local
```javascript
// server.js o local-server/app.js
import { SyntroJS } from 'syntrojs';
import { CreateOrderSchema } from './schemas.js';
import { createOrder } from './handler.js';

const app = new SyntroJS({ title: 'Order API' });

app.post('/orders', {
  body: CreateOrderSchema,
  handler: async ({ body, request }) => {
    const userId = request.headers['x-user-id'] || 'local-user';
    return await createOrder(body, userId);
  }
});

await app.listen(3001);
```

### Paso 4: Handler Lambda
```javascript
// index.js
import { CreateOrderSchema } from './schemas.js';
import { createOrder } from './handler.js';

export const handler = async (event) => {
  const orderData = CreateOrderSchema.parse(JSON.parse(event.body));
  const userId = event.requestContext?.authorizer?.claims?.sub || 'local-user';
  const result = await createOrder(orderData, userId);
  return { statusCode: 200, body: JSON.stringify(result) };
};
```

## Próximos Pasos

1. ✅ Crear estructura de schemas compartidos
2. ✅ Refactorizar lógica de negocio a funciones reutilizables
3. ✅ Crear servidor SyntroJS para desarrollo local
4. ✅ Adaptar handlers Lambda para usar la misma lógica

