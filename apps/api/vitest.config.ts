import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'lcov'],
      include: [
        'src/competition/bracket.ts',
        'src/competition/round-robin.ts',
        'src/competition/standings.ts',
        'src/live-scoring/score-state.ts',
        'src/management/management.schemas.ts',
      ],
      thresholds: { lines: 80, functions: 80, statements: 80, branches: 70 },
    },
    restoreMocks: true,
  },
});
