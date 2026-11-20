import React from "react";
import { Composition } from "remotion";
import { CrowVideo } from "./CrowDrinksWater";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="CrowDrinksWater"
      component={CrowVideo}
      durationInFrames={60 * 30}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
