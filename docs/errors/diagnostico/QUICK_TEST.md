# Quick Test - Capturar Error Rápido

## 🚀 Pasos Rápidos (5 minutos)

### 1. Iniciar servidor
```bash
cd syntrojs-example-service
npm start
```

### 2. En otra terminal, ejecutar captura
```bash
cd errors-syntrojs
./capturar-error.sh http://localhost:3000
```

### 3. Probar desde navegador
1. Abrir `test-options.html`
2. Click en "Probar OPTIONS /users"
3. **Copiar** el error completo de la consola

### 4. Documentar
Crear archivo `ERROR_DETALLADO_[timestamp].md` con:
- Status code de OPTIONS
- Mensaje de error completo
- Headers de respuesta
- Logs del servidor

## 📋 Checklist Mínimo

- [ ] Status code de OPTIONS: _____
- [ ] ¿Headers CORS presentes? [ ] Sí [ ] No
- [ ] Mensaje de error: _______________
- [ ] ¿Es diferente al error anterior? [ ] Sí [ ] No

## 🎯 Lo Más Importante

**Copiar el mensaje de error exacto** que aparece en:
1. Consola del navegador
2. Logs del servidor
3. Respuesta de curl

Con eso podemos identificar exactamente qué está fallando.

