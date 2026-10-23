import React from 'react';
import '@components/Shared/NavigationButton.css';
import { H5PContext } from '@context/H5PContext.js';
import NavigationButtonLabel, {
  getLabelPos,
  getLabelText,
  isHoverLabel,
} from '@components/Shared/NavigationButtonLabel.js';

/** @constant {object} Icons CSS classes for button icons. */
export const Icons = {
  INFO: 'h5p-info-button h5p-interaction-button',
  QUESTION: 'h5p-question-button h5p-interaction-button',
  GO_TO_SCENE: 'h5p-go-to-scene-button',
  GO_BACK: 'h5p-go-back-button',
  SCENE_DESCRIPTION: 'h5p-scene-description-button',
  AUDIO: 'h5p-audio-button h5p-interaction-button',
};

/** @constant {Array} infoInteractions Machine names of info-type interactions. */
const infoInteractions = ['H5P.AdvancedText', 'H5P.Image', 'H5P.Video'];

/**
 * Determine if machine name is info interaction.
 * @param {string} machineName Machine name to check.
 * @returns {boolean} Whether machine name is info interaction.
 */
const isInfoInteraction = (machineName) => {
  return infoInteractions.includes(machineName);
};

/**
 * Get icon for interaction.
 * @param {object} interaction Interaction to get icon for.
 * @param {Array} scenes All scenes (for icon type of next scene).
 * @returns {string} CSS class for icon.
 */
export const getIconFromInteraction = (interaction, scenes) => {
  const library = interaction.action.library;
  const machineName = H5P.libraryFromString(library).machineName;
  let icon = '';
  if (machineName === 'H5P.GoToScene') {
    icon = Icons.GO_TO_SCENE;

    const nextScene = scenes.find((scene) => {
      return scene.sceneId === interaction.action.params.nextSceneId;
    });
    if (nextScene && nextScene.iconType === 'plus') {
      icon = Icons.INFO;
    }
  }
  else if (machineName === 'H5P.Audio') {
    icon = Icons.AUDIO;
  }
  else if (isInfoInteraction(machineName)) {
    icon = Icons.INFO;
  }
  else {
    icon = Icons.QUESTION;
  }
  return icon;
};

/**
 * Get label for interaction.
 * @param {object} interaction Interaction to get label for.
 * @returns {object} Label object.
 */
export const getLabelFromInteraction = (interaction) => {
  return { ...interaction.label, labelText: interaction.labelText };
};

export default class NavigationButton extends React.Component {
  /**
   * Create navigation button component.
   * @param {object} props Component props.
   */
  constructor(props) {
    super(props);

    this.navButtonWrapper = React.createRef();
    this.navButton = React.createRef();
    this.expandButton = React.createRef();
    this.state = {
      isFocused: this.props.isFocused,
      expandButtonFocused: false,
      innerButtonFocused: false,
    };
  }

  /**
   * Add focus listener to navigation button wrapper.
   */
  addFocusListener = () => {
    if (this.navButtonWrapper) {
      this.navButtonWrapper.current.addEventListener('focus', this.onFocus);
    }
  };

  /**
   * Handle navigation button focused.
   */
  onFocus = () => {
    // Already focused
    if (this.state.isFocused) {
      return;
    }

    this.setState({
      isFocused: true,
    });
    if (this.props.onFocusedInteraction) {
      this.props.onFocusedInteraction();
    }

  };

  /**
   * Handle navigation button blurred.
   * @param {object} e Blur event.
   */
  onBlur = (e) => {
    const navButtonWrapper = this.navButtonWrapper && this.navButtonWrapper.current;

    if (
      navButtonWrapper?.contains(e.relatedTarget) &&
      (!this.expandButton || e.relatedTarget !== this.expandButton.current)
    ) {
      // Clicked target is child of button wrapper and not the expandButton, don't blur
      this.navButtonWrapper.current.focus({
        preventScroll: true,
      });
      return;
    }


    this.setState({
      isFocused: false,
    });
    if (this.props.onBlur) {
      this.props.onBlur();
    }

  };

