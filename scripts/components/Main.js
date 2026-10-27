import React from 'react';
import Scene, { SceneTypes } from '@components/Scene/Scene.js';
import Dialog from '@components/Dialog/Dialog.js';
import InteractionContent from '@components/Dialog/InteractionContent.js';
import { H5PContext } from '@context/H5PContext.js';
import '@components/Main.css';
import HUD from '@components/HUD/HUD.js';
import AudioButton from '@components/HUD/Buttons/AudioButton.js';
import NoScene from '@components/Scene/NoScene.js';
import { isCompletingStatement, isInstanceTask } from '@scripts/services/h5p-util.js';
import { getScoreFeedback, hasFeedbackMessage } from '@scripts/services/score-feedback.js';
import FeedbackOverlay from '@components/Dialog/FeedbackOverlay.js';
import {
  getInteractionProgress,
  isInteractionTask,
  getInteractionScore,
  getInteractionScorePercentage,
  getTotalScore,
  mergeInteractionState,
} from '@scripts/services/progress.js';
import Restrictions from '@scripts/services/restrictions/Restrictions.js';
import { getInteractionLabel } from '@scripts/services/interaction-util.js';
import { showRestrictionsDialog } from '@components/Dialog/RestrictionsDialog.js';

/** @constant {number} TIME_RESTRICTION_CHECK_INTERVAL_MS Interval for re-checking time restrictions. */
const TIME_RESTRICTION_CHECK_INTERVAL_MS = 2500;

export default class Main extends React.Component {
  /**
   * Create main component.
   * @param {object} props Component props.
   */
  constructor(props) {
    super(props);

    this.audioPlayers = {};

    this.state = {
      threeSixty: null,
      showingTextDialog: false,
      currentText: null,
      showingInteraction: false,
      currentInteraction: null,
      sceneHistory: [],
      audioIsPlaying: null,
      focusedInteraction: null,
      isEditingInteraction: false,
      nextFocus: null,
      sceneWaitingForLoad: null,
      updateThreeSixty: false,
      hudPanel: null,
      scoreFeedback: null,
      interactionStates: this.props.initialInteractionStates ?? {},
      labelBehavior: {
        showLabel: true,
        labelPosition: 'right',
      },
    };
  }

  /**
   * React - run after initial render.
   */
  componentDidMount() {
    this.updateTimeRestrictionTimer();

    this.context.interactionInstances.setCallbacks({
      onXAPI: this.handleInstanceXAPI,
    });

    // Listen for focus to interaction
    this.context.on('focusInteraction', (e) => {
      this.setState({
        focusedInteraction: e.data[0],
        isEditingInteraction: e.data[1],
      });
    });

    // Update edit state to false after done editing event
    this.context.on('updateEditStateInteraction', () => {
      this.setState({
        isEditingInteraction: false,
      });
    });
  }

