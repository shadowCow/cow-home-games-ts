import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: () => 'index.js',
    },
    outDir: 'dist',
    rollupOptions: {
      external: [
        'fastify',
        '@fastify/static',
        '@fastify/jwt',
        'path',
        'url',
      ],
    },
    ssr: true,
    target: 'node18',
  },
});
