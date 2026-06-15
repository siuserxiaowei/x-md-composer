# New Project 2

<!-- SIUSER-REPO-GUIDE:START -->
## Repository Guide

### What This Repository Does

X/Twitter Markdown 写作工具：把 Markdown 草稿整理成适合发布的推文、长帖和媒体内容。

English summary: Markdown composer for turning drafts into publishable X/Twitter posts, threads, and media-ready content.

### Online Entry Points

- GitHub repository: https://github.com/siuserxiaowei/x-md-composer
- Live / GitHub Pages: https://siuserxiaowei.github.io/x-md-composer/
- Default branch: `main`
- Primary language: `JavaScript`

### How To Read / Learn This Repository

1. 先读本 README，确认项目目标、在线入口和本地运行方式。
2. 打开上方 Live / GitHub Pages 链接，先从最终效果理解项目。
3. 按仓库目录从入口文件、数据文件、脚本和文档依次阅读。
4. 如果要修改内容，先小范围改动，再运行本 README 中的验证命令。

### Clone This Repository

```bash
git clone https://github.com/siuserxiaowei/x-md-composer.git
cd x-md-composer
```

### Run Or View Locally

```bash
python3 -m http.server 8000
```

然后打开 `http://127.0.0.1:8000/`。

### Repository Map

| Path | Purpose |
| --- | --- |
| `README.md` | 项目入口说明，先读这里。 |
| `docs/` | 文档或 GitHub Pages 输出目录。 |
| `.github/` | GitHub Actions、Issue/PR 模板等自动化配置。 |
| `x-md-composer/` | 项目目录。 |

### Maintenance Notes

- Keep this README in sync when the project purpose, live link, or run commands change.
- Prefer small, focused commits when changing code, data, or generated pages.
- Run the relevant build or validation command before publishing changes.
- If this is a generated/static archive, update the source data first, then regenerate the public files.

### Privacy And Safety

- Do not commit API keys, tokens, passwords, cookies, private URLs, or internal account data.
- Keep private source material out of public GitHub Pages output unless it has been explicitly cleared for publication.
- When in doubt, run a quick secret scan such as `rg -n "token|secret|password|access_key|authorization"` before pushing.
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
