import React from 'react';
import PathShape from '@components/Shared/Paths/PathShape.js';
import { getPathVisuals, getStrokeWidth } from '@components/Shared/Paths/pathVisuals.js';
import '@components/Shared/Paths/Paths.css';

/** @constant {number} PERCENT Divisor for converting percentage values. */
const PERCENT = 100;

/**
 * Get center of interaction button in px.
 * @param {object} position Position of button's top left corner with x and y in percent.
 * @param {number} width Width of scene in px.
 * @param {number} height Height of scene in px.
 * @param {number} radius Radius of interaction button in px.
 * @returns {object} Center with x and y in px.
 */
const getButtonCenter = (position, width, height, radius) => {
  return {
    x: position.x * width / PERCENT + radius,
    y: position.y * height / PERCENT + radius,
  };
};

/**
 * Render paths between interactions of static scene.
 * @param {object} props Component props.
 * @param {object[]} props.paths Paths with from and to interaction IDs.
 * @param {object} props.positions Positions of interactions' top left corners in percent, keyed by interaction ID.
 * @param {number} props.width Width of scene in px.
 * @param {number} props.height Height of scene in px.
 * @param {number} props.buttonSize Size of interaction button in px.
 * @param {object} [props.globalVisuals] Global path visuals.
 * @returns {React.Element|null} Rendered paths, or null if scene has no size yet.
 */
const StaticPaths = ({ paths, positions, width, height, buttonSize, globalVisuals }) => {
  if (!width || !height || !paths.length) {
    return null;
  }

  // eslint-disable-next-line no-magic-numbers
  const radius = buttonSize / 2;

  const shapes = paths.map((path) => {
    const from = getButtonCenter(positions[path.from], width, height, radius);
    const to = getButtonCenter(positions[path.to], width, height, radius);

    // Path should start and end at the edge of the buttons
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    if (length <= radius + radius) {
      return null;
    }

    const unitX = (to.x - from.x) / length;
    const unitY = (to.y - from.y) / length;
    const points = [
      { x: from.x + unitX * radius, y: from.y + unitY * radius },
      { x: to.x - unitX * radius, y: to.y - unitY * radius },
    ];

    const visuals = getPathVisuals(globalVisuals, path);

    return (
      <PathShape
        key={`${path.from}-${path.to}`}
        points={points}
        visuals={visuals}
        strokeWidth={getStrokeWidth(visuals, buttonSize)}
      />
    );
  });

  return (
    <svg className='paths-overlay' width={width} height={height} aria-hidden='true'>
      {shapes}
    </svg>
  );
};

export default StaticPaths;
