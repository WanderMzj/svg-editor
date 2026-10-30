# Lab1 Phase 1 — SVG 编辑器（CLI）

> 仓库地址：<https://github.com/WanderMzj/svg-editor.git>
> 提交记录：`main` 分支；最终提交打了 tag `final`。

一个用 TypeScript 写的 SVG 命令行编辑器：用 `id` 寻址图形，用 Command 模式做 undo/redo，用 Composite 模式让「容器 `<g>`」和「叶子图形」共用同一套编辑命令。

---

## 快速开始

```bash
npm install
npm run cli
```

`npm run cli` 会先编译再启动 REPL：

```text
svg-editor 0.1 — type 'help' for commands

svg> init 800 600
canvas 800x600 created
svg> create rect bg 0 0 800 600 #ffffff
rect#bg created
svg> save demo.svg
saved to demo.svg (1 elements)
```

`demo.svg` 可以直接拖进浏览器查看效果。

另外两种不进入交互的模式（便于把命令序列存成脚本回放、也便于自动化测试）：

```bash
npm run build
node dist/cli/main.js --script examples/flowchart.svgsh
node dist/cli/main.js -e "init" -e "create rect r1 0 0 10 10" -e "tree"
```

```bash
npm test
```

---

## 1. 架构方案

### 1.1 模块划分

```text
src/
├── domain/          领域模型：图形、容器、文档、id 索引（不依赖任何 IO）
│   └── shapes/      rect / circle / ellipse / line / text / g 六个具体类
├── commands/        Command 模式：每个编辑操作一个类 + undo 栈
├── ports/           出站接口（FileSystem / ShapeReader / ShapeWriter / Output）
├── infrastructure/  端口实现：XML 解析、SVG 读写、Node fs
├── app/             EditorContext：当前文档 + undo 会话 + 端口
└── cli/             输入解析、命令分派、tree/show 渲染、REPL 入口
    └── handlers/    每个 CLI 命令一个 Handler 类
```

| 模块 | 职责 | 关键类型 |
|---|---|---|
| `domain` | 图形树、几何运算、属性白名单、id 唯一性 | `Shape`、`LeafShape`、`Group`、`SvgDocument`、`ShapeFactory` |
| `commands` | 把「一次编辑」封装成可执行/可撤销的对象 | `Command`、`EditSession`、`CreateShapeCommand` … |
| `ports` | 声明领域需要外部提供什么，不关心怎么实现 | `FileSystem`、`ShapeReader`、`ShapeWriter`、`Output` |
| `infrastructure` | 实现端口：自己写的 XML parser、SVG 序列化、`node:fs` | `XmlParser`、`SvgReader`、`SvgWriter`、`NodeFileSystem` |
| `app` | 组装上下文，持有「当前文档」与撤销栈 | `EditorContext` |
| `cli` | 词法分析、命令分派、输出格式、进程入口 | `Shell`、`CommandRegistry`、`TreeRenderer`、`main` |

组件图（PlantUML）：

```plantuml
@startuml
package "cli" {
  [Shell] as shell
  [CommandRegistry] as registry
  [handlers/*] as handlers
  [TreeRenderer / ShowRenderer] as render
  [main] as main
}
package "app" {
  [EditorContext] as ctx
}
package "commands" {
  [Command 接口] as cmd
  [EditSession] as session
}
package "domain" {
  [Shape / LeafShape / Group] as shape
  [SvgDocument] as doc
  [ShapeFactory] as factory
}
package "ports" {
  [FileSystem / ShapeReader / ShapeWriter / Output] as ports
}
package "infrastructure" {
  [NodeFileSystem] as fs
  [SvgReader / SvgWriter] as svg
  [XmlParser] as xml
}

main --> shell
shell --> registry
registry --> handlers
handlers --> cmd
handlers --> render
handlers --> ctx
ctx --> session
ctx --> doc
ctx --> ports
session --> cmd
cmd --> shape
doc --> shape
factory --> shape
svg ..|> ports
fs ..|> ports
svg --> xml
@enduml
```

### 1.2 设计模式

**Command 模式（要求项）** —— 落地在 `src/commands/`：

