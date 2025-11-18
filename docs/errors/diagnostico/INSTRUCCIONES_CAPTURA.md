# Instrucciones para Capturar Errores de SyntroJS 0.6.8-alpha.0

## 🎯 Objetivo

Capturar información detallada sobre los **nuevos errores** encontrados con SyntroJS 0.6.8-alpha.0 para poder diagnosticar el problema.

## 📋 Pasos para Capturar el Error

### Paso 1: Iniciar el servidor con logs

```bash
cd syntrojs-example-service
npm start
```

**Importante**: Mantener esta terminal abierta para ver los logs.

### Paso 2: Ejecutar script de captura

En **otra terminal**:

```bash
cd errors-syntrojs
./capturar-error.sh http://localhost:3000
```

Este script capturará:
- ✅ Versión de SyntroJS instalada
- ✅ Respuesta completa de OPTIONS
- ✅ Headers de respuesta
- ✅ Resumen del error

### Paso 3: Probar desde el navegador

1. Abrir `test-options.html` en el navegador
2. Configurar URL: `http://localhost:3000`
3. Hacer clic en "Probar OPTIONS /users"
4. **Capturar**:
   - Mensaje de error completo de la consola
   - Headers de la petición OPTIONS (pestaña Network)
   - Status code de la respuesta

### Paso 4: Copiar logs del servidor

De la terminal donde está corriendo el servidor, copiar:
- Cualquier error que aparezca
- Logs de peticiones OPTIONS
- Stack traces si hay errores

## 📝 Qué Información Necesitamos

### 1. Error específico
- ¿Qué mensaje de error aparece?
- ¿Es diferente al error anterior?
- ¿En qué parte falla? (OPTIONS, POST, headers, etc.)

### 2. Status Code
- ¿Qué código HTTP devuelve OPTIONS?
- ¿Es 404, 500, 200 sin headers, u otro?

### 3. Headers CORS
- ¿Están presentes los headers CORS?
- ¿Cuáles faltan?
- ¿Hay headers inesperados?

### 4. Logs del servidor
- ¿Qué muestra la consola cuando se hace OPTIONS?
- ¿Hay errores en el servidor?
- ¿Se registra la petición OPTIONS?

## 🔍 Comandos Útiles

### Ver respuesta completa de OPTIONS
```bash
curl -X OPTIONS http://localhost:3000/users \
  -H "Origin: http://localhost:3001" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type" \
  -v 2>&1 | tee error-options-detailed.txt
```

### Ver solo headers
```bash
curl -X OPTIONS http://localhost:3000/users \
  -H "Origin: http://localhost:3001" \
  -H "Access-Control-Request-Method: POST" \
  -I
```

### Probar todos los endpoints
```bash
./test-options.sh http://localhost:3000 2>&1 | tee test-results.txt
```

## 📁 Dónde Guardar la Información

1. **Logs del servidor** → `errors-syntrojs/capturas/logs_servidor_[timestamp].txt`
2. **Respuesta de curl** → Ya se guarda automáticamente con `capturar-error.sh`
3. **Error del navegador** → `errors-syntrojs/capturas/error_navegador_[timestamp].txt`
4. **Screenshots** → `errors-syntrojs/capturas/screenshots/` (si es útil)

## 🎯 Información Crítica

Lo más importante es saber:

1. **¿OPTIONS devuelve 404 o otro código?**
2. **¿Qué mensaje de error específico aparece?**
3. **¿Los headers CORS están presentes o no?**
4. **¿Qué muestran los logs del servidor?**

Con esta información podremos identificar exactamente dónde está el problema.

