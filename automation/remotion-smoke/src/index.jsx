import React from 'react';
import {registerRoot, Composition, AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, staticFile} from 'remotion';
import {Audio} from '@remotion/media';

const Smoke = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  return (
    <AbsoluteFill style={{backgroundColor: '#0b0b0d', color: '#e6e6e6', fontFamily: 'Arial, sans-serif', alignItems: 'center', justifyContent: 'center'}}>
      <div style={{fontSize: 34, letterSpacing: 4, opacity: interpolate(frame, [0, fps], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}}>
        STRATUM PRAXIS
      </div>
      <div style={{fontSize: 72, fontWeight: 700, marginTop: 28, opacity: interpolate(frame, [0.6 * fps, 1.6 * fps], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}), scale: interpolate(frame, [0.6 * fps, 1.6 * fps], [0.96, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}}>
        PIPELINE ONLINE
      </div>
      <div style={{fontSize: 26, marginTop: 24, opacity: interpolate(frame, [1.4 * fps, 2.2 * fps], [0, 0.8], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}}>
        Speechify → Stability → Remotion
      </div>
      <Audio src={staticFile('narration.mp3')} />
    </AbsoluteFill>
  );
};

const Root = () => (
  <Composition
    id="StratumSmoke"
    component={Smoke}
    durationInFrames={210}
    fps={30}
    width={1920}
    height={1080}
  />
);

registerRoot(Root);
