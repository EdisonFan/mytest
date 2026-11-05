# git-sync 参数全解与 CNB 写认证层验证

## A. 镜像入口脚本 `/bin/entrypoint.sh` 全文

- exit=0 | 13084 字符
```bash
#!/bin/sh
# set -x
set -e

# 检查必要的参数
if [ -z "$PLUGIN_TARGET_URL" ]; then
  echo "Error: TARGET_URL is required"
  exit 1
fi

if [ -z "$PLUGIN_AUTH_TYPE" ]; then
  PLUGIN_AUTH_TYPE="https"
fi

setup_ssh() {
  echo "Creating .ssh directory..."
  # 确保 .ssh 目录存在
  mkdir -p $HOME/.ssh
  chmod 700 $HOME/.ssh

  # 如果提供了 SSH KEY，则配置它
  if [ ! -z "$PLUGIN_SSH_KEY" ]; then
    echo "Installing SSH key..."
    echo "$PLUGIN_SSH_KEY" >/$HOME/.ssh/id_rsa
    chmod 600 $HOME/.ssh/id_rsa
  else
    echo "No SSH key provided!"
    exit 1
  fi

  echo "Adding known hosts..."
  # 修改这部分代码
  if ssh-keyscan -H github.com >> $HOME/.ssh/known_hosts 2>/dev/null; then
    echo "Successfully added github.com to known_hosts"
  else
    echo "Warning: Failed to add github.com to known_hosts using ssh-keyscan"
  fi

  if ssh-keyscan -H gitlab.com >> $HOME/.ssh/known_hosts 2>/dev/null; then
    echo "Successfully added gitlab.com to known_hosts"
  else
    echo "Warning: Failed to add gitlab.com to known_hosts using ssh-keyscan"
  fi

  # 如果提供了自定义域名，也添加到 known_hosts
  if [ ! -z "$PLUGIN_GIT_HOST" ]; then
    echo "Adding custom git host: $PLUGIN_GIT_HOST"
    ssh-keyscan -H $PLUGIN_GIT_HOST >> $HOME/.ssh/known_hosts 2>/dev/null || echo "Failed to add $PLUGIN_GIT_HOST to known_hosts"
  fi

  echo "SSH setup completed successfully"
}

setup_https() {
  if [ ! -z "$PLUGIN_USERNAME" ] && [ ! -z "$PLUGIN_PASSWORD" ]; then
    # 从 URL 中提取域名
    DOMAIN=$(echo "$PLUGIN_TARGET_URL" | sed -E 's/https?:\/\///' | cut -d'/' -f1)
    git config --global credential.helper store
    echo "https://$PLUGIN_USERNAME:$PLUGIN_PASSWORD@$DOMAIN" > $HOME/.git-credentials
  fi
}

# 配置 Git
echo "Configuring Git..."
git config --global user.name "${PLUGIN_GIT_USER:-Git Sync Plugin}"
git config --global user.email "${PLUGIN_GIT_EMAIL:-git-sync@plugin.local}"

# 确保 Git LFS 被正确初始化
echo "Initializing Git LFS..."
git lfs install

# 添加工作目录到安全目录列表
git config --global --add safe.directory "$(pwd)"


# 检查是否使用了 Git LFS
HAS_LFS_FILES=$(git lfs ls-files 2>/dev/null | wc -l || echo "0")
if [ "$HAS_LFS_FILES" -gt 0 ]; then
  # 输出 LFS 文件列表
  echo "Git LFS files found:" $HAS_LFS_FILES
else
  echo "No Git LFS files found, skipping LFS operations"
fi

# 根据认证类型设置
echo "Setting up authentication type: $PLUGIN_AUTH_TYPE"
case "$PLUGIN_AUTH_TYPE" in
"ssh")
  echo "Setting up SSH authentication..."
  setup_ssh
  echo "SSH setup completed"
  ;;
"https")
  setup_https
  echo "HTTPS setup completed"
  ;;
*)
  echo "Error: Invalid auth type. Must be 'ssh' or 'https'"
  exit 1
  ;;
esac

# 添加远程仓库
echo "Setting up target remote repository..."
git remote add target "$PLUGIN_TARGET_URL" || true
git remote set-url target "$PLUGIN_TARGET_URL" || true
echo "Remote repositories:"
git remote -v

if [ "$PLUGIN_PUSH_TAGS" = "true" ]; then
  echo "Fetching tags from origin to ensure local tags are available..."
  git fetch origin --tags --force ${PLUGIN_FETCH_OPTIONS:-} || echo "Warning: Failed to fetch tags from origin"
  echo "Local tags count: $(git tag -l | wc -l)"
fi

# 同步代码
if [ "$PLUGIN_SYNC_MODE" = "rebase" ]; then
  echo "Performing rebase sync with local staging..."

  # 保存当前目录
  SOURCE_DIR=$(pwd)
  SOURCE_GIT_DIR="$SOURCE_DIR/.git"

  # 添加源目录到安全目录列表
  git config --global --add safe.directory "$SOURCE_DIR"
  git config --global --add safe.directory "$SOURCE_GIT_DIR"

  # 创建临时目录作为工作区
  WORK_DIR=$(mktemp -d)
  echo "Created work directory: $WORK_DIR"

  # 创建临时裸仓库作为中转
  BARE_DIR=$(mktemp -d)
  echo "Created bare repository: $BARE_DIR"
  git init --bare $BARE_DIR

  # 设置目标仓库认证
  TARGET_REPO_URL="$PLUGIN_TARGET_URL"
  if [ "$PLUGIN_AUTH_TYPE" = "https" ] && [ ! -z "$PLUGIN_USERNAME" ] && [ ! -z "$PLUGIN_PASSWORD" ]; then
    # 提取域名并重构带认证的URL
    DOMAIN=$(echo "$PLUGIN_TARGET_URL" | sed -E 's/https?:\/\///' | cut -d'/' -f1)
    PATH_PART=$(echo "$PLUGIN_TARGET_URL" | sed -E 's/https?:\/\/[^\/]+//')
    TARGET_REPO_URL="https://$PLUGIN_USERNAME:$PLUGIN_PASSWORD@$DOMAIN$PATH_PART"
  fi

  # 克隆目标仓库到工作区
  echo "Cloning target repo..."
  cd $WORK_DIR
  if ! git clone "$TARGET_REPO_URL" .; then
    echo "Error: Failed to clone target repository"
    cd $SOURCE_DIR
    rm -rf $WORK_DIR $BARE_DIR
    exit 1
  fi

  # 添加工作目录到安全目录
  git config --global --add safe.directory "$WORK_DIR"

  # 添加源仓库和裸仓库作为远程仓库
  git remote add source "$SOURCE_DIR"
```

