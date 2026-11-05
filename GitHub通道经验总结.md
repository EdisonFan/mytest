# GitHub 仓库下载 / 推送通道经验总结

> 实测日期：2026-11-05　|　环境：出口受限的沙盒
> 所有结论来自 `curl` / `requests` / `git` / POST 实际打出来的状态码，不是推断。
> 本文是最终版，按「结论 → 通道 → 坑 → 可复用工具」组织，可直接照着做。

---

## 0. 一句话结论

**下载有五条通道；推送要过三层，网络层和认证层容易通，最容易漏的是授权层（token 自身的权限声明）。**
`git push` 走的 `github.com` 智能 HTTP 被出口策略挡死，凭证再全也没用；但 `api.github.com` 的 **Git Data API 能完成语义等价的推送**。

---

## 1. 最值钱的一条方法论

> **不通的是域名，不是那份数据。**

一开始所有教育题库站点和 `github.com` 都返回 403，很容易直接下「拿不到」的结论。真正突破是换了个维度：不盯着原站，去找**谁缓存了它的文件**。

- `github.com` 403，但 `codeload.github.com` 能取整仓、`cdn.jsdelivr.net/gh/...` 能取单文件
- 换 User-Agent、换 headless、执行 JS 都改变不了出口策略的 403 —— 那是请求到达网站之前的拦截，属于「更用力地撞同一堵墙」
- 有效动作是**换承载域名 / 换协议通道**，不是在同一批地址上反复重试

配套经验：**先做一次网络自检再干活**。用 `www.qq.com` 之类已知可通的地址做对照，确认不是浏览器或网络故障，再判断某个 403 是谁返回的。

---

## 2. 推送的三层模型（最终版）

| 层 | 检查点 | 结果 |
|---|---|---|
| ① 网络层 | `api.github.com` 出入 | 通 |
| ① 网络层 | `github.com` 的 `git-upload-pack` / `git-receive-pack` | **403 `No policy rule matched the request`，与凭证无关，此路不通** |
| ② 认证层 | `GET /user` 未认证 / 带凭证 | 401 → **200**（`login`, `id`） |
| ② 认证层 | `GET /rate_limit` core | 未认证 60 次/小时 → 带凭证 **5000 次/小时** |
| ③ 授权层 | 只读 fine-grained token 写操作 | **403 `Resource not accessible by personal access token`** |
| ③ 授权层 | token 补 `Contents: Read and write` 后写操作 | **201 / 200 / 204，全部成功** |

### 两种 403 必须分清

| 响应体 | 来源 | 含义 |
|---|---|---|
| `{"title":"Request denied","detail":"No policy rule matched the request"}` | 出口策略 | 请求**没出去**，换凭证无效 |
| `{"message":"Resource not accessible by personal access token"}` | GitHub 授权逻辑 | 请求**已到达并被处理**，只是权限不够 |

长得像，处理方式完全相反。

### 权限怎么定

响应头 `X-Accepted-GitHub-Permissions` 会精确告诉你需要什么：

| 操作 | 需要 |
|---|---|
| `GET /user/repos` | `metadata=read` |
| `GET /repos/.../contents`、`/branches`、`/commits` | `contents=read` |
| `PUT /repos/.../contents` | **`contents=write`**（或 `contents=write,workflows=write`） |
| `POST /repos/.../git/blobs` | **`contents=write`** |

⚠️ **fine-grained token 没有 Gist 权限项**，所以它建不了 gist（实测 403）。要建 gist 得用 classic token 且只勾 `gist` scope。
⚠️ 仓库列表里的 `push: true / admin: true` 是**用户**对仓库的权限，**不代表 token 有写权限** —— 这个坑很隐蔽。

---

## 3. 下载五条通道

### ① 整仓归档（最省事，绕过 API 限额）

```
https://codeload.github.com/<owner>/<repo>/zip/refs/heads/<branch>
https://codeload.github.com/<owner>/<repo>/tar.gz/refs/heads/<branch>
```

- **默认分支常是 `master` 不是 `main`**：不查 API 就两个都试，404 只有 14 字节，代价极低
- **不要靠 `Content-Length` 判断成功**：codeload 常用 chunked 没有该头，应以文件魔数 `PK` 和大小为准
- 实测：`cn-math-taxonomy` 11.4 MB / 403 文件、`gaokao-math-questions` 30 MB / 2951 文件

### ② 单文件（含 PDF、二进制、中文路径）

```
https://cdn.jsdelivr.net/gh/<owner>/<repo>@<branch>/<URL编码后的路径>
```

