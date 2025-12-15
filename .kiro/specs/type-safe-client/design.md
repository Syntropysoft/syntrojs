# Documento de Diseño - Type-Safe Client

## Overview

El Type-Safe Client es una librería que proporciona acceso tipado y type-safe a las rutas de una aplicación SyntroJS. Utiliza el sistema de tipos de TypeScript para inferir automáticamente los tipos de parámetros, body, query y respuestas desde las definiciones de rutas del backend, eliminando la necesidad de duplicar tipos manualmente.

La arquitectura soporta dos modos de operación:
- **Local Mode**: Ejecuta handlers directamente sin HTTP, ideal para testing unitario rápido
- **Remote Mode**: Hace peticiones HTTP reales a un servidor, para integración y producción

El diseño sigue principios SOLID, DDD y programación funcional, con énfasis en type safety y developer experience.

## Architecture

### Capas Arquitectónicas

```
┌─────────────────────────────────────────────────────────┐
│                    Client API Layer                      │
│  createClient<App>() → TypedClient<App>                 │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                  Type Inference Layer                    │
│  RouteExtractor, PathParser, TypeMapper                 │
└─────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────┬──────────────────────────────────────┐
│   Local Executor │         Remote Executor              │
│  (Direct calls)  │      (HTTP requests)                 │
└──────────────────┴──────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│              Validation & Error Handling                 │
│  ZodValidator, ErrorMapper, ResponseParser              │
└─────────────────────────────────────────────────────────┘
```

### Flujo de Datos

**Local Mode:**
```
Client Call → Type Validation → DI Resolution → Handler Execution → Response
```

**Remote Mode:**
```
Client Call → Type Validation → HTTP Request → Response Parse → Typed Result
```

## Components and Interfaces

### 1. Core Types

```typescript
// Tipo principal que se exporta desde el backend
export type App = SyntroJS

// Configuración del cliente
interface ClientConfig {
  mode: 'local' | 'remote'
  baseUrl?: string  // Requerido para remote mode
  headers?: Record<string, string>
  timeout?: number
}

// Resultado de una llamada
interface ClientResponse<T> {
  data: T
  status: number
  headers: Record<string, string>
}

// Error tipado
interface ClientError {
  message: string
  statusCode: number
  details?: unknown
}
```

### 2. Type Inference Engine

```typescript
// Extrae información de rutas desde el tipo App
type ExtractRoutes<T> = T extends SyntroJS
  ? ExtractRoutesFromRegistry<T['routes']>
  : never

// Extrae parámetros de path
type ExtractPathParams<Path extends string> = 
  Path extends `${infer _Start}:${infer Param}/${infer Rest}`
    ? { [K in Param]: string } & ExtractPathParams<`/${Rest}`>
    : Path extends `${infer _Start}:${infer Param}`
    ? { [K in Param]: string }
    : {}

// Infiere tipo de request desde Zod schema
type InferRequestType<Schema> = Schema extends ZodType
  ? z.infer<Schema>
  : never

// Infiere tipo de response desde handler
type InferResponseType<Handler> = Handler extends (...args: any[]) => infer R
  ? Awaited<R>
  : never
```

### 3. Client Factory

```typescript
/**
 * Crea un cliente tipado para una aplicación SyntroJS
 * @param config - Configuración del cliente (local o remote)
 * @returns Cliente tipado con métodos para cada ruta
 */
export function createClient<App extends SyntroJS>(
  config: ClientConfig
): TypedClient<App> {
  if (config.mode === 'local') {
    return createLocalClient(config)
  }
  return createRemoteClient(config)
}
```

### 4. Local Executor

