import { resolveBranchDisplay } from '../traversal';
import type { DungeonNode } from '../content';

// Minimal DungeonNode factory — mirrors the one in traversal.test.ts, only
// the fields resolveBranchDisplay reads.
function node(partial: Partial<DungeonNode>): DungeonNode {
  return {
    id: 'n',
    type: 'explore',
    template: 'x',
    content: {} as DungeonNode['content'],
    depth: 1,
    next: [],
    ...partial,
  } as DungeonNode;
}

describe('resolveBranchDisplay', () => {
  it('non-side, non-reveal node: not locked, no gate consumption, no special tag override', () => {
    const d = resolveBranchDisplay(node({ type: 'combat' }), [], false);
    expect(d.locked).toBe(false);
    expect(d.consumesGateItem).toBe(false);
    expect(d.tagOverride).toBeUndefined();
  });

  it('side + ungated: tagOverride is the [ASIDE] tag, not locked', () => {
    const d = resolveBranchDisplay(node({ side: true }), [], false);
    expect(d.locked).toBe(false);
    expect(d.consumesGateItem).toBe(false);
    expect(d.tagOverride).toBe('[ASIDE]');
  });

  it('side + gate open: tagOverride is [UNSEALED], consumesGateItem true when gate.consumes', () => {
    const n = node({ side: true, gate: { item: 'Rusted Key', consumes: true } });
    const d = resolveBranchDisplay(n, [{ name: 'Rusted Key' }], false);
    expect(d.locked).toBe(false);
    expect(d.tagOverride).toBe('[UNSEALED]');
    expect(d.consumesGateItem).toBe(true);
    expect(d.gateItem).toBe('Rusted Key');
  });

  it('side + gate open + consumes:false: consumesGateItem is false', () => {
    const n = node({ side: true, gate: { item: 'Rusted Key', consumes: false } });
    const d = resolveBranchDisplay(n, [{ name: 'Rusted Key' }], false);
    expect(d.consumesGateItem).toBe(false);
  });

  it('side + gate locked: locked true, tagOverride [SEALED], no gate item named in tag', () => {
    const n = node({ side: true, gate: { item: 'Rusted Key', consumes: true } });
    const d = resolveBranchDisplay(n, [], false);
    expect(d.locked).toBe(true);
    expect(d.tagOverride).toBe('[SEALED]');
    expect(d.consumesGateItem).toBe(false);
  });

  it('revealPaths shows the concrete trail.type tag instead of the vague tag', () => {
    const d = resolveBranchDisplay(node({ type: 'combat' }), [], true);
    expect(d.tagOverride).toBe('COMBAT');
    expect(d.locked).toBe(false);
  });

  it('revealPaths overrides the side [ASIDE] tag with the concrete type', () => {
    const d = resolveBranchDisplay(node({ side: true, type: 'cache' }), [], true);
    expect(d.tagOverride).toBe('CACHE');
  });

  it('revealPaths does not unlock a locked gate — [SEALED] still wins', () => {
    const n = node({ side: true, type: 'cache', gate: { item: 'Rusted Key', consumes: true } });
    const d = resolveBranchDisplay(n, [], true);
    expect(d.locked).toBe(true);
    expect(d.tagOverride).toBe('[SEALED]');
  });

  it('revealPaths + open gate: shows concrete type, not [UNSEALED], and still consumes', () => {
    const n = node({ side: true, type: 'cache', gate: { item: 'Rusted Key', consumes: true } });
    const d = resolveBranchDisplay(n, [{ name: 'Rusted Key' }], true);
    expect(d.tagOverride).toBe('CACHE');
    expect(d.consumesGateItem).toBe(true);
  });
});