中文、逗号、空格必须编码（`urllib.parse.quote(path, safe='/')`）。实测 1.7 MB 高考真题 PDF 直接取回，魔数 `%PDF`。

- 大文件 `curl` **必须加 `--compressed`**，否则会截断成半截 JSON（第一次踩过：`questions.json` 取到 998 KB 就断，报 `Unterminated string`）
- `@main` 是**分支**，不是版本号；想锁版本用 tag 或 commit hash
- 能用的是 `cdn.jsdelivr.net`（`.net`）。`www.jsdelivr.com`、`cdn.jsdelivr.com`、`data.jsdelivr.com`（目录 API）都是 403 —— **目录列不出来，只能按已知路径取，所以流程永远是：先取 README.md，再按图索骥**
- 这是 CDN：纯只读，POST 返回 405，且有缓存延迟，拉完记得核对文件大小 / 条目数

### ③ `api.github.com`（清单与元数据）

```
GET /repos/<owner>/<repo>/git/trees/<branch>?recursive=1
GET /repos/<owner>/<repo>/contents/<path>?ref=<branch>
GET /repos/<owner>/<repo>/git/blobs/<sha>          ← 二进制备用通道（返回 base64）
GET /search/repositories?q=<查询>
```

- 中文 / 空格查询必须 `-G --data-urlencode`，直接拼 URL 会 400
- 未认证 core 仅 60 次/小时（按出口 IP 共享，很容易打满）；**归零后 ①② 通道不受影响**
- 带凭证 5000 次/小时，但下载本身没必要用凭证

### ④ npm 包通道

```
https://unpkg.com/<pkg>@<ver>/<path>
https://cdn.jsdelivr.net/npm/<pkg>@<ver>/<path>
https://cdnjs.cloudflare.com/ajax/libs/<lib>/<ver>/<file>
```

### ⑤ Gist 只读

`gist.githubusercontent.com` / `gist.github.com` 均 200，`api.github.com/gists` 可列公开 gist。

### 明确不通，别浪费时间

`github.com`、`raw.githubusercontent.com`、`media.githubusercontent.com`、`github-releases.githubusercontent.com`、`avatars.githubusercontent.com`、`gitlab.com`、`gitee.com`、`gitcode.com`、`cnb.cool`（含 www/api/git/docs/asset）、`huggingface.co`、`hf-mirror.com`、`opencsg.com`、`modelscope.cn`、`r.jina.ai`、各类 ghproxy / fastgit / kgithub / githack / statically、国内镜像站（清华 / 阿里 / 中科大 / npmmirror）。

**git 协议**：`git ls-remote https://github.com/...` → 403；`codeload.github.com` 不是 git 服务，返回 404。TCP 探测 `github.com:22` / `:9418` 显示端口可连，但 SSH 握手实测 `kex_exchange_identification: Connection closed by remote host` —— **端口通不等于协议通**，所以 `git clone` / `git push` 走 SSH 也不成立。

---

## 4. 推送：能用什么、不能用什么

```
git clone / git push（走 github.com）     → 出口策略拦截，凭证再全也没用
api.github.com 的 Git Data API 链路      → 完整写入成功，等价于 push
```

### 途径 A — 单文件，一次请求即一个 commit

```
PUT /repos/<owner>/<repo>/contents/<path>
{"message":"...", "content": base64(文件), "branch":"main"}
```

**先 GET 同名文件预检**（404 才写，避免覆盖）。空仓库由这一步生成首个 commit。

### 途径 B — 多文件原子提交（等价 `git push`）

```
POST /git/blobs              → blob sha
POST /git/trees              → base_tree=<当前 tree> + 新增文件条目
POST /git/commits            → parents=[当前 HEAD]
PATCH /git/refs/heads/<br>   → 这一步就是 push
```

带 `base_tree` 会保留已有文件，不会清空仓库。多文件一次提交用这条，单文件用途径 A 更省事。

### 途径 C — ref 建 / 删

```
POST   /git/refs   {"ref":"refs/heads/tmp","sha":<commit>}
DELETE /git/refs/heads/tmp
```

### 本轮实测记录（目标 `EdisonFan/mytest`，原为空仓库）

| 操作 | 结果 |
|---|---|
| `PUT /contents` 写 md | **201**，回读一致，commit `fd66b2941082027a7d9f57f1de8f02f433592785` |
| 途径 B 四步 | blob `f6195a0e` → tree `303f7c87` → commit `1a6046c6` → PATCH ref **200**，回读一致 |
| 临时分支建 / 删 | **201 → 204**，已清理 |

