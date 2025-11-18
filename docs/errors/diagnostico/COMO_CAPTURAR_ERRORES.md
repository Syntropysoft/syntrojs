# Cómo Capturar Errores de SyntroJS

## 🎯 Objetivo

Capturar información detallada sobre los errores de OPTIONS en SyntroJS para poder diagnosticar y reportar el problema.

## 📋 Información a Capturar

### 1. Error del Navegador

1. Abrir la consola del navegador (F12)
2. Ir a la pestaña "Network"
3. Hacer una petición desde el frontend
4. Buscar la petición OPTIONS (preflight)
5. Hacer clic en la petición OPTIONS
6. Capturar:
   - **Status Code**
   - **Response Headers** (completo)
   - **Request Headers** (completo)
   - **Response Body** (si hay)

### 2. Error con curl

```bash
# Petición OPTIONS completa
curl -X OPTIONS http://localhost:3000/users \
  -H "Origin: http://localhost:3001" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type" \
  -v > error-options.txt 2>&1

# Petición POST después del preflight
curl -X POST http://localhost:3000/users \
  -H "Origin: http://localhost:3001" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","age":25}' \
  -v > error-post.txt 2>&1
```

### 3. Logs del Servidor

Cuando el servidor está corriendo, debería mostrar logs. Capturar:
- Cualquier error en la consola
- Logs de Fastify/SyntroJS
- Stack traces si hay errores

### 4. Versión de SyntroJS

```bash
cd syntrojs-example-service
npm list syntrojs
```

## 📝 Template para Reportar Error

```markdown
# Error con SyntroJS 0.6.8-alpha.0

## Versión
- SyntroJS: 0.6.8-alpha.0
- Node.js: [versión]
- OS: [sistema operativo]

## Configuración CORS
```javascript
cors: {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id'],
  // ... resto de configuración
}
```

## Error OPTIONS

### Request
```
OPTIONS /users HTTP/1.1
Origin: http://localhost:3001
Access-Control-Request-Method: POST
Access-Control-Request-Headers: content-type
```

### Response
```
HTTP/1.1 [STATUS CODE]
[HEADERS COMPLETOS]
[BODY SI HAY]
```

## Logs del Servidor
```
[PEGAR LOGS AQUÍ]
```

## Comportamiento Esperado
- OPTIONS debería devolver 200/204 con headers CORS
- POST debería funcionar después del preflight

## Comportamiento Observado
- [DESCRIBIR QUÉ ESTÁ PASANDO]
```

## 🔍 Comandos Útiles

### Verificar que el servidor está corriendo
```bash
curl http://localhost:3000/health
```

### Probar OPTIONS con diferentes métodos
```bash
for method in GET POST PUT DELETE; do
  echo "Testing OPTIONS with method: $method"
  curl -X OPTIONS http://localhost:3000/users \
    -H "Origin: http://localhost:3001" \
    -H "Access-Control-Request-Method: $method" \
    -v
  echo ""
done
```

### Capturar todo en un archivo
```bash
./test-version.sh http://localhost:3000 > test-results.txt 2>&1
```

