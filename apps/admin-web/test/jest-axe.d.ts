declare module 'jest-axe' {
  export type AxeResults = { violations: readonly unknown[] };

  export function axe(html: Element | string): Promise<AxeResults>;

  export const toHaveNoViolations: {
    toHaveNoViolations(received: AxeResults): { pass: boolean; message(): string };
  };
}
