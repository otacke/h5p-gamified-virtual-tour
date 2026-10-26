import React from 'react';
import { createRoot } from 'react-dom/client';
import Main from '@components/Main.js';
import { H5PContext } from '@context/H5PContext.js';
import { sceneRenderingQualityMapping } from '@components/Scene/SceneTypes/ThreeSixtyScene.js';
import { getInitialInteractionStates } from '@scripts/services/progress.js';

/** @constant {number} DEFAULT_RATIO_HEIGHT Height of default 16:9 aspect ratio. */
const DEFAULT_RATIO_HEIGHT = 9;
/** @constant {number} DEFAULT_RATIO_WIDTH Width of default 16:9 aspect ratio. */
const DEFAULT_RATIO_WIDTH = 16;
/** @constant {number} PHONE_SIZE_MAX_WIDTH Breakpoint for phone-sized wrapper. */
const PHONE_SIZE_MAX_WIDTH = 480;
/** @constant {number} MEDIUM_TABLET_SIZE_MAX_WIDTH Breakpoint for medium tablet-sized wrapper. */
const MEDIUM_TABLET_SIZE_MAX_WIDTH = 768;

// Load library
H5P = H5P || {};

/**
 * H5P content library wrapper for gamified virtual tour.
 * @param {object} params Content library parameters as defined in semantics.json.
 * @param {number} contentId H5P content ID of content instance.
 * @param {object} extras Optional additional H5P options (e.g. forceStartScreen, forceStartCamera).
 */
