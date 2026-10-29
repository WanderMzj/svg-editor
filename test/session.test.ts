import { describe, expect, it } from 'vitest';
import { harness } from './helpers';

describe('spec section 6 — main session', () => {
  it('reproduces the documented transcript', () => {
    const h = harness();
    expect(h.run('init 800 600')).toEqual(['canvas 800x600 created']);
    expect(h.run('create rect bg 0 0 800 600 #ffffff')).toEqual(['rect#bg created']);
    expect(h.run('create text title 20 40 "My Diagram"')).toEqual(['text#title created']);
    expect(h.run('create circle c1 100 100 20 red')).toEqual(['circle#c1 created']);
    expect(h.run('create rect box 200 80 60 60 #3366ff')).toEqual(['rect#box created']);
    expect(h.run('group markers c1 box')).toEqual(['g#markers created with 2 children']);
    expect(h.run('tree')).toEqual([
      'svg (800x600)',
      '├── rect#bg     x=0 y=0 w=800 h=600 fill=#ffffff',
      '├── text#title  (20,40) "My Diagram"',
      '└── g#markers',
      '    ├── circle#c1  cx=100 cy=100 r=20 fill=red',
      '    └── rect#box   x=200 y=80 w=60 h=60 fill=#3366ff',
    ]);
    expect(h.run('move c1 30 0')).toEqual(['circle#c1 moved to (130,100)']);
    expect(h.run('undo')).toEqual(['circle#c1 moved back to (100,100)']);
    expect(h.run('redo')).toEqual(['circle#c1 moved to (130,100)']);
    expect(h.run('set title text "My Diagram v2"')).toEqual([
      'text#title updated: text="My Diagram v2"',
    ]);
    expect(h.run('undo')).toEqual(['text#title updated: text="My Diagram"']);
    expect(h.run('group bad c1 markers')).toEqual([
      'error: cannot group a container into its own descendant: markers',
    ]);
    expect(h.run('delete box')).toEqual(['rect#box deleted from g#markers']);
    expect(h.run('undo')).toEqual(['rect#box restored into g#markers']);
    expect(h.run('save demo.svg')).toEqual(['saved to demo.svg (5 elements)']);
    expect(h.run('undo')).toEqual(['error: undo not allowed after io command']);
  });

  it('reads a file with an unnamed element and assigns an id with a warning', () => {
    const h = harness();
    h.fs.files.set(
      'other.svg',
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">',
        '  <rect x="0" y="0" width="400" height="300" fill="#ffffff"/>',
        '  <text id="t1" x="10" y="290">imported</text>',
        '  <circle id="c1" cx="50" cy="50" r="10"/>',
        '  <g id="g1">',
        '    <rect id="r2" x="0" y="0" width="10" height="10"/>',
        '    <circle id="c2" cx="5" cy="5" r="2"/>',
        '  </g>',
        '  <ellipse id="e1" cx="1" cy="2" rx="3" ry="4"/>',
        '</svg>',
      ].join('\n'),
    );
    expect(h.run('read other.svg')).toEqual([
      'warning: assigned id rect1 to unnamed <rect>',
      'read other.svg (7 elements)',
    ]);
    expect(h.run('tree')).toEqual([
      'svg (400x300)',
      '├── rect#rect1  x=0 y=0 w=400 h=300 fill=#ffffff',
      '├── text#t1     (10,290) "imported"',
      '├── circle#c1   cx=50 cy=50 r=10',
      '├── g#g1',
      '│   ├── rect#r2    x=0 y=0 w=10 h=10',
      '│   └── circle#c2  cx=5 cy=5 r=2',
      '└── ellipse#e1  cx=1 cy=2 rx=3 ry=4',
    ]);
  });
});

describe('spec section 6.1 — flowchart built with `in`', () => {
  it('builds, moves and scales composites', () => {
    const h = harness();
    h.run('init 800 600');
    h.run('create g flowchart');
    h.run('create g node1 in flowchart');
    expect(h.run('create rect start 120 100 160 60 #4a90d9 in node1')).toEqual([
      'rect#start created in g#node1',
    ]);
    h.run('create text start-label 155 135 "开始" in node1');
    h.run('create g node2 in flowchart');
    h.run('create rect process 520 100 160 60 #f5a623 in node2');
    h.run('create text process-label 545 135 "处理数据" in node2');
    h.run('create line arrow1 280 130 520 130 black in flowchart');
    expect(h.run('move node2 0 100')).toEqual(['g#node2 moved by (0,100)']);
    expect(h.run('undo')).toEqual(['g#node2 moved back by (0,-100)']);
    expect(h.run('scale node1 0.5')).toEqual(['g#node1 scaled by 0.5']);
    expect(h.run('show start')).toEqual([
      'rect#start  parent=g#node1',
      '  x=60 y=50 w=80 h=30',
      '  fill=#4a90d9',
    ]);
    expect(h.run('undo')).toEqual(['g#node1 scaled back by 2']);
  });
});
