import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/plug-or-not/',
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts', 'test/**/*.test.ts'],
  },
});
