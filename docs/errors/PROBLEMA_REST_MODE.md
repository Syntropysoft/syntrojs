# Problema Específico: REST Mode - OPTIONS devuelve 404

## 🎯 Diagnóstico

En SyntroJS 0.6.8-alpha.2:
- ✅ **Lambda Mode funciona** - OPTIONS devuelve 204 con headers CORS
- ❌ **REST Mode falla** - OPTIONS devuelve 404 sin headers CORS

Esto indica que el problema **NO es general del core**, sino **específico de cómo SyntroJS maneja CORS en REST mode con Fastify**.

## 🔍 Análisis del Problema

### Comportamiento Observado

**REST Mode**:
```
OPTIONS /users → 404 Not Found
```

**Lambda Mode**:
```
OPTIONS /users → 204 No Content
Headers CORS: ✅ Presentes
```

### Hipótesis

El problema está en uno de estos puntos:

1. **SyntroJS no registra rutas OPTIONS automáticamente**
   - Cuando defines `app.post('/users', ...)`, debería también registrar `OPTIONS /users`
   - Pero parece que no lo hace en REST mode

2. **Plugin CORS de Fastify no maneja OPTIONS automáticamente**
   - `@fastify/cors` debería manejar OPTIONS automáticamente
   - Pero puede que no se esté registrando correctamente

3. **Orden de registro incorrecto**
   - Plugin CORS debe registrarse ANTES de las rutas
   - Si se registra después, no funciona para rutas ya definidas

4. **Configuración CORS no se pasa correctamente a Fastify**
   - La configuración `cors: { ... }` puede no convertirse correctamente al formato de Fastify

## 🔧 Qué Verificar en el Código de SyntroJS

### 1. Registro de Rutas OPTIONS

```javascript
// ¿SyntroJS registra automáticamente OPTIONS cuando defines POST?
app.post('/users', { handler: ... });
// ¿Esto también registra OPTIONS /users en Fastify?
```

### 2. Registro del Plugin CORS

```javascript
// ¿Cuándo se registra @fastify/cors?
// ¿Antes o después de registrar las rutas?

// Orden correcto:
// 1. Registrar plugin CORS
// 2. Registrar rutas
// 3. Iniciar servidor

// Orden incorrecto (probable actual):
// 1. Registrar rutas
// 2. Registrar plugin CORS (demasiado tarde)
// 3. Iniciar servidor
```

### 3. Conversión de Configuración

```javascript
// ¿La configuración cors: { ... } se convierte correctamente?
const app = new SyntroJS({
  cors: {
    origin: true,
    methods: ['GET', 'POST', ...],
    // ...
  }
});

// ¿Se pasa así a Fastify?
fastify.register(require('@fastify/cors'), {
  origin: true,
  methods: ['GET', 'POST', ...],
  // ...
});
```

## 🧪 Workaround Temporal

### Opción 1: Registrar OPTIONS Manualmente

```javascript
// En server.js, agregar después de definir las rutas:
app.options('/users', {
  handler: async () => {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id',
        'Access-Control-Max-Age': '86400',
      },
    };
  },
});
```

### Opción 2: Usar Lambda Mode para Desarrollo

Si Lambda mode funciona perfectamente, podrías usar `server-lambda.js` para desarrollo local también.

## 📝 Información de Configuración Actual

### REST Mode (server.js)

```javascript
const app = new SyntroJS({
  cors: {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id'],
    exposedHeaders: ['Content-Type'],
    maxAge: 86400,
    preflightContinue: false,
    strictPreflight: true,
  },
});
```

### Lambda Mode (server-lambda.js) - ✅ Funciona

```javascript
const app = new SyntroJS({
  rest: false,
  lambdaCors: {
    origin: '*',
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id'],
    maxAge: 86400,
  },
});
```

## 🎯 Próximos Pasos

1. **Revisar código fuente de SyntroJS** para ver cómo registra rutas en Fastify
2. **Verificar orden de registro** del plugin CORS
3. **Probar workaround** de registrar OPTIONS manualmente
4. **Reportar bug** específico de REST mode si es necesario

## 📚 Referencias

- `RESULTADOS_0.6.8-alpha.2.md` - Resultados completos de las pruebas
- `PRUEBA_0.6.8-alpha.2.md` - Guía de prueba

