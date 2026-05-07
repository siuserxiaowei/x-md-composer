# New Project 2

This repository collects local web tools and publishing workflows.

## Apps

- [X Markdown Composer](./x-md-composer): a no-token Markdown-to-X Articles and X Thread composer.

## GitHub Pages

The Pages workflow builds and deploys `x-md-composer` as a static site from the `main` branch.

For a normal project Pages URL, the workflow sets Vite's base path to `/${repository-name}/`.
For a user or organization root site, set the repository variable `PAGES_BASE` to `/` and update the workflow if needed.