- 接口只有两个方法：`execute(): string[]` / `undo(): string[]`，返回值就是给用户看的回显行，所以「命令做完了要打印什么」和「撤销后要打印什么」都内聚在命令自己身上。
- 每个操作一个类：`CreateShapeCommand`、`DeleteCommand`、`MoveCommand`、`ScaleCommand`、`SetAttributeCommand`、`GroupCommand`、`UngroupCommand`、`AddToCommand`、`ZOrderCommand`、`ResizeCanvasCommand`。
- `EditSession` 是 Invoker：持有 undo/redo 两个栈，`record()` 执行并把命令压栈，新编辑清空 redo 栈。
- **「一条编辑命令 = 一个 undo 单元」由结构保证**：`group g1 r1 c1 t1` 不是三个子命令拼起来，而是 `GroupCommand` 自己记录了每个成员原来的父容器和下标，`undo()` 逐个插回原位——不会出现「撤销了一半」的中间态。
- undo 的数据来源分两类：移动/缩放这类可逆运算直接反向执行（`moveBy(-dx,-dy)`），属性/删除这类不可逆的直接恢复快照（`ShapeState` / `captureState()`）。

**Composite 模式** —— 落地在 `src/domain/`：

- `Shape` 是统一组件：`moveBy` / `scaleBy` / `applyAttribute` / `captureState` / `geometryTokens` 都在这一层声明。
- `LeafShape` 是叶子实现：几何属性存成 `field -> number`，`move` 只平移「可移动字段」，`scale` 乘所有几何字段。
- `Group` 是组合实现：`moveBy` / `scaleBy` 直接遍历子节点递归。
- 因此 `move node2 0 100` 与 `move c1 30 0` 走的是**同一条代码路径**，`DeleteCommand` 删除容器时也不需要知道里面有什么——子树跟着走。

**其它**：

- **Value Object**：`Paint`（fill/stroke/stroke-width）与 `PaintState` 把「表现属性」从 6 个图形类里抽出来，避免每加一种图形就复制三个字段。
- **Registry（命令表）**：`CommandRegistry` 用 `Map<name, handler>` 替代 `switch(command)`，`help` 和「未知命令」提示读同一份数据。
- **Factory（图形工厂）**：`ShapeFactory` 用一张 `type -> spec` 表把「参数个数、参数名、可选 paint 参数、构造方式」收在一起；`create` 命令与 SVG 读入（`fromXml`）都走这张表，所以按标签名分派只有这一处。

**两处按名字分派**（规格允许的两处，均已标注为待重构）：

| 位置 | 现状 | 待重构方向 |
|---|---|---|
| `CommandRegistry` | `Map<string, CommandHandler>` | 已经足够，后续只需注册表外置成配置 |
| `ShapeFactory.SPECS` | `Record<string, ShapeSpec>` 静态表（`create` 与 `read` 共用） | 插件阶段替换为 `ShapeProvider` 注册表（见 1.4 变化点 C） |

### 1.3 依赖方向规则

```text
cli ──▶ app ──▶ commands ──▶ domain
 │       │          │           ▲
 │       └──▶ ports ─┘          │
 └──▶ infrastructure ───────────┘（只实现端口，不被 domain 反向依赖）
```

规则（违反即为待处理项）：

1. **`domain` 不依赖任何其它模块**，尤其不 import `node:fs`、不 import `cli`。理由：领域模型要能被测试和复用（后续接 GUI / 插件），一旦 domain 里出现 IO，所有单元测试都得靠 mock 文件系统。
2. **`commands` 只依赖 `domain`**。命令不认识 CLI 语法、不认识文件、不打印东西——它只返回字符串行，由 Shell 决定输出到哪。
3. **`ports` 可以依赖 `domain`，但不依赖 `infrastructure` / `cli`**。端口是「领域需要外部提供什么」的声明，签名里出现 `SvgDocument` 是它的本职（`ShapeReader.read(): SvgDocument`）；但它不能出现任何具体实现的类型。
4. **`infrastructure` 依赖 `domain` + `ports`，不得被 `domain` / `commands` 依赖**。`SvgReader` 需要构造 `Rect` 等具体类，所以 infra → domain 是允许的；反过来绝对禁止。
5. **`cli` 依赖 `app` / `commands` / `domain`，并负责组装 `infrastructure`**（`ShellFactory` 是唯一的组装点）。
6. **`app` 不依赖 `cli`**：`EditorContext` 不知道 REPL 的存在。

