import React from 'react';
import './ContextMenu.css';
import { H5PContext } from '../../context/H5PContext.js';

export default class ContextMenu extends React.Component {
  goToScene = () => {
    this.context.trigger('goToScene', this.props.interactionIndex);
  };

  handleEdit = () => {
    this.context.trigger('editInteraction', this.props.interactionIndex);
  };

  handleDelete = () => {
    this.context.trigger('deleteInteraction', this.props.interactionIndex);
  };

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
