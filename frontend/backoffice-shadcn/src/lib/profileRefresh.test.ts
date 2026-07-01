import { describe, expect, it, vi } from 'vitest';
import { notifyProfileRefresh, subscribeProfileRefresh } from './profileRefresh';

describe('profileRefresh', () => {
  it('notifies subscribers when profile is updated', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeProfileRefresh(listener);

    notifyProfileRefresh();
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    notifyProfileRefresh();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
