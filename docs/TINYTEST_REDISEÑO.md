# TinyTest - Rediseño y Visión

## Fecha: 2025-11-07
## Estado: 🔴 PLANIFICACIÓN - No implementar todavía

---

## Problema Actual

### ¿Qué NO funciona?

1. **Duplicación de trabajo**
   - Tenés que reescribir TODAS las rutas en el test
   - No testeas el código real de tu app
   - Coverage 0% del archivo principal

2. **Sin valor diferencial**
   - Es más fácil usar `fetch` directamente
   - No aporta nada vs testing tradicional
   - FastAPI y Elysia NO tienen esto y funcionan perfecto

3. **Confusión conceptual**
   - ¿Es para prototipado?
   - ¿Es para testing?
   - ¿Cuándo usarlo vs tests normales?

### Ejemplo del problema:

```typescript
// Tu app real (index.ts)
app.get('/users', {
  handler: async () => {
    const users = await db.query('SELECT * FROM users')
    return { users }
  }
})

// TinyTest actual - TENÉS QUE DUPLICAR TODO 😡
const api = new TinyTest()
api.get('/users', {  // ← DUPLICACIÓN
  handler: async () => {
    const users = await db.query('SELECT * FROM users')  // ← DUPLICACIÓN
    return { users }
  }
})
```

**Resultado:** Duplicaste código, no testeas el real, y el coverage miente.

---

## Visión: TinyTest v2

### Principio fundamental:

> **"Testea tu app REAL, no una copia"**

### Características clave:

#### 1. Attach a app existente

```typescript
import { TinyTest } from 'syntrojs/testing'
import { app } from './index.js'  // ← App REAL

const test = TinyTest(app)  // ← NO recrear rutas
```

#### 2. Sin servidor HTTP (emulación interna)

- NO levanta servidor
- NO usa red
- Llama directamente al handler interno
- 10-100x más rápido

#### 3. Sistema de mocking integrado

```typescript
test.mock(axios, 'get', 'https://api.github.com/*', () => ({
  data: { login: 'mocked' }
}))

test.mock(fetch, 'https://external-api.com/*', {
  status: 200,
  json: { result: 'mocked' }
})

test.mock(db, 'query', () => [{ id: 1, name: 'Mock' }])
```

#### 4. Mutation-aware testing

```typescript
// Tests diseñados para MATAR mutantes
test('age boundary', async () => {
  // Si alguien cambia >= por >, este test lo detecta
  await test.expectError('/register', { body: { age: 17 } }, 422) // Falla
  await test.expectSuccess('/register', { body: { age: 18 } }, 200) // Pasa ✅
  await test.expectSuccess('/register', { body: { age: 19 } }, 200) // Pasa
})
```

---

## Casos de Uso

### Caso 1: API que consume servicios externos

```typescript
// app.ts
app.get('/github/:user', {
  handler: async ({ params }) => {
    const response = await axios.get(`https://api.github.com/users/${params.user}`)
    return response.data
  }
})

// test.ts
const test = TinyTest(app)

test.mock(axios, 'get', 'https://api.github.com/users/*', () => ({
  data: { login: 'mocked-user', repos: 42 }
}))

const res = await test.get('/github/octocat')
expect(res.data.repos).toBe(42)  // ← Usa el mock
```

**Ventaja:** No necesitas servidor HTTP ni API real de GitHub

### Caso 2: Boundary testing para mutantes

```typescript
// app.ts
app.post('/users', {
  body: z.object({
    age: z.number().min(18)  // ← ¿Qué pasa si un mutante cambia 18 por 17?
  }),
  handler: ({ body }) => createUser(body)
})

// test.ts
const test = TinyTest(app)

// Test que MATA mutantes
await test.expectError('/users', { body: { age: 17 } }, 422) // ← Borde inferior
await test.expectSuccess('/users', { body: { age: 18 } }, 200) // ← Mínimo válido
await test.expectSuccess('/users', { body: { age: 19 } }, 200) // ← Válido
```

**Ventaja:** Si SmartMutator cambia `min(18)` por `min(17)`, el test falla

### Caso 3: Testing con base de datos

```typescript
// app.ts
app.get('/users', {
  handler: async () => {
    const users = await db.query('SELECT * FROM users')
    return { users }
  }
})

// test.ts
const test = TinyTest(app)

