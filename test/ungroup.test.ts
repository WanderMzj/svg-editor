import { describe, expect, it } from 'vitest';
import { harness } from './helpers';

describe('ungroup keeps the id index in sync', () => {
  it('frees the id of a dissolved container', () => {
    const h = harness();
    h.run('init', 'create g outer', 'create g inner in outer', 'create rect r1 0 0 1 1 in inner');
    h.run('ungroup inner');
    expect(h.run('show inner')).toEqual(['error: no such shape: inner']);
    expect(h.run('create g inner')).toEqual(['g#inner created']);
  });

  it('registers the id again when the ungroup is undone', () => {
    const h = harness();
    h.run('init', 'create g outer', 'create g inner in outer', 'create rect r1 0 0 1 1 in inner');
    h.run('ungroup inner');
    expect(h.run('undo')).toEqual(['g#inner restored with 1 child']);
    expect(h.run('show inner')).toEqual(['g#inner  parent=g#outer', '  1 child']);
    expect(h.run('create g inner')).toEqual(['error: id already exists: inner']);
  });

  it('keeps the saved element count equal to the visible tree', () => {
    const h = harness();
    h.run('init', 'create g outer', 'create g inner in outer', 'create rect r1 0 0 1 1 in inner');
    h.run('ungroup inner');
    expect(h.run('save a.svg')).toEqual(['saved to a.svg (2 elements)']);
  });
});
