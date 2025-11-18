# Errores de SyntroJS - Documentación

Esta carpeta contiene documentación sobre los errores encontrados al probar SyntroJS, especialmente relacionados con el manejo de OPTIONS (preflight CORS).

## 📁 Estructura

- `ERROR_0.6.8-alpha.0.md` - Errores encontrados con la versión 0.6.8-alpha.0
- `COMO_CAPTURAR_ERRORES.md` - Guía para capturar información de errores
- `README.md` - Este archivo

## 🎯 Objetivo

Documentar los problemas encontrados para:
1. Diagnosticar la causa raíz
2. Reportar bugs al equipo de SyntroJS si es necesario
3. Encontrar workarounds mientras se resuelve
4. Tener un historial de qué versiones se probaron y qué problemas tenían

## 📝 Cómo Contribuir

Cuando encuentres un nuevo error:

1. Crear un archivo `ERROR_[VERSION].md` con:
   - Versión de SyntroJS probada
   - Error específico encontrado
   - Pasos para reproducir
   - Logs y mensajes de error
   - Comportamiento esperado vs observado

2. Actualizar este README con referencia al nuevo error

3. Si encuentras una solución o workaround, documentarlo también

## 🔍 Versiones Probadas

- [ ] 0.6.4 - Problema conocido con OPTIONS
- [ ] 0.6.5 - Problema persiste
- [ ] 0.6.6 - Problema persiste
- [ ] 0.6.7 - Problema persiste
- [x] 0.6.8-alpha.0 - **En prueba** - Nuevos errores pero problema persiste

## ⚠️ Diagnóstico Importante

**El problema es GENERAL**, no específico de REST o Lambda mode:
- ❌ REST Mode falla con OPTIONS
- ❌ Lambda Mode falla con OPTIONS

Esto indica que el problema está en el **core de SyntroJS**, no en adapters específicos.

Ver: `PROBLEMA_GENERAL_CORS.md` y `ANALISIS_PROBLEMA_BASE.md`

## 📌 Estado Actual

**Última versión probada**: 0.6.8-alpha.0  
**Estado**: ❌ Error persiste pero con nuevos mensajes  
**Próximo paso**: Capturar errores específicos y documentarlos

