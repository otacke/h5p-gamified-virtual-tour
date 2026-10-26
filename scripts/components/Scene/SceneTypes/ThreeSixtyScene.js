import React from 'react';
import { createRoot } from 'react-dom/client';
import NavigationButton, {
  getIconFromInteraction,
  getLabelFromInteraction,
} from '@components/Shared/NavigationButton.js';
import { H5PContext } from '@context/H5PContext.js';
import ContextMenu from '@components/Shared/ContextMenu.js';
import ThreeSixtyPaths from '@components/Shared/Paths/ThreeSixtyPaths.js';
import loading from '@assets/images/loading.svg';
import '@components/Scene/SceneTypes/ThreeSixtyScene.css';

/** @constant {object} sceneRenderingQualityMapping Segment counts per rendering quality. */
export const sceneRenderingQualityMapping = {
  high: 128,
  medium: 64,
  low: 16,
};

/** @constant {number} DEFAULT_ASPECT_RATIO Default 16:9 aspect ratio. */
// eslint-disable-next-line no-magic-numbers
const DEFAULT_ASPECT_RATIO = 16 / 9;

/** @constant {number} MOUNT_TIMEOUT_MS Delay before mounting scene, in milliseconds. */
const MOUNT_TIMEOUT_MS = 40;

export default class ThreeSixtyScene extends React.Component {
  /**
   * Create three sixty scene component.
   * @param {object} props Component props.
   */
  constructor(props) {
    super(props);

    this.sceneRef = React.createRef();
    this.renderedInteractions = 0;
    this.interactionElements = {}; // Button elements of interactions, keyed by interaction ID

    this.state = {
      imagePath: null, // Path of current loaded image
      isLoaded: false, // Has the image been loaded
      isUpdated: false, // Has the scene been updated
      isRendered: false, // Has the scene been drawn
      cameraPosition: null, // Store current camera position between scene changes
      pointerLockElement: null,
      willPointerLock: false,
      hasPointerLock: false,
    };
  }


  /**
   * Lock dragged navigation button to pointer.
   * @param {object} element Element pointer locks to (navigation button).
   */
  initializePointerLock = (element) => {
    // Not supported
    element.requestPointerLock = element.requestPointerLock || element.mozRequestPointerLock;
    if (!element.requestPointerLock) {
      return;
    }

    // Already queued
    if (this.pointerLockTimeout && this.pointerLockTimeout.current) {
      return;
    }

    this.setState({
      willPointerLock: true,
      pointerLockElement: element,
    });

    this.pointerLockTimeout = setTimeout(() => {
      this.setState({
        hasPointerLock: true,
      });
    }, 100);
  };


  /**
   * Unlock navigation button from pointer.
   */
  cancelPointerLock = () => {
    this.setState({
      willPointerLock: false,
      hasPointerLock: false,
    });
  };


  /**
   * Handle scene move start, locking pointer for navigation button drags.
   * @param {object} e Scene move event.
   * @returns {boolean|undefined} False when move must be prevented (context menu drag), undefined otherwise.
   */
  handleSceneMoveStart = (e) => {

    if (!this.context.extras.isEditor || e.data.isCamera) {
      return;
    }

    const target = e.data.target;
    if (!target) {
      return;
    }

    // Don't move when dragging context menu
    if (target.classList.contains('context-menu')) {
      e.defaultPrevented = true;
      return false;
    }

    // Don't move when dragging context menu children
    if (target.parentNode) {
      const parent = target.parentNode;
      if (parent.classList.contains('context-menu')) {
        e.defaultPrevented = true;
        return false;
      }
    }

    // Make sure we don't start movement on contextmenu actions
    if (
      target.classList.contains('nav-button')
      || target.classList.contains('nav-label-container')
      || target.classList.contains('nav-label')
      || target.classList.contains('nav-label-inner')) {
      const element = e.data.element;
      this.initializePointerLock(element);
    }

    return;
  };

  /**
   * Get interaction title, falling back to content to prevent "Untitled Text".
   * @param {object} action Interaction action.
   * @returns {string} Interaction title.
   */
  getInteractionTitle = (action) => {
    const currentTitle = action.metadata.title;
    switch (currentTitle) {
      case 'Untitled Text':
        return action.params.text;
      case 'Untitled Image':
        return action.params.alt;
      default:
        return currentTitle;
    }
  };

  /**
   * Handle scene move stop.
   * @param {object} e Scene move stop event.
   */
  handleSceneMoveStop = (e) => {
    if (this.context.extras.isEditor) {
      this.cancelPointerLock();
    }
    this.context.trigger('movestop', e.data);
  };

