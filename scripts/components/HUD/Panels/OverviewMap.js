import React, { useContext } from 'react';
import { H5PContext } from '@context/H5PContext.js';
import '@components/HUD/Panels/HudPanel.css';
import '@components/HUD/Panels/OverviewMap.css';

/**
 * Render overview map with marker for position of current scene.
 * @param {object} props Component props.
 * @param {object} props.image Image parameters of overview map.
 * @param {object} [props.position] Position of current scene with x and y in percent.
 * @param {string} props.label Accessible name of overview map.
 * @returns {React.Element} Rendered overview map.
 */
const OverviewMap = ({ image, position, label }) => {
  const context = useContext(H5PContext);

  const hasPosition = typeof position?.x === 'number' && typeof position?.y === 'number';

  return (
    <div className='hud-panel overview-map-panel' role='region' aria-label={label}>
      <div className='overview-map-image-wrapper'>
        <img className='overview-map-image' src={H5P.getPath(image.path, context.contentId)} alt='' />
        {
          hasPosition &&
          <div className='overview-map-marker' style={{ left: `${position.x}%`, top: `${position.y}%` }} />
        }
      </div>
    </div>
  );
};

export default OverviewMap;