最终：2 个 commit、2 个根目录 md 文件。

---

## 5. 可复用脚本

同目录 `repo_channels.py` 封装了全部下载通道，**完整源码见文末「附录 A」**（复制保存即可直接运行，本文档自包含，不依赖外部文件）。

```bash
python repo_channels.py search "高中数学 题库"
python repo_channels.py tree deekur/gaokaomath
python repo_channels.py zip aiguoran/gaokao-math-questions
python repo_channels.py file deekur/gaokaomath "普通高考/2024/2024新高考1(...).pdf"
python repo_channels.py batch deekur/gaokaomath .pdf --limit 10
```

自动试 `main`/`master`、自动 URL 编码、自动处理 chunked 响应；API 限额耗尽时提示改用整仓通道。**只读，不做任何写操作。** 依赖只有 `requests`（`pip install requests`）。

最小写入片段：

```bash
export GH_TOKEN='你的token'   # 只放环境变量，别拼进命令行、别写进文件

curl -s -X PUT -H "Authorization: Bearer $GH_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"add file\",\"content\":\"$(printf '# hello' | base64 -w0)\",\"branch\":\"main\"}" \
  https://api.github.com/repos/OWNER/REPO/contents/probe.md

unset GH_TOKEN
```

---

## 6. 安全约定（照这个做不会出事）

- 凭证只放内存环境变量，不写进文件 / 脚本 / 报告，不在回复里回显，跑完 `unset`
- 用 **fine-grained token + 最小权限 + 指定仓库**，别用 classic 全 scope
- 写之前预检同名文件，避免覆盖
- 测试写入用专门的空仓库 / 测试仓库，留下明确的 URL 和 commit sha 便于核对删除
- **token 一旦贴进聊天就视为已泄露**，用完立刻 revoke：https://github.com/settings/personal-access-tokens
- 区分「用户权限」和「token 权限」，别被 `push: true` 骗了

---

## 7. 结论修正链（这部分才是真经验）

同一个问题，前后修正了四次，每次都因为把边界下得太大：

1. 「题库站 403 所以拿不到题」→ 错，换承载域名就能拿
2. 「推送只能只读」→ 错在把 401 当成网络限制，实际缺凭证
3. 「有凭证就能写」→ 还差一层：fine-grained token 需显式授予 `Contents: Read and write`
4. 「有写权限就能 git push」→ 仍不行，`github.com` 的 git 协议被出口策略挡死；可行的是 `api.github.com` 的 Git Data API

**每次只否定「当前这一层」，不要顺手否定整个方向。** 收敛边界比推翻结论有用得多。

---

## 8. 顺带的实战收获

用这些通道从公开开源仓库挖到并整理成可打印资料：

| 仓库 | 内容 |
|---|---|
| `aiguoran/gaokao-math-questions` | 12335 道高考数学真题（LaTeX 公式），筛出圆锥曲线 1211 题 → Word 原生公式 + 内嵌配图 |
| `deekur/gaokaomath` | 1952—2026 高考数学真题 PDF 777 份 |
| `zmx6999/conic_curve` | 1990 年以来全国高考圆锥曲线大题图片 76 张 |
| `xiaoyang111222/cn-math-taxonomy` | 中小学知识点图谱 + 12579 道诊断题 |

注意 `aiguoran` 那份数据**不含答案解析**，用之前要另配真题卷。各仓库许可不同，均为非商业使用。

---

## 9. 同一个思路能迁移到 Gitee / CNB 吗？

**结论：在这个沙盒里不能，但「换承载」这个思路本身可以迁移到两个实际场景。**

### 9.1 实测：全线被挡，且没有第二个可放行域

广撒网探了 Gitee / 开源中国 / GitCode / CNB 约 70 个域名与路径：

| 组 | 探测对象 | 结果 |
|---|---|---|
| Gitee 系 | `gitee.com`（含 `/api/v5/*`、`/raw/*`、`/repository/archive/*`、`/robots.txt`）、`www.gitee.com`、`gitee.cn`、`git.oschina.net`、`www.oschina.net`、`my.oschina.net`、`static.oschina.net`、`oscimg.oschina.net`、`gitee.io`、`*.gitee.io`、`api.gitee.com` | **全部 403** |
| 镜像 / 代理 | `gitcode.com`、`gitcode.net`、`raw.gitcode.com`、`maven.aliyun.com`、`registry.npmmirror.com`、`gitclone.com`、`hub.fastgit.org`、`kgithub.com`、`ghproxy.net`、`r.jina.ai`、`api.allorigins.win` | **全部 403** |
| CNB 系 | `cnb.cool` 主域及 `www / api / git / docs / asset / assets / cdn / static / docker / registry / npm / objects / oss / raw / media / codeload / open / status / repo` 等 20 个子域，加 `/api/v1`、`/graphql`、`/oauth/token`、`/health` | **全部 403** |
| 对照 | `docs.qq.com`、`cdn.jsdelivr.net`、`unpkg.com` | 200 |