  /**
   * Create or reuse ThreeSixty object and apply all listeners.
   */
  initializeThreeSixty = () => {
    // Determine camera position
    let cameraPosition = this.state.cameraPosition;
    if (!cameraPosition) {
      const startPosition = this.props.sceneParams.cameraStartPosition;

      cameraPosition = {
        yaw: parseFloat(startPosition.yaw),
        pitch: parseFloat(startPosition.pitch),
      };
    }

    let threeSixty;
    if (!this.props.threeSixty) {
      // ThreeSixty has not been used, yet. Create a new instance
      threeSixty = new H5P.ThreeSixty(this.imageElement, {
        ratio: DEFAULT_ASPECT_RATIO,
        cameraStartPosition: cameraPosition,
        segments: sceneRenderingQualityMapping[this.context.sceneRenderingQuality],
      });
      this.props.addThreeSixty(threeSixty);
    }
    else {
      // Set texture + camera pos
      threeSixty = this.props.threeSixty;
      threeSixty.setSourceElement(this.imageElement);
      threeSixty.setCameraPosition(cameraPosition.yaw, cameraPosition.pitch);
    }

    threeSixty.setAriaLabel(this.props.sceneParams.scenename);
    this.sceneRef.current.appendChild(threeSixty.getElement());
    threeSixty.resize(this.context.getRatio());

    // Show loading screen until first render has been drawn
    threeSixty.on('firstrender', () => {
      this.setState({
        isRendered: true,
      });

      if (this.props.canTakeFocus) {
        threeSixty.focus();
      }
    });

    threeSixty.startRendering();
    threeSixty.update();

    threeSixty.on('movestart', this.handleSceneMoveStart);
    threeSixty.on('movestop', this.handleSceneMoveStop);

    // Add buttons to scene
    this.addInteractionHotspots(threeSixty, this.props.sceneParams.interactions);
  };

  /**
   * Load current ThreeSixty scene.
   */
  loadScene = () => {
    if (!this.imageElement) {
      // Create image element used for loading on first load
      this.imageElement = document.createElement('img');
      this.imageElement.addEventListener('load', this.sceneLoaded);
    }

    this.setState({
      imagePath: this.props.imageSrc.path,
      isRendered: false,
    });

    if (H5P.setSource !== undefined) {
      H5P.setSource(this.imageElement, this.props.imageSrc, this.context.contentId);
    }
    else {
      const path = H5P.getPath(this.props.imageSrc.path, this.context.contentId);
      if (H5P.getCrossOrigin !== undefined) {
        const crossorigin = H5P.getCrossOrigin(path);
        if (crossorigin) {
          this.imageElement.setAttribute('crossorigin', crossorigin);
        }
      }
      this.imageElement.src = path;
    }
  };

  /**
   * Update state when scene image loads.
   */
  sceneLoaded = () => {
    if (this.state.isLoaded && this.state.isUpdated && this.props.isActive) {
      // Has been loaded before, we only need to reload the texture
      this.props.threeSixty.update();
    }
    else {
      this.setState({
        isLoaded: true, // Indicates that this.imageElement can now be used
      });
    }
  };

  /**
   * Create, add and render all interactions in 3D world.
   * @param {object} threeSixty ThreeSixty scene to render hotspots into.
   * @param {Array} interactions Interactions to create hotspots for (undefined when there are none).
   */
  addInteractionHotspots = (threeSixty, interactions) => {
    const list = interactions ? interactions.map(this.createInteraction) : [];
    this.renderedInteractions = list.length;

    const cameraElement = threeSixty.getCameraElement();
    if (!this.interactionHotspotRoot || this.interactionHotspotRootElement !== cameraElement) {
      if (this.interactionHotspotRoot) {
        this.interactionHotspotRoot.unmount();
      }
      this.interactionHotspotRoot = createRoot(cameraElement);
      this.interactionHotspotRootElement = cameraElement;
    }

    this.interactionHotspotRoot.render(
      <H5PContext.Provider value={this.context}>
        { list }
      </H5PContext.Provider>,
    );
  };

