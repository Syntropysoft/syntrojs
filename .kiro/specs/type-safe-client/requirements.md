# Documento de Requirements

## Introducción

La funcionalidad de Type-Safe Client proporciona inferencia automática de tipos y autocompletado para las rutas de API de SyntroJS en aplicaciones cliente. Esta característica elimina la duplicación manual de tipos entre backend y frontend, reduce errores en tiempo de ejecución mediante verificación de tipos en tiempo de compilación, y mejora dramáticamente la experiencia del desarrollador a través del autocompletado del IDE. El cliente soportará tanto modo local (para testing sin servidor corriendo) como modo remoto (para llamadas API en producción), usando inferencia pura de tipos de TypeScript sin generación de código.

## Glosario

- **Type-Safe Client**: Una librería cliente que infiere automáticamente tipos de TypeScript desde las definiciones de rutas del backend
- **SyntroJS Application**: El servidor API backend construido con el framework SyntroJS
- **Route Definition**: Un endpoint backend registrado con métodos como `app.get()`, `app.post()`, etc.
- **Type Inference**: La derivación automática de tipos de TypeScript desde la estructura de la aplicación
- **Local Mode**: Ejecución del cliente que llama handlers directamente sin peticiones HTTP (para testing)
- **Remote Mode**: Ejecución del cliente que hace peticiones HTTP reales a un servidor corriendo
- **Request Context**: Los parámetros validados y tipados, body, query, y headers para una ruta
- **Response Type**: El tipo de retorno inferido desde un handler de ruta
- **Client Instance**: Un objeto creado por `createClient<App>()` que proporciona acceso tipado al API

## Requirements

### Requirement 1

**User Story:** Como desarrollador frontend, quiero llamar APIs del backend con total seguridad de tipos y autocompletado, para evitar definiciones manuales de tipos y detectar errores en tiempo de compilación.

#### Acceptance Criteria

1. WHEN un desarrollador importa el tipo de la app backend y crea un cliente, THEN el Type-Safe Client SHALL proporcionar autocompletado para todas las rutas registradas
2. WHEN un desarrollador llama un método de ruta, THEN el Type-Safe Client SHALL forzar tipos de parámetros correctos basados en los schemas Zod del backend
3. WHEN un handler de ruta retorna un valor, THEN el Type-Safe Client SHALL inferir el tipo de respuesta correcto sin anotaciones manuales de tipos
4. WHEN la definición de ruta del backend cambia, THEN el Type-Safe Client SHALL causar errores de compilación en el código frontend que usa tipos desactualizados
5. WHERE una ruta tiene parámetros de path, THEN el Type-Safe Client SHALL requerir esos parámetros en el formato correcto

### Requirement 2

**User Story:** Como ingeniero de testing, quiero probar rutas de API sin iniciar un servidor, para poder escribir tests unitarios rápidos con total seguridad de tipos.

#### Acceptance Criteria

1. WHEN un desarrollador crea un cliente en modo local, THEN el Type-Safe Client SHALL ejecutar handlers de ruta directamente sin peticiones HTTP
2. WHEN se ejecuta en modo local, THEN el Type-Safe Client SHALL aplicar la misma validación que el servidor en runtime
3. WHEN un handler lanza una HTTPException en modo local, THEN el Type-Safe Client SHALL retornar el error en formato estructurado
4. WHEN se encolan background tasks en modo local, THEN el Type-Safe Client SHALL ejecutarlas síncronamente para testing
5. WHERE se usa dependency injection, THEN el Type-Safe Client SHALL resolver dependencias en modo local

### Requirement 3

**User Story:** Como desarrollador full-stack, quiero usar el mismo código de cliente para testing y producción, para evitar mantener implementaciones separadas.

#### Acceptance Criteria

1. WHEN un desarrollador crea un cliente con una base URL, THEN el Type-Safe Client SHALL hacer peticiones HTTP al servidor remoto
2. WHEN se ejecuta en modo remoto, THEN el Type-Safe Client SHALL serializar request bodies a JSON
3. WHEN el servidor retorna una respuesta de error, THEN el Type-Safe Client SHALL parsear y lanzar un error tipado
4. WHEN se hacen peticiones remotas, THEN el Type-Safe Client SHALL incluir headers Content-Type apropiados
5. WHERE se proporcionan headers personalizados, THEN el Type-Safe Client SHALL fusionarlos con headers por defecto

### Requirement 4

**User Story:** Como desarrollador backend, quiero que el cliente soporte todos los métodos HTTP y patrones de rutas, para que toda la superficie del API sea accesible con seguridad de tipos.

#### Acceptance Criteria

1. WHEN una ruta se registra con GET, POST, PUT, PATCH, o DELETE, THEN el Type-Safe Client SHALL proporcionar un método tipado correspondiente
2. WHEN una ruta tiene parámetros de path como `/users/:id`, THEN el Type-Safe Client SHALL requerir esos parámetros en la llamada del método
3. WHEN una ruta tiene query parameters, THEN el Type-Safe Client SHALL aceptarlos como un objeto tipado
4. WHEN una ruta tiene un request body, THEN el Type-Safe Client SHALL requerirlo con el tipo correcto
5. WHERE una ruta tiene múltiples parámetros, THEN el Type-Safe Client SHALL combinarlos en un único objeto de opciones tipado