```typescript
class LocalExecutor {
  constructor(
    private app: SyntroJS,
    private validator: ZodValidator,
    private diResolver: DependencyResolver
  ) {}

  async execute<T>(
    route: Route,
    params: RouteParams
  ): Promise<ClientResponse<T>> {
    // 1. Validar parámetros con Zod
    const validated = await this.validator.validate(route, params)
    
    // 2. Resolver dependencias
    const dependencies = await this.diResolver.resolve(route.dependencies)
    
    // 3. Crear contexto
    const context = this.buildContext(validated, dependencies)
    
    // 4. Ejecutar handler
    try {
      const result = await route.handler(context)
      
      // 5. Ejecutar background tasks síncronamente
      await this.executeBackgroundTasks(context.background)
      
      // 6. Cleanup de dependencias
      await this.diResolver.cleanup(dependencies)
      
      return {
        data: result,
        status: route.status || 200,
        headers: {}
      }
    } catch (error) {
      throw this.mapError(error)
    }
  }
}
```

### 5. Remote Executor

```typescript
class RemoteExecutor {
  constructor(
    private baseUrl: string,
    private defaultHeaders: Record<string, string>,
    private timeout: number
  ) {}

  async execute<T>(
    method: HttpMethod,
    path: string,
    params: RouteParams
  ): Promise<ClientResponse<T>> {
    // 1. Construir URL con path params
    const url = this.buildUrl(path, params.params)
    
    // 2. Construir request
    const request: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...this.defaultHeaders,
        ...params.headers
      },
      signal: AbortSignal.timeout(this.timeout)
    }
    
    // 3. Agregar body si existe
    if (params.body) {
      request.body = JSON.stringify(params.body)
    }
    
    // 4. Agregar query params
    const urlWithQuery = this.appendQueryParams(url, params.query)
    
    // 5. Hacer petición
    try {
      const response = await fetch(urlWithQuery, request)
      
      // 6. Parsear respuesta
      if (!response.ok) {
        throw await this.parseError(response)
      }
      
      const data = await response.json()
      
      return {
        data,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries())
      }
    } catch (error) {
      throw this.mapError(error)
    }
  }
}
```

### 6. Dependency Resolver (Local Mode)

```typescript
class DependencyResolver {
  private singletonCache = new Map<string, any>()
  
  async resolve(
    dependencies: Record<string, DependencyFactory>
  ): Promise<Record<string, any>> {
    const resolved: Record<string, any> = {}
    
    for (const [key, factory] of Object.entries(dependencies)) {
      if (factory.scope === 'singleton') {
        // Usar cache para singletons
        if (!this.singletonCache.has(key)) {
          this.singletonCache.set(key, await factory.create())
        }
        resolved[key] = this.singletonCache.get(key)
      } else {
        // Crear nueva instancia para request scope
        resolved[key] = await factory.create()
      }
    }
    
    return resolved
  }
  
  async cleanup(dependencies: Record<string, any>): Promise<void> {
    for (const dep of Object.values(dependencies)) {
      if (dep.cleanup && typeof dep.cleanup === 'function') {
        await dep.cleanup()
      }
    }
  }
}
```

## Data Models

### Route Metadata

```typescript
interface RouteMetadata {
  method: HttpMethod
  path: string
  pathParams: string[]  // ['id', 'postId']
  schemas: {
    params?: ZodSchema
    query?: ZodSchema
    body?: ZodSchema
    response?: ZodSchema
  }
  handler: RouteHandler
  dependencies?: Record<string, DependencyFactory>
  status?: number
}
```

### Request Parameters

```typescript
interface RouteParams {
  params?: Record<string, string>
  query?: Record<string, any>
  body?: any
  headers?: Record<string, string>
}
```

### Typed Client Structure

```typescript
// Ejemplo de estructura generada por tipos
type TypedClient<App> = {
  users: {
    get: (params?: { query?: { page: number } }) => Promise<User[]>
    ':id': {
      get: (params: { params: { id: string } }) => Promise<User>
      put: (params: { params: { id: string }, body: UpdateUser }) => Promise<User>
      delete: (params: { params: { id: string } }) => Promise<void>
    }
  }
  posts: {
    get: () => Promise<Post[]>
    post: (params: { body: CreatePost }) => Promise<Post>
  }
}
```

