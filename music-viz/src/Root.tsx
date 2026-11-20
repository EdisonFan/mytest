import {Composition, staticFile} from "remotion";
import {Visualizer} from "./Visualizer/Main";
import {visualizerCompositionSchema} from "./helpers/schema";

const FPS = 30;

// 官方原版（见 Root.original.tsx）用 mediabunny 的 UrlSource 读取远程 MP3
// 自动算时长。这里换成仓库自带的本地 WAV，Node 端无法 fetch 相对路径，
// 因此用 ffprobe 实测的时长作为常量，其余逻辑与官方完全一致。
const DEMO_AUDIO_DURATION_SECONDS = 16;

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
          audioFileUrl: staticFile("demo-track.wav"),
          // song data
          coverImageUrl: staticFile("demo-song-cover.jpeg"),
          songName: "Sunset Render Deja Vu",
          artistName: "Remotion",
          textColor: "white",
          // visualizer settings
          visualizer: {
            type: "spectrum" as const,
            bassOverlay: true,
            color: "#0b84f3",
            linesToDisplay: 65,
            mirrorWave: false,
            numberOfSamples: "512" as const,
          },
        }}
        calculateMetadata={async ({props}) => ({
          durationInFrames: Math.floor(
            (DEMO_AUDIO_DURATION_SECONDS - props.audioOffsetInSeconds) * FPS,
          ),
          fps: FPS,
        })}
      />
    </>
  );
};
