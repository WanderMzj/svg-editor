import { describe, expect, it } from 'vitest';
import { harness } from './helpers';

describe('error contract (section 4.2)', () => {
  it('reports every documented error', () => {
    const h = harness();
    expect(h.run('tree')).toEqual(["error: no document. use 'init' or 'read' first"]);
    h.run('init');
    expect(h.run('create hexagon h1 1 2')).toEqual([
      'error: unknown shape type: hexagon (is the plugin loaded?)',
    ]);
    h.run('create rect r1 0 0 10 10');
    expect(h.run('create rect r1 0 0 10 10')).toEqual(['error: id already exists: r1']);
    expect(h.run('move r9 1 1')).toEqual(['error: no such shape: r9']);
    expect(h.run('create rect r2 0 0 1 1 in node9')).toEqual(['error: no such container: node9']);
    expect(h.run('create rect r2 0 0 1 1 in r1')).toEqual(['error: not a container: r1']);
    expect(h.run('scale r1 0')).toEqual(['error: scale factor must be positive']);
    expect(h.run('set r1 colour red')).toEqual(['error: unknown attribute: colour']);
    h.run('create g g1');
    expect(h.run('ungroup g1')).toEqual(['error: cannot ungroup top-level container: g1']);
    expect(h.run('read nope.svg')).toEqual(['error: cannot read file: nope.svg']);
  });

  it('keeps the state untouched when a command fails', () => {
    const h = harness();
    h.run('init', 'create rect r1 0 0 10 10');
    h.run('scale r1 -1');
    h.run('set r1 x abc');
    expect(h.run('show r1')).toEqual(['rect#r1  parent=svg', '  x=0 y=0 w=10 h=10']);
  });
});

describe('undo / redo (section 4.3)', () => {
  it('treats a group command as one undo unit', () => {
    const h = harness();
    h.run('init', 'create rect r1 0 0 10 10', 'create circle c1 1 1 2', 'group g1 r1 c1');
    expect(h.run('undo')).toEqual(['g#g1 dissolved, 2 children restored']);
    expect(h.run('tree')).toEqual([
      'svg (800x600)',
      '├── rect#r1    x=0 y=0 w=10 h=10',
      '└── circle#c1  cx=1 cy=1 r=2',
    ]);
    expect(h.run('redo')).toEqual(['g#g1 created with 2 children']);
  });

  it('clears the redo stack after a new edit', () => {
    const h = harness();
    h.run('init', 'create rect r1 0 0 10 10', 'move r1 5 0', 'undo');
    h.run('move r1 0 5');
    expect(h.run('redo')).toEqual(['nothing to redo']);
  });

  it('refuses undo after an io command until the next edit', () => {
    const h = harness();
    h.run('init', 'create rect r1 0 0 10 10', 'move r1 5 0');
    h.run('save a.svg');
    expect(h.run('undo')).toEqual(['error: undo not allowed after io command']);
    h.run('move r1 1 1');
    expect(h.run('undo')).toEqual(['rect#r1 moved back to (5,0)']);
  });

  it('does not record display commands', () => {
    const h = harness();
    h.run('init', 'create rect r1 0 0 10 10', 'move r1 5 0', 'tree', 'show r1', 'help');
    expect(h.run('undo')).toEqual(['rect#r1 moved back to (0,0)']);
  });
});

describe('structure commands', () => {
  it('moves a shape with addto and restores it with undo', () => {
    const h = harness();
    h.run('init', 'create rect r1 0 0 10 10', 'create g g1');
    expect(h.run('addto g1 r1')).toEqual(['rect#r1 added to g#g1']);
    expect(h.run('tree')).toEqual([
      'svg (800x600)',
      '└── g#g1',
      '    └── rect#r1  x=0 y=0 w=10 h=10',
    ]);
    expect(h.run('undo')).toEqual(['rect#r1 moved back out of g#g1']);
    expect(h.run('tree')).toEqual(['svg (800x600)', '├── rect#r1  x=0 y=0 w=10 h=10', '└── g#g1']);
  });

  it('reorders siblings with front / back', () => {
    const h = harness();
    h.run('init', 'create rect a 0 0 1 1', 'create rect b 0 0 1 1', 'create rect c 0 0 1 1');
    h.run('front a');
    expect(h.run('tree')[1]).toBe('├── rect#b  x=0 y=0 w=1 h=1');
    h.run('back a');
    expect(h.run('tree')[1]).toBe('├── rect#a  x=0 y=0 w=1 h=1');
  });

  it('ungroups a nested container into its parent', () => {
    const h = harness();
    h.run('init', 'create g outer', 'create g inner in outer', 'create rect r1 0 0 1 1 in inner');
    expect(h.run('ungroup inner')).toEqual(['g#inner ungrouped: 1 child promoted']);
    expect(h.run('tree')).toEqual([
      'svg (800x600)',
      '└── g#outer',
      '    └── rect#r1  x=0 y=0 w=1 h=1',
    ]);
  });

  it('refuses to group a container together with its descendant', () => {
    const h = harness();
    h.run('init', 'create g outer', 'create rect r1 0 0 1 1 in outer');
    expect(h.run('group g2 outer r1')).toEqual([
      'error: cannot group a container into its own descendant: outer',
    ]);
  });
});

describe('canvas and save', () => {
  it('reports and changes the canvas size', () => {
    const h = harness();
    h.run('init 300 200');
    expect(h.run('canvas')).toEqual(['canvas 300x200']);
    expect(h.run('canvas 640 480')).toEqual(['canvas 640x480 resized']);
    expect(h.run('undo')).toEqual(['error: undo not allowed after io command']);
  });

  it('saves to the read path when no argument is given', () => {
    const h = harness();
    h.fs.files.set(
      'a.svg',
      '<svg width="10" height="10"><rect id="r1" x="0" y="0" width="1" height="1"/></svg>',
    );
    h.run('read a.svg', 'move r1 2 2');
    expect(h.run('save')).toEqual(['saved to a.svg (1 elements)']);
    expect(h.fs.files.get('a.svg')).toContain('<rect id="r1" x="2" y="2" width="1" height="1"/>');
  });
});
