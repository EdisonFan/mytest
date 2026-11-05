# 目标抓取：第一试卷网公开免费试卷（GitHub Actions runner）

## 1. 找试卷详情页（优先圆锥曲线相关）

- 第 1 页 `https://www.shijuan1.com/a/sjsx/` → HTTP 200, 24481 字节, 累计详情页 17
- 命中「圆锥曲线类」标题 0 份
- 实际取前 8 份详情页

## 2. 提取并下载 RAR 直链

- `2023年新课标全国Ⅱ卷数学真题（` → 下载候选 1
  - 已下载 **1-230H40SU8.rar** 734367 字节 魔数=b'Rar!' ← https://www.shijuan1.com/uploads/soft/sj2023/shuxue/gaokao/1-230H40SU8.rar
- `2023年高考全国乙卷数学(文)真题` → 下载候选 1
  - 已下载 **1-230H40S608.rar** 1193689 字节 魔数=b'Rar!' ← https://www.shijuan1.com/uploads/soft/sj2023/shuxue/gaokao/1-230H40S608.rar
- `2023年高考全国乙卷数学(理)真题` → 下载候选 1
  - 已下载 **1-230H40S512.rar** 1288151 字节 魔数=b'Rar!' ← https://www.shijuan1.com/uploads/soft/sj2023/shuxue/gaokao/1-230H40S512.rar
- `2023年高考全国甲卷数学(文)真题` → 下载候选 1
- `2022年新高考全国II卷数学真题（` → 下载候选 1
- `` → 下载候选 1
- `2026年高考数学试卷（天津）` → 下载候选 1
- `2026年高考数学试卷（上海）（秋考）` → 下载候选 1

## 3. 尝试解压（runner 上的 7z）

- 7z 可用: True
- 解压 1-230H40SU8.rar → exit=0
- 解压 1-230H40S608.rar → exit=0
- 解压 1-230H40S512.rar → exit=0
- 解压出 6 个文件到 `probe-assets/extracted/`
- 清单: 第一试卷网.url, 2023年高考全国乙卷数学_文_真题_解析版_.docx, 2023年高考全国乙卷数学_理_真题_解析版_.docx, 2023年新课标全国_卷数学真题_解析版_.docx
