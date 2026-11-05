# CNB 官方 git-sync 插件文档与写认证层验证

## A. 官方插件仓库 clone（CNB → runner）

- `git clone https://cnb.cool/cnb/plugins/tencentcom/git-sync.git` -> exit=0 | Cloning into '/tmp/git-sync-doc'...
- 文件 9 个: entrypoint.sh, example.yml, .cnb.yml, plugin-meta.json, Dockerfile, LICENSE, README.md, README.en.md, .markdownlint.json

### `README.md` (6149 字符)
```
# Git Sync Plugin

一个用于在不同 Git 平台之间同步代码的插件。支持通过 HTTPS 或 SSH 方式同步代码到其他 Git 托管平台。

例如从 CNB 同步到 GitHub。

## 功能特点

- 支持 HTTPS (推荐) 和 SSH 两种认证方式
- 支持推送指定分支或所有分支
- 支持推送标签
- 支持强制推送
- 可配置 Git 用户信息
- 支持自定义 Git 服务器
- 支持私有仓库认证

## 同步模式

插件支持两种同步模式：推送模式(默认)和 Rebase 模式。

具体参数请查阅下方参数列表

### 从 GitHub 同步到 CNB

#### 使用默认模式同步到 CNB

在 GitHub Actions 中使用推送模式，注意需要使用 [GitHub Secrets 来安全地存储敏感信息](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions)，如果`dependabot`创建的分支也要同步，请同步设置 [Dependabot Secret

```yaml
# .github/workflows/sync-cnb.yml

name: Sync to CNB
on: [push]

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
      
      - name: Sync to CNB Repository
        uses: docker://tencentcom/git-sync
        env:
          PLUGIN_TARGET_URL: "https://cnb.cool/username/repo.git"
          PLUGIN_AUTH_TYPE: "https"
          PLUGIN_USERNAME: "cnb"
          PLUGIN_PASSWORD: ${{ secrets.GIT_PASSWORD }}
          PLUGIN_FORCE: "true"
```

#### 使用 rebase 模式同步到 CNB

在 GitHub Actions 中使用 rebase 模式:

```yaml
# .github/workflows/sync-cnb.yml

name: Sync to CNB
on: [push]

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
      
      - name: Sync to CNB Repository
        uses: docker://tencentcom/git-sync
        env:
          PLUGIN_TARGET_URL: "https://cnb.cool/username/repo.git"
          PLUGIN_AUTH_TYPE: "https"
          PLUGIN_USERNAME: "cnb"
          PLUGIN_PASSWORD: ${{ secrets.GIT_PASSWORD }}
          PLUGIN_SYNC_MODE: "rebase"
```

#### 使用拉取模式同步到 CNB

在 CNB 中配置流水线来定时拉取 GitHub 仓库

```yaml
# .cnb.yml

main:
  "crontab: 0 1 * * *": # 每天1点执行
    - name: sync from github
      stages:
        - name: sync from github
          image: tencentcom/git-sync
          settings:
            target_url: https://github.com/username/repo.git
            auth_type: https
            username: ${GIT_USERNAME}
            password: ${GIT_ACCESS_TOKEN}
            sync_mode: pull
```

### 从 CNB 同步到 GitHub

#### 使用默认模式同步到 GitHub

在 CNB 中使用推送模式, 建议使用密钥仓库来存储密 GIT_USERNAME、GIT_PASSWORD 等敏感信息，
然后使用 [imports](https://docs.cnb.cool/zh/grammar/pipeline.html#imports) 引用变量，提高安全性。

```yaml
# .cnb.yml
```

## B. 写认证层：带无效 token 推虚构仓库（不会碰任何真实仓库）

- exit=1
  `Configuring Git...`
  `Initializing Git LFS...`
  `Git LFS initialized.`
  `No Git LFS files found, skipping LFS operations`
  `Setting up authentication type: https`
  `HTTPS setup completed`
  `Setting up target remote repository...`
  `Remote repositories:`
  `target	https://cnb.cool/yuanbao-probe-nonexistent/probe-nonexistent/probe.git (fetch)`
  `target	https://cnb.cool/yuanbao-probe-nonexistent/probe-nonexistent/probe.git (push)`
  `Pushing all branches`
  `Error: Failed to push all branches`
  `Unable to find image 'tencentcom/git-sync:latest' locally`
  `latest: Pulling from tencentcom/git-sync`
  `bd1829412dd1: Pulling fs layer`
  `727c5cd82b08: Pulling fs layer`
  `67e27cf294fe: Pulling fs layer`
  `44cf07d57ee4: Pulling fs layer`
  `727c5cd82b08: Download complete`
  `bd1829412dd1: Download complete`
  `67e27cf294fe: Download complete`
  `44cf07d57ee4: Download complete`
  `09e169fdf666: Download complete`
  `44cf07d57ee4: Pull complete`
  `727c5cd82b08: Pull complete`
  `bd1829412dd1: Pull complete`
  `67e27cf294fe: Pull complete`
  `Digest: sha256:b7c4672616ddea5b89948dcd034610b29d37d8430e74b4bc83b421c963c25f77`
  `Status: Downloaded newer image for tencentcom/git-sync:latest`
  `remote: Repository Not Found.`
- 若出现 CNB 返回的 401/403/404（而非网络超时/拒绝连接），说明写请求到达 CNB 应用层

## C. 对照：Gitee 写认证层（同样用虚构仓库 + 无效凭证）

- exit=0
  `error: src refspec main does not match any`
  `error: failed to push some refs to 'https://gitee.com/yuanbao_probe_nonexistent/probe.git'`
