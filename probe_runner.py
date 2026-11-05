import subprocess, re, urllib.request, ssl
from pathlib import Path
UA={"User-Agent":"Mozilla/5.0"}
def sh(cmd,t=120):
    try:
        p=subprocess.run(cmd,shell=True,capture_output=True,text=True,timeout=t)
        return p.returncode,(p.stdout+p.stderr).strip()
    except Exception as e: return -1,f"{type(e).__name__}: {str(e)[:130]}"
L=["# CNB 官方 git-sync 插件文档与写认证层验证",""]

L.append("## A. 官方插件仓库 clone（CNB → runner）")
L.append("")
sh("rm -rf /tmp/git-sync-doc")
rc,out=sh("git clone --depth 1 https://cnb.cool/cnb/plugins/tencentcom/git-sync.git /tmp/git-sync-doc",120)
L.append(f"- `git clone https://cnb.cool/cnb/plugins/tencentcom/git-sync.git` -> exit={rc} | {out[-150:].replace(chr(10),' ')}")
if rc==0:
    files=[p for p in Path("/tmp/git-sync-doc").rglob("*") if p.is_file() and ".git/" not in str(p)]
    L.append(f"- 文件 {len(files)} 个: {', '.join(p.name for p in files[:20])}")
    for name in ["README.md","README.zh.md","readme.md","docs/README.md","plugin.yml","README_EN.md"]:
        p=Path("/tmp/git-sync-doc",name)
        if p.exists():
            t=p.read_text(encoding="utf-8",errors="ignore")
            L.append(f"\n### `{name}` ({len(t)} 字符)")
            L.append("```")
            for line in t.splitlines()[:110]: L.append(line[:220])
            L.append("```")
            break
    else:
        L.append("- 未找到 README，列出根文件:")
        for p in files[:15]: L.append(f"  - `{p.relative_to('/tmp/git-sync-doc')}`")
L.append("")

L.append("## B. 写认证层：带无效 token 推虚构仓库（不会碰任何真实仓库）")
L.append("")
sh("rm -rf /tmp/fakerepo && mkdir -p /tmp/fakerepo && cd /tmp/fakerepo && git init -q && git config user.email a@b.c && git config user.name a && echo probe > a.txt && git add . && git commit -qm init")
fake="https://cnb.cool/yuanbao-probe-nonexistent/probe-nonexistent/probe.git"
cmd=(f"timeout 90 docker run --rm -v /tmp/fakerepo:/workspace -w /workspace "
     f"-e PLUGIN_TARGET_URL='{fake}' -e PLUGIN_AUTH_TYPE='https' "
     f"-e PLUGIN_USERNAME='cnb' -e PLUGIN_PASSWORD='invalid_probe_token_000' "
     f"-e PLUGIN_FORCE='true' tencentcom/git-sync")
rc,out=sh(cmd,110)
L.append(f"- exit={rc}")
for line in out.splitlines()[:30]: L.append(f"  `{line[:210]}`")
L.append("- 若出现 CNB 返回的 401/403/404（而非网络超时/拒绝连接），说明写请求到达 CNB 应用层")
L.append("")

L.append("## C. 对照：Gitee 写认证层（同样用虚构仓库 + 无效凭证）")
L.append("")
rc,out=sh("cd /tmp/fakerepo && timeout 60 git push https://yuanbao_probe_nonexistent:invalid_probe_token_000@gitee.com/yuanbao_probe_nonexistent/probe.git main 2>&1 | tail -8",80)
L.append(f"- exit={rc}")
for line in out.splitlines()[:10]: L.append(f"  `{line[:210]}`")
L.append("")
Path("cnb-official-doc.md").write_text("\n".join(L),encoding="utf-8")
print("\n".join(L)[:11000])
