# 维护指南

这份文档写给接手维护道路标牌生成器的开发者，说明代码组织方式、常见修改的落点，以及提交前要做的检查。使用说明见 [运行前阅读/zh_CN/README.md](./运行前阅读/zh_CN/README.md)。

## 1. 技术栈

- Next.js 16（App Router，`output: 'export'` 纯静态导出，构建使用 webpack）
- React 19，开启 React Compiler（`babel-plugin-react-compiler`）
- TypeScript 5、Tailwind CSS 4、Radix UI
- `@pdf-lib/fontkit`：在浏览器中读取字体，把文字转成 SVG 路径。导出的 SVG 不依赖任何字体文件。
- 包管理器为 pnpm（通过 `corepack pnpm` 调用），Node.js 版本不低于 20.9

所有标牌都在浏览器里渲染。`server.mjs` 只用于离线包，负责提供 `out/` 下的静态文件。

## 2. 目录结构

```
src/app/
  [tab]/                 六个工作区页面（路由参数即工作区名，见 tab-meta.json）
    TabPage.tsx          左侧列表 + 中间预览 + 右侧设置面板的总装
    SignPreview.tsx      预览画布：缩放、拖动、下载 SVG、隐藏的测量工具
    *Settings.tsx        各模板的设置面板
  generators/            每种标牌的 SVG 生成器
    generator.tsx        模板 → 生成器的分发，以及下载文件名 signFilename
    svg-text.tsx         文字转路径（OutlinedText）与通用颜色常量
    intersection/        交叉路口工作区的三种标牌，以及共享的外框和文字工具
    sign/ exit/ interchange/ ...
    template/*.svg       部分标牌直接使用的 SVG 底图（以源码文本导入）
  lib/
    types.ts             Sign 数据模型与所有配置类型
    sign-model.ts        模板归属、默认值、数据规范化（normalizeSign 等）
    sign-display.ts      列表中显示的徽标、标题、摘要
  state/
    use-sign-workspace.ts   工作区状态（增删改、引用同步）
    workspace-storage.ts    localStorage 持久化与初始示例数据
  fonts/                 字体文件与静态字体路由（/fonts/a 等）
server.mjs               离线包使用的静态服务器
tests/server.test.mjs    离线服务器测试（需要先 build）
scripts/                 rebuild.ps1 / clean.ps1
```

## 3. 常用命令

```powershell
corepack pnpm install --frozen-lockfile   # 安装依赖
corepack pnpm dev                         # 开发服务器 http://localhost:3000
corepack pnpm lint                        # ESLint（单行最长 100 字符，import 顺序有要求）
npx tsc --noEmit -p .                     # 类型检查
corepack pnpm build                       # 静态导出到 out/
corepack pnpm test                        # 离线服务器测试，依赖 out/
node server.mjs --open                    # 以离线方式运行 out/
```

import 顺序的告警可以用 `npx eslint --fix <路径>` 自动修正。

## 4. 数据流

1. 每块标牌是一个 `Sign` 对象（`lib/types.ts`）。所有模板共用这一个类型，各模板的专属配置放在 `intersectionConfig`、`crossroadsConfig`、`roundaboutConfig`、`freeConfig` 等字段里。
2. `use-sign-workspace.ts` 持有完整的标牌列表和当前选中项。每次修改都会经过 `normalizeUpdatedSign`，再写入 localStorage。
3. `TabPage.tsx` 按工作区和模板选择设置面板。设置面板只负责调用 `onChange(partialSign)`。
4. `SignPreview` 调用 `generator.tsx` 中的 `SignSvg`，后者按 `sign.template` 分发到具体生成器。
5. 生成器是纯函数组件：输入 `sign` 和 `roadSignList`（用于引用编号牌），输出一个带 `role="img"` 的 `<svg>`。下载功能导出的就是这个元素的 `outerHTML`。

`roadSignList` 是“道路名称标识”工作区里的标牌。其他标牌按 `roadSignId` 引用它们，所以编号牌改名后，引用处会自动更新。

## 5. 新增一种标牌模板

需要改动以下位置，漏掉任何一处都会导致新模板无法显示、无法保存或下载文件名错误。

