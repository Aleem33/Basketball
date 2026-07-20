import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    exclude: ['e2e/**', 'node_modules/**'],
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: [
        'app/login/page.tsx',
        'lib/config.ts',
        'lib/permissions.ts',
        'lib/tournament-form.ts',
      ],
      thresholds: { lines: 80, functions: 70, statements: 80, branches: 25 },
    },
  },
});