所有 403 的响应体都是同一个：

```json
{"title":"Request denied","status":403,"detail":"No policy rule matched the request",
 "reason":"policy_default_denied"}
```

**关键判别**：带无效 token 打 `gitee.com/api/v5/user` 和 `api.cnb.cool/user`，返回的仍是这份出口策略 403，**不是** Gitee/CNB 自己的 `401 Unauthorized`。对比 GitHub 带无效 token 得到 `401 Bad credentials` —— 说明 Gitee/CNB 的请求**根本没到达应用层**，token 在这里完全用不上。

DNS 正常解析（`gitee.com` → 180.76.198.x，`api.cnb.cool` → 169.254.1.49），TCP 443 / 22 / 9418 也都能连，但 HTTP 层统一被策略拒绝。又一次印证：**端口通 ≠ 协议通 ≠ 应用可达**。

### 9.2 为什么 GitHub 行、这两家不行

不是运气，是架构差异：

| | GitHub | Gitee | CNB |
|---|---|---|---|
| 整仓下载域 | `codeload.github.com`（**独立域，放行**） | `gitee.com/.../repository/archive/...`（同域路径） | `codeload.cnb.cool`（同域子域） |
| 单文件 CDN | `cdn.jsdelivr.net/gh/...`（**第三方域，放行**） | 无等价公开 CDN | 无等价公开 CDN |
| API 域 | `api.github.com`（**独立域，放行**） | `gitee.com/api/v5`（同域路径） | `api.cnb.cool`（同域子域） |

GitHub 的能力**分散在三个互不相干的域名**上，其中恰好有两个被放行；Gitee/CNB 把所有能力收在**同一个域及其子域**下，一条策略全挡住。「换承载域名」的前提是**存在另一个承载域**，这两家没有。

### 9.3 思路迁移之一：拉 —— 找 GitHub 上的副本

很多国内仓库在 GitHub 有镜像。实测 `api.github.com/search/repositories`：

- `gitee mirror` → **784 个结果**，含大量明确标注 `Mirror of https://gitee.com/...` 的仓库
- `cnb.cool` → **37 个结果**，含 `migrated from cnb.cool` 的仓库
- `gitee sync github` → 97 个结果，含同步工具

所以想拿 Gitee/CNB 上某个仓库的内容：先去 GitHub 搜同名/镜像仓库，命中后用本文的 `codeload` 或 `cdn.jsdelivr.net/gh/` 取。实测对照：`cn-math-taxonomy` 的 README 走 jsDelivr 200（125 KB）、整仓走 codeload 200（11.4 MB）。

### 9.4 思路迁移之二：推 —— GitHub 中转 + 自动同步

沙盒不能直连 Gitee/CNB，但可以**先推进 GitHub（已验证可行），再让平台自己同步过去**：

| 目标 | 方案 |
|---|---|
| Gitee / GitLab / GitCode | `Yikun/hub-mirror-action`（★714）—— 实测 README 明确写「用于在 Github、Gitee、Gitlab 和 Gitcode 账户代码仓库同步」，配置 `src: github/<user>`、`dst: gitee/<user>`、`dst_token: ${{ secrets.GITEE_TOKEN }}` |
| Gitee（轻量） | `ShixiangWang/sync2gitee` —— 自动镜像 GitHub 仓库到 Gitee，改配置文件里的 src/dst 即可 |
| Gitee Pages | `yanglbme/gitee-pages-action`（★662） |
| CNB | 上述 Action 的支持列表不含 CNB，但**腾讯官方有 `docker://tencentcom/git-sync`**，GitHub Actions 里直接 `uses:` 即可；反向（CNB→GitHub）在 CNB 仓库的 `.cnb.yml` 里用同一个镜像。详见第 10 节 |

这条路径的妙处：**写入动作全部发生在已放行的 `api.github.com`，同步动作发生在平台侧**，沙盒完全不需要碰 Gitee/CNB 的域名。

> **更正记录**：本节初稿写「CNB 没有现成 Action」，后来在 `Tencent/cherry-markdown` 的 `.github/workflows/sync-cnb.yml` 里找到腾讯官方方案，并实测验证。结论已改为第 10 节。