  /**
   * React - run after initial render.
   */
  componentDidMount() {
    if (this.props.onMount) {
      // Let parent know this element should be added to the THREE world.
      this.props.onMount(this.navButtonWrapper.current);
    }

    this.addFocusListener();
    if (this.state.isFocused) {
      setTimeout(() => {
        this.navButtonWrapper.current.focus({
          preventScroll: true,
        });
      }, 0);
    }
  }

  /**
   * React - update after render.
   * @param {object} prevProps Props from previous render.
   */
  componentDidUpdate(prevProps) {
    if (this.props.type && this.props.type === this.props.nextFocus && prevProps.nextFocus !== this.props.nextFocus) {
      this.skipFocus = true; // Prevent moving camera on next focus (makes for a better UX when using the mouse)
      this[this.context.extras.isEditor ? 'navButtonWrapper' : 'navButton'].current.focus({
        preventScroll: true,
      });
    }

    if (this.props.isFocused && !prevProps.isFocused) {
      setTimeout(() => { // Note: Don't think the timeout is needed after rendering was fixed
        if (this.navButtonWrapper.current) {
          this.navButtonWrapper.current.focus({
            preventScroll: true,
          });
        }
      }, 0);
    }

    if (this.props.onUpdate) {
      // Let parent know this element is updated. (Position might have changed.)
      this.props.onUpdate(this.navButtonWrapper.current);
    }

    if (prevProps.isFocused !== this.props.isFocused) {
      if (!this.props.isFocused) {
        this.setState({
          isFocused: false,
        });
      }
    }
  }

  /**
   * React - run before unmount.
   */
  componentWillUnmount() {
    if (this.navButtonWrapper) {
      this.navButtonWrapper.current.removeEventListener('focus', this.onFocus);
    }

    if (this.props.onUnmount) {
      const el = this.navButtonWrapper.current;
      // We want this to run after the component is removed
      setTimeout(() => {
        // Let parent know this element should be remove from the THREE world.
        this.props.onUnmount(el);
      }, 0);
    }
  }

  /**
   * Get style object with position.
   * @returns {object} Style object with top and left positions.
   */
  getStyle = () => {
    const style = {};
    if (this.props.topPosition !== undefined) {
      style.top = `${this.props.topPosition  }%`;
    }

    if (this.props.leftPosition !== undefined) {
      style.left = `${this.props.leftPosition  }%`;
    }
    return style;
  };

  /**
   * Handle navigation button clicked.
   */
  onClick = () => {
    const hasClickHandler = this.props.forceClickHandler || !this.context.extras.isEditor;
    if (!hasClickHandler) {
      return;
    }

    this.props.clickHandler();

    // Reset button focus state when changing scenes or opening content
    this.setState({
      innerButtonFocused: false,
    });
  };

  /**
   * Handle navigation button double-clicked.
   */
  onDoubleClick = () => {
    if (this.props.doubleClickHandler) {
      this.props.doubleClickHandler();
    }
    this.setState({
      isFocused: false,
    });
  };

  /**
   * Handle mouse down on navigation button.
   * @param {object} e Mouse event.
   */
  onMouseDown = (e) => {
    const hasMouseDownHandler = this.context.extras.isEditor && this.props.mouseDownHandler;

    if (hasMouseDownHandler) {
      this.props.mouseDownHandler(e);
    }
  };

  /**
   * Set focus to navigation button.
   */
  setFocus = () => {
    const isFocusable = this.context.extras.isEditor && this.navButtonWrapper && this.navButtonWrapper.current;
    if (isFocusable) {
      this.navButtonWrapper.current.focus({
        preventScroll: true,
      });
    }
  };

