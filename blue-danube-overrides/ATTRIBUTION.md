# 音源溯源与授权说明

## 曲目

- 中文名：**《蓝色多瑙河》**
- 原名：*An der schönen, blauen Donau*, Op. 314（"在美丽的蓝色多瑙河畔"）
- 作曲：**小约翰·施特劳斯**（Johann Strauss II, 1825–1899），1866 年创作，1867 年首演
- 曲谱：作者 1899 年去世，在绝大多数国家已进入**公有领域**

## 录音

- 演奏：**United States Marine Band**（"The President's Own"，美国海军陆战队乐团），管乐改编版
- 指挥：Albert F. Schoepper（据专辑资料）
- 时长：约 9 分 09 秒
- 来源：**Wikimedia Commons**，分类 *Audio files of An der schönen blauen Donau*
- 文件名：`"An der schönen, blauen Donau" performed by the U.S.Marine Band.mp3`
- 许可：Commons 页面标注 **Public domain**（美国联邦政府雇员职务作品，PD-USGov；相关邻接权一并标注为无已知限制）

> 同一演奏也有商业发行（Naxos / Altissimo 的 *The Robert Hoe Collection* Vol. 18 等）。
> 本 Demo 使用的是 Wikimedia Commons 上那份明确标注 PD 的文件，**不是**从商业平台抓取的音源。
> 各国对录音邻接权的规定不一致（部分国家保护期更长），**商业用途请自行复核当地法规**。

## 本 Demo 的用法

- 完整 MP3 随包附在 `source/blue-danube.mp3`，仅用于溯源与试听
- 视频只取其中 **16 秒片段**做可视化预览，不改动原录音内容（未变速、未变调、未重混）
- 三条成片共用同一份音频，仅通过 Remotion 的 `--props` 改变：
  - 可视化模式（spectrum / oscilloscope / mirrored spectrum）
  - 颜色、柱数、采样数
  - `audioOffsetInSeconds`（从第 0 秒 / 第 20 秒切入）
- 封面 `blue-danube-cover.jpeg` 为本项目自行绘制（PIL 生成，无第三方图片）

## 框架许可

`remotion-dev/template-music-visualization` 的 `package.json` 标 `UNLICENSED`；Remotion 框架对个人及 ≤3 人团队免费，公司场景需商业许可。学习参考可用，商用请先看官方 LICENSE。
