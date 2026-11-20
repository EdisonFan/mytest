import {Composition, staticFile} from "remotion";
import {Visualizer} from "./Visualizer/Main";
import {visualizerCompositionSchema} from "./helpers/schema";

const FPS = 30;

// 真实录音：小约翰·施特劳斯《蓝色多瑙河》Op. 314，
// 美国海军陆战队乐团演奏，Wikimedia Commons 标注 public domain（详见 ATTRIBUTION.md）。
// 官方原版用 mediabunny 读远程音频自动算时长；这里音频在 public/ 下，
// 用固定 16 秒做片段预览，其余逻辑与官方模板完全一致。
// 想从乐曲中段开始，改 defaultProps.audioOffsetInSeconds 或用 --props 覆盖即可。
const PREVIEW_DURATION_SECONDS = 16;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Visualizer"
        component={Visualizer}
        width={1080}
        height={1080}
        schema={visualizerCompositionSchema}
        defaultProps={{
          // audio settings
          audioOffsetInSeconds: 0,
          audioFileUrl: staticFile("blue-danube.mp3"),
          // song data
          coverImageUrl: staticFile("blue-danube-cover.jpeg"),
          songName: "The Blue Danube",
          artistName: "Johann Strauss II",
          textColor: "#eaf4ff",
          // visualizer settings
          visualizer: {
            type: "spectrum" as const,
            bassOverlay: true,
            color: "#4aa8ff",
            linesToDisplay: 65,
            mirrorWave: false,
            numberOfSamples: "512" as const,
          },
        }}
        // 固定 16 秒预览窗口；audioOffsetInSeconds 只决定从乐曲哪一秒切入，
        // 不缩短预览长度（<Sequence from={-offset}> 会把音频与可视化一起平移）。
        calculateMetadata={async () => ({
          durationInFrames: PREVIEW_DURATION_SECONDS * FPS,
          fps: FPS,
        })}
      />
    </>
  );
};
