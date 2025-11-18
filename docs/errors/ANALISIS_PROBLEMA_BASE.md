# Análisis del Problema Base de CORS

## 🎯 Conclusión del Diagnóstico

El problema de CORS en SyntroJS 0.6.8-alpha.0 es **GENERAL**, no específico de un modo:

- ❌ **REST Mode** falla con OPTIONS
- ❌ **Lambda Mode** falla con OPTIONS

Esto indica que el problema está en el **core de SyntroJS**, no en adapters específicos.

## 🔍 Áreas del Código a Revisar

### 1. Registro de Rutas OPTIONS

**Problema probable**: SyntroJS no registra automáticamente rutas OPTIONS cuando defines otras rutas.

**Qué debería pasar**:
```javascript
app.post('/users', { handler: ... });
// Debería también registrar automáticamente:
// OPTIONS /users → responder con headers CORS
```

**Qué probablemente pasa**:
- Solo registra POST, no OPTIONS
- Cuando llega OPTIONS, no hay ruta registrada → 404

### 2. Manejo de Preflight CORS

**Problema probable**: SyntroJS no detecta peticiones OPTIONS como preflight CORS.

**Qué debería pasar**:
1. Request llega con `Access-Control-Request-Method: POST`
2. SyntroJS detecta que es preflight
3. Responde automáticamente con headers CORS
4. No ejecuta el handler de POST

**Qué probablemente pasa**:
- No detecta preflight
- Intenta ejecutar handler de POST (que no existe para OPTIONS)
- Devuelve 404 o error

### 3. Configuración de CORS

**Problema probable**: La configuración `cors` o `lambdaCors` no se está aplicando correctamente.

**REST Mode**:
```javascript
const app = new SyntroJS({
  cors: { origin: true, methods: [...] }
});
// ¿Se registra @fastify/cors con esta configuración?
// ¿Se registra ANTES de las rutas?
```

**Lambda Mode**:
```javascript
const app = new SyntroJS({
  rest: false,
  lambdaCors: { origin: '*', methods: [...] }
});
// ¿Se agregan headers CORS a TODAS las respuestas?
// ¿Incluyendo OPTIONS?
```

### 4. Orden de Inicialización

**Problema probable**: Los plugins/middleware se registran en el orden incorrecto.

**Orden correcto** (Fastify):
1. Registrar plugin CORS
2. Registrar rutas
3. Iniciar servidor

**Orden probable actual**:
1. Registrar rutas
2. Registrar plugin CORS (demasiado tarde)
3. Iniciar servidor

## 🧪 Pruebas para Confirmar

### Test 1: Verificar si OPTIONS está registrado

```javascript
// Después de definir rutas
app.post('/users', { handler: ... });

// ¿Hay una ruta OPTIONS registrada?
console.log(app.routes); // Ver todas las rutas registradas
// ¿Aparece OPTIONS /users?
```

### Test 2: Verificar configuración CORS

```javascript
// ¿La configuración se está usando?
const app = new SyntroJS({
  cors: { origin: '*' }
});

// ¿Cómo se pasa a Fastify?
// ¿Se registra @fastify/cors con esta configuración?
```

### Test 3: Verificar orden de inicialización

```javascript
// Agregar logs en el código de SyntroJS
console.log('1. Registrando CORS...');
// registrar CORS

console.log('2. Registrando rutas...');
// registrar rutas

console.log('3. Iniciando servidor...');
// iniciar servidor
```

## 📋 Checklist de Diagnóstico

- [ ] ¿OPTIONS está registrado automáticamente?
- [ ] ¿La configuración CORS se está usando?
- [ ] ¿El orden de inicialización es correcto?
- [ ] ¿Se detecta preflight correctamente?
- [ ] ¿Los headers CORS se agregan a todas las respuestas?

## 🎯 Próximos Pasos

1. **Ejecutar `test-both-modes.sh`** para confirmar que ambos modos fallan igual
2. **Revisar código fuente de SyntroJS** (si está disponible) en estas áreas:
   - Registro de rutas
   - Manejo de OPTIONS
   - Configuración de CORS
   - Orden de inicialización
3. **Crear issue/bug report** con evidencia de ambos modos
4. **Proponer fix** si identificamos el problema exacto

## 📚 Referencias

- `PROBLEMA_GENERAL_CORS.md` - Documentación del problema general
- `test-both-modes.sh` - Script para probar ambos modos
- `server.js` - Ejemplo REST mode
- `server-lambda.js` - Ejemplo Lambda mode

