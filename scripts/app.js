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
H5P.GamifiedVirtualTour = (function () {

  /**
   * H5P content library wrapper for the gamified virtual tour.
   * @param {object} params Content library parameters as defined in semantics.json.
   * @param {number} contentId H5P content ID of the content instance.
   * @param {object} extras Optional additional H5P options (e.g. forceStartScreen, forceStartCamera).
   */
  function Wrapper(params, contentId, extras) {
    extras = extras || {};
    this.forceStartScreen = (extras.forceStartScreen !== undefined
      && extras.forceStartScreen >= 0)
      ? extras.forceStartScreen : null;

    this.forceStartCamera = extras.forceStartCamera !== undefined
      ? extras.forceStartCamera : null;

    // Initialize event inheritance
    H5P.EventDispatcher.call(self);

    let wrapper;
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

    const setCurrentSceneId = (sceneId) => {
      this.currentScene = sceneId;

      this.trigger('changedScene', sceneId);

      ReactDOM.render(
        <H5PContext.Provider value={this}>
          <Main
            forceStartScreen={this.forceStartScreen}
            forceStartCamera={this.forceStartCamera}
            currentScene={this.currentScene}
            setCurrentSceneId={setCurrentSceneId}
            addThreeSixty={ (tS) => this.threeSixty = tS }
            onSetCameraPos={setCameraPosition}
          />
        </H5PContext.Provider>,
        wrapper,
      );

      window.requestAnimationFrame(() => {
        this.trigger('resize');
      });
    };

    const createElements = () => {
      wrapper = document.createElement('div');
      wrapper.classList.add('h5p-three-sixty-wrapper');

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
            setCurrentSceneId={setCurrentSceneId}
            addThreeSixty={ (tS) => this.threeSixty = tS }
            onSetCameraPos={setCameraPosition}
          />
        </H5PContext.Provider>,
        wrapper,
      );
    };

    this.reDraw = (forceStartScreen = this.currentScene) => {
      const sceneRenderingQuality = this.behavior.sceneRenderingQuality;
      if (sceneRenderingQuality !== this.sceneRenderingQuality
        && this.threeSixty) {
        this.setSceneRenderingQuality(sceneRenderingQuality);
      }

      if (forceStartScreen !== this.currentScene) {
        setCurrentSceneId(forceStartScreen);
        return;
      }

      ReactDOM.render(
        <H5PContext.Provider value={this}>
          <Main
            forceStartScreen={this.forceStartScreen}
            forceStartCamera={this.forceStartCamera}
            currentScene={this.currentScene}
            setCurrentSceneId={setCurrentSceneId}
            addThreeSixty={ (tS) => this.threeSixty = tS }
            onSetCameraPos={setCameraPosition}
          />
        </H5PContext.Provider>,
        wrapper,
      );
    };

    this.attach = ($container) => {
      if (!wrapper) {
        createElements();
      }

      // Append elements to DOM
      $container[0].appendChild(wrapper);
      $container[0].classList.add('h5p-gamified-virtual-tour');
    };

    this.getRect = () => {
      return wrapper.getBoundingClientRect();
    };

    this.on('resize', () => {
      const isFullscreen = wrapper.parentElement.classList.contains('h5p-fullscreen')
        || wrapper.parentElement.classList.contains('h5p-semi-fullscreen');
      const rect = this.getRect();
      // Fullscreen should use all of the space
      const ratio = (isFullscreen ? (rect.height / rect.width)
        : (DEFAULT_RATIO_HEIGHT / DEFAULT_RATIO_WIDTH));

      wrapper.style.height = (isFullscreen ? '100%' : (`${rect.width * ratio  }px`));

      // Apply separate styles for mobile
      if (rect.width <= PHONE_SIZE_MAX_WIDTH) {
        wrapper.classList.add('h5p-phone-size');
      }
      else {
        wrapper.classList.remove('h5p-phone-size');
      }
      if (rect.width < MEDIUM_TABLET_SIZE_MAX_WIDTH) {
        wrapper.classList.add('h5p-medium-tablet-size');
      }
      else {
        wrapper.classList.remove('h5p-medium-tablet-size');
      }

      // Resize scene
      if (this.currentScene === null || !this.threeSixty) {
        return;
      }

      const updatedRect = wrapper.getBoundingClientRect();
      this.threeSixty.resize(updatedRect.width / updatedRect.height);
    });

    this.getRatio = () => {
      const rect = wrapper.getBoundingClientRect();
      return (rect.width / rect.height);
    };

    const setCameraPosition = (cameraPosition, focus) => {
      if (this.currentScene === null || !this.threeSixty) {
        return;
      }

      const [yaw, pitch] = cameraPosition.split(',');
      this.threeSixty.setCameraPosition(parseFloat(yaw), parseFloat(pitch));
      if (focus) {
        this.threeSixty.focus();
      }
    };

    this.getCamera = () => {
      if (this.currentScene === null || !this.threeSixty) {
        return;
      }

      return {
        camera: this.threeSixty.getCurrentPosition(),
        fov: this.threeSixty.getCurrentFov(),
      };
    };

    this.setSceneRenderingQuality = (quality) => {
      const segments = sceneRenderingQualityMapping[quality];
      this.threeSixty.setSegmentNumber(segments);
      this.sceneRenderingQuality = quality;
    };

    /**
     * Update parameters from editor.
     * @param {object} params Parameters to update with. Passed by reference!
     */
    this.updateParams = (params) => {
      this.params = params;
    };
  }

  return Wrapper;
})();
