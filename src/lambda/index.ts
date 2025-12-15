/**
 * Lambda Module - Public API
 *
 * Exports for Lambda adapters and handlers
 *
 * Structure prepared for easy extraction to separate package:
 * - Domain interfaces in domain/interfaces/ILambdaAdapter
 * - Adapters implement ILambdaAdapter interface
 * - Factory pattern for adapter management
 */

export type { ILambdaAdapter } from '../domain/interfaces/ILambdaAdapter';
export * from './adapters/ApiGatewayAdapter';
export type {
  EventBridgeAdapterConfig,
  EventBridgeEventHandler,
} from './adapters/EventBridgeAdapter';
export * from './adapters/EventBridgeAdapter';
export * from './adapters/LambdaAdapterFactory';
export type {
  S3AdapterConfig,
  S3ObjectHandler,
} from './adapters/S3Adapter';
export * from './adapters/S3Adapter';
// Re-export adapter configs for convenience
export type {
  SQSAdapterConfig,
  SQSMessageHandler,
} from './adapters/SQSAdapter';
export * from './adapters/SQSAdapter';
export type { LambdaAdaptersConfig } from './handlers/LambdaHandler';
export * from './handlers/LambdaHandler';
export * from './types';
