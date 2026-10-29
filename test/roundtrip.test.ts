import { describe, expect, it } from 'vitest';
import { SvgReader } from '../src/infrastructure/svg/SvgReader';
import { SvgWriter } from '../src/infrastructure/svg/SvgWriter';
import { harness } from './helpers';

describe('svg round-trip', () => {
  it('writes a document that reads back to the same tree', () => {
    const h = harness();
    h.run('init 800 600');
    h.run('create g flowchart');
    h.run('create g node1 in flowchart');
    h.run('create rect start 120 100 160 60 #4a90d9 in node1');
    h.run('create text start-label 155 135 "开始" in node1');
    h.run('create line arrow1 280 130 520 130 black in flowchart');
    const before = h.run('tree');
    h.run('save out.svg');
    const saved = h.fs.files.get('out.svg');
    expect(saved).toBeDefined();

    const { document, warnings } = new SvgReader().read(saved as string, 'out.svg');
    expect(warnings).toEqual([]);
    h.run('read out.svg');
    expect(h.run('tree')).toEqual(before);
    expect(document.width).toBe(800);
  });

  it('escapes text content and attribute values', () => {
    const h = harness();
    h.run('init', 'create text t1 10 10 "a & b < c"');
    h.run('save out.svg');
    const saved = h.fs.files.get('out.svg') as string;
    expect(saved).toContain('a &amp; b &lt; c');
    h.run('read out.svg');
    expect(h.run('show t1')[1]).toBe('  (10,10) "a & b < c"');
  });

  it('round-trips through writer directly', () => {
    const { document } = new SvgReader().read(
      '<svg width="10" height="20"><circle id="c1" cx="1" cy="2" r="3" fill="red"/></svg>',
      'x.svg',
    );
    const text = new SvgWriter().write(document);
    expect(text).toContain('<circle id="c1" cx="1" cy="2" r="3" fill="red"/>');
    expect(text).toContain('viewBox="0 0 10 20"');
  });
});

describe('tokenizer', () => {
  it('treats a leading # as a comment but keeps colours', () => {
    const h = harness();
    h.run('# init 100 100');
    expect(h.run('canvas')).toEqual(["error: no document. use 'init' or 'read' first"]);
    h.run('init', 'create rect r1 0 0 1 1 #abcdef');
    expect(h.run('show r1')[2]).toBe('  fill=#abcdef');
  });

  it('runs several ; separated commands on one line', () => {
    const h = harness();
    expect(h.run('init; create rect r1 0 0 1 1; move r1 1 1')).toEqual([
      'canvas 800x600 created',
      'rect#r1 created',
      'rect#r1 moved to (1,1)',
    ]);
  });
});