### Requirement 5

**User Story:** Como desarrollador TypeScript, quiero cero generación de código e inferencia pura de tipos, para evitar pasos de build y mantener un workflow simple.

#### Acceptance Criteria

1. WHEN se usa el Type-Safe Client, THEN el sistema SHALL NOT requerir ningún paso de generación de código
2. WHEN se importa el tipo del backend, THEN el Type-Safe Client SHALL inferir todos los tipos en tiempo de compilación
3. WHEN el sistema de tipos de TypeScript evalúa el cliente, THEN el sistema SHALL proporcionar autocompletado preciso en IDEs
4. WHEN la estructura de la aplicación cambia, THEN el Type-Safe Client SHALL reflejar cambios inmediatamente sin reconstruir
5. WHERE existen patrones de rutas complejos, THEN el Type-Safe Client SHALL manejarlos a través del sistema de tipos de TypeScript

### Requirement 6

**User Story:** Como mantenedor de monorepo, quiero compartir tipos entre paquetes sin dependencias circulares, para mantener una arquitectura limpia.

#### Acceptance Criteria

1. WHEN el backend exporta su tipo de app, THEN el Type-Safe Client SHALL consumir solo la información de tipos
2. WHEN se importa el tipo del backend, THEN el sistema SHALL NOT ejecutar ningún código de runtime del backend
3. WHEN el cliente se usa en un paquete separado, THEN el Type-Safe Client SHALL funcionar sin importar dependencias del backend
4. WHEN TypeScript compila el frontend, THEN el sistema SHALL NOT incluir código de implementación del backend
5. WHERE el backend y frontend están en repositorios separados, THEN el Type-Safe Client SHALL funcionar con definiciones de tipos publicadas

### Requirement 7

**User Story:** Como consumidor de API, quiero mensajes de error claros cuando las peticiones fallan, para poder debuggear problemas rápidamente.

#### Acceptance Criteria

1. WHEN una petición remota falla con error de red, THEN el Type-Safe Client SHALL lanzar un error con el mensaje original
2. WHEN el servidor retorna una HTTPException, THEN el Type-Safe Client SHALL preservar el código de estado y mensaje
3. WHEN la validación falla en modo local, THEN el Type-Safe Client SHALL lanzar un error con detalles de validación
4. WHEN no se encuentra una ruta, THEN el Type-Safe Client SHALL proporcionar un mensaje de error claro
5. WHERE ocurren múltiples errores, THEN el Type-Safe Client SHALL reportar el primer error encontrado

### Requirement 8

**User Story:** Como desarrollador usando dependency injection, quiero que el cliente funcione con dependencias inyectadas, para poder testear rutas que usan servicios.

#### Acceptance Criteria

1. WHEN una ruta usa dependency injection en modo local, THEN el Type-Safe Client SHALL resolver dependencias singleton una vez
2. WHEN una ruta usa dependencias con scope de request en modo local, THEN el Type-Safe Client SHALL crear nuevas instancias por petición
3. WHEN las dependencias tienen funciones de cleanup, THEN el Type-Safe Client SHALL ejecutar cleanup después de la petición en modo local
4. WHEN una factory de dependencia lanza un error, THEN el Type-Safe Client SHALL propagar el error con contexto
5. WHERE existen dependencias anidadas, THEN el Type-Safe Client SHALL resolverlas recursivamente

### Requirement 9

**User Story:** Como desarrollador trabajando con uploads y downloads de archivos, quiero que el cliente maneje tipos de respuesta especiales, para poder trabajar con todas las características del API.

#### Acceptance Criteria

1. WHEN una ruta retorna un FileDownloadResponse, THEN el Type-Safe Client SHALL manejarlo apropiadamente en ambos modos
2. WHEN una ruta retorna un RedirectResponse en modo local, THEN el Type-Safe Client SHALL retornar la información de redirección
3. WHEN una ruta retorna un stream en modo remoto, THEN el Type-Safe Client SHALL proporcionar acceso al stream de respuesta
4. WHEN se suben archivos en modo remoto, THEN el Type-Safe Client SHALL soportar FormData o encoding multipart
5. WHERE se usan tipos de respuesta personalizados, THEN el Type-Safe Client SHALL preservar su estructura

### Requirement 10

**User Story:** Como mantenedor del framework, quiero documentación y ejemplos comprehensivos, para que los usuarios puedan adoptar la característica fácilmente.

#### Acceptance Criteria

1. WHEN un desarrollador lee la documentación, THEN el sistema SHALL proporcionar ejemplos para ambos modos local y remoto
2. WHEN un desarrollador encuentra un error, THEN la documentación SHALL incluir guía de troubleshooting
3. WHEN se migra desde tipos manuales, THEN la documentación SHALL proporcionar una guía de migración
4. WHEN se usan características avanzadas, THEN la documentación SHALL explicar limitaciones de inferencia de tipos
5. WHERE se necesita setup de monorepo, THEN la documentación SHALL proporcionar ejemplos de configuración
