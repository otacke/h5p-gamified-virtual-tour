import React from 'react';
import '@components/Shared/ContextMenu.css';
import { H5PContext } from '@context/H5PContext.js';

export default class ContextMenu extends React.Component {
  /**
   * Trigger go to scene event.
   */
  goToScene = () => {
    this.context.trigger('goToScene', this.props.interactionIndex);
  };

  /**
   * Trigger edit interaction event.
   */
  handleEdit = () => {
    this.context.trigger('editInteraction', this.props.interactionIndex);
  };

  /**
   * Trigger delete interaction event.
   */
  handleDelete = () => {
    this.context.trigger('deleteInteraction', this.props.interactionIndex);
  };

  /**
   * React - create DOM elements.
   * @returns {React.Element} Rendered context menu element.
   */
  render() {
    return (
      <div className='context-menu'>
        {
          this.props.isGoToScene &&
          <button
            type="button"
            className='go-to-scene'
            onClick={this.goToScene}
            tabIndex="-1"
          >
            <div className='tooltip' dangerouslySetInnerHTML={{ __html: this.context.extras.l10n.goToScene }}></div>
          </button>
        }
        <button
          type="button"
          className='edit'
          onClick={this.handleEdit}
          tabIndex="-1"
        >
          <div className='tooltip' dangerouslySetInnerHTML={{ __html: this.context.extras.l10n.edit }} />
        </button>
        <button
          type="button"
          className='delete'
          onClick={this.handleDelete}
          tabIndex="-1"
        >
          <div className='tooltip' dangerouslySetInnerHTML={{ __html: this.context.extras.l10n.delete }}/>
        </button>
      </div>
    );
  }
}

ContextMenu.contextType = H5PContext;
