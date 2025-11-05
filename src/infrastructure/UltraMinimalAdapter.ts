/**
 * ULTRA-MINIMAL FastifyAdapter
 *
 * Eliminates ALL overhead by:
 * 1. No buildContext() - inline minimal context
 * 2. No DependencyInjector - skip dependencies
 * 3. No SchemaValidator - direct Zod.parse()
 * 4. No ErrorHandler - minimal error handling
 */

import type { Readable } from 'node:stream';
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import { StreamingResponseHandler } from '../application/StreamingResponseHandler';
import type { Route } from '../domain/Route';
import type { HttpMethod } from '../domain/types';
import { createFileDownload, type FileDownloadOptions } from './FileDownloadHelper';

export interface UltraMinimalConfig {
  logger?: boolean;
  disableRequestLogging?: boolean;
}

class UltraMinimalAdapterImpl {
  create(config: UltraMinimalConfig = {}): FastifyInstance {
    return Fastify({
      logger: config.logger ?? false,
      disableRequestLogging: config.disableRequestLogging ?? true,
    });
  }

  registerRoute(fastify: FastifyInstance, route: Route): void {
    if (!fastify || !route) return;

    const method = route.method.toLowerCase() as Lowercase<HttpMethod>;

    // ULTRA-MINIMAL handler - no overhead
    fastify[method](route.path, async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // MINIMAL context - no object creation overhead
        const context = {
          method: request.method as HttpMethod,
          path: request.url,
          params: request.params,
          query: request.query,
          body: request.body,
          headers: request.headers as Record<string, string>,
          cookies: (request as { cookies?: Record<string, string> }).cookies || {},
          correlationId: Math.random().toString(36).substring(2, 15),
          timestamp: new Date(),
          dependencies: {} as Record<string, unknown>,
          background: {
            addTask: (task: () => void) => setImmediate(task),
          },
          // File download helper (functional)
          download: (data: Buffer | Readable | string, options: FileDownloadOptions) =>
            createFileDownload(data, options),
        };

        // DIRECT validation - no SchemaValidator overhead
        if (route.config.params) {
          context.params = route.config.params.parse(request.params);
        }
        if (route.config.query) {
          context.query = route.config.query.parse(request.query);
        }
        if (route.config.body) {
          context.body = route.config.body.parse(request.body);
        }

        // DIRECT handler execution
        const result = await route.handler(context);

        // STREAMING SUPPORT: Check if result is a Stream
        if (StreamingResponseHandler.isReadableStream(result)) {
          const statusCode = route.config.status ?? 200;
          return reply.status(statusCode).send(result as Readable);
        }

        // BUFFER SUPPORT: Check if result is a Buffer
        if (Buffer.isBuffer(result)) {
          const statusCode = route.config.status ?? 200;
          return reply.status(statusCode).send(result);
        }

        // MINIMAL response validation (skip para streams/buffers)
        if (route.config.response) {
          const validatedResult = route.config.response.parse(result);
          const statusCode = route.config.status ?? 200;
          return reply.status(statusCode).send(validatedResult);
        }

        const statusCode = route.config.status ?? 200;
        return reply.status(statusCode).send(result);
      } catch (error) {
        // MINIMAL error handling - no ErrorHandler overhead
        const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
        return reply.status(500).send({ error: errorMessage });
      }
    });
  }
}

export const UltraMinimalAdapter = new UltraMinimalAdapterImpl();
