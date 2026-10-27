import React from 'react';
import { createRoot } from 'react-dom/client';
import Main from '@components/Main.js';
import { H5PContext } from '@context/H5PContext.js';
import { sceneRenderingQualityMapping } from '@components/Scene/SceneTypes/ThreeSixtyScene.js';
import { getInitialInteractionStates, isInteractionDone } from '@scripts/services/progress.js';
import InteractionInstances from '@scripts/services/interaction-instances.js';

/** @constant {number} DEFAULT_RATIO_HEIGHT Height of default 16:9 aspect ratio. */
const DEFAULT_RATIO_HEIGHT = 9;
/** @constant {number} DEFAULT_RATIO_WIDTH Width of default 16:9 aspect ratio. */
const DEFAULT_RATIO_WIDTH = 16;
/** @constant {number} PHONE_SIZE_MAX_WIDTH Breakpoint for phone-sized wrapper. */
const PHONE_SIZE_MAX_WIDTH = 480;
/** @constant {number} MEDIUM_TABLET_SIZE_MAX_WIDTH Breakpoint for medium tablet-sized wrapper. */
const MEDIUM_TABLET_SIZE_MAX_WIDTH = 768;
/** @constant {number} FULLSCREEN_TIMEOUT_MS Delay before toggling fullscreen, so devices register user gesture. */
const FULLSCREEN_TIMEOUT_MS = 300;

/**
 * Format language code to RFC 5646 recommendations, taken from H5P.GameMap.
 * @param {string} languageCode Language code.
 * @returns {string} Formatted language code.
 */
