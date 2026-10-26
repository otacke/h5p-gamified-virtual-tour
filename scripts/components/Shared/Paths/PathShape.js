import React, { useId } from 'react';

/** @constant {number} DOUBLE_GAP_RATIO Share of stroke width used as gap between double lines. */
const DOUBLE_GAP_RATIO = 0.33;

/** @constant {number} DOT_GAP_FACTOR Gap between dots relative to stroke width. */
const DOT_GAP_FACTOR = 2;

/** @constant {number} DASH_LENGTH_FACTOR Length of dashes relative to stroke width. */
const DASH_LENGTH_FACTOR = 3;

/** @constant {number} DASH_GAP_FACTOR Gap between dashes relative to stroke width. */
const DASH_GAP_FACTOR = 2;

/**
 * Get dash pattern for path style.
 * @param {string} pathStyle Path style (solid, dotted, dashed or double).
 * @param {number} strokeWidth Stroke width in px.
 * @returns {string|undefined} Value for stroke-dasharray, undefined for continuous line.
 */
const getDashArray = (pathStyle, strokeWidth) => {
  if (pathStyle === 'dotted') {
    return `0 ${strokeWidth * DOT_GAP_FACTOR}`;
  }

  if (pathStyle === 'dashed') {
    return `${strokeWidth * DASH_LENGTH_FACTOR} ${strokeWidth * DASH_GAP_FACTOR}`;
  }

  return undefined;
};

/**
 * Render path as polyline in SVG.
 * @param {object} props Component props.
 * @param {object[]} props.points Points with x and y in px.
 * @param {object} props.visuals Path visuals with colorPath and pathStyle.
 * @param {number} props.strokeWidth Stroke width in px.
 * @returns {React.Element} Rendered path shape.
 */
const PathShape = ({ points, visuals, strokeWidth }) => {
  const maskId = useId();

  const lineProps = {
    points: points.map((point) => `${point.x},${point.y}`).join(' '),
    fill: 'none',
    strokeLinejoin: 'round',
  };

  if (visuals.pathStyle === 'double') {
    // Cut gap out of thick line, so line works on any background
    return (
      <g>
        <mask id={maskId} maskUnits='userSpaceOnUse'>
          <polyline {...lineProps} stroke='white' strokeWidth={strokeWidth} />
          <polyline {...lineProps} stroke='black' strokeWidth={strokeWidth * DOUBLE_GAP_RATIO} />
        </mask>
        <polyline {...lineProps} stroke={visuals.colorPath} strokeWidth={strokeWidth} mask={`url(#${maskId})`} />
      </g>
    );
  }

  return (
    <polyline
      {...lineProps}
      stroke={visuals.colorPath}
      strokeWidth={strokeWidth}
      strokeLinecap={visuals.pathStyle === 'dotted' ? 'round' : 'butt'}
      strokeDasharray={getDashArray(visuals.pathStyle, strokeWidth)}
    />
  );
};

export default PathShape;