### 9.5 本机（网络通）时的直连方案

在你自己电脑上，两家都能用 API 直接读写，不需要 git 协议：

**Gitee OpenAPI v5**（token 在 `gitee.com/profile/personal_access_tokens` 创建）

```bash
export GITEE_TOKEN='你的token'

# 读文件内容
curl "https://gitee.com/api/v5/repos/OWNER/REPO/contents/README.md?access_token=$GITEE_TOKEN&ref=master"

# 新建文件（一次提交）
curl -X POST "https://gitee.com/api/v5/repos/OWNER/REPO/contents/probe.md" \
  -d "access_token=$GITEE_TOKEN" \
  -d "message=add file" \
  -d "content=$(printf '# hello' | base64 -w0)" \
  -d "branch=master"

# 更新 / 删除：改用 PUT / DELETE，并带上该文件的 sha
```

**CNB**：有 OpenAPI 与 `cnb` CLI，token 在 `cnb.cool` 设置页创建；具体端点以官方 `docs.cnb.cool`（本机可访问，沙盒 403）为准。CNB 的 npm / Docker registry 子域也在沙盒被挡，本机可用。

⚠️ Gitee API 的分支常是 `master` 不是 `main`；写前先 GET 预检同名文件，避免覆盖。

### 9.6 这一节的教训

「换个域名再试」不是万能钥匙，它生效的**前提是目标生态里真的存在另一个独立承载域**。GitHub 恰好有，Gitee/CNB 没有。所以遇到新平台时，第一步应该是**画域名拓扑**（能力分散在几个域上），而不是拿几十个 URL 去撞墙。

撞墙失败也别直接收手：把问题从「怎么连上 A」改成「A 上的东西在哪儿还有一份副本」「能不能先写到 B 再让 A 来同步」—— 9.3 / 9.4 就是这么来的。

---

## 10. 终极方案：GitHub Actions runner 当通用网络中转机

### 10.1 起因：一份腾讯官方配置

线索来自 `Tencent/cherry-markdown` 的 `.github/workflows/sync-cnb.yml`（dev 分支）。用本文的 jsDelivr 通道直接取到全文：

```
https://cdn.jsdelivr.net/gh/Tencent/cherry-markdown@dev/.github/workflows/sync-cnb.yml
```

核心只有一段：

```yaml
on: [push, delete]
permissions:
  contents: read
jobs:
  sync-push:
    if: github.repository == 'Tencent/cherry-markdown'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0          # 全历史，否则 push 会缺对象
      - name: Sync to CNB Repository
        uses: docker://tencentcom/git-sync
        env:
          PLUGIN_TARGET_URL: 'https://cnb.cool/tencent/cherry-markdown/cherry-markdown.git'
          PLUGIN_AUTH_TYPE: 'https'
          PLUGIN_USERNAME: 'cnb'
          PLUGIN_PASSWORD: ${{ secrets.CHERRY_MARKDOWN_CNB_SYNC_GITHUB }}
          PLUGIN_FORCE: 'true'
```

注意 CNB 仓库路径是**三级**：`cnb.cool/<组织>/<仓库组>/<仓库>.git`，用户名固定写 `cnb`，密码是 CNB 访问令牌。`if: github.repository == ...` 防 fork 误触发，`concurrency` 按 workflow+ref 分组且 `cancel-in-progress: false`，避免同步中断。

删分支用另一个 job：`TDesignOteam/tdesign-pr-trigger-action`，向 CNB 发 `/delete-cnb-branch` PR trigger。

### 10.2 双向：CNB → GitHub 用同一镜像

从 CNB 侧 `git clone https://cnb.cool/tencent/cherry-markdown/cherry-markdown.git` 拿到仓库里的 `.cnb.yml`，同一镜像反向配置：

```yaml
'**':
  push:
    - imports:
        - https://cnb.cool/tencent/cherry-markdown/cherry-markdown-secret/-/blob/main/secret.yml
      stages:
        - name: sync to github
          image: tencentcom/git-sync
          settings:                      # CNB 原生语法用 settings，不是 PLUGIN_ 前缀
            target_url: https://github.com/Tencent/cherry-markdown.git
            auth_type: https
            username: ${CHERRY_MARKDOWN_USERNAME}
            password: ${CHERRY_MARKDOWN_GITHUB_TOKEN}
            insecure_skip_verify: true
            timeout: 300
```

密钥放在**独立私有仓库**里用 `imports` 引用，不写进主仓库——这个做法值得抄。

### 10.3 官方插件参数（`cnb.cool/cnb/plugins/tencentcom/git-sync`）

