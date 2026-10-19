import React from "react";
import { Composition } from "remotion";
import { Main } from "./Main";
import { FPS, H, W } from "./theme";
import timeline from "./timeline.json";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Main"
        component={Main}
        durationInFrames={Math.round(timeline.total * FPS)}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={{ withAudio: false }}
      />
    </>
  );
};
