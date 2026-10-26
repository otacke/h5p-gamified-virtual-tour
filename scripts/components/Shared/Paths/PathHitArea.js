import React from 'react';

/** @constant {number} MIN_HIT_WIDTH_PX Minimum width of clickable area around path in px. */
const MIN_HIT_WIDTH_PX = 12;

/**
 * Render invisible, clickable area along path.
 * @param {object} props Component props.
 * @param {object[]} props.points Points with x and y in px.
 * @param {number} props.strokeWidth Stroke width of visible path in px.
 * @param {function} props.onClick Callback when path is clicked.
 * @returns {React.Element} Rendered hit area.
 */
const PathHitArea = ({ points, strokeWidth, onClick }) => (
  <polyline
    className='path-hit-area'
    points={points.map((point) => `${point.x},${point.y}`).join(' ')}
    fill='none'
    stroke='transparent'
    strokeWidth={Math.max(MIN_HIT_WIDTH_PX, strokeWidth)}
    strokeLinecap='round'
    onClick={onClick}
  />
);

export default PathHitArea;
