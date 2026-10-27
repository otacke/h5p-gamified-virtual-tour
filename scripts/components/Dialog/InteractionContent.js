import React from 'react';
import '@components/Dialog/InteractionContent.css';
import { H5PContext } from '@context/H5PContext.js';
import AudioButton from '@components/HUD/Buttons/AudioButton.js';

export default class InteractionContent extends React.Component {
  /**
   * Create interaction content component.
   * @param {object} props Component props.
   */
  constructor(props) {
    super(props);

    this.contentRef = React.createRef();
  }

  /**
   * React - run after initial render.
   */
  componentDidMount() {
    const scene = this.context.params.scenes.find((scene) => {
      return scene.sceneId === this.props.currentScene;
    });
    const interaction = scene.interactions[this.props.currentInteraction];

    // Instances are created up front, but not in the editor
    this.entry = this.context.interactionInstances.create(interaction);
    if (!this.entry) {
      return;
    }

    const instance = this.entry.instance;
    const wasAttached = this.entry.isAttached;

    this.contentRef.current.append(this.context.interactionInstances.getDOM(interaction.id));

    if (wasAttached && instance.libraryInfo.machineName === 'H5P.InteractiveVideo') {
      this.runInteractiveVideoWorkaround(instance);
    }

    this.handleInstanceResize = () => this.props.onResize();
    instance.on('resize', this.handleInstanceResize);

    if (instance.libraryInfo.machineName === 'H5P.Video') {
      this.handleVideoStateChange = (event) => {
        if (event.data === H5P.Video.PLAYING) {
          this.props.onAudioIsPlaying(`video-${scene.sceneId}-${this.props.currentInteraction}`);
        }
      };
      instance.on('stateChange', this.handleVideoStateChange);
    }

    if (instance.libraryInfo.machineName === 'H5P.Image') {
      this.fitImage(instance);
      instance.on('loaded', this.handleInstanceResize);
    }

    // Resize instance along with content, as H5P core would do for instances attached right away
    this.handleParentResize = () => instance.trigger('resize');
    this.context.on('resize', this.handleParentResize);
    instance.trigger('resize');

    this.props.onInteractionOpened?.(interaction, this.entry.isTask);
  }

  /**
   * React - run before unmount.
   */
  componentWillUnmount() {
    if (!this.entry) {
      return;
    }

    const instance = this.entry.instance;

    this.context.off('resize', this.handleParentResize);
    instance.off('resize', this.handleInstanceResize);
    instance.off('loaded', this.handleInstanceResize);
    if (this.handleVideoStateChange) {
      instance.off('stateChange', this.handleVideoStateChange);
    }

    // Instance is kept, so media must not continue playing when dialog is closed
    try {
      instance.pause?.();
    }
    catch (error) {
      console.warn('Could not pause interaction content:', error);
    }

    this.entry.wrapper.remove();

    // In the editor, parameters may have changed when interaction is shown next time
    if (this.context.extras.isEditor) {
      this.context.interactionInstances.destroy(this.entry.interaction.id);
    }
  }

  /**
   * React - update after render.
   * @param {object} prevProps Props from previous render.
   */
  componentDidUpdate(prevProps) {
    // The Audio Player has changed
    if (!this.props.audioIsPlaying || this.props.audioIsPlaying === prevProps.audioIsPlaying) {
      return;
    }

    // Thas last player was us, we need to stop it
    if (!AudioButton.isVideoAudio(prevProps.audioIsPlaying)) {
      return;
    }

    // NOTE: This is a hack for Panopto embed player bug where the API
    // sends a "play" event to all Panopto players when one is played
    // causing us to think that the audio is changed, when it actually
    // is not.
    // By checking that the new audio source is not a video, we can rule
    // this case out, since two videos can never happen at the same time
    // currently. This can be removed when Panopto has fixed their
    // API. See HFP-3191
    if (!AudioButton.isVideoAudio(this.props.audioIsPlaying)) {
      this.entry?.instance.pause?.();
    }
  }

  /**
   * Fit image into dialog.
   * @param {H5P.Image} instance Image instance.
   */
  fitImage(instance) {
    const img = this.entry.wrapper.querySelector('img');
    if (!img) {
      return;
    }

    const rect = this.context.getRect();
    const contentRatio = (rect.width / rect.height);
    const imageRatio = (instance.width / instance.height);
    const isWide = (imageRatio > contentRatio);
    img.style.width = isWide ? '100%' : 'auto';
    img.style.height = isWide ? 'auto' : '100%';
  }

  /**
   * Workaround for H5P Interactive Video, taken from H5P.GameMap.
   * If the YouTube handler is used and the instance is re-attached, the YouTube player by Google does not send
   * events anymore and therefore Interactive Video does not work properly. This workaround forces the YouTube player
   * to be recreated and the video to be seeked to the previous position.
   * @param {H5P.InteractiveVideo} interactiveVideoInstance Instance of H5P Interactive Video.
   */
  runInteractiveVideoWorkaround(interactiveVideoInstance) {
    const videoInstance = interactiveVideoInstance?.video;
    if (videoInstance?.getHandlerName?.() !== 'YouTube') {
      return; // No YouTube video used.
    }

    const currentTime = videoInstance.getCurrentTime();
    videoInstance.once('loaded', () => {
      if (typeof currentTime === 'number' && currentTime > 0) {
        interactiveVideoInstance.seek(currentTime);
        videoInstance.pause();
      }
    });
    videoInstance.resetPlayback();
  }

  /**
   * React - create DOM elements.
   * @returns {React.Element} Rendered interaction content container.
   */
  render() {
    return (
      <div className='interaction-content' ref={ this.contentRef } />
    );
  }
}

InteractionContent.contextType = H5PContext;
