# Arquitectura: SyntroJS-Lambda - División Estratégica

## 📋 Resumen Ejecutivo

Este documento detalla la arquitectura para extender SyntroJS con soporte nativo para AWS Lambda, manteniendo todos los principios de diseño: SOLID, DDD, Programación Funcional y Guard Clauses.

**Objetivo**: Crear `syntrojs-lambda` que comparta el core de SyntroJS pero tenga adapters específicos para Lambda, permitiendo el mismo código funcione en modo REST (desarrollo) y modo Lambda (producción).

---

## 🎯 Principios de Diseño

### SOLID Principles

1. **Single Responsibility Principle (SRP)**
   - Cada módulo tiene una única responsabilidad
   - Core: routing y validación
   - HTTP: servidor HTTP
   - Lambda: adapters Lambda

2. **Open/Closed Principle (OCP)**
   - Abierto para extensión (nuevos adapters)
   - Cerrado para modificación (core estable)
   - Plugins/middleware como extensión

3. **Liskov Substitution Principle (LSP)**
   - Adapters intercambiables
   - Handlers intercambiables
   - Mismo contrato, diferentes implementaciones

4. **Interface Segregation Principle (ISP)**
   - Interfaces pequeñas y específicas
   - No forzar implementar lo innecesario
   - Cada parte usa solo lo que necesita

5. **Dependency Inversion Principle (DIP)**
   - Depender de abstracciones
   - Inyección de dependencias
   - Fácil de testear

### Domain Driven Design (DDD)

1. **Domain Layer** (Core compartido)
   - Lógica de negocio pura
   - Entities: Route, Schema, Handler
   - Value Objects: Path, Method, Response
   - Domain Services: Router, Validator

2. **Application Layer**
   - Use Cases: RegisterRoute, ValidateRequest, ExecuteHandler
   - DTOs: RequestDTO, ResponseDTO
   - Application Services: RouteRegistry, ValidationService

3. **Infrastructure Layer**
   - HTTP Adapter: FastifyServerAdapter
   - Lambda Adapter: LambdaEventAdapter
   - Event Adapters: API Gateway, SQS, S3, etc.

4. **Presentation Layer**
   - SyntroJS HTTP: Servidor HTTP completo
   - SyntroJS Lambda: Handlers Lambda optimizados

### Programación Funcional

1. **Funciones Puras**
   - Handlers sin side effects visibles
   - Transformaciones inmutables
   - Composición de funciones

2. **Inmutabilidad**
   - No mutar eventos/requests
   - Crear nuevos objetos
   - Evitar estado compartido

3. **Composición sobre Herencia**
   - Middleware como funciones
   - Handlers como composición
   - Sin clases complejas

### Guard Clauses

1. **Validación Temprana**
   - Validar entrada inmediatamente
   - Salir temprano si falla
   - Código más plano y legible

2. **Errores Claros**
   - Mensajes descriptivos
   - Contexto suficiente
   - Fácil de debuggear

---

## 🏗️ Arquitectura Propuesta

### Estructura de Módulos

```
syntrojs/
├── core/                          # Domain + Application Layer (compartido)
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── Route.ts           # Entity: Ruta definida
│   │   │   ├── Schema.ts          # Entity: Schema de validación
│   │   │   └── Handler.ts         # Entity: Handler function
│   │   ├── value-objects/
│   │   │   ├── Path.ts            # Value Object: Path de ruta
│   │   │   ├── Method.ts           # Value Object: HTTP Method
│   │   │   └── Response.ts        # Value Object: Response structure
│   │   └── services/
│   │       ├── Router.ts           # Domain Service: Routing logic
│   │       └── Validator.ts        # Domain Service: Validation logic
│   ├── application/
│   │   ├── use-cases/
│   │   │   ├── RegisterRoute.ts   # Use Case: Registrar ruta
│   │   │   ├── ValidateRequest.ts # Use Case: Validar request
│   │   │   └── ExecuteHandler.ts  # Use Case: Ejecutar handler
│   │   └── services/
│   │       ├── RouteRegistry.ts   # Application Service
│   │       └── ValidationService.ts
│   └── index.ts                    # Public API del core
│
├── http/                           # Infrastructure: HTTP Server
│   ├── adapters/
│   │   └── FastifyServerAdapter.ts # Adapter: Fastify → SyntroJS Core
│   ├── server/
│   │   └── HttpServer.ts          # Servidor HTTP completo
│   └── index.ts                    # Public API HTTP
│
├── lambda/                         # Infrastructure: Lambda Adapters
│   ├── adapters/
│   │   ├── ApiGatewayAdapter.ts   # Adapter: API Gateway → Core
│   │   ├── SQSAdapter.ts          # Adapter: SQS → Core
│   │   ├── S3Adapter.ts           # Adapter: S3 → Core
│   │   └── EventBridgeAdapter.ts  # Adapter: EventBridge → Core
│   ├── handlers/
│   │   └── LambdaHandler.ts       # Handler principal Lambda
│   └── index.ts                    # Public API Lambda
│
└── index.ts                        # Public API unificado
```

