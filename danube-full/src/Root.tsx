import React from 'react';
import {Composition} from 'remotion';
import {FullFilm} from './FullFilm';
import {defaultFullProps, fullSchema} from './schema';
import {FPS, HEIGHT, WIDTH} from './theme';
import {FULL_TOTAL} from './full-timing';

export const RemotionRoot: React.FC = () => (
  <Composition
    id="FullDanube"
    component={FullFilm}
    durationInFrames={FULL_TOTAL}
    fps={FPS}
    width={WIDTH}
    height={HEIGHT}
    schema={fullSchema}
    defaultProps={defaultFullProps}
  />
);
