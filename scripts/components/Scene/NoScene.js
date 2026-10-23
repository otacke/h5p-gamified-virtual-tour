import React from 'react';
import '@components/Scene/NoScene.css';
import PropTypes from 'prop-types';

/**
 * Render no-scene placeholder.
 * @param {string} label Title shown in placeholder.
 * @returns {React.Element} Rendered no-scene placeholder.
 */
const NoScene = ({ label }) => (
  <div className='no-scene-container'>
    <div className="no-scene-wrapper">
      <div className="title" dangerouslySetInnerHTML={{ __html: label }} />
    </div>
  </div>
);

NoScene.propTypes = {
  label: PropTypes.string.isRequired,
};

export default NoScene;
