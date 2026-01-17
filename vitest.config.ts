import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    // Use happy-dom for faster DOM simulation
    environment: 'happy-dom',

    // Setup file for global test configuration
    setupFiles: ['./vitest.setup.ts'],

    // Include test files
    include: ['src/**/*.{test,spec}.{ts,tsx}', '__tests__/**/*.{test,spec}.{ts,tsx}'],

    // Exclude patterns
    exclude: ['node_modules', '.next', 'e2e', 'playwright'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        '.next/',
        'src/components/ui/**', // shadcn/ui auto-generated
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        'src/api/mocks/**', // Mock handlers
        'src/api/client/endpoints.ts', // Static endpoint definitions
        'test/**', // Test utilities
        'e2e/**',
        'playwright/**',
      ],
      // Initial thresholds (can be increased over time)
      thresholds: {
        branches: 60,
        functions: 60,
        lines: 70,
        statements: 70,
      },
    },

    // Global test settings
    globals: true,

    // Test timeout
    testTimeout: 10000,

    // Retry failed tests once in CI
    retry: process.env.CI ? 1 : 0,

    // Reporter configuration
    reporters: process.env.CI ? ['verbose', 'junit'] : ['verbose'],

    // Output options
    outputFile: {
      junit: './test-results/junit.xml',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@test': path.resolve(__dirname, './test'),
    },
  },
});