  /**
   * Create button for each interaction.
   * @param {object} interaction Interaction to create button for.
   * @param {number} index Index of interaction in scene.
   * @returns {NavigationButton} Created interaction button.
   */
  createInteraction = (interaction, index) => {

    const className = ['three-sixty'];
    if (this.props.audioIsPlaying === `interaction-${  this.props.sceneId  }-${  index}`) {
      className.push('active');
    }

    let title;
    const isGoToSceneInteraction = interaction.action.library.split(' ')[0] === 'H5P.GoToScene';
    if (isGoToSceneInteraction) {
      const gotoScene = this.context.params.scenes.find((scene) => {
        return scene.sceneId === interaction.action.params.nextSceneId;
      });
      title = gotoScene.scenename; // Use scenename as title.
    }
    else {
      title = this.getInteractionTitle(interaction.action);
    }

    return (
      <NavigationButton
        key={`interaction-${  this.props.sceneId  }${index}`}
        onMount={ (el) => {
          this.interactionElements[interaction.id] = el;
          this.props.threeSixty.add(
            el,
            ThreeSixtyScene.getYawPitchFromPosition(interaction.interactionPosition),
            this.context.extras.isEditor,
          );
        }}
        onUnmount={ (el) => {
          if (this.interactionElements[interaction.id] === el) {
            delete this.interactionElements[interaction.id];
          }
          this.props.threeSixty.remove(this.props.threeSixty.find(el));
        }}
        onUpdate={ (el) => H5P.ThreeSixty.setElementPosition(
          this.props.threeSixty.find(el),
          ThreeSixtyScene.getYawPitchFromPosition(interaction.interactionPosition),
        )}
        title={title}
        label={getLabelFromInteraction(interaction)}
        buttonClasses={ className }
        icon={getIconFromInteraction(interaction, this.context.params.scenes)}
        isHiddenBehindOverlay={ this.props.isHiddenBehindOverlay }
        nextFocus={ this.props.nextFocus }
        type={ `interaction-${  index}` }
        clickHandler={() => this.props.showInteraction(index)}
        doubleClickHandler={() => {
          this.context.trigger('doubleClickedInteraction', index);
        }}
        onFocus={ () => {
          this.handleInteractionFocus(interaction);
        }}
        onFocusedInteraction={() => this.props.onFocusedInteraction(index)}
        onBlur={this.props.onBlurInteraction}
        isFocused={this.props.focusedInteraction === index}
        rendered={this.state.isUpdated}
      >
        {
          this.context.extras.isEditor &&
          <ContextMenu
            isGoToScene={isGoToSceneInteraction}
            interactionIndex={index}
          />
        }
      </NavigationButton>
    );
  };

  /**
   * Get yaw and pitch from interaction position.
   * @param {object} position Interaction position with x (yaw) and y (pitch).
   * @returns {object} Object with yaw and pitch.
   */
  static getYawPitchFromPosition(position) {
    return {
      yaw: position.x,
      pitch: position.y,
    };
  }

  /**
   * Let editor know that path was clicked.
   * @param {object} path Clicked path with from and to interaction IDs.
   */
  handlePathClick = (path) => {
    this.context.trigger('editPath', { from: path.from, to: path.to });
  };

  /**
   * Get current position of interaction, following it while it is being dragged in editor.
   * @param {object} interaction Interaction parameters.
   * @returns {object} Position with yaw and pitch in radians.
   */
  getInteractionPosition = (interaction) => {
    const element = this.interactionElements[interaction.id];
    const threeElement = element && this.props.threeSixty?.find(element);
    if (threeElement) {
      return { yaw: -threeElement.rotation.y, pitch: threeElement.rotation.x };
    }

    return {
      yaw: parseFloat(interaction.interactionPosition.x),
      pitch: parseFloat(interaction.interactionPosition.y),
    };
  };

  /**
   * Handle interaction focused, setting camera to interaction position.
   * @param {object} interaction Interaction that gained focus.
   */
  handleInteractionFocus = (interaction) => {
    this.props.onSetCameraPos(ThreeSixtyScene.getYawPitchFromPosition(interaction.interactionPosition));
  };

  /**
   * Cancel pointer lock when interaction is double-clicked.
   */
  handleDoubleClickedInteraction = () => {
    this.cancelPointerLock();
  };

  /**
   * React - run after initial render.
   */
  componentDidMount() {
    this.loadScene();

    this.context.on('doubleClickedInteraction', this.handleDoubleClickedInteraction);
  }

  /**
   * React - run before unmount.
   */
  componentWillUnmount() {
    this.context.off('doubleClickedInteraction', this.handleDoubleClickedInteraction);
  }