### Punto de División Estratégico

**División en la capa de Infrastructure**:

```
Core (Domain + Application)
  ↓
Infrastructure Layer
  ├── HTTP Adapter (modo REST)
  └── Lambda Adapter (modo Lambda)
```

**El Core permanece intacto**, solo cambia el adapter de Infrastructure.

---

## 🔄 Flujo de Ejecución

### Modo REST (rest: true)

```
Usuario define rutas
  ↓
SyntroJS Core (RouteRegistry)
  ↓
HTTP Adapter (FastifyServerAdapter)
  ├── Convierte rutas a Fastify
  ├── Inicia servidor HTTP
  └── Maneja requests HTTP
  ↓
Core (Router + Validator)
  ↓
Handler ejecutado
  ↓
Response HTTP
```

### Modo Lambda (rest: false)

```
Event Lambda llega
  ↓
Lambda Adapter (detecta tipo de evento)
  ├── API Gateway → ApiGatewayAdapter
  ├── SQS → SQSAdapter
  └── Otros → EventBridgeAdapter
  ↓
Convierte evento a RequestDTO
  ↓
Core (Router + Validator)
  ↓
Handler ejecutado
  ↓
Response Lambda
```

---

## 📦 Módulos Detallados

### Core Module (Domain + Application)

#### Responsabilidades:
- ✅ Routing logic (puro, sin dependencias)
- ✅ Validation logic (Zod integration)
- ✅ Error handling (domain errors)
- ✅ Response building (estructura de respuesta)

#### Dependencias:
- ✅ Zod (validación)
- ❌ Sin Fastify
- ❌ Sin AWS SDK
- ❌ Sin dependencias de infraestructura

#### Ejemplo Conceptual:

```typescript
// core/domain/entities/Route.ts
export class Route {
  constructor(
    public readonly path: Path,
    public readonly method: Method,
    public readonly schema: Schema,
    public readonly handler: Handler
  ) {}
}

// core/application/services/RouteRegistry.ts
export class RouteRegistry {
  private routes: Route[] = [];
  
  register(route: Route): void {
    // Guard clause: validar entrada
    if (!route) throw new Error('Route is required');
    if (!route.handler) throw new Error('Handler is required');
    
    this.routes.push(route);
  }
  
  find(path: string, method: string): Route | null {
    // Guard clause: validar entrada
    if (!path || !method) return null;
    
    return this.routes.find(r => 
      r.path.matches(path) && r.method.equals(method)
    ) || null;
  }
}
```

### HTTP Module (Infrastructure)

#### Responsabilidades:
- ✅ Adaptar Core a Fastify
- ✅ Iniciar servidor HTTP
- ✅ Manejar ciclo de vida del servidor
- ✅ Features HTTP (docs, CORS, etc.)

#### Dependencias:
- ✅ SyntroJS Core
- ✅ Fastify
- ❌ Sin AWS SDK

#### Ejemplo Conceptual:

```typescript
// http/adapters/FastifyServerAdapter.ts
export class FastifyServerAdapter {
  constructor(
    private routeRegistry: RouteRegistry,
    private validator: Validator
  ) {}
  
  adapt(fastify: FastifyInstance): void {
    // Guard clause: validar entrada
    if (!fastify) throw new Error('Fastify instance required');
    
    // Registrar rutas del core en Fastify
    this.routeRegistry.getAll().forEach(route => {
      fastify[route.method.value](
        route.path.value,
        async (request, reply) => {
          // Validar con core
          const validated = this.validator.validate(
            request.body,
            route.schema
          );
          
          // Ejecutar handler del core
          const result = await route.handler.execute({
            body: validated,
            params: request.params,
            query: request.query
          });
          
          return result;
        }
      );
    });
  }
}
```