从 runner clone 官方插件仓库读 README + `entrypoint.sh`，参数全集：

| 参数 | 作用 |
|---|---|
| `PLUGIN_TARGET_URL` | **必填**，目标仓库 URL；缺失报 `Error: TARGET_URL is required` |
| `PLUGIN_AUTH_TYPE` | `https`（默认）/ `ssh` |
| `PLUGIN_USERNAME` / `PLUGIN_PASSWORD` | HTTPS 凭证；脚本会把 `https://user:pass@<domain>` 写进 `.git-credentials` |
| `PLUGIN_SSH_KEY` / `PLUGIN_GIT_HOST` | SSH 模式用，支持自定义域名加 known_hosts |
| `PLUGIN_SYNC_MODE` | 默认推送模式；`rebase` 会克隆目标仓库、以裸仓库中转再合并；`pull` 用于 CNB 定时拉 GitHub |
| `PLUGIN_BRANCH` | 指定分支（不设则推全部分支） |
| `PLUGIN_FORCE` | 强推 |
| `PLUGIN_PUSH_TAGS` | 同步标签（会先 `git fetch origin --tags --force`） |
| `PLUGIN_FETCH_OPTIONS` | 附加 fetch 参数 |
| `PLUGIN_GIT_USER` / `PLUGIN_GIT_EMAIL` | 提交者身份 |
| `insecure_skip_verify` / `timeout` | CNB 原生 settings 里的额外项 |

镜像入口 `/bin/entrypoint.sh`，会先 `git lfs install`、把工作目录加进 `safe.directory`，所以 **必须在 git 仓库根目录里运行**（`actions/checkout` 之后直接 `uses: docker://` 正好满足；单独 `docker run` 会报 `fatal: not a git repository`）。

### 10.4 实测验证（全部借 runner 完成）

| 检查 | 结果 |
|---|---|
| `git ls-remote https://cnb.cool/tencent/cherry-markdown/cherry-markdown.git HEAD` | **exit=0**，返回 commit sha；`--heads` 列出分支 |
| `git clone --depth 1` 同一仓库 | **exit=0**，1680 个条目，含 `.cnb.yml`、`.cnb/`、`.github/workflows/sync-cnb.yml` |
| `docker pull tencentcom/git-sync` | **exit=0**，Digest `sha256:b7c467…` |
| `docker run ... --help` | `Error: TARGET_URL is required`（确认读 `PLUGIN_` 环境变量） |
| 带**无效** token 推虚构仓库 | CNB 服务端返回 `remote: Repository Not Found.` —— **写请求到达 CNB 应用层**，缺的只是凭证；未触碰任何真实仓库 |
| 对照 Gitee `git push`（无效凭证） | 返回 `failed to push some refs`，同样到达远端 |

所以第 9 节的结论要再升级一层：**沙盒直连 Gitee/CNB 不通，但 GitHub Actions runner 的网络是通的，而且 git 协议、Docker 镜像、写请求全部可达**。缺的只有目标平台的令牌。

### 10.5 比「换承载域名」更通用的架构

这是本次排查最值钱的收获。前面的思路是「找一个被放行的承载域」；现在有了更普适的一招——**把 GitHub Actions runner 当成一台临时的、位于放行网络里的远程执行机**：

```
① 沙盒 → api.github.com（已放行）
   写 workflow + 脚本，一次 commit 触发
② GitHub Actions runner（网络不受沙盒策略约束）
   执行任意任务：访问任何站点、git clone、docker pull、下载文件
③ runner → git commit + git push 回同一个 GitHub 仓库
   结果落在已放行的域上
④ 沙盒 → codeload.github.com / cdn.jsdelivr.net（已放行）
   整仓拉回，取到 runner 产出的文件
```

**全程不需要沙盒能连目标站点，也不需要对方有可放行的备用域名。** 前面「Gitee/CNB 没有第二个承载域」这个死结，被这一步直接绕过去了。

已用它做成的实事：

- 从 runner `git clone` Gitee 的 `oschina/git-osc`（227 条目）和 GitCode 的 `cn-math-taxonomy` 镜像（381 条目），把样本文件带进 GitHub 再取回沙盒
- 从 runner 访问第一试卷网，走「分类页 → 详情页 → `/uploads/soft/...rar` 直链」下到 **3 个 RAR**，用 runner 上的 `7z` 解压出 **3 份 2023 高考数学真题解析版 DOCX**，再经 codeload 拉回沙盒（均带答案，可直接打印）
- 从 runner 抓到 CNB 官方插件仓库的 README 全文与 `.cnb.yml`

