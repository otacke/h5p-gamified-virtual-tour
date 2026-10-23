import React from 'react';
import '@components/Dialog/Dialog.css';
import { H5PContext } from '@context/H5PContext.js';

export default class Dialog extends React.Component {
  /**
   * React - run after initial render.
   */
  componentDidMount() {
    // Focus must be set to the first focusable element
    this.title.focus();
  }

  /**
   * Store dialog element reference.
   * @param {object} el Dialog element.
   */
  handleDialogRef = (el) => {
    if (el) {
      this.el = el;
    }
  };

  /**
   * Resize dialog to fit content.
   */
  handleResize = () => {
    if (!this.el) {
      return;
    }

    // Reset to allow size growth
    this.el.style.width = '';
    this.el.style.height = '';
    this.el.style.height = `${this.el.getBoundingClientRect().height  }px`;
  };

  /**
   * React - create DOM elements.
   * @returns {React.Element} Rendered dialog element.
   */
  render() {
    let dialogClasses = ['h5p-text-dialog'];
    if (this.props.dialogClasses) {
      dialogClasses = dialogClasses.concat(this.props.dialogClasses);
    }

    const children = (this.props.children.type === 'div'
      ? this.props.children
      : React.Children.map(this.props.children, (child) =>
        React.cloneElement(child, {
          onResize: this.handleResize,
        }),
      ));

    return (
      <div className='h5p-text-overlay' role="dialog" aria-label={ this.props.title }>
        <div
          ref={ (el) => this.title = el }
          className="h5p-dialog-focusstart"
          tabIndex="-1"
        ></div>
        <div className={dialogClasses.join(' ')} ref={ this.handleDialogRef }>
          <div className='h5p-text-content'>
            { children }
          </div>
          <button
            type="button"
            ref={ (el) => this.closeButton = el }
            aria-label={ this.context.l10n.closeDialog }
            className='close-button-wrapper'
            onClick={this.props.onHideTextDialog}
          />
        </div>
      </div>
    );
  }
}

Dialog.contextType = H5PContext;