test.mock(db, 'query', () => [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' }
])

const res = await test.get('/users')
expect(res.data.users).toHaveLength(2)
```

**Ventaja:** No necesitas DB real, tests aislados

---

## Arquitectura Propuesta

### Componentes:

```
┌─────────────────────────────────────────┐
│ TinyTest                                │
├─────────────────────────────────────────┤
│ 1. App Wrapper                          │
│    - Attach app real                    │
│    - Acceso a handlers internos         │
│                                         │
│ 2. Mock Layer                           │
│    - Intercepta axios/fetch/db          │
│    - Pattern matching de URLs           │
│    - Respuestas configurables           │
│                                         │
│ 3. Request Emulator                     │
│    - Sin HTTP, sin red                  │
│    - Llama handlers directamente        │
│    - Simula Request/Response            │
│                                         │
│ 4. Assertion Helpers                    │
│    - expectSuccess / expectError        │
│    - testBoundaries (mutation-aware)    │
│    - testContract (schema validation)   │
└─────────────────────────────────────────┘
```

### Flujo interno:

```
test.get('/users')
  ↓
1. Busca handler de /users en app real
  ↓
2. Activa mocks configurados
  ↓
3. Crea Request simulado (sin HTTP)
  ↓
4. Llama handler con context mockeado
  ↓
5. Retorna Response parseado
```

---

## Desafíos Técnicos

### 1. Mock system

**Problema:** ¿Cómo interceptar axios, fetch, db sin librerías externas?

**Opciones:**
- A) Usar `vi.mock()` de Vitest (depende de Vitest)
- B) Proxy pattern (nuestro propio sistema)
- C) Dependency injection (cambiar arquitectura de SyntroJS)

**Pregunta:** ¿Vale la pena reinventar la rueda o usar `vi.mock()`?

### 2. Request emulation sin HTTP

**Problema:** ¿Cómo llamar handlers sin levantar servidor?

**Opciones:**
- A) `app.handle(request)` interno (como Elysia)
- B) Acceder directamente al handler
- C) Simular fetch local

**Referencia:** Mirar cómo lo hace Elysia con `treaty`

### 3. Type safety

**Problema:** ¿Cómo tener autocompletado de rutas?

**Opciones:**
- A) Simple: `test.get('/users')` sin tipos (fácil)
- B) Type-safe: `test.users.get()` con tipos (complejo)

**Decisión:** Fase 1 = simple, Fase 2 = type-safe

### 4. Integración con SmartMutator

**Problema:** ¿Cómo vincular tests con mutantes?

**Idea:**
- TinyTest registra qué handlers se testean
- SmartMutator genera mutantes de esos handlers
- Correlación automática test ↔ mutante

---

## Comparación con otras soluciones

### FastAPI (Python)

```python
from fastapi.testclient import TestClient

client = TestClient(app)
response = client.get("/users")
```

- ✅ Testea app real
- ✅ Sin servidor HTTP
- ❌ No tiene mocking integrado
- ❌ No tiene mutation-aware testing
- ❌ No type-safe (Python typing limitado)

### Elysia (Bun/TS) - Treaty

```typescript
import { treaty } from '@elysiajs/eden'
import type { App } from './index'

const client = treaty<App>('localhost:3000')

// ✨ MAGIA: Autocompletado completo
const { data, error } = await client.users.get()
//                            ↑ autocomplete
const { data } = await client.users[':id'].get({ params: { id: 1 } })
//                            ↑ autocomplete       ↑ typed
```

- ✅ Testea app real
- ✅ **Type-safe END-TO-END** (el diferenciador clave)
- ✅ Sin servidor HTTP (opcional)
- ✅ Autocompletado de rutas
- ✅ Validación de tipos en compile time
- ✅ Error handling tipado
- ❌ No tiene mocking integrado
- ❌ No tiene mutation-aware testing

**Valor real:** No necesitas escribir `'/users'` manualmente, todo está tipado.

### TinyTest v2 - Approach "Treaty-like"

**Opción A: Simple (sin types)**
```typescript
const test = TinyTest(app)
const res = await test.get('/users')  // ← String manual
```

**Opción B: Type-safe (como treaty)**
```typescript
import { test } from 'syntrojs/testing'
import type { App } from './index'

const client = test<App>(app)

