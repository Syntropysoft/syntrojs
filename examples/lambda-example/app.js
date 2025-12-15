/**
 * SyntroJS Lambda Example
 *
 * Example showing how to use SyntroJS in Lambda mode
 * Same code works in REST mode (development) and Lambda mode (production)
 */

import { SyntroJS } from '../../src/core/index.js';
import { z } from 'zod';

// Lambda mode: rest: false
const app = new SyntroJS({
  rest: false, // Lambda mode
  title: 'Order API',
  version: '1.0.0',
});

// Define schemas
const OrderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
  price: z.number().positive(),
});

const CreateOrderSchema = z.object({
  customerId: z.string().uuid(),
  items: z.array(OrderItemSchema).min(1),
  source: z.enum(['web', 'mobile', 'api']).optional(),
});

// GET /orders
app.get('/orders', {
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
  handler: async ({ query }) => {
    return {
      page: query.page || '1',
      limit: query.limit || '10',
      orders: [
        { id: '1', customerId: '123', total: 100 },
        { id: '2', customerId: '456', total: 200 },
      ],
    };
  },
});

// GET /orders/:id
app.get('/orders/:id', {
  params: z.object({
    id: z.string().uuid(),
  }),
  handler: async ({ params }) => {
    return {
      id: params.id,
      customerId: '123',
      items: [{ productId: 'prod-1', quantity: 2, price: 50 }],
      total: 100,
      status: 'pending',
    };
  },
});

// POST /orders
app.post('/orders', {
  body: CreateOrderSchema,
  handler: async ({ body }) => {
    // Simulate order creation
    const orderId = `order-${Date.now()}`;
    const total = body.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    return {
      id: orderId,
      customerId: body.customerId,
      items: body.items,
      total,
      source: body.source || 'api',
      status: 'created',
      createdAt: new Date().toISOString(),
    };
  },
});

// Export handler for AWS Lambda
export const handler = app.handler();

// For local testing (optional)
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Lambda handler exported. Use in AWS Lambda:');
  console.log('  Handler: index.handler');
  console.log('  Runtime: nodejs18.x');
}