  /**
   * React - update after render.
   * @param {object} prevProps Props from previous render.
   * @param {object} prevState State from previous render.
   */
  componentDidUpdate(prevProps, prevState) {
    this.updateTimeRestrictionTimer();

    if (prevProps.resetCount !== this.props.resetCount) {
      this.reset();
      return;
    }

    if (this.state.updateThreeSixty) {
      this.setState({
        updateThreeSixty: false,
      });
    }
    if (this.state.labelBehavior && this.context.behavior.label) {
      if ( this.state.labelBehavior.showLabel !== this.context.behavior.label.showLabel ||
        this.state.labelBehavior.labelPosition !== this.context.behavior.label.labelPosition
      ) {
        this.setState({
          labelBehavior: {
            showLabel: this.context.behavior.label.showLabel,
            labelPosition: this.context.behavior.label.labelPosition,
          },
          updateThreeSixty: true,
        });
      }
    }

    const validScenes = (this.context.params.scenes ?? []).map((scene) => {
      return scene.sceneId;
    });

    const prunedHistory = this.state.sceneHistory.filter((sceneId) => {
      return validScenes.includes(sceneId);
    });

    // Scene has been removed from params, but not yet from history
    if (this.state.sceneHistory.length !== prunedHistory.length) {
      let lastElement = prunedHistory[prunedHistory.length - 1];
      // Remove current scene if it is at the top of the history
      while (lastElement === this.props.currentScene) {
        prunedHistory.pop();
        lastElement = prunedHistory.length ? prunedHistory[prunedHistory.length - 1] : null;
      }
      this.setState({
        sceneHistory: prunedHistory,
      });
    }
    if (this.props.currentScene !== prevProps.currentScene) {

      // We skip adding to history if we navigated backwards
      if (this.skipHistory) {
        this.skipHistory = false;
        return;
      }

      this.setState({
        sceneHistory: [...this.state.sceneHistory, prevProps.currentScene],
      });
    }

    // Something is playing audio
    if (!this.state.audioIsPlaying || this.state.audioIsPlaying === prevState.audioIsPlaying) {
      return;
    }

    // Thas last player was us, we need to stop it
    if (!AudioButton.isInteractionAudio(prevState.audioIsPlaying)) {
      return;
    }

    const lastPlayer = this.getAudioPlayer(prevState.audioIsPlaying);
    if (lastPlayer) {
      // Pause and reset the last player
      lastPlayer.pause();
      lastPlayer.currentTime = 0;
    }
  }

  /**
   * React - run before unmount.
   */
  componentWillUnmount() {
    window.clearInterval(this.timeRestrictionTimer);
  }

  /**
   * Get access restrictions of interaction.
   * @param {object} sceneParams Parameters of scene containing interaction.
   * @param {object} interaction Interaction parameters.
   * @returns {Restrictions} Restrictions of interaction.
   */
  getRestrictions = (sceneParams, interaction) => {
    const states = this.state.interactionStates;

    return new Restrictions(interaction.accessRestrictions, {
      l10n: this.context.l10n,
      callbacks: {
        getTotalScore: () => getTotalScore(states),
        getInteractionScore: (id) => getInteractionScore(states, id),
        getInteractionScorePercentage: (id) => getInteractionScorePercentage(states, id),
        getInteractionProgress: (id) => getInteractionProgress(states, id),
        isInteractionTask: (id) => isInteractionTask(states, id),
        getInteractionLabel: (id) => {
          const referenced = (sceneParams.interactions ?? []).find((other) => other.id === id);
          return referenced ? getInteractionLabel(referenced) : null;
        },
        getTime: () => new Date(),
      },
    });
  };

  /**
   * Determine whether interaction is locked. Interactions are never locked in editor.
   * @param {object} sceneParams Parameters of scene containing interaction.
   * @param {object} interaction Interaction parameters.
   * @returns {boolean} True, if access restrictions of interaction are not met.
   */
  isInteractionLocked = (sceneParams, interaction) => {
    if (this.context.extras.isEditor) {
      return false;
    }

    return !this.getRestrictions(sceneParams, interaction).isMet();
  };

  /**
   * Get IDs of locked interactions of scene.
   * @param {object} sceneParams Scene parameters.
   * @returns {string[]} IDs of interactions whose access restrictions are not met.
   */
  getLockedInteractions = (sceneParams) => {
    return (sceneParams.interactions ?? [])
      .filter((interaction) => this.isInteractionLocked(sceneParams, interaction))
      .map((interaction) => interaction.id);
  };

  /**
   * Get IDs of interactions of scene that have restrictions, for highlighting them in editor.
   * @param {object} sceneParams Scene parameters.
   * @returns {string[]} IDs of interactions with restrictions, empty outside of editor.
   */
  getRestrictedInteractions = (sceneParams) => {
    if (!this.context.extras.isEditor) {
      return [];
    }

    return (sceneParams.interactions ?? [])
      .filter((interaction) => this.getRestrictions(sceneParams, interaction).hasRestrictions())
      .map((interaction) => interaction.id);
  };

