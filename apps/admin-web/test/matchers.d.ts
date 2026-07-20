import '@testing-library/jest-dom/vitest';
import 'vitest';

declare module 'vitest' {
  interface Assertion<T = unknown> {
    toHaveNoViolations(): T;
  }

  interface AsymmetricMatchersContaining {
    toHaveNoViolations(): unknown;
  }
}
