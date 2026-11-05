# 扩展探测结果（由 GitHub Actions runner 执行）

## A. 从 runner 直接 git clone 外部托管平台

### Gitee / oschina/git-osc
- exit=0 | 条目数=227 | 顶层: .git .gitee .gitignore 404.html README.md _config.yml _data _includes _layouts _posts assets index.html
- log: Cloning into '/tmp/extrepo'...

### GitCode / 公开仓库探测
- exit=0 | 条目数=381 | 顶层: .git .github .gitignore .nojekyll CHANGELOG.md LICENSE README.md assets children data diagnose docs
- log: Cloning into '/tmp/extrepo'...

## B. 免费题库站公开链接探测（仅读取公开页面）

### 第一试卷网  `https://www.shijuan1.com/`
- HTTP 200 | 24979 字节 | 链接 233 个 | 文件链接 0 个 | 试卷类 232 个
  - https://www.shijuan1.com/templets/default/style/s1.css
  - http://www.shijuan1.com
  - https://shijuan1.taobao.com
  - https://www.shijuan1.com/
  - https://www.shijuan1.com/a/sjyw/
  - https://www.shijuan1.com/a/sjsx/
  - https://www.shijuan1.com/a/sjyy/
  - https://www.shijuan1.com/a/sjwl/

### 第一试卷网·高中
- 异常: HTTPError: HTTP Error 404: Not Found

### 可圈可点·高中数学  `http://gzsx.cooco.net.cn/`
- HTTP 200 | 25873 字节 | 链接 105 个 | 文件链接 0 个 | 试卷类 25 个
  - http://gzsx.cooco.net.cn/test/
  - http://czwl.cooco.net.cn/test/
  - http://gzsx.cooco.net.cn/paper/1687143727/
  - http://gzsx.cooco.net.cn/paper/1686797930/
  - http://gzsx.cooco.net.cn/paper/1686710250/
  - http://gzsx.cooco.net.cn/paper/1686709638/

### 菁优网·高中数学  `https://www.jyeoo.com/math/`
- HTTP 200 | 239753 字节 | 链接 237 个 | 文件链接 0 个 | 试卷类 5 个
  - http://xyh.jyeoo.com/home/paper
  - https://www.jyeoo.com/math/paper/recommend
  - https://www.jyeoo.com/papercommunity
  - https://www.jyeoo.com/math/PaperCommunity

### 教研云  `https://www.jiaoyanyun.com/`
- HTTP 200 | 430701 字节 | 链接 38 个 | 文件链接 0 个 | 试卷类 2 个
  - https://word.jiaoyanyun.com/preview/w_cgqc78keqpjqt3djgt0g?jyyToken=9714bf6ca0e5396a851a921fe4c6e644&amp;paperVersion=1&amp;versionString=1
  - https://file1.jiaoyanyun.com/extraResources/jyy/homety/index.html#/download

## C. 下载公开免费文件（最多 2 个，用于验证端到端）

- 首页未直接暴露可下载文件链接（这类站点通常需要进入试卷详情页 / 组卷流程）
