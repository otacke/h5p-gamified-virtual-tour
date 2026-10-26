import React from 'react';
import { H5PContext } from '@context/H5PContext.js';
import ThreeSixtyScene from '@components/Scene/SceneTypes/ThreeSixtyScene.js';
import StaticScene from '@components/Scene/SceneTypes/StaticScene.js';

/** @constant {object} SceneTypes Scene type identifiers. */
export const SceneTypes = {
  THREE_SIXTY_SCENE: '360',
  STATIC_SCENE: 'static',
  PREVIOUS_SCENE: -1,
};

export default class Scene extends React.Component {

  /**
   * React - create DOM elements.
   * @returns {React.Element} Rendered scene element.
   */
  render() {
    if (this.props.sceneParams.sceneType === SceneTypes.STATIC_SCENE) {
      return (
        <StaticScene
          isActive={this.props.isActive}
          isHiddenBehindOverlay={ this.props.isHiddenBehindOverlay }
          nextFocus={ this.props.nextFocus }
          sceneIcons={this.props.sceneIcons}
          sceneParams={this.props.sceneParams}
          imageSrc={this.props.imageSrc}
          navigateToScene={this.props.navigateToScene}
          showInteraction={this.props.showInteraction}
          sceneHistory={this.props.sceneHistory}
          audioIsPlaying={ this.props.audioIsPlaying }
          sceneId={ this.props.sceneId }
          onBlurInteraction={this.props.onBlurInteraction}
          onFocusedInteraction={this.props.onFocusedInteraction}
          focusedInteraction={this.props.focusedInteraction}
          sceneWaitingForLoad={this.props.sceneWaitingForLoad}
          doneLoadingNextScene={this.props.doneLoadingNextScene}
          canTakeFocus={this.props.canTakeFocus}
          lockedInteractions={this.props.lockedInteractions}
        />
      );
    }

    return (
      <ThreeSixtyScene
        threeSixty={this.props.threeSixty}
        updateThreeSixty={this.props.updateThreeSixty}
        isActive={this.props.isActive}
        isHiddenBehindOverlay={ this.props.isHiddenBehindOverlay }
        nextFocus={ this.props.nextFocus }
        sceneIcons={this.props.sceneIcons}
        sceneParams={this.props.sceneParams}
        addThreeSixty={ this.props.addThreeSixty }
        imageSrc={this.props.imageSrc}
        navigateToScene={this.props.navigateToScene}
        forceStartCamera={this.props.forceStartCamera}
        showInteraction={this.props.showInteraction}
        audioIsPlaying={ this.props.audioIsPlaying }
        sceneId={ this.props.sceneId }
        toggleCenterScene={ this.props.toggleCenterScene }
        onSetCameraPos={ this.props.onSetCameraPos }
        onBlurInteraction={this.props.onBlurInteraction}
        onFocusedInteraction={this.props.onFocusedInteraction}
        focusedInteraction={this.props.focusedInteraction}
        isEditingInteraction={this.props.isEditingInteraction}
        sceneWaitingForLoad={this.props.sceneWaitingForLoad}
        doneLoadingNextScene={this.props.doneLoadingNextScene}
        canTakeFocus={this.props.canTakeFocus}
        lockedInteractions={this.props.lockedInteractions}
      />
    );
  }
}
Scene.contextType = H5PContext;