1. `lib/types.ts`：在 `SignTemplate` 中加入新值。如有专属配置，新增配置类型并加到 `Sign` 上。
2. `lib/sign-model.ts`：
   - 在 `isTemplateParam` 中加入新值，否则从 localStorage 恢复时会被丢弃。
   - 在 `visibleSignsForTab` 中把它归入某个工作区。
   - 加入对应工作区的 `*_ADD_CHOICES`，“新增标志”菜单才会出现。
   - 在 `normalizeSign` 中为专属配置提供默认值和规范化逻辑。旧数据没有这个字段，必须能补齐。
3. `generators/`：新建生成器组件，然后在 `generator.tsx` 的 `SignSvgContent` 和 `signFilename` 中各加一个分支。
4. 设置面板：新建 `[tab]/XxxSettings.tsx`，在 `TabPage.tsx` 中按模板接入。
5. `lib/sign-display.ts`：补充列表徽标、标题和摘要。
6. 如果每个工作区都需要一块默认示例，在 `state/workspace-storage.ts` 的 `normalizeWorkspace` 中补上。

## 6. 交叉路口模块的设计规格

依据是 GB 5768.2-2022：8.3.2 节（图 205、图 206）、4.6.5 节（图 3），以及附录 E 的制作图例 E.167 d)、E.168（印刷页第 263 页，对应 PDF 第 275 页）。国标 PDF 放在项目根目录，已加入 `.gitignore`，不随仓库提交。

所有尺寸都以汉字字高 h 的倍数表示。代码里的 `U` 表示 1h 对应多少 viewBox 单位：交叉路口指路标志和环岛都取 100，十字路口图形式取 50。

**共用部分**（`sign-frame.tsx`、`label-stack.tsx`）

| 项目 | 取值 | 来源 |
| --- | --- | --- |
| 颜色 | 从统一色板取：`useSignColors()` 的 `plate`（底色）、`border`（边框、方位框）、`text`（文字、图形），红色横杠用 `resolve('red')`。不要在生成器里写死色值 | 标题栏色板 |
| 衬边 / 白边框 | 各 0.1h | 图 3 |
| 圆角半径 | 底板 0.4h，白边外沿 0.3h，白边内沿 0.2h | 图 3 |
| 方位框 | 0.9h 白色方块，贴在白边框内角，与边框连成一体 | 图 205、E.167 |
| 字格 | 每字 1h×1h，字间距 0.2h（`CellText`） | E.167、E.168 |
| 行间距 | 0.3h（编号牌与地名之间、多行之间） | E.168 |
| 编号牌高度 | 普通公路 1.2h，国家高速 2h，城市道路 1.3h | E.168、图 205c |

**交叉路口指路标志**（`intersection-guidance.tsx`，对应 E.167 d）

- 版面大小随内容变化。三个三字路名时版面为 16h×7h，与制作图例一致。
- 箭头：杆宽 0.36h，箭头半宽 0.6h，头长 1.1h，边线都是 45°。直行箭头尖距路口中心 2.7h，左右箭头尖在六边形外角外 1.5h（三字路名时为 3.6h）。
- 中心路名：0.7h 字，放在高 1.5h、白边 0.2h、斜边 45° 的六边形里。超过 6 个字时分两行，字高改为 0.4h。
- 间距：版面外缘到左右文字 0.7h；左右文字到箭头尖 0.3h；直行文字到箭头尖 0.5h；白边框到直行文字 0.5h；下方路段末端到白边框 0.6h。
- 封闭方向保留路段，箭头头部换成红色横杠。

**环岛图形式**（`roundabout-guidance.tsx`，对应 E.168 与图 206）

- 横向版面是 E.168：9h×7.7h，路口中心在 (4.5h, 4.2h)。方形版面是图 206：9h×8.3h，路口中心在 (4.5h, 4.6h)。
- 环：白环外径 0.8h，中心蓝岛半径 0.4h。出口道路宽 0.4h（编号集散道路；干线 0.5h，地方 0.3h），与环之间用 0.4h 圆角过渡，末端为 45° 尖头。进口道路下方是平头，环左下有一道表示行车方向的蓝色缺口（`slitPolygon`）。
- 出口道路尖端距中心：左右 3h，斜向 2h。斜向出口按 E.168 取 60°。同时有直行出口时改为 45°，否则直行和斜向只差 30°，会挤在一起。
- 标签位置：左右出口的标签放在道路下方 0.3h 处，中心距路口 2.6h；斜向标签放在尖端上方 0.3h；与白边框保持上下 0.3h、左右 0.1h 的距离。标签碰到图形或其他标签时会被推开（`placeLabels`），实在放不下才统一缩小字高。
- 直行标签放不下时版面加高，不缩小文字。GB 4.6.4 规定标志大小按字高和字数确定。

