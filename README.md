# 道路标牌生成器

一个在浏览器中制作中国道路标牌、并导出 SVG 矢量图的工具。包含道路名称、交叉路口、地点距离、立交枢纽、出入口和自由排版六个工作区。

## 在线使用

部署完成后，可通过下面的地址直接使用：

`https://<你的 GitHub 用户名>.github.io/<仓库名>/`

在线版无需安装软件；编辑内容仅保存在访问者当前浏览器中，不会上传或同步到服务器。

## 本地运行

需要 Node.js 20.9 或更高版本。

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm build
node server.mjs --open
```

开发调试可运行：

```powershell
corepack pnpm dev
```

Windows 用户也可以使用仓库中的“重新构建.bat”生成离线文件，再双击“一键启动.bat”。完整使用说明见 [简体中文教程](./运行前阅读/zh_CN/README.md)。

## 发布到 GitHub Pages

本项目内置 GitHub Actions 发布流程。把代码推送到 `main` 分支后：

1. 在仓库的 **Settings → Pages** 中将发布来源选为 **GitHub Actions**。
2. 等待 Actions 页中的 “Deploy to GitHub Pages” 工作流完成。
3. 从部署结果或 **Settings → Pages** 复制在线地址。

构建过程会自动配置仓库路径前缀，因此仓库改名后无需修改源代码。

## 离线发行包

如果要让非开发者下载后直接使用，建议在 GitHub 的 **Releases** 中上传完整离线压缩包（至少包含 `out/`、`server.mjs` 和“一键启动.bat”）。`out/` 是构建产物，源码仓库默认不提交它。

## 许可

请参阅 [LICENSE.md](./LICENSE.md)。