## Correctness Properties

*Una property es una característica o comportamiento que debe mantenerse verdadero a través de todas las ejecuciones válidas del sistema - esencialmente, una declaración formal sobre lo que el sistema debe hacer. Las properties sirven como puente entre especificaciones legibles por humanos y garantías de corrección verificables por máquina.*


### Property 1: Type inference completeness
*Para cualquier* aplicación SyntroJS con rutas registradas, el cliente tipado debe inferir correctamente todos los tipos de parámetros, body, query y respuesta sin anotaciones manuales
**Validates: Requirements 1.1, 1.3**

### Property 2: Parameter validation consistency
*Para cualquier* ruta con schemas Zod definidos, la validación en local mode debe producir los mismos resultados que la validación en el servidor
**Validates: Requirements 1.2, 2.2**

### Property 3: Path parameter requirement
*Para cualquier* ruta con parámetros de path (ej: `/users/:id`), el cliente debe requerir esos parámetros y fallar si no se proporcionan
**Validates: Requirements 1.5, 4.2**

### Property 4: Local mode direct execution
*Para cualquier* cliente en local mode, las llamadas deben ejecutar handlers directamente sin hacer peticiones HTTP
**Validates: Requirements 2.1**

### Property 5: HTTPException preservation
*Para cualquier* handler que lance una HTTPException, el cliente debe preservar el código de estado y mensaje en ambos modos
**Validates: Requirements 2.3, 7.2**

### Property 6: Background task synchronous execution
*Para cualquier* ruta que encole background tasks en local mode, todas las tasks deben completarse antes de retornar la respuesta
**Validates: Requirements 2.4**

### Property 7: Dependency injection resolution
*Para cualquier* ruta con dependencias inyectadas en local mode, todas las dependencias deben resolverse correctamente antes de ejecutar el handler
**Validates: Requirements 2.5, 8.1, 8.2**

### Property 8: Remote mode HTTP execution
*Para cualquier* cliente en remote mode con base URL, las llamadas deben hacer peticiones HTTP reales a la URL correcta
**Validates: Requirements 3.1**

### Property 9: JSON serialization
*Para cualquier* request body en remote mode, el body debe serializarse correctamente a JSON con Content-Type header apropiado
**Validates: Requirements 3.2, 3.4**

### Property 10: Error response parsing
*Para cualquier* respuesta de error del servidor, el cliente debe parsear y lanzar un error tipado con el código de estado y mensaje preservados
**Validates: Requirements 3.3, 7.1, 7.2**

### Property 11: Header merging
*Para cualquier* conjunto de headers personalizados, el cliente debe fusionarlos con headers por defecto sin sobrescribir headers requeridos
**Validates: Requirements 3.5**

### Property 12: HTTP method support
*Para cualquier* método HTTP (GET, POST, PUT, PATCH, DELETE), el cliente debe proporcionar un método tipado correspondiente que funcione correctamente
**Validates: Requirements 4.1**

### Property 13: Query parameter handling
*Para cualquier* ruta con query parameters, el cliente debe aceptarlos como objeto tipado y construir la URL correctamente
**Validates: Requirements 4.3**

### Property 14: Request body validation
*Para cualquier* ruta con schema de body, el cliente debe validar el body según el schema Zod antes de enviar la petición
**Validates: Requirements 4.4**

### Property 15: Parameter combination
*Para cualquier* ruta con múltiples tipos de parámetros (params, query, body), el cliente debe combinarlos correctamente en un objeto de opciones
**Validates: Requirements 4.5**

### Property 16: Complex route pattern handling
*Para cualquier* patrón de ruta complejo (nested paths, múltiples params), el cliente debe manejarlos correctamente en runtime
**Validates: Requirements 5.5**

