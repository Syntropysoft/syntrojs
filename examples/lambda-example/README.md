# SyntroJS Lambda Example

Este ejemplo muestra cómo usar SyntroJS en modo Lambda para AWS Lambda.

## Características

- ✅ Mismo código funciona en desarrollo (REST) y producción (Lambda)
- ✅ Validación automática con Zod
- ✅ Type safety completo
- ✅ Rutas dinámicas con parámetros
- ✅ Query parameters validados

## Uso

### Desarrollo Local (REST Mode)

```javascript
// Cambiar rest: false a rest: true
const app = new SyntroJS({ rest: true });
await app.listen(3000);
```

### Producción (Lambda Mode)

```javascript
// rest: false (default para Lambda)
const app = new SyntroJS({ rest: false });
export const handler = app.handler();
```

## Despliegue en AWS Lambda

### 1. Build

```bash
npm run build
```

### 2. Deploy con AWS SAM

```yaml
# template.yaml
Resources:
  OrderApiFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: index.handler
      Runtime: nodejs18.x
      Events:
        Api:
          Type: Api
          Properties:
            Path: /{proxy+}
            Method: ANY
```

### 3. Deploy

```bash
sam build
sam deploy
```

## Endpoints

- `GET /orders` - Listar órdenes (con paginación)
- `GET /orders/:id` - Obtener orden por ID
- `POST /orders` - Crear nueva orden

## Testing Local

Para probar localmente, puedes usar [SAM Local](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html):

```bash
sam local start-api
```

O cambiar a modo REST para desarrollo:

```javascript
const app = new SyntroJS({ rest: true });
await app.listen(3000);
```