### 提取到的变量名

`BARE_DIR`, `BRANCHES`, `CURRENT_BRANCH`, `DOMAIN`, `GIT_LFS_SKIP_SMUDGE`, `HAS_LFS_FILES`, `HOME`, `PATH_PART`, `PLUGIN_AUTH_TYPE`, `PLUGIN_BRANCH`, `PLUGIN_FETCH_OPTIONS`, `PLUGIN_FORCE`, `PLUGIN_GIT_EMAIL`, `PLUGIN_GIT_HOST`, `PLUGIN_GIT_USER`, `PLUGIN_PASSWORD`, `PLUGIN_PUSH_TAGS`, `PLUGIN_SSH_KEY`, `PLUGIN_SYNC_MODE`, `PLUGIN_TARGET_URL`, `PLUGIN_USERNAME`, `REMOTE_BRANCHES`, `SOURCE_DIR`, `SOURCE_GIT_DIR`, `SUCCESSFUL_BRANCHES`, `TARGET_REPO_URL`, `TARGET_URL`, `WORK_DIR`

### 部分 `PLUGIN_` 映射（脚本里实际读取的）

- `PLUGIN_TARGET_URL`
- `PLUGIN_AUTH_TYPE`
- `PLUGIN_AUTH_TYPE`
- `PLUGIN_SSH_KEY`
- `PLUGIN_SSH_KEY`
- `PLUGIN_GIT_HOST`
- `PLUGIN_GIT_HOST`
- `PLUGIN_GIT_HOST`
- `PLUGIN_GIT_HOST`
- `PLUGIN_USERNAME`
- `PLUGIN_PASSWORD`
- `PLUGIN_TARGET_URL`
- `PLUGIN_USERNAME`
- `PLUGIN_PASSWORD`
- `PLUGIN_GIT_USER`
- `PLUGIN_GIT_EMAIL`
- `PLUGIN_AUTH_TYPE`
- `PLUGIN_AUTH_TYPE`
- `PLUGIN_TARGET_URL`
- `PLUGIN_TARGET_URL`
- `PLUGIN_PUSH_TAGS`
- `PLUGIN_FETCH_OPTIONS`
- `PLUGIN_SYNC_MODE`
- `PLUGIN_TARGET_URL`
- `PLUGIN_AUTH_TYPE`
- `PLUGIN_USERNAME`
- `PLUGIN_PASSWORD`
- `PLUGIN_TARGET_URL`
- `PLUGIN_TARGET_URL`
- `PLUGIN_USERNAME`
- `PLUGIN_PASSWORD`
- `PLUGIN_GIT_USER`
- `PLUGIN_GIT_EMAIL`
- `PLUGIN_FETCH_OPTIONS`
- `PLUGIN_BRANCH`
- `PLUGIN_BRANCH`
- `PLUGIN_PUSH_TAGS`
- `PLUGIN_TARGET_URL`
- `PLUGIN_BRANCH`
- `PLUGIN_BRANCH`
- `PLUGIN_BRANCH`
- `PLUGIN_BRANCH`
- `PLUGIN_PUSH_TAGS`
- `PLUGIN_SYNC_MODE`
- `PLUGIN_FETCH_OPTIONS`
- `PLUGIN_BRANCH`
- `PLUGIN_BRANCH`
- `PLUGIN_BRANCH`
- `PLUGIN_BRANCH`
- `PLUGIN_BRANCH`
- `PLUGIN_BRANCH`
- `PLUGIN_BRANCH`
- `PLUGIN_BRANCH`
- `PLUGIN_BRANCH`
- `PLUGIN_BRANCH`
- `PLUGIN_BRANCH`
- `PLUGIN_BRANCH`
- `PLUGIN_BRANCH`
- `PLUGIN_BRANCH`
- `PLUGIN_BRANCH`
- `PLUGIN_BRANCH`
- `PLUGIN_BRANCH`
- `PLUGIN_PUSH_TAGS`
- `PLUGIN_FETCH_OPTIONS`
- `PLUGIN_BRANCH`
- `PLUGIN_BRANCH`
- `PLUGIN_BRANCH`
- `PLUGIN_BRANCH`
- `PLUGIN_BRANCH`
- `PLUGIN_BRANCH`
- `PLUGIN_BRANCH`
- `PLUGIN_FORCE`
- `PLUGIN_BRANCH`
- `PLUGIN_BRANCH`
- `PLUGIN_FORCE`
- `PLUGIN_PUSH_TAGS`
- `PLUGIN_FORCE`