**十字路口图形式**（`crossroads-guidance.tsx`）只使用了共用的外框和方位框。版面布局保持原样，这次没有按国标改动。

## 7. 预览画布

`SignPreview.tsx` 的视图状态是 `{ scale, x, y }`：

- `view` 用于渲染，`viewRef` 始终保存最新值。滚轮和拖动事件读写 `viewRef`，连续快速触发时也不会读到过期的状态。不要改回 `setState(current => ...)` 再在外面修改 ref 的写法，原来拖动失效就是这个原因。
- 滚轮直接缩放，不需要按 Ctrl，以光标为中心（`zoomAt`）。缩放范围为 `MIN_SCALE`–`MAX_SCALE`（0.2–8），灵敏度由 `WHEEL_ZOOM_SPEED` 控制。
- 左键拖动平移；中键始终可以拖动，测量模式下也可以。
- 调试工具：在浏览器控制台输入 `position` 会显示光标处的标牌坐标；输入 `px` 会打开像素测量（左键拖出测量线，按住 Shift 锁定水平或垂直方向）。核对版式尺寸时可以使用。

## 8. 字体

字体文件位于 `src/app/fonts/files/`，通过 `fonts/[font]/route.ts` 在构建时静态导出为 `/fonts/han`、`/fonts/a`、`/fonts/b`、`/fonts/c`。`tests/server.test.mjs` 会校验离线包中的字体与源文件逐字节一致。

`OutlinedText` 遇到字体中没有的字符会抛出错误，预览区会显示错误信息。添加生僻地名时，需要先确认字体包含这些字。

## 9. 本地存储与数据兼容

- 存储键为 `expressway-sign-generator:workspace`，版本号为 `WORKSPACE_STORAGE_VERSION = 1`。
- 给 `Sign` 或某个配置新增字段时，在 `normalizeSign` / `normalize*Config` 里补默认值。用户已保存的数据没有新字段，读取时会经过这里。
- 不要轻易提高版本号。版本不匹配时 `loadSavedWorkspace` 会直接放弃旧数据，用户的所有标牌都会丢失。

## 10. 构建与发布

- **在线版**：推送到 `main` 分支后，`.github/workflows/deploy-pages.yml` 会构建并部署到 GitHub Pages。工作流会设置 `NEXT_PUBLIC_BASE_PATH`，静态资源地址需要用 `lib/public-url.ts` 的 `publicUrl()` 生成，不要写死以 `/` 开头的路径。
- **离线包**：运行 `重新构建.bat`，它会依次执行 install、lint、build 和离线服务器测试，最后执行 `clean.ps1 -RemoveDependencies`。**这一步会删除 `node_modules`**，之后继续开发需要重新安装依赖。发布时至少打包 `out/`、`server.mjs` 和 `一键启动.bat`。
- `out/`、`.next/` 和 `node_modules/` 已在 `.gitignore` 中排除。

## 11. 提交前检查清单

1. `corepack pnpm lint` 和 `npx tsc --noEmit -p .` 均无报错。
2. 在 `corepack pnpm dev` 中逐个打开受影响的标牌，至少检查：
   - 默认示例数据；
   - 长名称（会触发缩小或换行）；
   - 引用编号牌的情况；
   - 环岛的方形和宽版两种版式，以及交叉路口的封闭方向（如有改动）。
3. 下载 SVG，用浏览器单独打开，确认没有依赖页面样式或字体。
4. 改动构建、字体或服务器相关代码时，运行 `corepack pnpm build && corepack pnpm test`。

## 12. 已知问题

- `CONTRIBUTION.md` 指向的 `docs/en_US/CONTRIBUTION.md` 不存在。
- 仓库中的文本文件使用 LF 换行，Windows 上的 Git 会提示 LF/CRLF 转换。如需统一，可以添加 `.gitattributes`（例如 `* text=auto eol=lf`）。
- 十字路口图形式还没有对照国标制作图例调整版面，只统一了外框和方位框。
