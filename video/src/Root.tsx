import { Composition } from "remotion";
import { PitchVideo } from "./PitchVideo";

// Video settings
const FPS = 30;
const DURATION_SECONDS = 82; // ~82 second pitch

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="PitchVideo"
        component={PitchVideo}
        durationInFrames={DURATION_SECONDS * FPS}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{}}
      />
    </>
  );
};