自检方式：`grep -rn "from '.*infrastructure" src/domain src/commands` 必须为空；`grep -rn "node:fs" src/domain src/commands src/cli` 只允许出现在 `main.ts`（读脚本文件）。

### 1.4 变化点假设

| # | 变化点 | 我留了什么 / 为什么不留 |
|---|---|---|
| A | **新增图形类型**（`box`、`polygon`、`path`） | 留了：`ShapeFactory.SPECS` 是数据表，新增一种类型 = 加一条 spec + 一个类，命令层零改动。但**没有**提前做插件接口——本阶段只有 6 个内核类型，过早抽象会多出 `register()` / `unregister()` 的语义问题（已注册类型被 `read` 读到怎么办），收益为负。 |
| B | **新增命令**（如 `rotate`、`copy`） | 留了：新增 `XxxCommand` + 一个 `XxxHandler`，在 `ShellFactory` 注册一行。Handler 只做「解析参数 → 找到图形 → 构造命令」，解析逻辑用 `Args` 工具复用。 |
| C | **插件化（ShapeProvider）** | 部分留：`Shape.asContainer()` / `ownAttributeNames()` / `applyOwnAttribute()` 这些钩子已经让「容器型复合图形」不需要改内核（设想：`box` 继承 `Group` 并覆写 `applyOwnAttribute` 做 fill / label 的传播；该方案尚未实现，也没有验证过）。但真正的插件加载（动态 import / 配置文件）没做——规格明确说本阶段不要求。 |
| D | **属性集合扩展**（`opacity`、`transform`、`text-anchor`） | **故意不留**：目前白名单是 `Paint` + `ownAttributeNames()` 两处，加属性需要同时改这两处。这是有意的——`set` 白名单是**安全边界**（防止把任意字符串写进 SVG 破坏文件），做成完全开放的数据驱动反而会让「哪些属性合法」散落各处。 |
| E | **持久化格式变化**（JSON 工程文件、压缩包、版本控制） | 留了：`ShapeReader` / `ShapeWriter` 两个端口，换格式只需换实现并在 `ShellFactory` 改一行；domain 完全不知道 SVG 的存在。 |
| F | **交互通道变化**（GUI、HTTP API、MCP） | 留了：`Shell` 只做「行 → tokens → handler」；`Output` 端口把输出与 `stdout` 解耦。GUI 可以复用 `CommandRegistry` + `EditorContext`，只是换一个输入层。 |
| G | **undo 粒度变细**（按字符 / 按拖拽帧） | **故意不留**：现在是命令级撤销，若要合并连续 `move` 需要 `EditSession` 支持 merge 策略。当前没有需求，加进来只会让 `record()` 的语义变复杂。 |
| H | **大文档性能**（十万级图形） | **故意不留**：`SvgDocument` 用 `Map` 做 id 索引，`all()` 是 O(n) 遍历；目前 `group` 需要按文档序排序会走一次 `all()`。没有性能需求，先保证正确性与可读性。 |
| I | **坐标变换语义**（`transform="translate(...) scale(...)"`） | **故意不留**：既不解析也不保存 `transform`。读入带 `transform` 的元素时输出 `warning: ignored transform on <g> g1: coordinates are used as written`，`move` / `scale` 直接改几何值而不是写 `transform`。理由是规格里 `move` 的回显是「moved to (130,100)」，说明期望的是**绝对坐标**语义；混用两种表示会让 `tree` 输出不可读。 |

---

## 2. 过程记录

以下是开发中**真实发生**的、有代表性的讨论与纠错（按时间顺序）。

### 2.1 `group` 之后 `tree` 少了一层

**现象**：第一次跑规格第 6 节的 transcript，`group markers c1 box` 之后紧接着 `group bad c1 markers`，期望报 `cannot group a container into its own descendant: markers`，实际报 `no such shape: markers`。

