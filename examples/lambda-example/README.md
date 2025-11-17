# SyntroJS Lambda Example

This example shows how to use SyntroJS in Lambda mode for AWS Lambda.

## Features

- ✅ Same code works in development (REST) and production (Lambda)
- ✅ Automatic validation with Zod
- ✅ Full type safety
- ✅ Dynamic routes with parameters
- ✅ Validated query parameters

## Usage

### Local Development (REST Mode)

```javascript
// Change rest: false to rest: true
const app = new SyntroJS({ rest: true });
await app.listen(3000);
```

### Production (Lambda Mode)

```javascript
// rest: false (default for Lambda)
const app = new SyntroJS({ rest: false });
export const handler = app.handler();
```

## AWS Lambda Deployment

### 1. Build

```bash
npm run build
```

### 2. Deploy with AWS SAM

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

- `GET /orders` - List orders (with pagination)
- `GET /orders/:id` - Get order by ID
- `POST /orders` - Create new order

## Local Testing

To test locally, you can use [SAM Local](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html):

```bash
sam local start-api
```

Or switch to REST mode for development:

```javascript
const app = new SyntroJS({ rest: true });
await app.listen(3000);
```
