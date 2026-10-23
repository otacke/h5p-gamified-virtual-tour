import React from 'react';
import ReactDOM from 'react-dom';
import Main from './components/Main.js';
import { H5PContext } from './context/H5PContext.js';
import { sceneRenderingQualityMapping } from './components/Scene/SceneTypes/ThreeSixtyScene.js';

// Default 16:9 widescreen aspect ratio fallback (ratio is height / width)
const DEFAULT_RATIO_HEIGHT = 9;
const DEFAULT_RATIO_WIDTH = 16;
// Breakpoints for responsive wrapper sizing
const PHONE_SIZE_MAX_WIDTH = 480;
const MEDIUM_TABLET_SIZE_MAX_WIDTH = 768;

// Load library
H5P = H5P || {};

/**
 * H5P content library wrapper for the gamified virtual tour.
 * @param {object} params Content library parameters as defined in semantics.json.
 * @param {number} contentId H5P content ID of the content instance.
 * @param {object} extras Optional additional H5P options (e.g. forceStartScreen, forceStartCamera).
 */
H5P.GamifiedVirtualTour = class Wrapper extends H5P.EventDispatcher {
  constructor(params, contentId, extras) {
    super();

    extras = extras || {};
    this.forceStartScreen = (extras.forceStartScreen !== undefined
      && extras.forceStartScreen >= 0)
      ? extras.forceStartScreen : null;

    this.forceStartCamera = extras.forceStartCamera !== undefined
      ? extras.forceStartCamera : null;

    this.behavior = {
      label: {
        showLabel: false,
        labelPosition: 'right',
        ...params.behaviour.label,
      },
      ...params.behaviour,
    };
    this.l10n = {
      // Text defaults
      title: 'Virtual Tour',
      playAudioTrack: 'Play Audio Track',
      pauseAudioTrack: 'Pause Audio Track',
      sceneDescription: 'Scene Description',
      resetCamera: 'Reset Camera',
      closeDialog: 'Close Dialog',
      expandButtonAriaLabel: 'Expand the visual label',
      backgroundLoading: 'Loading background image...',
      noContent: 'No content',
      ...params.l10n,
    };

    // Parameters has been wrapped in the gamifiedVirtualTour widget group
    if (params.gamifiedVirtualTour) {
      params = params.gamifiedVirtualTour;
    }
    this.params = params;
    this.contentId = contentId;
    this.extras = extras;
    this.sceneRenderingQuality = this.behavior.sceneRenderingQuality || 'high';

    this.on('resize', this.handleResize);
  }

  setCurrentSceneId = (sceneId) => {
    this.currentScene = sceneId;

    this.trigger('changedScene', sceneId);

    ReactDOM.render(
      <H5PContext.Provider value={this}>
        <Main
          forceStartScreen={this.forceStartScreen}
          forceStartCamera={this.forceStartCamera}
          currentScene={this.currentScene}
          setCurrentSceneId={this.setCurrentSceneId}
          addThreeSixty={ (tS) => this.threeSixty = tS }
          onSetCameraPos={this.setCameraPosition}
        />
      </H5PContext.Provider>,
      this.wrapper,
    );

    window.requestAnimationFrame(() => {
      this.trigger('resize');
    });
  };

  createElements = () => {
    this.wrapper = document.createElement('div');
    this.wrapper.classList.add('h5p-three-sixty-wrapper');

    this.currentScene = this.params.startSceneId;
    if (this.forceStartScreen) {
      this.currentScene = this.forceStartScreen;
    }

    ReactDOM.render(
      <H5PContext.Provider value={this}>
        <Main
          forceStartScreen={this.forceStartScreen}
          forceStartCamera={this.forceStartCamera}
          currentScene={this.currentScene}
          setCurrentSceneId={this.setCurrentSceneId}
          addThreeSixty={ (tS) => this.threeSixty = tS }
          onSetCameraPos={this.setCameraPosition}
        />
      </H5PContext.Provider>,
      this.wrapper,
    );
  };

  reDraw = (forceStartScreen = this.currentScene) => {
    const sceneRenderingQuality = this.behavior.sceneRenderingQuality;
    if (sceneRenderingQuality !== this.sceneRenderingQuality
      && this.threeSixty) {
      this.setSceneRenderingQuality(sceneRenderingQuality);
    }

    if (forceStartScreen !== this.currentScene) {
      this.setCurrentSceneId(forceStartScreen);
      return;
    }

    ReactDOM.render(
      <H5PContext.Provider value={this}>
        <Main
          forceStartScreen={this.forceStartScreen}
          forceStartCamera={this.forceStartCamera}
          currentScene={this.currentScene}
          setCurrentSceneId={this.setCurrentSceneId}
          addThreeSixty={ (tS) => this.threeSixty = tS }
          onSetCameraPos={this.setCameraPosition}
        />
      </H5PContext.Provider>,
      this.wrapper,
    );
  };

  attach = ($container) => {
    if (!this.wrapper) {
      this.createElements();
    }

    // Append elements to DOM
    $container[0].appendChild(this.wrapper);
    $container[0].classList.add('h5p-gamified-virtual-tour');
  };

  getRect = () => {
    return this.wrapper.getBoundingClientRect();
  };

  handleResize = () => {
    const isFullscreen = this.wrapper.parentElement.classList.contains('h5p-fullscreen')
      || this.wrapper.parentElement.classList.contains('h5p-semi-fullscreen');
    const rect = this.getRect();
    // Fullscreen should use all of the space
    const ratio = (isFullscreen ? (rect.height / rect.width)
      : (DEFAULT_RATIO_HEIGHT / DEFAULT_RATIO_WIDTH));

    this.wrapper.style.height = (isFullscreen ? '100%' : (`${rect.width * ratio  }px`));

    // Apply separate styles for mobile
    if (rect.width <= PHONE_SIZE_MAX_WIDTH) {
      this.wrapper.classList.add('h5p-phone-size');
    }
    else {
      this.wrapper.classList.remove('h5p-phone-size');
    }
    if (rect.width < MEDIUM_TABLET_SIZE_MAX_WIDTH) {
      this.wrapper.classList.add('h5p-medium-tablet-size');
    }
    else {
      this.wrapper.classList.remove('h5p-medium-tablet-size');
    }

    // Resize scene
    if (this.currentScene === null || !this.threeSixty) {
      return;
    }

    const updatedRect = this.wrapper.getBoundingClientRect();
    this.threeSixty.resize(updatedRect.width / updatedRect.height);
  };

  getRatio = () => {
    const rect = this.wrapper.getBoundingClientRect();
    return (rect.width / rect.height);
  };

  setCameraPosition = (cameraPosition, focus) => {
    if (this.currentScene === null || !this.threeSixty) {
      return;
    }

    const [yaw, pitch] = cameraPosition.split(',');
    this.threeSixty.setCameraPosition(parseFloat(yaw), parseFloat(pitch));
    if (focus) {
      this.threeSixty.focus();
    }
  };

  getCamera = () => {
    if (this.currentScene === null || !this.threeSixty) {
      return;
    }

    return {
      camera: this.threeSixty.getCurrentPosition(),
      fov: this.threeSixty.getCurrentFov(),
    };
  };

  setSceneRenderingQuality = (quality) => {
    const segments = sceneRenderingQualityMapping[quality];
    this.threeSixty.setSegmentNumber(segments);
    this.sceneRenderingQuality = quality;
  };

  /**
   * Update parameters from editor.
   * @param {object} params Parameters to update with. Passed by reference!
   */
  updateParams = (params) => {
    this.params = params;
  };
};
