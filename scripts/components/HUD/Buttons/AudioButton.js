import React from 'react';

import { H5PContext } from '../../../context/H5PContext.js';
import Button from './Button/Button.js';

export default class AudioButton extends React.Component {
  /**
   * Create audio button component.
   * @param {object} props Component props.
   */
  constructor(props) {
    super(props);

    // Separate players for the different scenes
    this.players = {};
  }

  /**
   * Determine player ID from given props.
   * @param {object} props Component props (scene ID and scene audio track).
   * @returns {string} Player ID, or null if no audio track applies.
   */
  getPlayerId = (props) => {
    if (props.sceneId !== undefined && props.sceneAudioTrack && props.sceneAudioTrack.length) {
      return `scene-${  props.sceneId}`;
    }
    if (this.context.behavior.audio && this.context.behavior.audio.length) {
      return 'global';
    }

    return null;
  };

  /**
   * Get track from given player ID.
   * @param {string} id Player ID ('global' or scene ID).
   * @returns {Array} Audio source files for track.
   */
  getTrack = (id) => {
    return (id === 'global' ? this.context.behavior.audio : this.props.sceneAudioTrack);
  };

  /**
   * Get audio player for current track.
   * @param {string} id Player ID.
   * @returns {object} Audio player (HTMLAudioElement), or null if track isn't playable.
   */
  getPlayer = (id) => {
    if (!id) {
      return null;
    }

    // Create player if none exist
    if (this.players[id] === undefined) {
      this.players[id] = AudioButton.createAudioPlayer(
        this.context.contentId,
        this.getTrack(id),
        () => this.props.onIsPlaying(id),
        () => {
          if (this.props.isPlaying === id) {
            this.props.onIsPlaying(null);
          }
        },
        true,
      );
    }

    return this.players[id];
  };

  /**
   * Handle audio button click.
   */
  handleClick = () => {
    // Determine player ID
    const id = this.getPlayerId(this.props);
    const player = this.getPlayer(id);
    if (player) {
      if (id === this.props.isPlaying) {
        // Pause and reset the player
        player.pause();
      }
      else {
        // Start the playback!
        player.play();
      }
    }
  };

  /**
   * Handle audio playback start.
   */
  handlePlay = () => {
    this.setState({
      isPlaying: true,
    });
  };

  /**
   * Handle audio playback stop.
   */
  handleStop = () => {
    this.setState({
      isPlaying: false,
    });
  };

  /**
   * React - update after render.
   * @param {object} prevProps Props from previous render.
   */
  componentDidUpdate(prevProps) {
    if (this.props.isPlaying && this.props.isPlaying !== prevProps.isPlaying) {
      // The Audio Player has changed

      if (AudioButton.isSceneAudio(prevProps.isPlaying)) {
        // Thas last player was us, we need to stop it

        const lastPlayer = this.getPlayer(prevProps.isPlaying);
        if (lastPlayer) {
          // Pause and reset the last player
          lastPlayer.pause();
        }
      }
    }

    if (AudioButton.isSceneAudio(this.props.isPlaying)) {
      // We are playing something

      const currentPlayerId = this.getPlayerId(this.props);
      if (this.props.isPlaying !== currentPlayerId) {
        // We are playing the audio track from another scene... we need to change track!

        const isPlayer = this.getPlayer(this.props.isPlaying);
        if (isPlayer) {
          // Pause and reset last player
          isPlayer.pause();
        }

        // and start the current player
        const currentPlayer = this.getPlayer(currentPlayerId);
        if (currentPlayer) {
          currentPlayer.play();
        }
      }
    }
  }

  /**
   * React - create DOM elements.
   * @returns {React.Element|null} Rendered audio button, or null if no track applies.
   */
  render() {
    const id = this.getPlayerId(this.props);
    if (!id) {
      return null;
    }

    const type = (`audio-track${  this.props.isPlaying === id ? ' active' : ''}`);
    return (
      <Button
        type={ type }
        label={ this.props.isPlaying === id ? this.context.l10n.pauseAudioTrack : this.context.l10n.playAudioTrack }
        isHiddenBehindOverlay={ this.props.isHiddenBehindOverlay }
        onClick={ this.handleClick }
      />
    );
  }

  /**
   * Determine if player ID belongs to scene audio track.
   * @param {string} id Player ID to check.
   * @returns {boolean} Whether player ID belongs to scene audio track.
   */
  static isSceneAudio(id) {
    return id === 'global' || id?.startsWith('scene-');
  }

  /**
   * Determine if player ID belongs to interaction audio track.
   * @param {string} id Player ID to check.
   * @returns {boolean} Whether player ID belongs to interaction audio track.
   */
  static isInteractionAudio(id) {
    return id?.startsWith('interaction-');
  }

  /**
   * Determine if player ID belongs to video interaction.
   * @param {string} id Player ID to check.
   * @returns {boolean} Whether player ID belongs to video interaction.
   */
  static isVideoAudio(id) {
    return id?.startsWith('video-');
  }

  /**
   * Create audio player and find appropriate source.
   * @param {number} id Content ID.
   * @param {Array} sources Audio source files (path and mime pairs) to add.
   * @param {function} onPlay Callback.
   * @param {function} onStop Callback.
   * @param {boolean} loop Whether audio should loop.
   * @returns {object} Created audio player (HTMLAudioElement), or null if not supported.
   */
  static createAudioPlayer(id, sources, onPlay, onStop, loop) {
    // Check if browser supports audio.
    let player = document.createElement('audio');
    if (player.canPlayType !== undefined) {
      // Add supported source files.
      for (let i = 0; i < sources.length; i++) {
        if (player.canPlayType(sources[i].mime)) {
          const source = document.createElement('source');
          source.src = H5P.getPath(sources[i].path, id);
          source.type = sources[i].mime;
          player.appendChild(source);
        }
      }
    }

    if (!player.children.length) {
      player = null; // Not supported
    }
    else {
      player.controls = false;
      player.preload = 'auto';
      player.loop = loop;
      player.addEventListener('play', onPlay);
      player.addEventListener('ended', onStop);
      player.addEventListener('pause', onStop);
    }

    return player;
  }
}

AudioButton.contextType = H5PContext;