  /**
   * Re-render periodically while current scene has time restrictions, so interactions unlock in time.
   */
  updateTimeRestrictionTimer = () => {
    const sceneParams = (this.context.params.scenes ?? []).find((scene) => scene.sceneId === this.props.currentScene);
    const interactions = sceneParams?.interactions ?? [];
    const hasTimeRestrictions = !this.context.extras.isEditor && interactions.some((interaction) => {
      return this.getRestrictions(sceneParams, interaction).includesTime();
    });

    if (hasTimeRestrictions && !this.timeRestrictionTimer) {
      this.timeRestrictionTimer = window.setInterval(() => this.forceUpdate(), TIME_RESTRICTION_CHECK_INTERVAL_MS);
    }
    else if (!hasTimeRestrictions && this.timeRestrictionTimer) {
      window.clearInterval(this.timeRestrictionTimer);
      this.timeRestrictionTimer = null;
    }
  };

  /**
   * Set focused interaction index.
   * @param {number} focusedInteraction Index of focused interaction.
   */
  setFocusedInteraction = (focusedInteraction) => {
    this.setState({
      focusedInteraction: focusedInteraction,
    });
  };

  /**
   * Blur focused interaction.
   */
  blurInteraction = () => {
    this.setState({
      focusedInteraction: null,
    });
  };

  /**
   * Navigate to scene.
   * @param {number} sceneId ID of scene to navigate to.
   */
  navigateToScene = (sceneId) => {
    this.setState({
      sceneWaitingForLoad: this.props.currentScene,
      focusedInteraction: null,
      childrenCanTakeFocus: true,
    });
    let nextSceneId = null;
    if (sceneId === SceneTypes.PREVIOUS_SCENE) {
      const history = [...this.state.sceneHistory];
      nextSceneId = history.pop();
      this.skipHistory = true;
      this.setState({
        sceneHistory: history,
      });
    }
    else {
      nextSceneId = this.context.params.scenes.find((scene) => {
        return scene.sceneId === sceneId;
      }).sceneId;
    }

    // Pause any playing interaction audio on navigation
    const isInteractionAudioPlaying = this.state.audioIsPlaying
      && AudioButton.isInteractionAudio(this.state.audioIsPlaying);
    if (isInteractionAudioPlaying) {
      const lastPlayer = this.getAudioPlayer(this.state.audioIsPlaying);
      if (lastPlayer) {
        // Pause and reset the interaction player from last scene
        lastPlayer.pause();
        lastPlayer.currentTime = 0;
      }
    }

    this.props.setCurrentSceneId(nextSceneId);
  };


  /**
   * Show scene description in dialog.
   * @param {string} text Scene description.
   */
  handleSceneDescription = (text) => {
    this.setState({
      showingTextDialog: true,
      currentText: text,
      nextFocus: null,
    });
  };

  /**
   * Close text dialog.
   */
  handleCloseTextDialog = () => {
    this.setState({
      showingTextDialog: false,
      currentText: null,
      nextFocus: 'scene-description', // Should probably come in as an arg when opening the dialog
    });
  };

  /**
   * Get audio player for current track.
   * @param {string} id Player ID.
   * @param {object} [interaction] Interaction parameters (only needed initially).
   * @returns {HTMLAudioElement|undefined} Audio player, or undefined if track isn't playable.
   */
  getAudioPlayer = (id, interaction) => {
    // Create player if none exist
    if (this.audioPlayers[id] === undefined) {
      if (!interaction || !interaction.action || !interaction.action.params || !interaction.action.params.files ||
          !interaction.action.params.files.length) {
        return; // No track to play
      }
      this.audioPlayers[id] = AudioButton.createAudioPlayer(
        this.context.contentId,
        interaction.action.params.files,
        () => {
          this.setState({
            audioIsPlaying: id, // Set state on starting to play
          });
        },
        () => {
          if (this.state.audioIsPlaying === id) {
            this.setState({
              audioIsPlaying: null,  // Clear state on playing ended
            });
          }
        },
        false,
      );
    }

    return this.audioPlayers[id];
  };

