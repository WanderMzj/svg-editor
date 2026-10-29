# svg-editor

Lab1 Phase 1：SVG 命令行编辑器（TypeScript + Command 模式 + Composite 模式）。

- 仓库地址：<https://github.com/WanderMzj/svg-editor.git>
- 架构方案 / 过程记录 / 一致性自查 / 质量保证：**[doc/README.md](doc/README.md)**

## 运行

```bash
npm install
npm run cli
```

```text
svg> init 800 600
canvas 800x600 created
svg> create rect bg 0 0 800 600 #ffffff
rect#bg created
svg> save demo.svg
saved to demo.svg (1 elements)
```

回放脚本与测试：

```bash
npm run build
node dist/cli/main.js --script examples/flowchart.svgsh
npm test
```