### Lambda Module (Infrastructure)

#### Responsabilidades:
- ✅ Adaptar eventos Lambda a Core
- ✅ Convertir eventos a RequestDTO
- ✅ Convertir Response a formato Lambda
- ✅ Manejar diferentes tipos de eventos

#### Dependencias:
- ✅ SyntroJS Core
- ✅ AWS SDK (opcional, solo tipos)
- ❌ Sin Fastify

#### Ejemplo Conceptual:

```typescript
// lambda/adapters/ApiGatewayAdapter.ts
export class ApiGatewayAdapter {
  constructor(
    private routeRegistry: RouteRegistry,
    private validator: Validator
  ) {}
  
  adapt(event: APIGatewayProxyEvent): LambdaResponse {
    // Guard clause: validar entrada
    if (!event) throw new Error('Event is required');
    if (!event.httpMethod || !event.path) {
      throw new Error('Invalid API Gateway event');
    }
    
    // Convertir evento a RequestDTO
    const requestDTO = this.toRequestDTO(event);
    
    // Buscar ruta en core
    const route = this.routeRegistry.find(
      requestDTO.path,
      requestDTO.method
    );
    
    // Guard clause: ruta no encontrada
    if (!route) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Not found' })
      };
    }
    
    // Validar con core
    const validated = this.validator.validate(
      requestDTO.body,
      route.schema
    );
    
    // Ejecutar handler del core
    const result = await route.handler.execute({
      body: validated,
      params: requestDTO.pathParams,
      query: requestDTO.queryParams
    });
    
    // Convertir a formato Lambda
    return this.toLambdaResponse(result);
  }
  
  private toRequestDTO(event: APIGatewayProxyEvent): RequestDTO {
    // Transformación inmutable
    return {
      path: event.path,
      method: event.httpMethod,
      body: event.body ? JSON.parse(event.body) : {},
      pathParams: event.pathParameters || {},
      queryParams: event.queryStringParameters || {}
    };
  }
}
```

---

## 🔀 Tree-Shaking Strategy

### Estructura para Tree-Shaking Efectivo

#### 1. Módulos Separados (ESM)
```typescript
// Cada módulo exporta solo lo necesario
export { RouteRegistry } from './application/services/RouteRegistry';
export { Validator } from './domain/services/Validator';
// No exportar todo con *
```

#### 2. Conditional Imports
```typescript
// lambda/index.ts
import { RouteRegistry } from '../core';
import { ApiGatewayAdapter } from './adapters/ApiGatewayAdapter';

// Solo importar lo necesario para Lambda
export function createLambdaApp(config: LambdaConfig) {
  const registry = new RouteRegistry();
  const adapter = new ApiGatewayAdapter(registry);
  // ...
}

// http/index.ts
import { RouteRegistry } from '../core';
import { FastifyServerAdapter } from './adapters/FastifyServerAdapter';

// Solo importar lo necesario para HTTP
export function createHttpApp(config: HttpConfig) {
  const registry = new RouteRegistry();
  const adapter = new FastifyServerAdapter(registry);
  // ...
}
```

#### 3. Build Configuration
```json
{
  "exports": {
    ".": "./dist/index.js",
    "./core": "./dist/core/index.js",
    "./http": "./dist/http/index.js",
    "./lambda": "./dist/lambda/index.js"
  }
}
```

### Qué se Elimina en Lambda Build

#### ❌ Eliminado (tree-shaking):
- Fastify y dependencias
- Servidor HTTP completo
- Features de desarrollo (docs, hot reload)
- HTTP-specific middleware

#### ✅ Mantenido:
- Core (routing, validation)
- Lambda adapters
- Validación Zod
- Error handling

---

## 🎨 API Design

### API Fluent Unificada

```typescript
// Uso unificado
import { SyntroJS } from 'syntrojs';

const app = new SyntroJS({
  rest: true,  // Flag para modo REST
  title: 'Order API'
});

// Misma API para ambos modos
app.post('/orders', {
  body: OrderSchema,
  handler: async ({ body, context }) => {
    // Lógica de negocio
    return { orderId: '123' };
  }
});

// Si rest: true → inicia servidor HTTP
// Si rest: false → exporta handler Lambda
```