  /**
   * Show interaction.
   * @param {number} interactionIndex Index of interaction to show.
   */
  showInteraction = (interactionIndex) => {
    const scene = this.context.params.scenes.find((scene) => {
      return scene.sceneId === this.props.currentScene;
    });
    const interaction = scene.interactions[interactionIndex];

    if (this.isInteractionLocked(scene, interaction)) {
      showRestrictionsDialog({
        container: this.context.container,
        instance: this.context,
        criteria: this.getRestrictions(scene, interaction).getCriteria(),
        l10n: this.context.l10n,
      });
      return;
    }

    const library = H5P.libraryFromString(interaction.action.library);
    const machineName = library.machineName;

    if (machineName === 'H5P.GoToScene') {
      const nextSceneId = parseInt(interaction.action.params.nextSceneId);
      this.navigateToScene(nextSceneId);
    }
    else if (machineName === 'H5P.Audio') {
      const playerId = `interaction-${  scene.sceneId  }-${  interactionIndex}`;
      if (this.state.audioIsPlaying === playerId) {
        // Pause and reset player
        const lastPlayer = this.getAudioPlayer(playerId);
        if (lastPlayer) {
          lastPlayer.pause();
          lastPlayer.currentTime = 0;
        }
      }
      else {
        // Start current audio playback
        const player = this.getAudioPlayer(playerId, interaction);
        if (player) {
          player.play();
          this.updateInteractionState(interaction.id, { progress: 'cleared', isTask: false });
        }
      }
    }
    else {
      // Show interaction in dialog by default
      this.setState({
        showingInteraction: true,
        currentInteraction: interactionIndex,
        nextFocus: null,
      });
    }
  };

  /**
   * Update progress and score of interaction.
   * @param {string} interactionId ID of interaction.
   * @param {object} changes Changes with progress, score and maxScore.
   */
  updateInteractionState = (interactionId, changes) => {
    if (!interactionId) {
      return;
    }

    this.setState((prevState) => ({
      interactionStates: {
        ...prevState.interactionStates,
        [interactionId]: mergeInteractionState(prevState.interactionStates[interactionId], changes),
      },
    }), () => {
      this.props.onInteractionStatesChanged?.(this.state.interactionStates);
    });
  };

  /**
   * Reset progress, history, dialogs and audio after content was reset.
   */
  reset = () => {
    Object.values(this.audioPlayers).forEach((player) => {
      player.pause();
      player.currentTime = 0;
    });

    this.setState({
      interactionStates: {},
      sceneHistory: [],
      showingTextDialog: false,
      currentText: null,
      showingInteraction: false,
      currentInteraction: null,
      audioIsPlaying: null,
      hudPanel: null,
      scoreFeedback: null,
    });
  };

  /**
   * Track progress of interaction that was opened.
   * @param {object} interaction Interaction parameters.
   * @param {boolean} isTask True, if interaction's content is a task.
   */
  handleInteractionOpened = (interaction, isTask) => {
    this.updateInteractionState(
      interaction.id,
      isTask ? { progress: 'opened', isTask: true } : { progress: 'cleared', isTask: false },
    );
  };

  /**
   * Track progress and score of interaction's content instance.
   * @param {object} interaction Interaction parameters.
   * @param {object} instance H5P instance of interaction's content.
   * @param {object} event xAPI event.
   */
  handleInstanceXAPI = (interaction, instance, event) => {
    if (!isInstanceTask(instance) || !isCompletingStatement(event, instance)) {
      return;
    }

    const score = event.getScore();
    const maxScore = event.getMaxScore();
    const hasScore = typeof score === 'number' && typeof maxScore === 'number';
    const isSuccess = event.getVerifiedStatementValue(['result', 'success']) === true ||
      (hasScore && maxScore > 0 && score >= maxScore);

    this.updateInteractionState(interaction.id, {
      progress: isSuccess ? 'cleared' : 'completed',
      ...(hasScore && { score: score, maxScore: maxScore }),
    });

    if (hasScore) {
      this.showScoreFeedback(interaction, score, maxScore);
    }
  };

