# 深度探测：试卷下载链接与跨平台中转（GitHub Actions runner）

## 1. 第一试卷网：分类页 → 详情页 → 下载链接

- 分类页 `https://www.shijuan1.com/a/sjsx/` → HTTP 200, 24481 字节, 链接 139, 详情页候选 107
  - https://www.shijuan1.com/a/sjsxgk/323880.html
  - https://www.shijuan1.com/a/sjsxgk/323874.html
  - https://www.shijuan1.com/a/sjsxgk/323872.html
  - https://www.shijuan1.com/a/sjsxgk/323870.html
  - https://www.shijuan1.com/a/sjsxgk/323602.html
  - 详情页 `https://www.shijuan1.com/a/sjsxgk/323880.html` → 8705 字节, 下载候选 1
      · https://www.shijuan1.com/uploads/soft/sj2023/shuxue/gaokao/1-230H40SU8.rar
  - 详情页 `https://www.shijuan1.com/a/sjsxgk/323874.html` → 8719 字节, 下载候选 1
      · https://www.shijuan1.com/uploads/soft/sj2023/shuxue/gaokao/1-230H40S608.rar
  - 详情页 `https://www.shijuan1.com/a/sjsxgk/323872.html` → 8753 字节, 下载候选 1
      · https://www.shijuan1.com/uploads/soft/sj2023/shuxue/gaokao/1-230H40S512.rar
- `https://www.shijuan1.com/a/gzsx/` 异常 HTTPError: HTTP Error 404: Not Found

## 2. 可圈可点：试卷详情页 → 下载链接

- `http://gzsx.cooco.net.cn/paper/1687143727/` → HTTP 200, 376618 字节, 链接 64, 下载候选 1
  - http://gzsx.cooco.net.cn/user/newdown/1/
- `http://gzsx.cooco.net.cn/paper/1686797930/` → HTTP 200, 378742 字节, 链接 63, 下载候选 1
  - http://gzsx.cooco.net.cn/user/newdown/1/

## 3. 实际下载公开免费文件（最多 2 个，验证魔数）

- 候选链接均非直接文件（站点多为 JS 触发下载 / 需要会话），未强行抓取

## 4. 跨平台中转验证：clone Gitee 仓库 → 复制样本到本仓库

- `git clone --depth 1 gitee.com/oschina/git-osc.git` → exit=0
- 已复制 6 个文件到 `mirror-sample/`: index.html, _config.yml, 404.html, README.md, .gitignore, config.yml
- 这些文件随本次 commit 进入 GitHub，可由 jsDelivr / codeload 从沙盒侧取回