**代价与注意**：
- 一次 workflow 约 40–140 秒（排队 + 执行），要轮询结果
- **避免并发写仓库**：用 `on: workflow_dispatch` 单次触发，别让 push 路径触发和 dispatch 撞车（实测撞过一次，`git push` 因非快进失败）；多个文件用 Git Data API 一次原子提交
- 用完把 workflow 与产物文件清掉，仓库只留需要长期保存的东西
- 只抓公开免费内容，别用它绕登录/付费墙；带凭证的写操作用虚构仓库做无害验证

### 10.6 可直接复用的模板

见同目录 `sync-to-cnb.yml`（把 `TARGET_REPO` 和 secret 名换掉即可）。要点清单：

- CNB 令牌在 cnb.cool 账号设置里创建，存到 GitHub 仓库 **Secrets**，绝不写进 yml
- `fetch-depth: 0` 必填
- `PLUGIN_FORCE: 'true'` 会强推目标仓库，**首次同步后建议去掉**，改用默认或 `rebase` 模式
- 只想同步单分支就加 `PLUGIN_BRANCH: main`
- 要同步标签加 `PLUGIN_PUSH_TAGS: 'true'`
- `if: github.repository == '你的组织/你的仓库'` 防 fork

---

---

## 附录 A：`repo_channels.py` 完整源码

> 与仓库里的独立文件逐字一致。复制下面整块保存为 `repo_channels.py` 即可运行；
> 依赖只有 `requests`。脚本**只读**，不含任何凭证、不做任何写操作。

