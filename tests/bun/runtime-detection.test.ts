import { describe, expect, test } from 'bun:test';
import { SyntroJS } from '../../src/core/SyntroJS';

describe('Bun Runtime Detection', () => {
  test('should detect Bun runtime correctly', () => {
    const app = new SyntroJS({ title: 'Bun Test' });

    // Access private runtime property for testing
    const runtime = (app as any).runtime;
    expect(runtime).toBe('bun');
  });

  test('should show Bun-specific output', async () => {
    const app = new SyntroJS({ title: 'Bun Test' });
    app.get('/test', { handler: () => ({ message: 'Bun test' }) });

    // Capture console output
    const originalLog = console.log;
    let output = '';
    console.log = (...args: any[]) => {
      output += `${args.join(' ')}\n`;
    };

    try {
      await app.listen(0); // Random port
      expect(output).toContain('🚀 SyntroJS-BUN');
      expect(output).toContain('Bun (JavaScriptCore)');
      expect(output).toContain('⚡ Ultra-fast Performance: 6x faster than Fastify');
    } finally {
      console.log = originalLog;
      await app.close();
    }
  });

  test('should handle Bun-specific optimizations', () => {
    const app = new SyntroJS({
      title: 'Bun Test',
      runtime: 'bun', // Force Bun runtime
    });

    const runtime = (app as any).runtime;
    expect(runtime).toBe('bun');
  });
});