## B. 带无效 token 跑一次（目标是虚构仓库，不会写入任何真实仓库）

- exit=128
  `Configuring Git...`
  `Initializing Git LFS...`
  `Git LFS initialized.`
  `Git LFS files found: 1`
  `Setting up authentication type: https`
  `HTTPS setup completed`
  `Setting up target remote repository...`
  `Remote repositories:`
  `fatal: not a git repository (or any of the parent directories): .git`
  `fatal: not a git repository (or any of the parent directories): .git`
  `fatal: not a git repository (or any of the parent directories): .git`
- 说明：若返回 CNB 侧的认证/404 错误（而非网络不通），证明写请求能到达 CNB 应用层

## C. CNB 仓库里的原生配置（clone 下来的 tencent/cherry-markdown）

### `/tmp/cnbrepo/.cnb.yml` (954 字符)
```yaml
# .cnb.yml
'**':
  push:
    - imports:
        - https://cnb.cool/tencent/cherry-markdown/cherry-markdown-secret/-/blob/main/secret.yml
      stages:
        # cnb 同步代码到 github 仓库 https://cnb.cool/cnb/plugins/tencentcom/git-sync#%E4%BB%8E-cnb-%E5%90%8C%E6%AD%A5%E5%88%B0-github
        - name: sync to github
          image: tencentcom/git-sync
          settings:
            target_url: https://github.com/Tencent/cherry-markdown.git
            auth_type: https
            username: ${CHERRY_MARKDOWN_USERNAME}
            password: ${CHERRY_MARKDOWN_GITHUB_TOKEN}
            insecure_skip_verify: true
            timeout: 300
$:
  vscode:
    - docker:
        image: docker.cnb.cool/tencent/cherry-markdown/cherry-markdown
        # build: .cnb/Dockerfile
        volumes:
          - node_modules
      services:
        - vscode
        - docker
      stages:
        - name: install dependencies
          script:
            - yarn install
```
### `/tmp/cnbrepo/.cnb/config.yml` — 不存在
### `/tmp/cnbrepo/.github/workflows/sync-cnb.yml` (1609 字符)
```yaml
# =============================================================================
# Sync: CNB — 同步代码到腾讯 CNB 仓库
#
# 触发时机: 任何 push / 删除分支时自动运行
# 功能:
#   - push: 双向同步代码到 cnb.cool/tencent/cherry-markdown/cherry-markdown.git
#   - delete: 通过 PR trigger 删除 CNB 上对应分支
# 注意: delete job 仅限主仓库触发，防止 fork 误操作
# =============================================================================

name: 'Sync: CNB'

on:
  - push
  - delete

permissions:
  contents: read

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: false

jobs:
  sync-push:
    if: github.repository == 'Tencent/cherry-markdown'
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0

      - name: Sync to CNB Repository
        uses: docker://tencentcom/git-sync
        env:
          PLUGIN_TARGET_URL: 'https://cnb.cool/tencent/cherry-markdown/cherry-markdown.git'
          PLUGIN_AUTH_TYPE: 'https'
          PLUGIN_USERNAME: 'cnb'
          PLUGIN_PASSWORD: ${{ secrets.CHERRY_MARKDOWN_CNB_SYNC_GITHUB }}
          PLUGIN_FORCE: 'true'

  sync-delete-branch:
    if: ${{ github.repository == 'Tencent/cherry-markdown' && github.event_name == 'delete' && github.event.ref_type == 'branch' }}
    runs-on: ubuntu-latest
```

## D. CNB OpenAPI 页面里的接口线索

- 页面 2424096 字符 | 提取路径 8 | 含 repos 类 0