  /**
   * Show feedback that author defined for score range of interaction.
   * @param {object} interaction Interaction parameters.
   * @param {number} score Score achieved.
   * @param {number} maxScore Maximum score.
   */
  showScoreFeedback = (interaction, score, maxScore) => {
    const range = getScoreFeedback(interaction.scoreFeedback?.ranges, score, maxScore);
    if (!hasFeedbackMessage(range)) {
      return;
    }

    // Key lets overlay be recreated if new feedback arrives while it is shown
    this.scoreFeedbackCount = (this.scoreFeedbackCount ?? 0) + 1;

    this.setState({
      scoreFeedback: { text: range.text, image: range.image, key: this.scoreFeedbackCount },
    });
  };

  /**
   * Close score feedback.
   */
  closeScoreFeedback = () => {
    this.setState({ scoreFeedback: null });
  };

  /**
   * Hide interaction dialog.
   */
  hideInteraction = () => {
    this.setState((prevState) => ({
      showingInteraction: false,
      currentInteraction: null,
      nextFocus: `interaction-${  prevState.currentInteraction}`,
    }));
  };

  /**
   * Add ThreeSixty instance.
   * @param {object} threeSixty ThreeSixty scene instance.
   */
  addThreeSixty = (threeSixty) => {
    this.props.addThreeSixty(threeSixty);
    this.setState({
      threeSixty: threeSixty,
    });
  };

  /**
   * Set player ID of playing audio.
   * @param {string} id Player ID, or null if no audio plays.
   */
  handleAudioIsPlaying = (id) => {
    this.setState({
      audioIsPlaying: id, // Change the player
    });
  };

  /**
   * Show panel in HUD, or hide it if it is already shown. Only one panel can be shown at a time.
   * @param {string} panel Identifier of panel to toggle.
   */
  toggleHudPanel = (panel) => {
    this.setState((prevState) => ({
      hudPanel: prevState.hudPanel === panel ? null : panel,
    }));
  };

  /**
   * Center camera at scene start position.
   */
  centerScene = () => {
    const sceneParams = this.context.params.scenes;
    const scene = sceneParams.find((scene) => {
      return scene.sceneId === this.props.currentScene;
    });
    if (!scene) {
      return;
    }

    this.props.onSetCameraPos(scene.cameraStartPosition, true);
  };

  /**
   * Mark next scene as loaded.
   */
  doneLoadingNextScene = () => {
    this.setState({
      sceneWaitingForLoad: null,
    });
  };