const formatLanguageCode = (languageCode) => {
  if (typeof languageCode !== 'string') {
    return languageCode;
  }

  const segments = languageCode.split('-');
  segments[0] = segments[0].toLowerCase(); // ISO 639 recommendation
  if (segments.length > 1) {
    segments[1] = segments[1].toUpperCase(); // ISO 3166-1 recommendation
  }

  return segments.join('-');
};

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
      fullscreenEnter: 'Enter full screen mode',
      fullscreenExit: 'Exit full screen mode',
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

    // Total score that was last sent with a "completed" statement
    this.completedScore = extras.previousState?.completedScore;
    // Incremented on reset to let main component reset its state
    this.resetCount = 0;

    const defaultLanguage = extras.metadata?.defaultLanguage || 'en';
    this.languageTag = formatLanguageCode(defaultLanguage);

    if (extras.isEditor) {
      /*
       * Kill all external listeners that may have been added so far, so the preview does not pollute LRS (as in
       * H5P.GameMap). /!\ This can have side effects if a customization listens within the H5P Editor!
       */
      H5P.externalDispatcher.off('xAPI');
    }

    this.interactionInstances = new InteractionInstances({
      contentId: this.contentId,
      parent: this,
      previousStates: extras.previousState?.instanceStates,
    });

    // In the editor, parameters can change, so instances are only created when an interaction is shown
    if (!extras.isEditor) {
      this.interactionInstances.createAll(this.params.scenes);
    }

    this.isFullscreenAllowed = !!extras.standalone && !extras.isEditor && H5P.fullscreenSupported;
    this.isFullscreen = false;

    this.on('resize', this.handleResize);

    if (this.isFullscreenAllowed) {
      this.on('enterFullScreen', () => {
        this.isFullscreen = true;
        this.renderMain();
      });

      this.on('exitFullScreen', () => {
        this.isFullscreen = false;
        this.renderMain();
      });
    }
  }

  /**
   * Toggle fullscreen mode.
   */
  toggleFullscreen = () => {
    if (!this.container || !this.isFullscreenAllowed) {
      return;
    }

    // Some devices don't register user gesture before call to requestFullscreen
    window.setTimeout(() => {
      if (H5P.isFullscreen) {
        H5P.exitFullScreen();
      }
      else {
        H5P.fullScreen(H5P.jQuery(this.container), this);
      }
    }, FULLSCREEN_TIMEOUT_MS);
  };

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
          resetCount={this.resetCount}
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
    this.triggerCompletedIfDone();
  };

  /**
   * Trigger "completed" xAPI statement once all tasks are done and whenever the total score changes afterwards.
   */
  triggerCompletedIfDone = () => {
    const taskIds = this.interactionInstances.getTaskEntries().map((entry) => entry.interaction.id);
    const allTasksDone = taskIds.length > 0 &&
      taskIds.every((interactionId) => isInteractionDone(this.interactionStates, interactionId));

    if (!allTasksDone) {
      return;
    }

    const score = this.getScore();
    if (score === this.completedScore) {
      return;
    }

    this.completedScore = score;
    this.trigger(this.createXAPIEvent('completed'));
  };

  /**
   * Get current state for resuming.
   * @returns {object|undefined} Current state, or undefined if there is nothing to resume.
   */
  getCurrentState = () => {
    const instanceStates = this.interactionInstances.getCurrentStates();

    if (!Object.keys(this.interactionStates).length && !Object.keys(instanceStates).length) {
      // Nothing relevant to store, but previous state in DB must be cleared after reset
      return this.contentWasReset ? {} : undefined;
    }

    return {
      interactionStates: this.interactionStates,
      instanceStates: instanceStates,
      ...(this.completedScore !== undefined && { completedScore: this.completedScore }),
    };
  };

  /**
   * Get current score.
   * @returns {number} Current score.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-2}
   */
  getScore = () => {
    return this.interactionInstances.getScore();
  };

  /**
   * Get maximum possible score.
   * @returns {number} Maximum possible score.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-3}
   */
  getMaxScore = () => {
    return this.interactionInstances.getMaxScore();
  };

  /**
   * Determine whether the task was answered already.
   * @returns {boolean} True if answer was given by user, else false.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-1}
   */
  getAnswerGiven = () => {
    return this.interactionInstances.getAnswerGiven() || Object.keys(this.interactionStates).length > 0;
  };

  /**
   * Show solutions.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-4}
   */
  showSolutions = () => {
    this.interactionInstances.showSolutions();
  };

  /**
   * Reset task.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-5}
   */
  resetTask = () => {
    this.contentWasReset = true;
    this.interactionInstances.reset();
    this.interactionStates = {};
    this.completedScore = undefined;
    this.resetCount += 1;

    if (this.root) {
      this.setCurrentSceneId(this.params.startSceneId);
    }
  };

  /**
   * Get xAPI data.
   * @returns {object} xAPI statement with statements of subcontents as children.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-6}
   */
  getXAPIData = () => {
    const xAPIEvent = this.createXAPIEvent('completed');

    // Not a valid xAPI value (!), but H5P uses it for reporting
    xAPIEvent.data.statement.object.definition.interactionType = 'compound';

    return {
      statement: xAPIEvent.data.statement,
      children: this.interactionInstances.getXAPIData(),
    };
  };

  /**
   * Get context data. Contract used for confusion report.
   * @returns {object} Context data.
   */
  getContext = () => {
    return {
      type: 'scene',
      value: this.currentScene,
    };
  };

  /**
   * Create xAPI event.
   * @param {string} verb Short id of the verb to trigger.
   * @returns {H5P.XAPIEvent} xAPI event.
   */
  createXAPIEvent = (verb) => {
    const xAPIEvent = this.createXAPIEventTemplate(verb);

    Object.assign(xAPIEvent.getVerifiedStatementValue(['object', 'definition']), this.getXAPIDefinition());

    if (verb === 'completed' || verb === 'answered') {
      const maxScore = this.getMaxScore();
      const score = Math.min(this.getScore(), maxScore);
      xAPIEvent.setScoredResult(score, maxScore, this, true, score === maxScore);
    }

    return xAPIEvent;
  };

  /**
   * Get xAPI definition for xAPI object.
   * @returns {object} xAPI definition.
   */
  getXAPIDefinition = () => {
    const title = this.getTitle();

    return {
      // Fallback for h5p-php-reporting, expects en-US
      name: { [this.languageTag]: title, 'en-US': title },
      description: { [this.languageTag]: title, 'en-US': title },
      type: 'http://adlnet.gov/expapi/activities/cmi.interaction',
      interactionType: 'other',
    };
  };

  /**
   * Get title of content.
   * @returns {string} Title.
   */
  getTitle = () => {
    // H5P Core function: createTitle
    return H5P.createTitle(this.extras?.metadata?.title || this.l10n.title);
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
    this.container = $container[0];
    this.container.appendChild(this.wrapper);
    this.container.classList.add('h5p-gamified-virtual-tour');
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
