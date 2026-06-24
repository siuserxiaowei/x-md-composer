# New Project 2

<!-- SIUSER-REPO-GUIDE:START -->
## 项目介绍 / Project Introduction

### 中文
X/Twitter Markdown 写作工具：把 Markdown 草稿整理成适合发布的推文、长帖和媒体内容。

### English
Markdown composer for turning drafts into publishable X/Twitter posts, threads, and media-ready content.

## 使用方式 / Usage

### 中文
1. 优先打开在线入口或本地静态服务查看最终页面。
2. 内容型仓库通常从 `README.md`、`docs/`、`data/` 或 `content/` 开始阅读。
3. 更新资料后，重新生成或刷新静态页面，并检查链接、图片和文字是否正常。

### English
1. Start with the live link or a local static server to view the final page.
2. For content repositories, begin with `README.md`, `docs/`, `data/`, or `content/`.
3. After updating material, regenerate or refresh the static page and check links, images, and copy.

## 入口与元信息 / Entry Points & Metadata

- GitHub 仓库 / Repository: https://github.com/siuserxiaowei/x-md-composer
- Live / 在线入口：https://siuserxiaowei.github.io/x-md-composer/
- 默认分支 / Default branch: `main`
- 主要语言 / Primary language: `JavaScript`
- 可见性 / Visibility: `public`
- 仓库类型 / Repository type: `source`

## 本地运行 / Local Run

```bash
git clone https://github.com/siuserxiaowei/x-md-composer.git
cd x-md-composer
python3 -m http.server 8000
```

## 仓库结构 / Repository Map

| 路径 / Path | 中文说明 | English |
| --- | --- | --- |
| `README.md` | 项目入口说明，先读这里。 | Main project entry point and orientation. |
| `docs` | 文档或 GitHub Pages 输出目录。 | Documentation or GitHub Pages output. |
| `.github` | GitHub Actions 和协作自动化配置。 | GitHub Actions and collaboration automation. |
| `x-md-composer` | 项目文件或目录。 | Project file or directory. |
| `.gitignore` | 项目文件或目录。 | Project file or directory. |

## 维护备注 / Maintenance Notes

- 中文：当项目目标、在线入口、运行命令或目录结构变化时，同步更新本说明。
- English: Keep this guide updated when the project purpose, live link, run commands, or structure changes.
- 中文：修改代码、数据或生成页面后，优先运行相关构建、测试或校验命令。
- English: After changing code, data, or generated pages, run the relevant build, test, or validation command.

## 安全与隐私 / Safety & Privacy

- 中文：不要提交 API key、token、密码、cookie、私有链接或内部账号资料。
- English: Do not commit API keys, tokens, passwords, cookies, private URLs, or internal account data.
- 中文：公开 GitHub Pages 前，确认资料已脱敏并允许公开。
- English: Before publishing GitHub Pages output, confirm the material is redacted and cleared for public release.
<!-- SIUSER-REPO-GUIDE:END -->



<!-- SIUSER-SEO-INTRO:START -->

## 项目介绍 / Project Introduction

**中文介绍**：面向 X/Twitter 的 Markdown 写作与内容拆条工具，帮助把长文转成更适合社交传播的帖子结构。

**English**: A Markdown composer for X/Twitter that helps transform long-form writing into post-ready social content structures.

**SEO 关键词 / SEO Keywords**: Markdown editor, Twitter thread, X content, content automation, 写作工具

<!-- SIUSER-SEO-INTRO:END -->

This repository collects local web tools and publishing workflows.

## Apps

- [X Markdown Composer](./x-md-composer): a no-token Markdown-to-X Articles and X Thread composer.

## GitHub Pages

The Pages workflow builds and deploys `x-md-composer` as a static site from the `main` branch.

For a normal project Pages URL, the workflow sets Vite's base path to `/${repository-name}/`.
For a user or organization root site, set the repository variable `PAGES_BASE` to `/` and update the workflow if needed.

<!-- SIUSER-CONTACT:START -->

## 联系我 / Contact

想交流 AI 工具、内容自动化、SEO、私域增长或项目合作，可以扫码加我微信。

For collaboration on AI tools, content automation, SEO, private-domain growth, or product experiments, scan the WeChat QR code below.

<img src="https://raw.githubusercontent.com/siuserxiaowei/siuserxiaowei/main/assets/contact/wechat-qrcode.jpg" width="180" alt="WeChat QR code / 微信二维码" />

**关键词 / Keywords**: Markdown editor, Twitter thread, X content, content automation, AI tools, AI automation, GitHub Pages, SEO

<!-- SIUSER-CONTACT:END -->
