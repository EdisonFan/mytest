# CNB 同步方案验证（GitHub Actions runner 执行）

## A. CNB 的 git 协议（公开仓库，只读）

### git ls-remote HEAD
- exit=0
  `839ce6927601684f5bd70918d6bb240176288dec	HEAD`

### git ls-remote refs/heads/dev
- exit=0
  `839ce6927601684f5bd70918d6bb240176288dec	refs/heads/dev`

### git ls-remote --heads (前5行)
- exit=0
  `1ede232a4367875ee3bc0150d0bec7cc60ed758a	refs/heads/auto/engine-package-9040`
  `32142f32daaacc1d2ba539233f12b89d4daa6f3b	refs/heads/auto/migrate-pnpm-5668`
  `759b3d5304bb885c458e56b3014c082b26ace950	refs/heads/chore/pnpm`
  `6d84d6d30fd4780c9b45be873f21196f3fdcf5c9	refs/heads/clientStyle`
  `c95c9e7310a0dbc427639b2b5818b02fefa6f08b	refs/heads/copilot/add-go-project-daemon-manager`

### git clone --depth 1
- exit=0 | log: Cloning into '/tmp/cnbrepo'...
- 条目数=1680 | 顶层: .cargo, .changeset, .cnb, .cnb.yml, .code.yml, .devcontainer, .editorconfig, .git, .gitattributes, .github

## B. tencentcom/git-sync 镜像

- `docker pull tencentcom/git-sync` -> exit=0 | Pull complete bd1829412dd1: Pull complete Digest: sha256:b7c4672616ddea5b89948dcd034610b29d37d8430e74b4bc83b421c963c25f77 Status: Downloaded newer image for tencentcom/git-sync:latest docker.io/tencentcom/git-sync:latest
- **inspect Env** -> exit=0
  `["PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"]`
- **inspect Entrypoint/Cmd** -> exit=0
  `["/bin/entrypoint.sh"] null`
- **run --help** -> exit=1
  `Error: TARGET_URL is required`

### 从镜像内查找参数定义（PLUGIN_ 全集）
- exit=-1
  `TimeoutExpired: Command 'docker run --rm --entrypoint sh tencentcom/git-sync -c 'ls -la / && (grep -rho "PLUGIN_[A-Z_]*" / 2>/dev/null |`

## C. CNB 官方文档 / OpenAPI

- `https://api.cnb.cool/` -> HTTP 200 | 2424096 字符
  - [token] …r=class extends s{constructor(e,t,n,r){super(`at "${o(r)}", token "${e}" in "${o(n)}" does not exist`,i(t)),this.code="EMISSINGPOINTER"}});function c(e){Object.defineProp…
  - [mirror] …fragment=e}}class qO extends HO{constructor(e){super(),this.mirroredNode=e,this.fragment=e.fragment}get error(){return this.mirroredNode.error}get value(){return this.mir…
- `https://docs.cnb.cool/` -> HTTP 200 | 2014 字符
- `https://docs.cnb.cool/zh/guide/repo-mirror.html` -> HTTP 0 | 36 字符
- `https://docs.cnb.cool/zh/guide/token.html` -> HTTP 0 | 36 字符

## D. 结论所需：无凭证写 CNB 会停在哪一层

- 匿名只读 exit=0（成功=公开仓库可读）
- 推送需 CNB 的访问令牌（本轮未提供，不尝试写入，避免误操作）
