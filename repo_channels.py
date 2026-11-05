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