// ✨ Autocompletado completo
const res = await client.users.get()
//                   ↑ autocomplete
const res2 = await client.users[':id'].patch({
  params: { id: 1 },  // ← Typed
  body: { name: 'Updated' }  // ← Typed según schema
})
```

- ✅ Testea app real
- ✅ **Type-safe END-TO-END**
- ✅ Sin servidor HTTP
- ✅ Autocompletado de rutas
- ✅ Mocking integrado (diferenciador vs Elysia)
- ✅ Mutation-aware testing (diferenciador vs Elysia)

**Diferenciadores vs Elysia:**
1. Mocking integrado (Elysia no tiene)
2. Mutation-aware helpers (Elysia no tiene)
3. Pensado para testing desde el diseño

---

## Cómo lograr Type-Safety (Treaty-like)

### El desafío técnico:

**¿Cómo convertir esto:**
```typescript
app.get('/users/:id', { handler: ... })
app.post('/users', { handler: ... })
```

**En esto:**
```typescript
client.users[':id'].get({ params: { id: 1 } })
client.users.post({ body: { ... } })
```

### Solución: Type inference con Template Literals

```typescript
// 1. Extraer rutas del tipo de App
type ExtractRoutes<T> = T extends SyntroJS<infer Routes> ? Routes : never

// 2. Convertir rutas en objeto navegable
type RouteToObject<Path extends string> = 
  Path extends `/${infer Segment}/${infer Rest}`
    ? { [K in Segment]: RouteToObject<`/${Rest}`> }
    : Path extends `/${infer Segment}`
    ? { [K in Segment]: EndpointMethods }
    : never

// 3. Cliente tipado
type TypedClient<App> = {
  [Route in ExtractRoutes<App>]: {
    get: (options?) => Promise<Response>
    post: (options?) => Promise<Response>
    // ... otros métodos
  }
}
```

### Ejemplo completo:

```typescript
// app.ts
export const app = new SyntroJS()
  .get('/users', { 
    handler: () => ({ users: [] })
  })
  .get('/users/:id', {
    params: z.object({ id: z.coerce.number() }),
    handler: ({ params }) => ({ id: params.id, name: 'John' })
  })
  .post('/users', {
    body: z.object({ 
      name: z.string(), 
      email: z.string().email() 
    }),
    handler: ({ body }) => ({ id: 1, ...body })
  })

export type App = typeof app

// test.ts
import { test } from 'syntrojs/testing'
import type { App } from './app'

const client = test<App>(app)

// ✨ TODO TIPADO:
const res1 = await client.users.get()
//    ↑ data: { users: any[] }

const res2 = await client.users[':id'].get({ 
  params: { id: 123 }  // ← Typed: number
})
//    ↑ data: { id: number, name: string }

