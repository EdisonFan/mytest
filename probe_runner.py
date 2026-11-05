import re, os, ssl, urllib.request, urllib.parse, subprocess
from pathlib import Path
UA={"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0 Safari/537.36"}
ctx=ssl.create_default_context()
def fetch(u,t=25):
    req=urllib.request.Request(u,headers=UA)
    with urllib.request.urlopen(req,timeout=t,context=ctx) as r:
        return r.read(),r.status

L=["# 扩展探测结果（由 GitHub Actions runner 执行）",""]
L.append("## A. 从 runner 直接 git clone 外部托管平台")
L.append("")
for label,url in [("Gitee / oschina/git-osc","https://gitee.com/oschina/git-osc.git"),
                  ("GitCode / 公开仓库探测","https://gitcode.com/gh_mirrors/cn/cn-math-taxonomy.git")]:
    try:
        p=subprocess.run(["git","clone","--depth","1",url,"/tmp/extrepo"],
                         capture_output=True,text=True,timeout=100)
        rc=p.returncode
        n=len(list(Path("/tmp/extrepo").rglob("*"))) if Path("/tmp/extrepo").exists() else 0
        top=" ".join(sorted(x.name for x in Path("/tmp/extrepo").iterdir())[:12]) if Path("/tmp/extrepo").exists() else ""
        L.append(f"### {label}")
        L.append(f"- exit={rc} | 条目数={n} | 顶层: {top}")
        L.append(f"- log: {(p.stderr or p.stdout)[-260:].strip()}")
        subprocess.run(["rm","-rf","/tmp/extrepo"])
    except Exception as e:
        L.append(f"### {label}\n- 异常: {type(e).__name__}: {str(e)[:160]}")
    L.append("")

L.append("## B. 免费题库站公开链接探测（仅读取公开页面）")
L.append("")
targets=[("第一试卷网","https://www.shijuan1.com/"),
         ("第一试卷网·高中","https://www.shijuan1.com/gaozhong/"),
         ("可圈可点·高中数学","http://gzsx.cooco.net.cn/"),
         ("菁优网·高中数学","https://www.jyeoo.com/math/"),
         ("教研云","https://www.jiaoyanyun.com/")]
cands=[]
for name,u in targets:
    try:
        raw,code=fetch(u,30)
        text=raw.decode("utf-8",errors="ignore")
        hrefs=re.findall(r"href=[\"']([^\"']+)[\"']",text,re.I)
        full=[urllib.parse.urljoin(u,h) for h in hrefs]
        files=[x for x in full if re.search(r"\.(pdf|docx?|zip|rar|7z)(\?|$)",x,re.I)]
        kw=[x for x in full if re.search(r"shiti|shijuan|zujuan|test|paper|download",x,re.I)]
        L.append(f"### {name}  `{u}`")
        L.append(f"- HTTP {code} | {len(raw)} 字节 | 链接 {len(hrefs)} 个 | 文件链接 {len(files)} 个 | 试卷类 {len(kw)} 个")
        for x in list(dict.fromkeys(kw[:8])): L.append(f"  - {x[:150]}")
        if not kw:
            for x in list(dict.fromkeys(full[:6])): L.append(f"  - (样例) {x[:150]}")
        cands.extend(files)
    except Exception as e:
        L.append(f"### {name}\n- 异常: {type(e).__name__}: {str(e)[:160]}")
    L.append("")

L.append("## C. 下载公开免费文件（最多 2 个，用于验证端到端）")
L.append("")
Path("probe-assets").mkdir(exist_ok=True)
got=[]
for u in list(dict.fromkeys(cands))[:6]:
    if len(got)>=2: break
    try:
        raw,code=fetch(u,45)
        if code!=200 or len(raw)<2000: continue
        fn=re.sub(r"[^A-Za-z0-9._-]","_",urllib.parse.urlparse(u).path.split("/")[-1])[-70:]
        if not fn: fn="probe_"+str(len(got))+".bin"
        if not re.search(r"\.(pdf|docx?|zip)$",fn,re.I): continue
        Path("probe-assets",fn).write_bytes(raw)
        got.append((fn,len(raw),u))
    except Exception as e:
        pass
if got:
    for fn,size,u in got: L.append(f"- **{fn}** — {size} 字节 — 来自 `{u[:130]}`")
else:
    L.append("- 首页未直接暴露可下载文件链接（这类站点通常需要进入试卷详情页 / 组卷流程）")
L.append("")
Path("extended-probe-result.md").write_text("\n".join(L),encoding="utf-8")
print("\n".join(L))