### Implementación Interna

```typescript
// syntrojs/index.ts
import { RouteRegistry } from './core';
import { createHttpApp } from './http';
import { createLambdaApp } from './lambda';

export class SyntroJS {
  private registry: RouteRegistry;
  private httpApp?: HttpApp;
  private lambdaApp?: LambdaApp;
  
  constructor(config: SyntroJSConfig) {
    // Guard clause: validar config
    if (!config) throw new Error('Config is required');
    
    this.registry = new RouteRegistry();
    
    // Crear adapter según modo
    if (config.rest) {
      this.httpApp = createHttpApp({
        registry: this.registry,
        ...config
      });
    } else {
      this.lambdaApp = createLambdaApp({
        registry: this.registry,
        ...config
      });
    }
  }
  
  post(path: string, config: RouteConfig): this {
    // Guard clause: validar entrada
    if (!path) throw new Error('Path is required');
    if (!config?.handler) throw new Error('Handler is required');
    
    // Registrar en core (compartido)
    this.registry.register(
      new Route(
        new Path(path),
        new Method('POST'),
        config.body ? new Schema(config.body) : null,
        new Handler(config.handler)
      )
    );
    
    return this;
  }
  
  // Métodos similares para get, put, delete, etc.
  
  handler(): LambdaHandler {
    // Guard clause: validar modo
    if (!this.lambdaApp) {
      throw new Error('Lambda mode not enabled');
    }
    
    return this.lambdaApp.handler();
  }
  
  async listen(port: number): Promise<void> {
    // Guard clause: validar modo
    if (!this.httpApp) {
      throw new Error('REST mode not enabled');
    }
    
    await this.httpApp.listen(port);
  }
}
```

---

## 🧪 Testing Strategy

### Testing por Capas

#### 1. Core Tests (Unit)
```typescript
// Test core sin dependencias
describe('RouteRegistry', () => {
  it('should register route', () => {
    const registry = new RouteRegistry();
    const route = new Route(...);
    registry.register(route);
    expect(registry.find('/orders', 'POST')).toBe(route);
  });
});
```

#### 2. Adapter Tests (Integration)
```typescript
// Test adapters con core
describe('ApiGatewayAdapter', () => {
  it('should adapt API Gateway event', async () => {
    const registry = new RouteRegistry();
    const adapter = new ApiGatewayAdapter(registry);
    const event = createApiGatewayEvent(...);
    const response = await adapter.adapt(event);
    expect(response.statusCode).toBe(200);
  });
});
```

#### 3. End-to-End Tests
```typescript
// Test completo en ambos modos
describe('Order API', () => {
  it('should work in REST mode', async () => {
    const app = new SyntroJS({ rest: true });
    // ... test
  });
  
  it('should work in Lambda mode', async () => {
    const app = new SyntroJS({ rest: false });
    const handler = app.handler();
    // ... test
  });
});
```

---

## 📊 Comparación: Antes vs Después

### Antes (SyntroJS solo HTTP)

```
SyntroJS
├── Core
├── HTTP Server (siempre presente)
└── Features HTTP
```

**Problemas**:
- ❌ No funciona en Lambda directamente
- ❌ Overhead de servidor HTTP siempre
- ❌ No optimizado para serverless

### Después (SyntroJS + Lambda)

```
SyntroJS Core (compartido)
├── HTTP Adapter (modo REST)
└── Lambda Adapter (modo Lambda)
```

**Ventajas**:
- ✅ Mismo código funciona en ambos modos
- ✅ Tree-shaking elimina overhead
- ✅ Optimizado para cada caso de uso
- ✅ Arquitectura sólida mantenida

---

## 🚀 Plan de Implementación

### Fase 1: Core Refactoring
1. ✅ Separar Core de HTTP
2. ✅ Crear interfaces claras
3. ✅ Aplicar SOLID estrictamente
4. ✅ Tests del Core

### Fase 2: Lambda Adapter
1. ✅ Crear Lambda adapters
2. ✅ API Gateway adapter
3. ✅ SQS adapter
4. ✅ Tests de adapters

### Fase 3: API Unificada
1. ✅ Crear API fluida unificada
2. ✅ Flag `rest` para modo
3. ✅ Tree-shaking configurado
4. ✅ Documentación