**定位**：`GroupCommand.execute()` 把新 `<g>` 插进了父容器，但忘了把它登记进 `SvgDocument` 的 id 索引——索引只服务 `find()`，插入容器不会自动登记。

**修正**：`execute()` 里补 `doc.register(group)`，`undo()` 里补 `unregister`。**复核时订正**：当时为防止重复登记，给 `register()` 加过一个 `checkDuplicate` 参数，但校验其实无条件执行，参数从未生效；树内的所有移动都是先 `unregister` 再 `register`，本来就不会重复。该参数已删除，`register()` 一律校验 id 唯一。

> 这条的教训：**id 索引不是树的派生物，而是需要显式维护的第二个真相**。凡是「创建/删除节点」的地方都要成对调用 register / unregister；`group` 登记新建的容器，`ungroup` 注销被解散的容器（撤销时再登记），`addto` / `front` / `back` 只改变位置、不改变索引；`test/ungroup.test.ts` 固定了 `ungroup` 这一条。

### 2.2 「缺 id 自动补」的编号从 2 开始

**现象**：读规格自带的 `other.svg`，期望 `assigned id rect1`，实际输出 `rect2`。

**原因**：`buildFromNode()` 为了「先构造形状再决定 id」，在构造时就调用了一次 `suggestId()`，外层又调用一次——计数器被消费两次。

**修正**：把 id 决议提前到构造之前（先算 id，再 `buildFromNode(node, id)`）。重复 id 的处理也顺带改成 `原id-1`、`原id-2` 递增，避免与其它自动 id 撞车。

**确认方式**：把规格 6 节的 `other.svg` 原样写进 `test/session.test.ts`，逐行断言 `tree` 输出——现在与文档完全一致。

### 2.3 `#` 既是注释又是颜色

**问题**：规格要求「`#` 开头为注释」，但颜色值 `#ffffff` 也以 `#` 开头。最初的实现是「`#` 前面不是紧贴字符就当注释」，结果 `create rect bg 0 0 800 600 #ffffff` 里的颜色被当成注释吞掉，`fill` 直接丢失。

**修正**：改成「**整行的第一个 token 才可能是注释**」——`tokens.length === 0 && !hasCurrent` 时才截断。这样 `# init 800 600` 是注释，`... #ffffff` 是颜色。

### 2.4 `tree` 的列对齐

**问题**：规格示例里属性列是**全局对齐**的（`rect#bg` 后面跟着固定宽度空格），但嵌套层级里的 `circle#c1` 与 `rect#box` 也是各自对齐的。第一版用「全局最长 label」算宽度，结果嵌套层级被外层长 label 撑开，`circle#c1` 后面出现巨大空白。

**修正**：改成**每个兄弟组内对齐**（`siblingWidth`），与规格示例逐字符一致。这条也写进了测试断言，防止以后重构改坏。

### 2.5 编辑器把 `canvas <w> <h>` 误当编辑命令

**问题**：规格 4.3 说「文档类（init / read / save，以及 canvas 修改尺寸）执行后 undo/redo 禁止」。第一版把 `ResizeCanvasCommand` 走 `session.record()`，于是 `canvas 640 480` 之后还能 `undo`，与规格矛盾。

**修正**：`CanvasHandler` 直接 `new ResizeCanvasCommand(...).execute()`，然后 `session.lockForIo()`——命令类本身仍然保留（它实现了 `Command` 接口，未来若要支持可撤销的画布调整只需换一行），但**当前语义下不进 undo 栈**。

### 2.6 关于「要不要自己写 XML parser」

**讨论**：可以引 `fast-xml-parser` 或 `xmldom`。

**决定**：自己写（`src/infrastructure/xml/`，约 200 行）。理由：① 项目要求「零运行时依赖」便于助教直接 `npm install && npm run cli`；② 我们需要控制的是**错误信息**（`cannot parse svg: ...`）和**实体解码**（`&amp;` → `&`，再编码回去），第三方库的默认行为反而要额外适配；③ 解析范围是 SVG 子集（元素/属性/文本/注释/CDATA），不是通用 XML。

