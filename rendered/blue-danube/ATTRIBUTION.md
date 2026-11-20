# 音源溯源与授权说明

## 曲目

- 中文名：**《蓝色多瑙河》**
- 原名：*An der schönen, blauen Donau*, Op. 314
- 作曲：**小约翰·施特劳斯**（Johann Strauss II, 1825–1899），1866 年创作
- 曲谱：作曲者 1899 年去世，已进入公有领域；原条目注明「1866 年发表，1924 年前发表的作品在美国版权已过期」

## 实际使用的录音（重要）

- 来源：**Internet Archive**，条目 `AnDerSchnemBlauenDonau`（上传者 Sookietex，2011-01-02）
- 文件：`An_der_schnem_blauen_Donau.mp3`，2,594,842 B
- 规格：MP3 / 44.1 kHz / 立体声 / 约 117 kbps / **177.08 秒（2:57）**
- 授权：条目标注 **Public Domain Mark 1.0**
  - *Composition Licence*：曲谱版权已过期（1866 年作品）
  - *Performance Licence*：条目原文称「依据芬兰版权法，录音权在发行 50 年后消灭；**本录音发行于 1936 年**，权利已消灭」
- 演奏者：**条目未标注乐团/指挥**，因此本项目不署名任何演奏团体
- 音质：老录音（78 转翻录质感），有底噪，反而让频谱与示波器更有细节

> 这份录音**不是**任何商业唱片，也不是从流媒体抓取；视频只取其中 16 秒做可视化预览，
> 未变速、未变调、未重混、未降噪。
>
> 各国对录音邻接权的规定不同（部分国家保护期更长），**商业用途请自行复核当地法规**。

## 为什么不是美国海军陆战队乐团版

最初选的是 Wikimedia Commons 上标注 PD 的 US Marine Band 管乐录音（9:09），
但 runner 请求 `upload.wikimedia.org` 时连续收到 **HTTP 429 Too Many Requests**（日志见
`fetch-audio.log`），下载脚本自动退到 Internet Archive 的这份 PD Mark 1.0 录音并成功。
**第一版封面与字幕误写了 US Marine Band，已全部更正**；本次交付的三条成片与封面、说明
均以实际音源为准。

## 本 Demo 的用法

- 完整 MP3 随包附在 `source/blue-danube.mp3`，仅用于溯源与试听
- 三条成片共用同一份音频，只通过 Remotion 的 `--props` 改变：
  - 可视化模式（spectrum / oscilloscope / mirrored spectrum）
  - 颜色、柱数、采样数
  - `audioOffsetInSeconds`（第 0 秒 / 第 20 秒切入）
- 封面 `blue-danube-cover.jpeg` 为本项目用 PIL 自行绘制，无第三方图片

## 框架许可

`remotion-dev/template-music-visualization` 的 `package.json` 标 `UNLICENSED`；
Remotion 框架对个人及 ≤3 人团队免费，公司场景需商业许可。学习参考可用，商用请先看官方 LICENSE。