### Property 17: Validation error details
*Para cualquier* validación que falle en local mode, el error debe incluir detalles específicos de qué campo falló y por qué
**Validates: Requirements 7.3**

### Property 18: Route not found error
*Para cualquier* intento de llamar una ruta inexistente, el cliente debe lanzar un error claro indicando que la ruta no existe
**Validates: Requirements 7.4**

### Property 19: First error reporting
*Para cualquier* situación donde ocurran múltiples errores, el cliente debe reportar solo el primer error encontrado
**Validates: Requirements 7.5**

### Property 20: Singleton dependency caching
*Para cualquier* dependencia con scope singleton en local mode, la factory debe ejecutarse solo una vez y reutilizar la instancia
**Validates: Requirements 8.1**

### Property 21: Request-scoped dependency creation
*Para cualquier* dependencia con scope request en local mode, debe crearse una nueva instancia para cada petición
**Validates: Requirements 8.2**

### Property 22: Dependency cleanup execution
*Para cualquier* dependencia con función cleanup en local mode, el cleanup debe ejecutarse después de completar la petición
**Validates: Requirements 8.3**

### Property 23: Dependency error propagation
*Para cualquier* factory de dependencia que lance un error, el error debe propagarse con contexto sobre qué dependencia falló
**Validates: Requirements 8.4**

### Property 24: Nested dependency resolution
*Para cualquier* conjunto de dependencias anidadas, el resolver debe resolverlas recursivamente en el orden correcto
**Validates: Requirements 8.5**

### Property 25: FileDownloadResponse handling
*Para cualquier* ruta que retorne FileDownloadResponse, el cliente debe manejarlo apropiadamente en ambos modos
**Validates: Requirements 9.1**

### Property 26: RedirectResponse handling
*Para cualquier* ruta que retorne RedirectResponse en local mode, el cliente debe retornar la información de redirección sin seguir el redirect
**Validates: Requirements 9.2**

### Property 27: Stream response handling
*Para cualquier* ruta que retorne un stream en remote mode, el cliente debe proporcionar acceso al stream sin consumirlo automáticamente
**Validates: Requirements 9.3**

### Property 28: File upload support
*Para cualquier* ruta que acepte file uploads en remote mode, el cliente debe soportar FormData y encoding multipart
**Validates: Requirements 9.4**

### Property 29: Custom response type preservation
*Para cualquier* tipo de respuesta personalizado, el cliente debe preservar su estructura sin modificaciones
**Validates: Requirements 9.5**

## Error Handling

### Error Hierarchy

```typescript
// Error base
class ClientError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message)
    this.name = 'ClientError'
  }
}

// Error de validación
class ValidationError extends ClientError {
  constructor(
    message: string,
    public validationErrors: ZodError
  ) {
    super(message, 400, validationErrors)
    this.name = 'ValidationError'
  }
}

// Error de red
class NetworkError extends ClientError {
  constructor(
    message: string,
    public originalError: Error
  ) {
    super(message, 0, originalError)
    this.name = 'NetworkError'
  }
}

// Error de ruta no encontrada
class RouteNotFoundError extends ClientError {
  constructor(path: string) {
    super(`Route not found: ${path}`, 404)
    this.name = 'RouteNotFoundError'
  }
}
```

### Error Mapping Strategy

```typescript
function mapError(error: unknown): ClientError {
  // HTTPException del backend
  if (error instanceof HTTPException) {
    return new ClientError(
      error.message,
      error.statusCode,
      error.details
    )
  }
  
  // Error de validación Zod
  if (error instanceof ZodError) {
    return new ValidationError(
      'Validation failed',
      error
    )
  }
  
  // Error de red (fetch)
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return new NetworkError(
      'Network request failed',
      error
    )
  }
  
  // Error genérico
  if (error instanceof Error) {
    return new ClientError(error.message, 500)
  }
  
  // Unknown error
  return new ClientError('Unknown error occurred', 500, error)
}
```