**代价**：不支持命名空间前缀（`xlink:href` 这类带前缀的属性按普通属性名解析，但不在保留范围内，读入后即被丢弃，见已知限制 6）、不支持 DTD 实体定义。已写进「已知限制」。

### 2.7 复核轮：用工具审计，而不是凭印象

交付后做了一轮复核，方法是先跑工具、再读文档，而不是重读自己写的东西：

1. `tsc --noUnusedLocals --noUnusedParameters` 报出 5 处未使用的符号；对可疑成员逐个 `grep` 调用方，又找出一批没有调用方的成员（`extraAttributes`、`Text.getContent`、`SvgDocument.toState` 等）。
2. `grep -rnE 'switch \(|case '` 发现 `SvgReader` 里有第三处按标签名的 `switch`，超出规格允许的两处。它是为了「读文件时方便地按标签建对象」顺手写的，当时没有对照规格第 2.1 节检查。已收回到 `ShapeFactory.fromXml`。
3. 逐条核对文档里的断言，发现 4 处与实现不符：`transform` 并未保留（代码里从来没有 `setTransform`）；`CommandRegistry` 用 `Map`、并没有 `switch`；`checkDuplicate` 参数从未生效；修订记录 R1–R5 大部分并非真实发生过的修订。均已按事实改写。

4. 订正文档时写下「`ungroup` 不改变索引」，回头核对代码发现这句不成立：`UngroupCommand` 从未读过构造参数 `doc`（`tsc --noUnusedParameters` 报过），所以 `ungroup` 之后被解散的容器 id 仍留在索引里——`show` 还能查到一个空容器、`save` 的元素数多算一个、该 id 无法复用。先写 `test/ungroup.test.ts` 复现（3 个用例中 2 个失败），再修：`execute` 时注销，`undo` 时重新登记。这是上一版交付里一个真实的 bug，原有 20 个测试没有覆盖「id 索引与树同步」。

教训：文档里的每一句「实现了 X」，都应该能用一条 grep 或一个测试反证；连订正文档时新写的句子也不例外。本轮新增 `test/review.test.ts`（5 个用例）与 `test/ungroup.test.ts`（3 个用例）把其中可测的部分固定下来。

---

## 3. 一致性自查

### 3.1 模块划分：实际目录 vs 方案

**一致**。实际目录与 1.1 完全相同：

```text
src/domain/          ✔
src/domain/shapes/   ✔
src/commands/        ✔
src/ports/           ✔
src/infrastructure/  ✔（多出 xml/ 子目录，方案里已提到 XmlParser）
src/app/             ✔
src/cli/             ✔
src/cli/handlers/    ✔
```

**修订记录**（实现过程中相对原设想的变化）：

> 说明：开发前没有单独成文的方案，1.1–1.4 是边实现边定稿的。此前版本里的 R1–R5（`EditorContext` 搬目录、补 `ports/` 等）与真实过程不符，已删除；下表只保留确实发生过的变化。

| 修订 | 内容 | 原因 |
|---|---|---|
| R1 | `GroupCommand` 初稿用 `CompositeCommand` 组合若干子命令 | 子命令各自 undo 时无法保证成员回到原下标；改为单个命令记录 `Placement[]`，并删除了 `CompositeCommand.ts` |
| R2 | 依赖规则 3：`ports` 由「不依赖任何模块」放宽为「可以依赖 `domain`」 | `ShapeReader.read()` 必须返回 `SvgDocument`，见 3.2 |
| R3 | `SvgReader` 内曾有第三处按标签名的 `switch` | 复核时发现，规格只允许两处；收回到 `ShapeFactory.fromXml`，`create` 与 `read` 共用同一张类型表 |
| R4 | 删除无调用方的成员：`Shape.extraAttributes` / `addExtraAttribute` / `rename`、`Text` 的两个访问器、`SvgDocument.toState` / `kindOf`、`EditSession.undoDepth` / `redoDepth`、`Shell` 未使用的 `ctx` | 复核时用 `tsc --noUnusedLocals` 与 `grep` 找出；减少没人维护的接口 |
| R5 | `UngroupCommand` 补上 id 索引的注销 / 重新登记 | 复核时发现 `ungroup` 后被解散的容器仍留在索引里（`show` 可查到、`save` 元素数多算、id 不能复用），见 2.7 第 4 条 |

