import React from 'react';
import '@components/HUD/HUD.css';

import { H5PContext } from '@context/H5PContext.js';
import AudioButton from '@components/HUD/Buttons/AudioButton.js';
import Button from '@components/HUD/Buttons/Button/Button.js';
import { SceneTypes } from '@components/Scene/Scene.js';
import OverviewMap from '@components/HUD/Panels/OverviewMap.js';

/** @constant {object} HudPanels Identifiers of panels that can be toggled in HUD. */
export const HudPanels = {
  OVERVIEW_MAP: 'overviewMap',
  CHECKLIST: 'checklist',
};

export default class HUD extends React.Component {
  /**
   * Pick audio track props for scene.
   * @param {object} scene Current scene (may have its own audio track).
   * @returns {object} Props object for scene's audio button.
   */
  getSceneAudioTrack = (scene) => {
    const props = {
      isPlaying: this.props.audioIsPlaying,
      onIsPlaying: this.props.onAudioIsPlaying,
      isHiddenBehindOverlay: this.props.isHiddenBehindOverlay,
      nextFocus: this.props.nextFocus,
    };

    if (scene && scene.audio && scene.audio.length) {
      props.sceneAudioTrack = scene.audio;
      props.sceneId = scene.sceneId;
    }

    return props;
  };

  /**
   * Show scene description.
   */
  handleSceneDescription = () => {
    this.props.onSceneDescription(this.props.scene.scenedescription);
  };

  /**
   * Show or hide overview map.
   */
  handleToggleOverviewMap = () => {
    this.props.onToggleHudPanel(HudPanels.OVERVIEW_MAP);
  };

  /**
   * React - create DOM elements.
   * @returns {React.Element} Rendered HUD elements.
   */
  render() {
    const isThreeSixty = this.props.scene.sceneType === SceneTypes.THREE_SIXTY_SCENE;

    const overviewMap = this.context.behavior.overviewMap;
    const hasOverviewMap = overviewMap?.show === true && !!overviewMap.image?.path;
    const isShowingOverviewMap = hasOverviewMap && this.props.hudPanel === HudPanels.OVERVIEW_MAP;

    return (
      <div className="hud" aria-hidden={ this.props.isHiddenBehindOverlay ? true : undefined }>
        <div className="hud-bottom-left">
          <AudioButton { ...this.getSceneAudioTrack(this.props.scene) }/>
          { this.props.scene.scenedescription &&
            <Button
              type={ 'scene-description' }
              label={ this.context.l10n.sceneDescription }
              isHiddenBehindOverlay={ this.props.isHiddenBehindOverlay }
              nextFocus={ this.props.nextFocus }
              onClick={ this.handleSceneDescription }
            />
          }
          {
            isThreeSixty &&
            <Button
              type={ 'reset' }
              label={ this.context.l10n.resetCamera }
              isHiddenBehindOverlay={ this.props.isHiddenBehindOverlay }
              nextFocus={ this.props.nextFocus }
              onClick={ this.props.onCenterScene }
            />
          }
          {
            hasOverviewMap &&
            <Button
              type={ 'overview-map' }
              label={ this.context.l10n.overviewMap }
              isPressed={ isShowingOverviewMap }
              isHiddenBehindOverlay={ this.props.isHiddenBehindOverlay }
              nextFocus={ this.props.nextFocus }
              onClick={ this.handleToggleOverviewMap }
            />
          }
        </div>
        {
          isShowingOverviewMap &&
          <OverviewMap
            image={ overviewMap.image }
            position={ this.props.scene.overviewMapPosition }
            label={ this.context.l10n.overviewMap }
          />
        }
      </div>
    );
  }
}

HUD.contextType = H5PContext;