H5P.GamifiedVirtualTour = class Wrapper extends H5P.EventDispatcher {
  constructor(params, contentId, extras) {
    super();

    extras = extras || {};
    this.forceStartScreen = (extras.forceStartScreen !== undefined && extras.forceStartScreen >= 0)
      ? extras.forceStartScreen : null;

    this.forceStartCamera = extras.forceStartCamera !== undefined ? extras.forceStartCamera : null;

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
      overviewMap: 'Overview map',
      checklist: 'Checklist',
      checklistItemDone: 'Completed',
      checklistItemNotDone: 'Not completed',
      interactionLockedHeader: 'Interaction locked',
      interactionLockedDialog: 'This interaction requires you to meet some goals before it can be opened.',
      ok: 'OK',
      locked: 'Locked',
      criterionMet: 'Met',
      criterionNotMet: 'Not met',
      restrictionsAllOfLong: 'The interaction will not be available unless:',
      restrictionsAnyOfLong: 'The interaction will not be available unless any of:',
      restrictionsAllOf: 'All of:',
      restrictionsAnyOf: 'Any of:',
      restrictionTotalScoreLessThan: 'You have a total score less than @value.',
      restrictionTotalScoreEqualTo: 'You have a total score equal to @value.',
      restrictionTotalScoreNotEqualTo: 'You have a total score not equal to @value.',
      restrictionTotalScoreGreaterThan: 'You have a total score greater than @value.',
      restrictionInteractionScoreLessThan: 'You have a score less than @value in interaction @label.',
      restrictionInteractionScoreEqualTo: 'You have a score equal to @value in interaction @label.',
      restrictionInteractionScoreNotEqualTo: 'You have a score not equal to @value in interaction @label.',
      restrictionInteractionScoreGreaterThan: 'You have a score greater than @value in interaction @label.',
      restrictionInteractionScorePercentageLessThan:
        'You have a score percentage less than @value in interaction @label.',
      restrictionInteractionScorePercentageEqualTo:
        'You have a score percentage equal to @value in interaction @label.',
      restrictionInteractionScorePercentageNotEqualTo:
        'You have a score percentage not equal to @value in interaction @label.',
      restrictionInteractionScorePercentageGreaterThan:
        'You have a score percentage greater than @value in interaction @label.',
      restrictionInteractionProgressIs: 'The progress of interaction @label is @value.',
      restrictionInteractionProgressIsNot: 'The progress of interaction @label is not @value.',
      restrictionTimeBefore: 'The current time is before @value.',
      restrictionTimeIs: 'The current date is @value.',
      restrictionTimeIsNot: 'The current date is not @value.',
      restrictionTimeAfter: 'The current time is after @value.',
      progressUnstarted: 'not started',
      progressOpened: 'started',
      progressCompleted: 'completed',
      progressCleared: 'completed successfully',
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
    this.interactionStates = getInitialInteractionStates(extras.previousState);

    this.on('resize', this.handleResize);
  }

  /**
   * Set current scene ID.
   * @param {number} sceneId ID of scene to display.
   */
  setCurrentSceneId = (sceneId) => {
    this.currentScene = sceneId;

    this.trigger('changedScene', sceneId);

    this.renderMain();

    window.requestAnimationFrame(() => {
      this.trigger('resize');
    });
  };

  /**
   * Create wrapper element and render main component.
   */
  createElements = () => {
    this.wrapper = document.createElement('div');
    this.wrapper.classList.add('h5p-three-sixty-wrapper');

    this.currentScene = this.params.startSceneId;
    if (this.forceStartScreen) {
      this.currentScene = this.forceStartScreen;
    }

    this.root = createRoot(this.wrapper);

    this.renderMain();
  };

  /**
   * Re-draw content, switching scene if needed.
   * @param {number} [forceStartScreen] ID of scene to display instead of current.
   */
  reDraw = (forceStartScreen = this.currentScene) => {
    const sceneRenderingQuality = this.behavior.sceneRenderingQuality;
    if (sceneRenderingQuality !== this.sceneRenderingQuality && this.threeSixty) {
      this.setSceneRenderingQuality(sceneRenderingQuality);
    }

    if (forceStartScreen !== this.currentScene) {
      this.setCurrentSceneId(forceStartScreen);
      return;
    }

    this.renderMain();
  };

  /**
   * Render main component.
   */
  renderMain = () => {
    this.root.render(
      <H5PContext.Provider value={this}>
        <Main
          forceStartScreen={this.forceStartScreen}
          forceStartCamera={this.forceStartCamera}
          currentScene={this.currentScene}
          setCurrentSceneId={this.setCurrentSceneId}
          addThreeSixty={ (tS) => this.threeSixty = tS }
          onSetCameraPos={this.setCameraPosition}
          initialInteractionStates={this.interactionStates}
          onInteractionStatesChanged={this.handleInteractionStatesChanged}
        />
      </H5PContext.Provider>,
    );
  };

  /**
   * Store progress and scores of interactions for resuming.
   * @param {object} interactionStates States of interactions, keyed by interaction ID.
   */
  handleInteractionStatesChanged = (interactionStates) => {
    this.interactionStates = interactionStates;
  };

  /**
   * Get current state for resuming.
   * @returns {object|undefined} Current state, or undefined if there is nothing to resume.
   */
  getCurrentState = () => {
    if (!Object.keys(this.interactionStates).length) {
      return;
    }

    return {
      interactionStates: this.interactionStates,
    };
  };

  /**
   * Attach wrapper to container.
   * @param {object} $container jQuery object wrapping container element.
   */
  attach = ($container) => {
    if (!this.wrapper) {
      this.createElements();
    }

    // Append elements to DOM
    $container[0].appendChild(this.wrapper);
    $container[0].classList.add('h5p-gamified-virtual-tour');
  };

  /**
   * Get wrapper bounding rect.
   * @returns {object} Wrapper bounding rect.
   */
  getRect = () => {
    return this.wrapper.getBoundingClientRect();
  };

  /**
   * Resize wrapper and scene.
   */
  handleResize = () => {
    const isFullscreen = this.wrapper.parentElement.classList.contains('h5p-fullscreen')
      || this.wrapper.parentElement.classList.contains('h5p-semi-fullscreen');
    const rect = this.getRect();
    // Fullscreen should use all of the space
    const ratio = (isFullscreen ? (rect.height / rect.width) : (DEFAULT_RATIO_HEIGHT / DEFAULT_RATIO_WIDTH));

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

  /**
   * Get wrapper aspect ratio.
   * @returns {number} Wrapper aspect ratio.
   */
  getRatio = () => {
    const rect = this.wrapper.getBoundingClientRect();
    return (rect.width / rect.height);
  };

  /**
   * Set camera position.
   * @param {object} cameraPosition Camera position with yaw and pitch.
   * @param {boolean} [focus] Whether to focus scene.
   */
  setCameraPosition = (cameraPosition, focus) => {
    if (this.currentScene === null || !this.threeSixty) {
      return;
    }

    this.threeSixty.setCameraPosition(parseFloat(cameraPosition.yaw), parseFloat(cameraPosition.pitch));
    if (focus) {
      this.threeSixty.focus();
    }
  };

  /**
   * Get camera position and field of view.
   * @returns {object|undefined} Object with camera position and field of view, or undefined if no scene.
   */
  getCamera = () => {
    if (this.currentScene === null || !this.threeSixty) {
      return;
    }

    return {
      camera: this.threeSixty.getCurrentPosition(),
      fov: this.threeSixty.getCurrentFov(),
    };
  };

  /**
   * Set scene rendering quality.
   * @param {string} quality Rendering quality ('high', 'medium' or 'low').
   */
  setSceneRenderingQuality = (quality) => {
    const segments = sceneRenderingQualityMapping[quality];
    this.threeSixty.setSegmentNumber(segments);
    this.sceneRenderingQuality = quality;
  };

  /**
   * Update parameters from editor.
   * @param {object} params Parameters to update with (passed by reference).
   */
  updateParams = (params) => {
    this.params = params;
  };
};