  /**
   * React - update after render.
   * @param {object} prevProps Props from previous render.
   */
  componentDidUpdate(prevProps) {
    if ((this.props.isActive && this.state.isLoaded && !this.state.isUpdated) ||
    (this.props.isActive && this.props.updateThreeSixty)) {
      // Active and loaded, prepare the scene
      setTimeout(() => {
        this.initializeThreeSixty();
      }, MOUNT_TIMEOUT_MS); // Using timeout to allow loading screen to render before we load WebGL
      this.setState({
        isUpdated: true,
      });
    }

    if (this.state.imagePath !== this.props.imageSrc.path) {
      this.loadScene();
    }

    if (prevProps.isActive && !this.props.isActive) {
      // No longer active, indicate that scene must be updated
      this.props.threeSixty.stopRendering();
      this.props.threeSixty.off('movestart', this.handleSceneMoveStart);
      this.props.threeSixty.off('movestop', this.handleSceneMoveStop);
      this.props.threeSixty.off('firstrender');
      this.setState({
        cameraPosition: this.props.threeSixty.getCurrentPosition(),
        isUpdated: false,
        isRendered: false,
      });
    }

    if (this.state.hasPointerLock) {
      if (!this.state.willPointerLock) {
        // canceled
        this.setState({
          willPointerLock: false,
          hasPointerLock: false,
        });
      }
      else {
        this.state.pointerLockElement.requestPointerLock();
        this.state.pointerLockElement.classList.add('dragging');
      }
    }
    else {
      document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock;
      if (document.exitPointerLock) {
        if (this.state.pointerLockElement) {
          this.state.pointerLockElement.classList.remove('dragging');
        }
        document.exitPointerLock();
      }
    }

    // Need to respond to dialog toggling in order to hide the buttons under the overlay
    const isHiddenBehindOverlayHasChanged = (this.props.isHiddenBehindOverlay !== prevProps.isHiddenBehindOverlay);
    if (isHiddenBehindOverlayHasChanged && this.state.isUpdated) {
      // TODO: Update scene element
      this.props.threeSixty.setTabIndex(false);
    }

    if (!this.props.threeSixty || !this.props.isActive) {
      return;
    }

    // Need to respond to audio in order to update the icon of the interaction
    const audioHasChanged = (prevProps.audioIsPlaying !== this.props.audioIsPlaying);
    const hasChangedFocus = prevProps.focusedInteraction !== this.props.focusedInteraction;

    const hasChangedInteractions = this.props.sceneParams.interactions
      && (this.renderedInteractions !== this.props.sceneParams.interactions.length);

    let shouldUpdateInteractionHotspots = hasChangedInteractions
        || audioHasChanged
        || hasChangedFocus
        || isHiddenBehindOverlayHasChanged
        || this.props.isEditingInteraction;

    // Check if the scene that interactions point to has changed icon type
    // This is only relevant when changing the icon using the H5P editor
    if (window.H5PEditor && !shouldUpdateInteractionHotspots && this.props.sceneParams.interactions) {
      shouldUpdateInteractionHotspots = this.props.sceneParams.interactions.some((interaction) => {
        const library = H5P.libraryFromString(interaction.action.library);
        const machineName = library.machineName;
        if (machineName !== 'H5P.GoToScene') {
          return false;
        }

        const nextSceneId = interaction.action.params.nextSceneId;
        const nextSceneIcon = this.props.sceneIcons.find((scene) => {
          return scene.id === nextSceneId;
        });
        const oldNextSceneIcon = prevProps.sceneIcons.find((scene) => {
          return scene.id === nextSceneId;
        });

        const hasChangedIcon = nextSceneIcon && oldNextSceneIcon
          && nextSceneIcon.iconType !== oldNextSceneIcon.iconType;
        if (hasChangedIcon) {
          return true;
        }
        return false;
      });
    }

    if (shouldUpdateInteractionHotspots) {
      this.addInteractionHotspots(this.props.threeSixty, this.props.sceneParams.interactions);
    }
  }

  /**
   * React - create DOM elements.
   * @returns {React.Element|null} Scene markup, or null when scene is not active.
   */
  render() {
    if (!this.props.isActive) {
      return null;
    }

    return (
      <div className='three-sixty-scene-wrapper'>
        <div
          ref={this.sceneRef}
          aria-hidden={ this.props.isHiddenBehindOverlay ? true : undefined }
        />
        {
          this.props.threeSixty && this.state.isUpdated &&
          <ThreeSixtyPaths
            threeSixty={this.props.threeSixty}
            sceneParams={this.props.sceneParams}
            globalVisuals={this.context.behavior.paths}
            getInteractionPosition={this.getInteractionPosition}
            onPathClick={this.context.extras.isEditor ? this.handlePathClick : undefined}
          />
        }
        {
          (!this.state.isRendered) &&
          <div className='loading-overlay'>
            <div className='loading-wrapper'>
              <div className='loading-image-wrapper'>
                <img src={loading} alt='loading' />
              </div>
              <div className='loader' dangerouslySetInnerHTML={{ __html: this.context.l10n.backgroundLoading }}></div>
            </div>
          </div>
        }
      </div>
    );
  }
}

ThreeSixtyScene.contextType = H5PContext;
