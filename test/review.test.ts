import { describe, expect, it } from 'vitest';
import { harness } from './helpers';

describe('review fixes', () => {
  it('warns when a read element carries a transform, and keeps coordinates as written', () => {
    const h = harness();
    h.fs.files.set(
      't.svg',
      [
        '<svg width="100" height="100">',
        '  <g id="g1" transform="translate(10,10)">',
        '    <rect id="r1" x="1" y="2" width="3" height="4"/>',
        '  </g>',
        '</svg>',
      ].join('\n'),
    );
    expect(h.run('read t.svg')).toEqual([
      'warning: ignored transform on <g> g1: coordinates are used as written',
      'read t.svg (2 elements)',
    ]);
    expect(h.run('show r1')).toEqual(['rect#r1  parent=g#g1', '  x=1 y=2 w=3 h=4']);
  });

  it('reads every kernel type through the same table that create uses', () => {
    const h = harness();
    h.run(
      'init',
      'create rect a 1 2 3 4 red',
      'create circle b 1 2 3',
      'create ellipse c 1 2 3 4',
      'create line d 1 2 3 4 black',
      'create text e 1 2 "hi"',
      'create g f',
    );
    const before = h.run('tree');
    h.run('save out.svg', 'read out.svg');
    expect(h.run('tree')).toEqual(before);
  });

  it('ignores unsupported elements with a warning instead of dropping them silently', () => {
    const h = harness();
    h.fs.files.set('p.svg', '<svg width="10" height="10"><path id="p1" d="M0 0"/></svg>');
    expect(h.run('read p.svg')).toEqual([
      'warning: ignored unsupported element <path>',
      'read p.svg (0 elements)',
    ]);
  });

  it('does not treat inherited object property names as shape types', () => {
    const h = harness();
    h.run('init');
    expect(h.run('create constructor x 1 2')).toEqual([
      'error: unknown shape type: constructor (is the plugin loaded?)',
    ]);
    expect(h.run('create toString y')).toEqual([
      'error: unknown shape type: toString (is the plugin loaded?)',
    ]);
  });

  it('reports a missing document through the shared error path', () => {
    const h = harness();
    expect(h.run('undo')).toEqual(["error: no document. use 'init' or 'read' first"]);
    expect(h.run('save a.svg')).toEqual(["error: no document. use 'init' or 'read' first"]);
  });
});
