# Extracción de Adapters Lambda a Paquete Separado

## 📋 Objetivo

Este documento explica cómo los adapters Lambda están preparados para ser extraídos a un paquete separado (`@syntrojs/lambda-adapters`) en el futuro, manteniendo compatibilidad con SyntroJS core.

---

## 🏗️ Arquitectura Actual

### Estructura Preparada para Extracción

```
syntrojs/
├── src/
│   ├── domain/
│   │   └── interfaces/
│   │       └── ILambdaAdapter.ts      # ✅ Interface compartida (permanece en core)
│   ├── lambda/
│   │   ├── adapters/
│   │   │   ├── ApiGatewayAdapter.ts   # 🔄 Puede moverse a paquete separado
│   │   │   └── LambdaAdapterFactory.ts # 🔄 Puede moverse a paquete separado
│   │   ├── handlers/
│   │   │   └── LambdaHandler.ts       # ✅ Permanece en core (usa factory)
│   │   ├── types.ts                    # ✅ Tipos compartidos (permanece)
│   │   └── index.ts                    # ✅ Exports públicos
```

---

## 🔄 Plan de Extracción Futuro

### Paso 1: Crear Paquete Separado

```bash
# Estructura del nuevo paquete
@syntrojs/lambda-adapters/
├── src/
│   ├── adapters/
│   │   ├── ApiGatewayAdapter.ts
│   │   ├── SQSAdapter.ts
│   │   ├── S3Adapter.ts
│   │   └── EventBridgeAdapter.ts
│   ├── factory/
│   │   └── LambdaAdapterFactory.ts
│   └── index.ts
├── package.json
└── tsconfig.json
```

### Paso 2: Dependencias del Paquete

```json
{
  "name": "@syntrojs/lambda-adapters",
  "version": "1.0.0",
  "peerDependencies": {
    "syntrojs": "^0.5.0"
  },
  "dependencies": {
    "zod": "^3.22.4"
  }
}
```

### Paso 3: Implementar ILambdaAdapter

Los adapters en el paquete separado implementan la interfaz de SyntroJS:

```typescript
// @syntrojs/lambda-adapters/src/adapters/ApiGatewayAdapter.ts
import type { ILambdaAdapter } from 'syntrojs/domain/interfaces';
import type { LambdaResponse } from 'syntrojs/lambda/types';

export class ApiGatewayAdapter implements ILambdaAdapter {
  getEventType(): string {
    return 'api-gateway';
  }

  canHandle(event: unknown): boolean {
    // Implementation
  }

  async handle(event: unknown): Promise<LambdaResponse> {
    // Implementation
  }
}
```

### Paso 4: Uso en SyntroJS

```typescript
// src/lambda/handlers/LambdaHandler.ts
import { lambdaAdapterFactory } from '../adapters/LambdaAdapterFactory';
// En el futuro:
// import { ApiGatewayAdapter } from '@syntrojs/lambda-adapters';

constructor(config: LambdaHandlerConfig = {}) {
  // Opción 1: Usar adapters internos (actual)
  const apiGatewayAdapter = new ApiGatewayAdapter(routeRegistry, validator);
  this.adapterFactory.register('api-gateway', apiGatewayAdapter);

  // Opción 2: Usar adapters externos (futuro)
  // import { ApiGatewayAdapter } from '@syntrojs/lambda-adapters';
  // const apiGatewayAdapter = new ApiGatewayAdapter(routeRegistry, validator);
  // this.adapterFactory.register('api-gateway', apiGatewayAdapter);
}
```

---

## ✅ Principios Aplicados

### SOLID

1. **Single Responsibility**: Cada adapter tiene una única responsabilidad
2. **Open/Closed**: Fácil agregar nuevos adapters sin modificar core
3. **Liskov Substitution**: Todos los adapters implementan `ILambdaAdapter`
4. **Interface Segregation**: Interfaz pequeña y específica
5. **Dependency Inversion**: SyntroJS depende de `ILambdaAdapter`, no implementaciones concretas

### DDD

- **Domain Interface**: `ILambdaAdapter` está en domain layer
- **Infrastructure**: Adapters están en infrastructure layer
- **Separation**: Core no depende de implementaciones específicas

### Programación Funcional

- **Funciones Puras**: `getEventType()`, `canHandle()` son puras
- **Inmutabilidad**: Factory no muta adapters después de registro
- **Composición**: Factory compone adapters dinámicamente

### Guard Clauses

- Validación temprana en todos los métodos
- Errores claros y descriptivos
- Salida temprana en caso de error

---

## 🧪 Testing Independiente

Los adapters pueden ser testeados completamente aislados:

```typescript
// Test del adapter sin SyntroJS
import { ApiGatewayAdapter } from '@syntrojs/lambda-adapters';
import { MockRouteRegistry, MockValidator } from './mocks';

describe('ApiGatewayAdapter - Isolated', () => {
  it('should implement ILambdaAdapter', () => {
    const adapter = new ApiGatewayAdapter(mockRegistry, mockValidator);
    expect(adapter.getEventType()).toBe('api-gateway');
    expect(adapter.canHandle(validEvent)).toBe(true);
  });
});
```

---

## 📦 Migración Gradual

### Fase 1: Preparación (Actual)
- ✅ Interface `ILambdaAdapter` creada
- ✅ Factory pattern implementado
- ✅ Adapters implementan interfaz
- ✅ Tests unitarios independientes

### Fase 2: Extracción
1. Crear paquete `@syntrojs/lambda-adapters`
2. Mover adapters al nuevo paquete
3. Mantener compatibilidad con SyntroJS core
4. Actualizar imports en SyntroJS

### Fase 3: Uso Externo
```typescript
// Usuario puede usar adapters externos
import { SyntroJS } from 'syntrojs';
import { ApiGatewayAdapter } from '@syntrojs/lambda-adapters';

const app = new SyntroJS({ rest: false });
// Registrar adapter externo
lambdaAdapterFactory.register('api-gateway', new ApiGatewayAdapter(...));
```

---

## 🔍 Ventajas de la Estructura Actual

1. **Testabilidad**: Adapters pueden testearse sin SyntroJS completo
2. **Extensibilidad**: Fácil agregar nuevos adapters
3. **Separación**: Core no depende de implementaciones específicas
4. **Reutilización**: Adapters pueden usarse en otros proyectos
5. **Mantenibilidad**: Cambios en adapters no afectan core

---

## 📝 Checklist para Extracción

- [x] Interface `ILambdaAdapter` creada en domain layer
- [x] Factory pattern implementado
- [x] Adapters implementan interfaz
- [x] Tests unitarios independientes creados
- [ ] Paquete separado creado
- [ ] Adapters movidos al nuevo paquete
- [ ] Documentación de migración
- [ ] Ejemplos de uso actualizados

---

**Última actualización**: 2024-11-17
**Estado**: Estructura preparada, lista para extracción cuando sea necesario

