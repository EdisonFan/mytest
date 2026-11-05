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

同目录 `repo_channels.py` 封装了全部下载通道：

```bash
python repo_channels.py search "高中数学 题库"
python repo_channels.py tree deekur/gaokaomath
python repo_channels.py zip aiguoran/gaokao-math-questions
python repo_channels.py file deekur/gaokaomath "普通高考/2024/2024新高考1(...).pdf"
python repo_channels.py batch deekur/gaokaomath .pdf --limit 10
```

自动试 `main`/`master`、自动 URL 编码、自动处理 chunked 响应；API 限额耗尽时提示改用整仓通道。**只读，不做任何写操作。**

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

*本文由一次「先说不行 → 被追问 → 逐层收敛」的实际排查整理而成。所有 URL 与状态码均为实测值；出口策略可能随时间调整，复用前先跑一次自检。*