### Guard Clauses

```typescript
// Validación de configuración
function validateConfig(config: ClientConfig): void {
  if (config.mode === 'remote' && !config.baseUrl) {
    throw new ClientError(
      'baseUrl is required for remote mode',
      400
    )
  }
  
  if (config.baseUrl && !isValidUrl(config.baseUrl)) {
    throw new ClientError(
      'baseUrl must be a valid URL',
      400
    )
  }
  
  if (config.timeout && config.timeout <= 0) {
    throw new ClientError(
      'timeout must be positive',
      400
    )
  }
}

// Validación de parámetros de ruta
function validateRouteParams(
  route: RouteMetadata,
  params: RouteParams
): void {
  // Verificar path params requeridos
  for (const param of route.pathParams) {
    if (!params.params?.[param]) {
      throw new ValidationError(
        `Missing required path parameter: ${param}`,
        new ZodError([])
      )
    }
  }
}
```

## Testing Strategy

### Unit Testing

El Type-Safe Client requiere unit tests exhaustivos para:

1. **Type Inference Engine**
   - Extracción correcta de rutas desde el tipo App
   - Parsing de path parameters
   - Inferencia de tipos desde Zod schemas
   - Manejo de rutas anidadas

2. **Local Executor**
   - Ejecución directa de handlers
   - Validación con Zod
   - Resolución de dependencias
   - Ejecución de background tasks
   - Cleanup de dependencias

3. **Remote Executor**
   - Construcción correcta de URLs
   - Serialización de body a JSON
   - Manejo de query parameters
   - Headers por defecto y personalizados
   - Parsing de respuestas
   - Manejo de errores HTTP

4. **Error Handling**
   - Mapeo correcto de diferentes tipos de errores
   - Preservación de información de error
   - Mensajes de error claros

### Property-Based Testing

Usaremos **fast-check** (librería de PBT para TypeScript/JavaScript) para validar las correctness properties.

**Configuración:**
```typescript
import fc from 'fast-check'

// Cada property test debe ejecutar mínimo 100 iteraciones
const PBT_RUNS = 100
```

**Generators necesarios:**

```typescript
// Generator para rutas válidas
const routeArb = fc.record({
  method: fc.constantFrom('GET', 'POST', 'PUT', 'PATCH', 'DELETE'),
  path: fc.string().filter(s => s.startsWith('/')),
  handler: fc.func(fc.anything())
})

// Generator para parámetros de path
const pathParamsArb = fc.dictionary(
  fc.string(),
  fc.string()
)

// Generator para query parameters
const queryParamsArb = fc.dictionary(
  fc.string(),
  fc.oneof(fc.string(), fc.integer(), fc.boolean())
)

// Generator para request body
const bodyArb = fc.oneof(
  fc.object(),
  fc.array(fc.anything()),
  fc.string(),
  fc.integer()
)
```

**Ejemplo de property test:**

```typescript
describe('Property 2: Parameter validation consistency', () => {
  it('should validate parameters consistently in local and remote mode', () => {
    fc.assert(
      fc.property(
        routeArb,
        pathParamsArb,
        queryParamsArb,
        bodyArb,
        async (route, params, query, body) => {
          // Setup
          const app = new SyntroJS()
          app.register(route)
          
          const localClient = createClient({ mode: 'local', app })
          const remoteClient = createClient({ 
            mode: 'remote', 
            baseUrl: 'http://localhost:3000' 
          })
          
          // Execute
          const localResult = await localClient.call(route.path, {
            params,
            query,
            body
          })
          
          const remoteResult = await remoteClient.call(route.path, {
            params,
            query,
            body
          })
          
          // Assert: ambos deben validar de la misma forma
          expect(localResult.status).toBe(remoteResult.status)
        }
      ),
      { numRuns: PBT_RUNS }
    )
  })
})
```

### Integration Testing

Tests de integración para verificar:

1. **Monorepo Setup**
   - Cliente en paquete separado
   - Importación solo de tipos
   - No ejecución de código backend

2. **Real HTTP Requests**
   - Servidor SyntroJS corriendo
   - Cliente en remote mode
   - Peticiones reales end-to-end

3. **File Uploads/Downloads**
   - FormData en remote mode
   - FileDownloadResponse en ambos modos
   - Streams en remote mode

### Test Coverage Goals

- **Unit Tests**: >90% coverage
- **Property Tests**: Todas las 29 properties implementadas
- **Integration Tests**: Escenarios críticos cubiertos
- **Edge Cases**: Rutas complejas, errores, timeouts

## Performance Considerations

### Type Inference Performance

- Los tipos se calculan en compile-time, sin overhead en runtime
- TypeScript puede ser lento con tipos muy complejos (>10 niveles de anidación)
- Solución: Limitar profundidad de inferencia con tipos helper

```typescript
type MaxDepth = 5

type InferRoutes<T, Depth extends number = 0> = 
  Depth extends MaxDepth
    ? any  // Stop recursion
    : // ... continue inference
```

### Local Mode Performance

- **Ventaja**: Sin overhead de HTTP, serialización, red
- **Desventaja**: Debe resolver dependencias y ejecutar validación
- **Optimización**: Cache de dependencias singleton

### Remote Mode Performance

- **Overhead**: HTTP request, serialización JSON, red
- **Optimización**: 
  - Reuso de conexiones HTTP (keep-alive)
  - Timeout configurable
  - Cancelación de requests (AbortSignal)

### Memory Considerations

```typescript
class LocalExecutor {
  // Límite de cache para evitar memory leaks
  private readonly MAX_CACHE_SIZE = 100
  
  private singletonCache = new Map<string, any>()
  
  private evictOldestIfNeeded(): void {
    if (this.singletonCache.size > this.MAX_CACHE_SIZE) {
      const firstKey = this.singletonCache.keys().next().value
      this.singletonCache.delete(firstKey)
    }
  }
}
```

## Security Considerations

### Type Safety as Security

- Validación en compile-time previene muchos errores
- Zod validation en runtime como segunda capa
- No bypass de validación posible

### Remote Mode Security

```typescript
// Sanitización de URLs
function sanitizeUrl(url: string): string {
  // Prevenir SSRF
  if (url.includes('localhost') || url.includes('127.0.0.1')) {
    throw new ClientError('Localhost URLs not allowed', 400)
  }
  
  // Validar protocolo
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    throw new ClientError('Only HTTP/HTTPS protocols allowed', 400)
  }
  
  return url
}

// Headers seguros
const SAFE_HEADERS = [
  'content-type',
  'authorization',
  'accept',
  'user-agent'
]

function filterHeaders(headers: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers).filter(([key]) => 
      SAFE_HEADERS.includes(key.toLowerCase())
    )
  )
}
```

### Dependency Injection Security

```typescript
// Prevenir inyección de código malicioso
function validateDependency(dep: any): void {
  if (typeof dep === 'function') {
    // Verificar que no sea código malicioso
    const source = dep.toString()
    if (source.includes('eval') || source.includes('Function(')) {
      throw new ClientError('Unsafe dependency detected', 400)
    }
  }
}
```

## Extensibility

### Custom Serializers

```typescript
interface CustomSerializer {
  canHandle(data: unknown): boolean
  serialize(data: unknown): string
  deserialize(data: string): unknown
}

class ClientBuilder {
  private serializers: CustomSerializer[] = []
  
  addSerializer(serializer: CustomSerializer): this {
    this.serializers.push(serializer)
    return this
  }
  
  build(): TypedClient {
    // Use custom serializers if available
    return createClient({
      serializers: this.serializers
    })
  }
}
```

### Middleware Support

