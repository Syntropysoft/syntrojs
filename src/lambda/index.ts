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

export * from './types';
export * from './adapters/ApiGatewayAdapter';
export * from './adapters/SQSAdapter';
export * from './adapters/S3Adapter';
export * from './adapters/EventBridgeAdapter';
export * from './adapters/LambdaAdapterFactory';
export * from './handlers/LambdaHandler';
export type { ILambdaAdapter } from '../domain/interfaces/ILambdaAdapter';

