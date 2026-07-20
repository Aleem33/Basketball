import { describe, expect, it } from 'vitest';
import { visibleNavigation } from '../lib/permissions';

describe('role-aware navigation', () => {
  it('renders only scorekeeping navigation for a scorekeeper', () => {
    const items = visibleNavigation(new Set(['game.score']), false);
    expect(items.map((item) => item.label)).toEqual(['Live scoring']);
  });

  it('allows audited platform operators to see all areas', () => {
    expect(visibleNavigation(new Set(), true)).toHaveLength(10);
  });
});
