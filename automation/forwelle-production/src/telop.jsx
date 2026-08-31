import React from 'react';
import {SAFE_AREA, TELOP_RULES} from './telop-spec.mjs';

export const Pill = ({children, color = '#7ce8e1'}) => (
  <div
    style={{
      padding: '12px 20px',
      borderRadius: 999,
      border: `2px solid ${color}`,
      color,
      fontSize: 24,
      fontWeight: 800,
      letterSpacing: 2,
      whiteSpace: 'nowrap',
    }}
  >
    {children}
  </div>
);

export const MetaBar = ({spec, color = '#102433'}) => (
  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
    <Pill color={color}>{spec.eyebrow}</Pill>
    <div style={{fontSize: 25, fontWeight: 800, letterSpacing: 1}}>{spec.counter}</div>
  </div>
);

const titleSize = (lines) => {
  const longest = Math.max(...lines.map((line) => line.length));
  if (longest <= 16) return 76;
  if (longest <= 21) return 68;
  return 60;
};

export const TelopHeadline = ({
  spec,
  color = '#102433',
  accent = '#ff6157',
  align = 'left',
  marginTop = 55,
  maxWidth = 920,
}) => {
  const lines = spec.lines || [];
  const fontSize = titleSize(lines);

  return (
    <div
      data-telop-preset={TELOP_RULES.preset}
      style={{
        marginTop,
        maxWidth,
        fontSize,
        fontWeight: 900,
        lineHeight: 1.02,
        letterSpacing: -2.5,
        textAlign: align,
        textWrap: 'balance',
      }}
    >
      {lines.map((line, index) => (
        <React.Fragment key={`${spec.role}-${index}`}>
          <span style={{color: index === spec.accentLine ? accent : color}}>{line}</span>
          {index < lines.length - 1 ? <br /> : null}
        </React.Fragment>
      ))}
    </div>
  );
};

export const safeFrameStyle = ({backgroundColor, color}) => ({
  backgroundColor,
  color,
  fontFamily: 'Arial, Helvetica, sans-serif',
  paddingTop: SAFE_AREA.top,
  paddingRight: SAFE_AREA.right,
  paddingBottom: SAFE_AREA.bottom,
  paddingLeft: SAFE_AREA.left,
});