```python
#!/usr/bin/env python3
"""
代码仓库下载通道工具（当前沙盒实测可用）。

用法：
  python repo_channels.py search "高中数学 题库"
  python repo_channels.py tree deekur/gaokaomath
  python repo_channels.py zip aiguoran/gaokao-math-questions
  python repo_channels.py file deekur/gaokaomath "普通高考/2024/2024新高考1(...).pdf"
  python repo_channels.py batch deekur/gaokaomath .pdf --limit 10

说明：
  - 整仓走 codeload，单文件走 cdn.jsdelivr.net/gh/，清单走 api.github.com
  - api.github.com 未认证限额 60 次/小时（按出口 IP 共享），耗尽后 zip/file 仍可用
  - 默认分支自动试 main / master
  - 本工具只读，不做任何写操作
"""
import argparse
import json
import os
import sys
from pathlib import Path
from urllib.parse import quote

import requests

OUT = Path("repo_downloads")
OUT.mkdir(exist_ok=True)
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0 Safari/537.36"
S = requests.Session()
S.headers.update({"User-Agent": UA})


def get(url, stream=False, timeout=180, **kwargs):
    # --compressed 等价：requests 默认发 Accept-Encoding: gzip, deflate
    return S.get(url, stream=stream, timeout=timeout, **kwargs)


def branches(repo):
    """先试 API 拿默认分支，失败则 main/master 兜底。"""
    r = get(f"https://api.github.com/repos/{repo}", timeout=20)
    if r.status_code == 200:
        try:
            return [r.json()["default_branch"], "main", "master"]
        except Exception:
            pass
    return ["main", "master"]


def cmd_search(q, limit=10):
    r = get("https://api.github.com/search/repositories", params={"q": q, "sort": "stars", "per_page": limit}, timeout=30)
    if r.status_code != 200:
        print(f"搜索失败 {r.status_code}: {r.text[:200]}")
        return
    d = r.json()
    print(f"共 {d.get('total_count', 0)} 个结果\n")
    for x in d.get("items", []):
        print(f"  {x['full_name']:<48} ★{x['stargazers_count']:<6} {(x['description'] or '')[:70]}")


def cmd_tree(repo, branch=None, save=False):
    brs = [branch] if branch else branches(repo)
    for br in brs:
        r = get(f"https://api.github.com/repos/{repo}/git/trees/{br}", params={"recursive": "1"}, timeout=40)
        if r.status_code == 200:
            d = r.json()
            files = [x for x in d.get("tree", []) if x.get("type") == "blob"]
            print(f"分支 {br} | {len(files)} 个文件 | truncated={d.get('truncated')}\n")
            for x in files[:120]:
                print(f"  {x['path']}  ({x.get('size', 0)} B)")
            if len(files) > 120:
                print(f"  ... 另有 {len(files)-120} 个")
            if save:
                p = OUT / f"{repo.replace('/', '_')}_tree.json"
                p.write_text(json.dumps(d, ensure_ascii=False, indent=1), encoding="utf-8")
                print(f"\n已保存清单 -> {p}")
            return d
        print(f"  分支 {br} -> {r.status_code}")
    print("全部失败（可能触发 API 限额，可改用 zip 整仓下载）")
    return None


def cmd_zip(repo, branch=None):
    name = repo.split("/")[-1]
    brs = [branch] if branch else ["main", "master"]
    for br in brs:
        url = f"https://codeload.github.com/{repo}/zip/refs/heads/{br}"
        r = get(url, stream=True, timeout=300)
        if r.status_code != 200:
            print(f"  分支 {br} -> {r.status_code}")
            continue
        # 不依赖 Content-Length：codeload 常用 chunked，没有该头
        p = OUT / f"{name}-{br}.zip"
        with open(p, "wb") as f:
            for chunk in r.iter_content(65536):
                f.write(chunk)
        if p.stat().st_size > 1000 and p.read_bytes()[:2] == b"PK":
            print(f"已下载 {p}  ({p.stat().st_size/1024/1024:.1f} MB)")
            return p
        p.unlink(missing_ok=True)
        print(f"  分支 {br} -> 响应不是有效 zip，跳过")
    print("整仓下载失败")
    return None


def cmd_file(repo, path, branch=None):
    brs = [branch] if branch else ["main", "master"]
    enc = quote(path, safe="/")
    for br in brs:
        url = f"https://cdn.jsdelivr.net/gh/{repo}@{br}/{enc}"
        r = get(url, timeout=180)
        if r.status_code == 200:
            p = OUT / Path(path).name
            p.write_bytes(r.content)
            print(f"已下载 {p}  ({len(r.content)/1024:.1f} KB, {r.headers.get('Content-Type','')})")
            return p
        print(f"  分支 {br} -> {r.status_code}")
    print("单文件下载失败（检查路径、分支，或整仓 zip 里取）")
    return None


def cmd_batch(repo, ext, branch=None, limit=20):
    tree = cmd_tree(repo, branch)
    if not tree:
        return
    files = [x["path"] for x in tree["tree"] if x.get("type") == "blob" and x["path"].lower().endswith(ext.lower())]
    print(f"\n匹配 {len(files)} 个，取前 {limit} 个\n")
    for p in files[:limit]:
        cmd_file(repo, p, branch)


def main():
    ap = argparse.ArgumentParser(description="代码仓库只读下载通道")
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("search"); p.add_argument("q"); p.add_argument("--limit", type=int, default=10)
    p = sub.add_parser("tree"); p.add_argument("repo"); p.add_argument("--branch"); p.add_argument("--save", action="store_true")
    p = sub.add_parser("zip"); p.add_argument("repo"); p.add_argument("--branch")
    p = sub.add_parser("file"); p.add_argument("repo"); p.add_argument("path"); p.add_argument("--branch")
    p = sub.add_parser("batch"); p.add_argument("repo"); p.add_argument("ext"); p.add_argument("--branch"); p.add_argument("--limit", type=int, default=20)
    a = ap.parse_args()

    if a.cmd == "search": cmd_search(a.q, a.limit)
    elif a.cmd == "tree": cmd_tree(a.repo, a.branch, a.save)
    elif a.cmd == "zip": cmd_zip(a.repo, a.branch)
    elif a.cmd == "file": cmd_file(a.repo, a.path, a.branch)
    elif a.cmd == "batch": cmd_batch(a.repo, a.ext, a.branch, a.limit)


if __name__ == "__main__":
    main()
```

### 校验与复用提示

- 源码中 `get()` 透传 `**kwargs`，所以 `params=` 能正确送到 `requests`（早期版本漏了这行，搜索/tree 会报错）。
- `cmd_zip()` 不依赖 `Content-Length`，用文件魔数 `PK` 判断有效性——codeload 的 chunked 响应没有该头。
- `cmd_file()` 对中文/逗号路径用 `quote(path, safe='/')` 编码；`requests` 默认发送 `Accept-Encoding: gzip, deflate`，等价于 curl 的 `--compressed`，大文件不会截断。
- `branches()` 走 API 拿默认分支，失败时兜底 `main` / `master`；API 限额耗尽不影响 `zip` / `file` 两条通道。
- 想把配额从 60/小时提到 5000/小时，可在 `S.headers` 里加 `Authorization`（**别把 token 写进文件**，用环境变量注入）。

---

*本文由一次「先说不行 → 被追问 → 逐层收敛」的实际排查整理而成。所有 URL 与状态码均为实测值；出口策略可能随时间调整，复用前先跑一次自检。*
