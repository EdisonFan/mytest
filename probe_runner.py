import subprocess, re, urllib.request, ssl
from pathlib import Path
UA={"User-Agent":"Mozilla/5.0"}
def sh(cmd,t=100):
    try:
        p=subprocess.run(cmd,shell=True,capture_output=True,text=True,timeout=t)
        return p.returncode,(p.stdout+p.stderr).strip()
    except Exception as e: return -1,f"{type(e).__name__}: {str(e)[:120]}"
L=["# git-sync 参数全解与 CNB 写认证层验证",""]

L.append("## A. 镜像入口脚本 `/bin/entrypoint.sh` 全文")
L.append("")
rc,out=sh("docker run --rm --entrypoint cat tencentcom/git-sync /bin/entrypoint.sh",90)
L.append(f"- exit={rc} | {len(out)} 字符")
L.append("```bash")
for line in out.splitlines()[:160]: L.append(line[:220])
L.append("```")
L.append("")
vars=sorted(set(re.findall(r"\b(?:PLUGIN_)?[A-Z][A-Z0-9_]{3,}\b",out)))
vars=[v for v in vars if not re.match(r"^(?:EOF|HEAD|SHA|URL|UTF|HTTP|HTTPS|GIT|NULL|TRUE|FALSE|ERROR|WARNING)$",v)]
L.append("### 提取到的变量名")
L.append("")
L.append("`"+"`, `".join(vars[:80])+"`")
L.append("")
L.append("### 部分 `PLUGIN_` 映射（脚本里实际读取的）")
L.append("")
for m in re.findall(r'PLUGIN_[A-Z_]+',out):
    L.append(f"- `{m}`")
L.append("")

L.append("## B. 带无效 token 跑一次（目标是虚构仓库，不会写入任何真实仓库）")
L.append("")
fake="https://cnb.cool/yuanbao-probe-nonexistent/probe-nonexistent/probe.git"
cmd=(f"timeout 70 docker run --rm "
     f"-e PLUGIN_TARGET_URL='{fake}' -e PLUGIN_AUTH_TYPE='https' "
     f"-e PLUGIN_USERNAME='cnb' -e PLUGIN_PASSWORD='invalid_probe_token_000' "
     f"-e PLUGIN_FORCE='true' tencentcom/git-sync")
rc,out=sh(cmd,90)
L.append(f"- exit={rc}")
for line in out.splitlines()[:25]: L.append(f"  `{line[:210]}`")
L.append("- 说明：若返回 CNB 侧的认证/404 错误（而非网络不通），证明写请求能到达 CNB 应用层")
L.append("")

L.append("## C. CNB 仓库里的原生配置（clone 下来的 tencent/cherry-markdown）")
L.append("")
sh("git clone --depth 1 https://cnb.cool/tencent/cherry-markdown/cherry-markdown.git /tmp/cnbrepo",150)
for p in ["/tmp/cnbrepo/.cnb.yml","/tmp/cnbrepo/.cnb/config.yml","/tmp/cnbrepo/.github/workflows/sync-cnb.yml"]:
    f=Path(p)
    if f.exists():
        t=f.read_text(encoding="utf-8",errors="ignore")
        L.append(f"### `{p}` ({len(t)} 字符)")
        L.append("```yaml")
        for line in t.splitlines()[:45]: L.append(line[:200])
        L.append("```")
    else: L.append(f"### `{p}` — 不存在")
L.append("")

L.append("## D. CNB OpenAPI 页面里的接口线索")
L.append("")
try:
    req=urllib.request.Request("https://api.cnb.cool/",headers=UA)
    with urllib.request.urlopen(req,timeout=35) as r: html=r.read().decode("utf-8",errors="ignore")
    paths=sorted(set(re.findall(r"[\"'`](/[a-zA-Z0-9_/{}$.-]{6,60})[\"'`]",html)))
    api=[x for x in paths if re.search(r"/(repos|users|groups|files|git|token)",x,re.I)]
    L.append(f"- 页面 {len(html)} 字符 | 提取路径 {len(paths)} | 含 repos 类 {len(api)}")
    for x in api[:25]: L.append(f"  - `{x}`")
except Exception as e: L.append(f"- 异常 {type(e).__name__}: {str(e)[:120]}")
L.append("")
Path("cnb-sync-params.md").write_text("\n".join(L),encoding="utf-8")
print("\n".join(L)[:9000])