### Fase 4: Optimización
1. ✅ Optimizar bundle size
2. ✅ Optimizar cold start
3. ✅ Performance testing
4. ✅ Documentación completa

---

## 📝 Principios de Implementación

### SOLID Aplicado

1. **SRP**: Cada módulo una responsabilidad
   - RouteRegistry: solo registrar rutas
   - Validator: solo validar
   - Adapters: solo adaptar

2. **OCP**: Extensible sin modificar
   - Nuevos adapters sin tocar core
   - Nuevos event types como plugins
   - Middleware como extensión

3. **LSP**: Adapters intercambiables
   - Mismo contrato para HTTP y Lambda
   - Handlers funcionan igual
   - Misma interfaz

4. **ISP**: Interfaces pequeñas
   - Route interface mínima
   - Handler interface mínima
   - No forzar lo innecesario

5. **DIP**: Depender de abstracciones
   - Core depende de interfaces
   - Adapters implementan interfaces
   - Fácil de testear

### DDD Aplicado

1. **Domain Layer**: Lógica pura
   - Route, Schema, Handler como entities
   - Path, Method como value objects
   - Router, Validator como domain services

2. **Application Layer**: Orquestación
   - RegisterRoute, ValidateRequest como use cases
   - RouteRegistry como application service

3. **Infrastructure Layer**: Adaptadores
   - FastifyServerAdapter
   - LambdaEventAdapter
   - AWS SDK integration

### Programación Funcional

1. **Funciones Puras**
   - Validator.validate() sin side effects
   - Transformaciones inmutables
   - Handlers composables

2. **Inmutabilidad**
   - No mutar Route después de crear
   - Crear nuevos objetos
   - Evitar estado compartido

3. **Composición**
   - Middleware como funciones
   - Handlers como composición
   - Sin clases complejas

### Guard Clauses

1. **Validación Temprana**
   ```typescript
   if (!route) throw new Error('Route required');
   if (!handler) throw new Error('Handler required');
   // Continuar solo si válido
   ```

2. **Salir Temprano**
   ```typescript
   if (!route) return { statusCode: 404 };
   // Continuar solo si encontrado
   ```

3. **Código Plano**
   - Menos anidación
   - Más legible
   - Más fácil de seguir

---

## 🎯 Objetivos Finales

### Técnicos
- ✅ Core compartido sin dependencias de infraestructura
- ✅ Adapters específicos para cada caso de uso
- ✅ Tree-shaking efectivo
- ✅ Bundle pequeño para Lambda
- ✅ Cold start rápido

### Arquitectónicos
- ✅ SOLID aplicado estrictamente
- ✅ DDD bien estructurado
- ✅ Programación funcional integrada
- ✅ Guard clauses en todos lados

### DX
- ✅ API fluida y expresiva
- ✅ Mismo código para ambos modos
- ✅ Type safety completo
- ✅ Validación automática
- ✅ Errores claros

---

## 📚 Referencias

- SyntroJS actual: `/Users/gabrielalejandrogomez/source/libs/hyper/syntrojs`
- Principios SOLID
- Domain Driven Design
- Programación Funcional
- Guard Clauses Pattern

---

## ✅ Checklist de Implementación

### Core
- [ ] Separar Core de HTTP
- [ ] Crear Domain entities
- [ ] Crear Value objects
- [ ] Crear Domain services
- [ ] Crear Application services
- [ ] Aplicar SOLID estrictamente
- [ ] Tests unitarios completos

### HTTP Adapter
- [ ] Crear FastifyServerAdapter
- [ ] Integrar con Core
- [ ] Mantener features HTTP
- [ ] Tests de integración

### Lambda Adapter
- [ ] Crear ApiGatewayAdapter
- [ ] Crear SQSAdapter
- [ ] Crear otros adapters necesarios
- [ ] Integrar con Core
- [ ] Tests de integración

### API Unificada
- [ ] Crear SyntroJS class unificada
- [ ] Implementar flag `rest`
- [ ] Tree-shaking configurado
- [ ] Documentación completa
- [ ] Ejemplos de uso

### Optimización
- [ ] Bundle size optimizado
- [ ] Cold start optimizado
- [ ] Performance testing
- [ ] Documentación de performance

---

**Última actualización**: 2024-11-17
**Estado**: Diseño conceptual completo, listo para implementación

