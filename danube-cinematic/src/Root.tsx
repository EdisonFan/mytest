import React from 'react';
import {Composition} from 'remotion';
import {DanubeFilm} from './DanubeFilm';
import {defaultFilmProps, filmSchema} from './schema';
import {FPS, HEIGHT, WIDTH} from './theme';
import {TOTAL} from './timing';

export const RemotionRoot: React.FC = () => (
  <Composition
    id="DanubeFilm"
    component={DanubeFilm}
    durationInFrames={TOTAL}
    fps={FPS}
    width={WIDTH}
    height={HEIGHT}
    schema={filmSchema}
    defaultProps={defaultFilmProps}
  />
);