  /**
   * Handle focus event, focusing wrapper in editor.
   * @param {object} e Focus event.
   */
  handleFocus = (e) => {
    if (this.context.extras.isEditor) {
      if (this.navButtonWrapper && this.navButtonWrapper.current && this.navButtonWrapper === e.target) {
        this.navButtonWrapper.current.focus({
          preventScroll: true,
        });
      }
      return;
    }

    if (!this.context.extras.isEditor  && this.props.onFocus) {
      if (this.skipFocus) {
        this.skipFocus = false;
      }
      else {
        this.props.onFocus();
      }
    }
  };

  /**
   * Handle expand button focused.
   */
  handleExpandButtonFocus = () => {
    this.setState({
      expandButtonFocused: true,
    });
    if (this.props.onFocusedInteraction) {
      this.props.onFocus();
    }
  };

  /**
   * React - create DOM elements.
   * @returns {React.Element} Rendered navigation button element.
   */
  render() {
    let wrapperClasses = ['nav-button-wrapper'];

    if (this.props.buttonClasses) {
      wrapperClasses = wrapperClasses.concat(this.props.buttonClasses);
    }

    if (this.props.icon) {
      wrapperClasses.push(this.props.icon);
    }

    // only apply custom focus if we have children that are shown on focus
    if (this.state.isFocused && this.props.children) {
      wrapperClasses.push('focused');
    }

    // Add classname to current active element (wrapper, button or expand label button) so it can be shown on top
    if (this.state.isFocused && this.props.children
      || this.state.expandButtonFocused
      || this.state.innerButtonFocused) {
      wrapperClasses.push('active-element');
    }

    const isWrapperTabbable = this.context.extras.isEditor;
    const isInnerButtonTabbable = !this.context.extras.isEditor && !this.props.isHiddenBehindOverlay;

    let title = '';
    if (this.props.title) {
      const titleText = document.createElement('div');
      titleText.innerHTML = this.props.title;
      title = titleText.textContent;
    }

    let label = this.props.label ? this.props.label : {
      labelPosition: 'inherit',
      showLabel: 'inherit',
    };

    let labelPos = getLabelPos(this.context.behavior.label, label);
    let hoverLabel = isHoverLabel(this.context.behavior.label, label);

    const labelText = getLabelText(label);
    return (

      <div
        ref={this.navButtonWrapper}
        className={wrapperClasses.join(' ')}
        style={this.getStyle()}
        tabIndex={isWrapperTabbable ? '0' : undefined}
        onFocus={this.handleFocus}
        onClick={this.onClick}
        onBlur={this.onBlur}
      >
        <button
          type="button"
          ref={this.navButton}
          aria-label={labelText ? labelText : title}
          className='nav-button'
          tabIndex={ isInnerButtonTabbable ? undefined : '-1'}
          onClick={this.onClick}
          onDoubleClick={this.onDoubleClick}
          onMouseDown={this.onMouseDown}
          onMouseUp={this.setFocus}
          onFocus={() => this.setState({ innerButtonFocused: true })}
          onBlur={() => this.setState({ innerButtonFocused: false })} />
        {this.props.children}
        {this.props.icon !== 'h5p-go-back-button' && labelText !== '' &&
          <NavigationButtonLabel
            labelText={labelText}
            labelPos={labelPos}
            hoverOnly={hoverLabel}
            onMount={this.props.onMount}
            forwardRef={this.expandButton}
            onFocus={this.handleExpandButtonFocus}
            onBlur={() => this.setState({ expandButtonFocused: false })}
            topPosition={this.props.topPosition * this.props.wrapperHeight / 100}
            wrapperHeight={this.props.wrapperHeight}
            leftPosition={this.props.leftPosition}
            navButtonHeight={this.navButton.current ? this.navButton.current.offsetHeight : null}
            staticScene={this.props.staticScene}
            navButtonFocused={this.state.innerButtonFocused}
            rendered={this.props.rendered}
            onDoubleClick={this.onDoubleClick}
          />
        }
      </div>
    );
  }
}
NavigationButton.contextType = H5PContext;