### 3.2 依赖方向：规则是否被违反

抽样检查（命令可复现）：

```bash
# 1. domain 不得依赖 infrastructure / cli / commands
grep -rn "infrastructure\|/cli/\|/commands/" src/domain/     # 无输出

# 2. commands 不得依赖 infrastructure / cli
grep -rn "infrastructure\|/cli/" src/commands/                # 无输出

# 3. node:fs 只允许出现在 infrastructure/NodeFileSystem.ts 与 cli/main.ts（读脚本）
grep -rn "node:fs" src/                                       # 仅 cli/main.ts 与 infrastructure/NodeFileSystem.ts

# 4. ports 只允许 import domain
grep -rn "^import" src/ports/                                 # 仅 ShapeReader / ShapeWriter -> ../domain/SvgDocument

# 5. domain 不得出现任何非相对路径 import（即不碰 node 内置 / 第三方）
grep -rn "^import" src/domain/ | grep -v "from '\./\|from '\.\./"   # 无输出
```

**结论**：五条规则均未被违反。

**一处已修订的规则**：初版方案写的是「`ports` 不依赖任何模块」。实际实现时，`ShapeReader.read()` 的返回类型必须是 `SvgDocument`，否则端口就无法描述「读出一个文档」。所以规则改为「ports 可以依赖 domain，但不依赖任何实现模块」——这是**放宽规则以匹配正确的设计**，而不是违反规则（依赖方向仍是 ports → domain，单向）。

**已知的两处「合规的」跨层**：

1. `cli/ShellFactory.ts` 同时 import `infrastructure` 与 `cli/handlers` —— 这是**组装点（composition root）**，允许，且是全项目唯一一处。
2. `infrastructure/svg/SvgReader.ts` import `domain/shapes/*` —— 允许（infra → domain 是单向的）。

**唯一的味道**：`ShapeFactory` 同时被 `domain`（创建）和 `infrastructure`（读文件时按标签名建对象）使用。它按名字分派，属于规格允许的两处之一，已在 1.2 标注为待重构。

---

## 4. 质量保证手段

### 4.1 功能完整性

| 手段 | 说明 |
|---|---|
| **规格 transcript 逐行断言** | `test/session.test.ts` 把规格第 6 节、6.1 节的完整会话（含 `other.svg` 读入、`tree` 输出、`undo`/`redo` 回显）逐行写成断言。规格示例就是验收标准。 |
| **错误契约全量覆盖** | `test/commands.test.ts` 覆盖规格 4.2 表格里**每一条**错误信息（id 重复 / id 不存在 / 容器不存在 / 不是容器 / 未知类型 / 无法 ungroup / 组内包含子孙 / 根级 ungroup / 缩放非正 / 读写失败 / 未初始化文档）。 |
| **undo 粒度** | 专门测试「group 是一条 undo 单元」「新编辑清空 redo」「io 命令后 undo 被拒且下一次编辑解禁」「显示类命令不进栈」。 |
| **往返一致性** | `test/roundtrip.test.ts`：构建文档 → `save` → `read` → `tree`，断言与保存前**完全相同**；文本里的 `& < >` 转义后再读回内容不变。 |
| **命令覆盖** | 命令总表 19 条（init/read/save/canvas/create/delete/move/scale/set/group/ungroup/addto/front/back/tree/show/help/undo/redo）全部实现，`help` 输出即总表。 |

当前测试结果：**5 个测试文件 / 28 个用例全部通过**（含复核轮新增的 `test/ungroup.test.ts`（`ungroup` 与 id 索引同步，3 个用例）和 `test/review.test.ts`（5 个用例）：`transform` 警告、`create` 与 `read` 共用类型表、原型属性名不被当作图形类型、无文档时的错误路径）。

### 4.2 代码质量