const res3 = await client.users.post({
  body: { 
    name: 'Alice',
    email: 'alice@example.com'  // ← Typed: string.email()
  }
})
//    ↑ data: { id: number, name: string, email: string }
```

### Ventajas de este approach:

1. **Zero code generation** → Todo por inference
2. **Autocomplete completo** → VSCode sabe todas tus rutas
3. **Compile-time safety** → Errores antes de ejecutar
4. **Refactor-friendly** → Cambias la ruta, el test se actualiza
5. **DX excepcional** → Como usar un SDK tipado

### Complejidad técnica:

🔴 **Alta** - Requiere:
- Type gymnastics avanzado (Template Literal Types)
- Manejo de rutas dinámicas (`:id`, `:slug`, etc)
- Inferencia de schemas Zod
- Mapping de métodos HTTP
- Manejo de errores tipados

**Estimación:** 1-2 semanas de desarrollo + debugging de edge cases

### ¿Vale la pena?

**Sí, SI:**
- Queremos diferenciarnos de FastAPI/Express
- Buscamos la mejor DX posible
- Tenemos tiempo para hacerlo bien

**No, SI:**
- Solo queremos una versión más simple de fetch
- No tenemos tiempo/recursos
- El valor no justifica la complejidad

---

## Preguntas Abiertas

### 1. ¿Qué hacemos con TinyTest actual?

**Opciones:**
- A) Deprecarlo y eliminarlo
- B) Renombrarlo a "ProtoTest" (solo para prototipado)
- C) Refactorarlo para que sea el nuevo TinyTest

**Recomendación:** B - Mantener para casos específicos (docs, prototipos)

### 2. ¿Vale la pena el esfuerzo?

**Consideraciones:**
- FastAPI funciona bien SIN esto
- Elysia funciona bien SIN esto (pero tienen treaty para ergonomía)
- El mocking se puede hacer con `vi.mock()`
- El mutation testing es el diferenciador

**Pregunta:** ¿El combo Mocking + Mutation es suficiente valor?

### 3. ¿Qué priorizar primero?

**Fase 1:**
- [ ] Attach app real (sin duplicación)
- [ ] Request emulation (sin HTTP)
- [ ] API simple: `test.get('/users')`

**Fase 2:**
- [ ] Sistema de mocking
- [ ] Helpers mutation-aware
- [ ] Type-safety completo

**Pregunta:** ¿Empezamos con Fase 1 o necesitamos todo desde el inicio?

---

## Próximos Pasos

1. **Discutir y refinar este documento**
   - ¿La visión es correcta?
   - ¿Faltan casos de uso?
   - ¿Los desafíos están bien identificados?

2. **Decidir scope**
   - ¿Fase 1 mínima o completo desde el inicio?
   - ¿Qué features son must-have vs nice-to-have?

3. **Crear POC (Proof of Concept)**
   - Implementar versión mínima
   - Validar que funciona como esperamos
   - Medir performance

4. **Iterar**
   - Feedback del POC
   - Ajustar diseño
   - Implementar versión final

---

## Decisión Final: ¿Qué camino tomar?

### Opción 1: No hacer nada ❌
- Dejar testing a Vitest + fetch tradicional
- Eliminar TinyTest actual
- **Esfuerzo:** 0 días
- **Valor:** ✅ Simplicidad

### Opción 2: Cliente simple (sin types) ⚠️
```typescript
const client = test(app)
await client.get('/users')
```
- **Esfuerzo:** 2-3 días
- **Valor:** ⚠️ Marginal (solo sintaxis más limpia)
- **Conclusión:** No vale la pena

### Opción 3: Cliente type-safe (como treaty) ✨
```typescript
const client = test<App>(app)
await client.users.get()  // ← Autocomplete mágico
```
- **Esfuerzo:** 1-2 semanas
- **Valor:** ✅✅✅ Alto (diferenciador real)
- **Requiere:** Type gymnastics + testing exhaustivo
- **Conclusión:** **ESTE es el camino**

### Opción 4: Type-safe + Mocking + Mutation 🚀
```typescript
const client = test<App>(app)
client.mock(axios, 'get', '...', () => ({ data: [] }))

await client.users.get()  // ← Autocomplete + Mock
```
- **Esfuerzo:** 3-4 semanas
- **Valor:** ✅✅✅✅ Máximo (único en el mercado)
- **Riesgo:** Alto (mucha complejidad)
- **Conclusión:** Para versión futura (v2)

---

## 🎯 Recomendación Final

### **Opción 3: Cliente type-safe (inspirado en treaty de Elysia)**

**Razones:**
1. ✅ **Diferenciador claro** vs FastAPI/Express/Hono
2. ✅ **DX excepcional** (igual o mejor que Elysia)
3. ✅ **Value prop claro** para marketing
4. ✅ **Esfuerzo justificado** (1-2 semanas bien invertidas)

**Roadmap propuesto:**
- **v0.5.0:** Cliente type-safe básico
  - `test<App>(app)` con autocomplete de rutas
  - Inferencia de params/body/response desde schemas
  - Sin servidor HTTP (emulación interna)

- **v0.6.0:** Agregar mocking integrado
  - `client.mock()` para axios/fetch/db
  - Combinación única: type-safe + mocking

- **v0.7.0:** Mutation-aware helpers
  - Integration con SmartMutator
  - Helpers especializados para boundary testing

### Si NO tenemos tiempo/recursos:

**Opción 1: Eliminar TinyTest**

Mejor no tener nada que tener algo mediocre que confunde y no aporta valor.

---

## Notas Finales

**Recordatorio:** No implementar nada hasta:
1. Validar que podemos lograr el type-safety (POC de tipos)
2. Estimar esfuerzo real con precisión
3. Decidir si vale la pena vs otras prioridades

**Pregunta clave actualizada:** ¿El type-safety estilo treaty justifica 1-2 semanas de desarrollo?

**Respuesta:** SÍ, porque es un diferenciador real que mejora significativamente la DX.

