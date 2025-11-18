/**
 * Lambda CORS Test Application
 * 
 * End-to-end test application to verify CORS origin extraction fix
 * This app tests the fix for case-insensitive Origin header extraction
 */

import { SyntroJS } from '../../dist/index.js';
import { z } from 'zod';

// Create SyntroJS instance in Lambda mode with CORS enabled
const app = new SyntroJS({
  rest: false,
  title: 'Lambda CORS Test API',
  lambdaCors: {
    origin: true, // This should reflect the actual request origin
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id'],
  },
});

// Test schema
const CreateOrderSchema = z.object({
  item: z.string().min(1),
  quantity: z.number().int().positive(),
});

// POST endpoint to test CORS headers in response
app.post('/orders', {
  body: CreateOrderSchema,
  handler: async ({ body }) => {
    return {
      success: true,
      message: 'Order created',
      order: {
        id: Math.random().toString(36).substr(2, 9),
        ...body,
        createdAt: new Date().toISOString(),
      },
    };
  },
});

// GET endpoint to test CORS headers
app.get('/orders', {
  handler: async () => {
    return {
      orders: [
        { id: '1', item: 'Test Item', quantity: 1 },
        { id: '2', item: 'Another Item', quantity: 2 },
      ],
    };
  },
});

// GET endpoint with path params
app.get('/orders/:id', {
  handler: async ({ params }) => {
    return {
      order: {
        id: params.id,
        item: 'Test Item',
        quantity: 1,
      },
    };
  },
});

// Export Lambda handler
export const handler = app.handler();

// For local testing (if needed)
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Lambda handler exported. Use AWS Lambda or SAM Local to test.');
  console.log('Example event:');
  console.log(JSON.stringify({
    httpMethod: 'POST',
    path: '/orders',
    headers: {
      Origin: 'http://localhost:3000',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ item: 'test', quantity: 1 }),
    requestContext: {
      requestId: 'test-request-id',
      stage: 'test',
      resourceId: 'test-resource',
      resourcePath: '/orders',
      httpMethod: 'POST',
      requestTime: new Date().toISOString(),
      requestTimeEpoch: Date.now(),
      identity: {
        sourceIp: '127.0.0.1',
        userAgent: 'test-agent',
      },
    },
  }, null, 2));
}

