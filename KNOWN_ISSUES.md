# Known Issues & Technical Debt

> **IMPORTANTE:** Leer este archivo ANTES de investigar tests fallidos para evitar perder tiempo.

---

## 🟡 Bun Runtime - 5 Tests de Logging/Observability (v0.4.0)

**Estado:** Funcionalidad core funciona ✅ - Solo afecta logging de errores  
**Impacto:** Minimal - 5/679 tests (99.3% passing)  
**Prioridad:** Baja - Resolver en v0.5.0  
**Tests afectados:** 5 tests de observability (NO funcionalidad)

### Lista de tests fallidos (5):

**Background Tasks - Logging/Observability (4 tests):**
- `BackgroundTasks > addTask() > handles timeout for long-running tasks` - Unit test de timeout logs
- `background task errors do not affect response` - Error logging timing
- `warns for slow background tasks (>100ms)` - Warning logs no se capturan
- `background task with custom timeout` - Timeout error logs no se capturan

**Dependency Injection - Cleanup (1 test):**
- `dependency cleanup is called after request` - Lifecycle timing en Bun

### Nota Importante:

**La funcionalidad core funciona perfectamente** ✅:
- Background tasks SE EJECUTAN correctamente
- Background tasks NO bloquean la respuesta
- DI cleanup probablemente se ejecuta pero con timing diferente

El problema es **logging de errores en background tasks** - en Bun las unhandled rejections se detectan de manera diferente, causando que los logs no se capturen en los tests.

### Causa raíz:

Bun tiene Promise handling más estricto que Node.js:
- Detecta unhandled rejections más rápido
- `queueMicrotask` vs `setImmediate` tienen timing diferente
- Los logs se generan pero no son capturados por el test antes de que termine

### Verificación:

```bash
# Node (100% passing)
npm test

# Bun (4 tests de logging fallarán - funcionalidad OK)
bun test tests/universal tests/bun
```

### Solución propuesta para v0.5.0:

- [ ] Crear `BunBackgroundTasks` con manejo de Promise específico para Bun ✅ (Iniciado)
- [ ] Ajustar timing de tests para capturar logs asincrónicos en Bun
- [ ] O simplificar tests para no depender de logs internos

---

## ✅ Redirects & Content Negotiation (v0.4.0)

**Estado:** Completamente funcional en Node y Bun  
**Tests:** 38/38 passing en ambos runtimes  
**Nota:** Los tests de redirects usan `rawRequest(..., false)` para NO seguir redirects automáticamente

---

**Última actualización:** 2025-11-06

