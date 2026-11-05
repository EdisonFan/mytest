import re, ssl, urllib.request, urllib.parse, subprocess, shutil
from pathlib import Path
UA={"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0 Safari/537.36"}
ctx=ssl.create_default_context()
def dec(raw):
    for enc in ("utf-8","gbk","gb18030"):
        try: return raw.decode(enc)
        except Exception: pass
    return raw.decode("utf-8",errors="ignore")
def fetch(u,t=45,ref=None):
    h=dict(UA)
    if ref: h["Referer"]=ref
    req=urllib.request.Request(u,headers=h)
    with urllib.request.urlopen(req,timeout=t,context=ctx) as r:
        return r.read(),r.status
def anchors(txt,base):
    out=[]
    for href,text in re.findall(r"<a[^>]+href=[\"']([^\"']+)[\"'][^>]*>(.*?)</a>",txt,re.I|re.S):
        title=re.sub(r"<[^>]+>","",text).strip()
        out.append((urllib.parse.urljoin(base,href),title))
    return out

L=["# 目标抓取：第一试卷网公开免费试卷（GitHub Actions runner）",""]
L.append("## 1. 找试卷详情页（优先圆锥曲线相关）")
L.append("")
seeds=["https://www.shijuan1.com/a/sjsx/"]
seen=set(); detail=[]
for step in range(4):
    seed=seeds[step]
    try:
        raw,code=fetch(seed)
        txt=dec(raw)
        items=anchors(txt,seed)
        for u,title in items:
            if re.search(r"/a/sjsxgk/\d+\.html",u) and u not in seen:
                seen.add(u); detail.append((u,title[:60]))
        nxt=[u for u,t in items if re.search(r"list_\d+\.html|_\d+\.html",u) and "sjsx" in u]
        for n in nxt[:1]:
            if n not in seeds: seeds.append(n)
        L.append(f"- 第 {step+1} 页 `{seed}` → HTTP {code}, {len(raw)} 字节, 累计详情页 {len(detail)}")
    except Exception as e:
        L.append(f"- 第 {step+1} 页异常 {type(e).__name__}: {str(e)[:90]}")
    if len(seeds)<=step+1: break

kw=[x for x in detail if re.search(r"圆锥|椭圆|双曲线|抛物线|解析几何",x[1])]
L.append(f"- 命中「圆锥曲线类」标题 {len(kw)} 份")
for u,t in kw[:12]: L.append(f"  - {t} → {u[:120]}")
chosen = (kw + detail)[:8]
L.append(f"- 实际取前 {len(chosen)} 份详情页")
L.append("")

L.append("## 2. 提取并下载 RAR 直链")
L.append("")
Path("probe-assets").mkdir(exist_ok=True)
got=[]; rars=[]
for d,title in chosen:
    try:
        raw,code=fetch(d,ref="https://www.shijuan1.com/a/sjsx/")
        txt=dec(raw)
        dl=[urllib.parse.urljoin(d,h) for h,_ in anchors(txt,d) if re.search(r"\.(rar|zip|pdf|docx?)(\?|$)",h,re.I)]
        dl+= [urllib.parse.urljoin(d,h) for h in re.findall(r"[\"']([^\"']+\.(?:rar|zip|pdf|docx?))[\"']",txt,re.I)]
        L.append(f"- `{title[:40]}` → 下载候选 {len(set(dl))}")
        for u in list(dict.fromkeys(dl))[:1]:
            if len(got)>=3: break
            try:
                data,c2=fetch(u,60,ref=d)
                if c2!=200 or len(data)<3000: continue
                fn=re.sub(r"[^A-Za-z0-9._-]","_",urllib.parse.urlparse(u).path.split("/")[-1])
                Path("probe-assets",fn).write_bytes(data)
                got.append((fn,len(data),data[:4],u,title))
                L.append(f"  - 已下载 **{fn}** {len(data)} 字节 魔数={data[:4]!r} ← {u[:110]}")
            except Exception as e: L.append(f"  - 下载异常 {type(e).__name__}: {str(e)[:80]}")
    except Exception as e: L.append(f"- 详情页异常 {type(e).__name__}: {str(e)[:80]}")
L.append("")

L.append("## 3. 尝试解压（runner 上的 7z）")
L.append("")
ext=Path("probe-assets/extracted"); ext.mkdir(exist_ok=True)
try:
    has=subprocess.run(["7z","i"],capture_output=True,text=True,timeout=15).returncode==0
except Exception: has=False
L.append(f"- 7z 可用: {has}")
if has:
    n=0
    for fn,_,_,_,_ in got:
        p=Path("probe-assets",fn)
        out=Path("probe-assets/tmp_"+fn.split(".")[0]); out.mkdir(exist_ok=True)
        try:
            r=subprocess.run(["7z","x","-y","-o"+str(out),str(p)],capture_output=True,text=True,timeout=90)
            L.append(f"- 解压 {fn} → exit={r.returncode}")
            for x in out.rglob("*"):
                if x.is_file() and n<8 and x.stat().st_size<15000000:
                    dest=ext/(re.sub(r"[^A-Za-z0-9._\u4e00-\u9fff-]","_",x.name))
                    shutil.copy2(x,dest); n+=1
            shutil.rmtree(out,ignore_errors=True)
        except Exception as e: L.append(f"- 解压异常 {type(e).__name__}: {str(e)[:90]}")
    L.append(f"- 解压出 {n} 个文件到 `probe-assets/extracted/`")
    if n: L.append(f"- 清单: {', '.join(x.name for x in ext.iterdir())}")
else:
    L.append("- runner 无 7z，保留 RAR 原件，由沙盒侧解压")
L.append("")
Path("capture-result.md").write_text("\n".join(L),encoding="utf-8")
print("\n".join(L))
