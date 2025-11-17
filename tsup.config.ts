import { defineConfig } from 'tsup';
import {
  dependencies,
  devDependencies,
  optionalDependencies,
  peerDependencies,
} from './package.json';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'testing/index': 'src/testing/index.ts',
    'lambda/index': 'src/lambda/index.ts',
  },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  minify: false,
  target: 'es2022',
  outDir: 'dist',
  external: [
    ...Object.keys(dependencies),
    ...Object.keys(devDependencies),
    ...Object.keys(peerDependencies),
    ...Object.keys(optionalDependencies || {}),
    // Add optionalDependencies to prevent bundling
    'swagger-ui-dist',
    'redoc',
  ],
});