```typescript
type ClientMiddleware = (
  request: ClientRequest,
  next: () => Promise<ClientResponse>
) => Promise<ClientResponse>

class ClientBuilder {
  private middlewares: ClientMiddleware[] = []
  
  use(middleware: ClientMiddleware): this {
    this.middlewares.push(middleware)
    return this
  }
}

// Ejemplo: Logging middleware
const loggingMiddleware: ClientMiddleware = async (request, next) => {
  console.log(`[Client] ${request.method} ${request.path}`)
  const start = Date.now()
  
  const response = await next()
  
  console.log(`[Client] ${response.status} (${Date.now() - start}ms)`)
  return response
}
```

### Plugin System

```typescript
interface ClientPlugin {
  name: string
  setup(client: TypedClient): void
}

// Ejemplo: Retry plugin
class RetryPlugin implements ClientPlugin {
  name = 'retry'
  
  constructor(private maxRetries: number = 3) {}
  
  setup(client: TypedClient): void {
    // Wrap executor con retry logic
    const originalExecute = client.execute
    
    client.execute = async (...args) => {
      let lastError: Error
      
      for (let i = 0; i < this.maxRetries; i++) {
        try {
          return await originalExecute(...args)
        } catch (error) {
          lastError = error
          await this.delay(Math.pow(2, i) * 1000)
        }
      }
      
      throw lastError
    }
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
```

## Migration Path

### From Manual Types

**Antes:**
```typescript
// types.ts
interface User {
  id: string
  name: string
  email: string
}

// api.ts
async function getUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`)
  return response.json()
}
```

**Después:**
```typescript
// backend/app.ts
export const app = new SyntroJS()
  .get('/users/:id', {
    params: z.object({ id: z.string() }),
    handler: ({ params }) => getUser(params.id)
  })

export type App = typeof app

// frontend/api.ts
import { createClient } from 'syntrojs/client'
import type { App } from '../backend/app'

const api = createClient<App>({ 
  mode: 'remote',
  baseUrl: 'https://api.example.com'
})

// ✨ Fully typed, no manual types needed
const user = await api.users[':id'].get({ params: { id: '123' } })
```

### Gradual Adoption

1. **Fase 1**: Agregar Type-Safe Client para nuevas rutas
2. **Fase 2**: Migrar rutas existentes una por una
3. **Fase 3**: Eliminar tipos manuales cuando todas las rutas estén migradas

## Documentation Requirements

### API Documentation

- Guía de inicio rápido (Quick Start)
- Referencia completa de API
- Ejemplos para casos comunes
- Troubleshooting guide

### Type System Documentation

- Cómo funciona la inferencia de tipos
- Limitaciones del sistema de tipos
- Workarounds para casos complejos

### Migration Guide

- Paso a paso desde tipos manuales
- Ejemplos de antes/después
- Checklist de migración

### Monorepo Setup Guide

- Configuración de TypeScript
- Estructura de paquetes
- Evitar dependencias circulares

## Future Enhancements

### v1.1 - Advanced Features

- WebSocket support
- Server-Sent Events (SSE)
- GraphQL integration
- Batch requests

### v1.2 - Developer Tools

- VSCode extension para mejor autocomplete
- CLI para generar tipos desde OpenAPI
- Debug mode con logging detallado

### v1.3 - Performance

- Request caching
- Optimistic updates
- Request deduplication
- Parallel requests

## Conclusion

El Type-Safe Client representa un salto significativo en developer experience para SyntroJS. Al eliminar la duplicación manual de tipos y proporcionar type safety completo, reduce errores y acelera el desarrollo.

La arquitectura dual (local/remote) permite testing rápido sin sacrificar la capacidad de hacer peticiones HTTP reales. El diseño extensible permite agregar features como retry, caching, y middleware sin modificar el core.

Con 29 correctness properties bien definidas y una estrategia de testing comprehensiva, el Type-Safe Client será una feature robusta y confiable que diferencia a SyntroJS de otros frameworks.