- **类型严格**：`tsconfig.json` 开启 `strict` + `noImplicitOverride` + `noFallthroughCasesInSwitch` + `noUnusedLocals` + `noUnusedParameters`，`npm run typecheck` 零错误。
- **无运行时依赖**：`package.json` 只有 `devDependencies`，`npm install` 不会拉进任何库代码。
- **一类一文件**：`domain/shapes/` 下每个图形一个文件；`commands/` 下每个命令一个文件；文件名 = 类名。
- **按名字分派只有两处**：`ShapeFactory.SPECS`（类型名到类，`create` 与 `read` 共用）和 `CommandRegistry`（命令名到 handler，用 `Map` 实现，没有 `switch`），符合规格豁免条件。代码中仅有的 `switch` 在 `Paint.apply`，分派对象是属性名而不是标签名。
- **错误即状态不变**：所有命令都是「先校验、后执行」——`SetAttributeCommand` 在构造时就检查白名单，`ScaleCommand` 在构造时就检查正数，`GroupCommand` 在构造时就检查「容器与子孙同组」。校验失败时构造抛错，**命令对象根本没被创建**，`EditSession.record()` 不会碰栈，因此状态必然不变。
- **回显与行为同源**：命令的 `execute()` / `undo()` 返回的就是要打印的行，不存在「实现了但回显写错」的漂移可能。

### 4.3 已知限制（如实记录）

1. **`create box` 未实现**——按规格 4.4 属于插件化阶段；当前报 `error: unknown shape type: box (is the plugin loaded?)`。
2. **`transform` 属性**：既不解析也不保存。读入带 `transform` 的元素时输出 `warning: ignored transform on <g> g1: coordinates are used as written`，坐标按原值使用；`save` 后该属性不会写回，所以带平移 / 缩放变换的文件保存后视觉效果会改变。这是本阶段的语义选择（见 1.4 变化点 I）。
3. **`<path>`、`<polygon>` 等未在规格内的元素**：读入时忽略并给出 `warning: ignored unsupported element <path>`，不会静默丢失数据而不提示。
4. **`scale` 对 `line` 的语义**：按规格「factor 同乘到图形的全部几何属性」，端点坐标同乘（即以原点为基准缩放），而不是以线自身中心缩放。
5. **XML 解析**：不支持 DTD 实体、命名空间前缀解析。
6. **未知属性在 read → save 后丢失**：读入时只保留 `id`、各类型的几何属性和 `fill` / `stroke` / `stroke-width`，其余属性（`opacity`、`class`、`font-size`、`text-anchor`、`xlink:href` 等）不会写回。
7. **脚本文件读取绕过端口**：`cli/main.ts` 的 `--script` 直接用 `node:fs` 读文件，没有经过 `FileSystem` 端口；它只影响入口层，不影响命令的可测试性。

---

## 5. 命令总表（与 `help` 输出一致）

| 类别 | 命令 |
|---|---|
| 文档 | `init [w] [h]`、`read <file.svg>`、`save [file.svg]`、`canvas [w] [h]` |
| 编辑 | `create <type> <id> [params…] [in <containerId>]`、`delete <id>`、`move <id> <dx> <dy>`、`scale <id> <factor>`、`set <id> <attr> <value>`、`group <newGid> <id1> <id2>…`、`ungroup <gid>`、`addto <gid> <id>`、`front <id>`、`back <id>` |
| 显示 | `tree [id]`、`show <id>`、`help` |
| 撤销 | `undo`、`redo` |

---

## 6. 目录结构

```text
.
├── doc/README.md          本文档
├── examples/              可回放的命令脚本
├── src/
│   ├── app/EditorContext.ts
│   ├── cli/               Shell / Registry / Renderers / handlers / main
│   ├── commands/          Command 接口 + 10 个命令 + EditSession
│   ├── domain/            Shape / LeafShape / Group / SvgDocument / ShapeFactory
│   ├── infrastructure/    XmlParser / SvgReader / SvgWriter / NodeFileSystem
│   └── ports/             FileSystem / ShapeReader / ShapeWriter / Output
├── test/                  vitest 用例
├── package.json
└── tsconfig.json
```