  /**
   * React - create DOM elements.
   * @returns {React.Element|null} Rendered main elements, or null if no scene.
   */
  render() {
    const sceneParams = this.context.params.scenes;
    if (!sceneParams?.length) {
      return <NoScene label={this.context.l10n.noContent} />;
    }

    const scene = sceneParams.find((scene) => {
      return scene.sceneId === this.props.currentScene;
    });
    if (!scene) {
      return null;
    }
    const isShowingInteraction = this.state.showingInteraction && this.state.currentInteraction !== null;

    let dialogClasses = [];
    if (isShowingInteraction) {
      const scene = this.context.params.scenes.find((scene) => {
        return scene.sceneId === this.props.currentScene;
      });
      const interaction = scene.interactions[this.state.currentInteraction];
      const library = H5P.libraryFromString(interaction.action.library);
      const interactionClass = library.machineName.replace('.', '-').toLowerCase();

      dialogClasses.push(interactionClass);
    }

    const showInteractionDialog = (this.state.showingInteraction && this.state.currentInteraction !== null);
    const showTextDialog = (this.state.showingTextDialog && this.state.currentText);

    // Whenever a dialog is shown we need to hide all the elements behind the overlay
    const isHiddenBehindOverlay = (showInteractionDialog || showTextDialog || !!this.state.scoreFeedback);

    let dialogTitle;
    if (showInteractionDialog) {
      dialogTitle = scene.interactions[this.state.currentInteraction].action.metadata.title;
    }

    const sceneIcons = this.context.params.scenes.map((sceneParams) => {
      return {
        id: sceneParams.sceneId,
        iconType: sceneParams.iconType,
      };
    });

    return (
      <div role="document" aria-label={ this.context.l10n.title }>
        { showInteractionDialog &&
          <Dialog
            title={ dialogTitle }
            onHideTextDialog={this.hideInteraction}
            dialogClasses={dialogClasses}
          >
            <InteractionContent
              currentScene={this.props.currentScene}
              currentInteraction={this.state.currentInteraction}
              audioIsPlaying={ this.state.audioIsPlaying }
              onAudioIsPlaying={ this.handleAudioIsPlaying }
              onInteractionOpened={ this.handleInteractionOpened }
            />
          </Dialog>
        }
        { showTextDialog &&
          <Dialog
            title={ this.context.l10n.sceneDescription }
            onHideTextDialog={  this.handleCloseTextDialog  }
          >
            <div dangerouslySetInnerHTML={{ __html: this.state.currentText }} />
          </Dialog>
        }
        {
          this.context.params.scenes.map((sceneParams) => {
            return (
              <Scene
                key={sceneParams.sceneId}
                threeSixty={this.state.threeSixty}
                updateThreeSixty={this.state.updateThreeSixty}
                isActive={sceneParams.sceneId === this.props.currentScene}
                isHiddenBehindOverlay={ isHiddenBehindOverlay }
                sceneIcons={sceneIcons}
                sceneParams={sceneParams}
                nextFocus={ this.state.nextFocus }
                addThreeSixty={ this.addThreeSixty }
                imageSrc={sceneParams.scenesrc}
                navigateToScene={this.navigateToScene}
                forceStartCamera={this.props.forceStartCamera}
                showInteraction={this.showInteraction}
                sceneHistory={this.state.sceneHistory}
                audioIsPlaying={ this.state.audioIsPlaying }
                sceneId={sceneParams.sceneId}
                onSetCameraPos={ this.props.onSetCameraPos }
                onBlurInteraction={this.blurInteraction}
                onFocusedInteraction={this.setFocusedInteraction}
                focusedInteraction={this.state.focusedInteraction}
                isEditingInteraction={this.state.isEditingInteraction}
                sceneWaitingForLoad={this.state.sceneWaitingForLoad}
                doneLoadingNextScene={this.doneLoadingNextScene}
                canTakeFocus={this.state.childrenCanTakeFocus}
                lockedInteractions={
                  sceneParams.sceneId === this.props.currentScene ? this.getLockedInteractions(sceneParams) : []
                }
                restrictedInteractions={
                  sceneParams.sceneId === this.props.currentScene ? this.getRestrictedInteractions(sceneParams) : []
                }
              />
            );
          })
        }
        <HUD
          scene={ scene }
          audioIsPlaying={ this.state.audioIsPlaying }
          isHiddenBehindOverlay={ isHiddenBehindOverlay }
          nextFocus={ this.state.nextFocus }
          onAudioIsPlaying={ this.handleAudioIsPlaying }
          onSceneDescription={ this.handleSceneDescription }
          onCenterScene={ this.centerScene }
          hudPanel={ this.state.hudPanel }
          onToggleHudPanel={ this.toggleHudPanel }
          interactionStates={ this.state.interactionStates }
          lockedInteractions={ this.getLockedInteractions(scene) }
          onShowInteraction={ this.showInteraction }
        />
        {
          this.state.scoreFeedback &&
          <FeedbackOverlay
            key={ this.state.scoreFeedback.key }
            text={ this.state.scoreFeedback.text }
            image={ this.state.scoreFeedback.image }
            onClose={ this.closeScoreFeedback }
          />
        }
      </div>
    );
  }
}

Main.contextType = H5PContext;
