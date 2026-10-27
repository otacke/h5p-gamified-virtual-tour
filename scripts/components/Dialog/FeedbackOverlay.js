import React from 'react';
import PropTypes from 'prop-types';
import '@components/Dialog/Dialog.css';
import '@components/Dialog/FeedbackOverlay.css';
import { H5PContext } from '@context/H5PContext.js';
import { hasImage, hasText } from '@scripts/services/score-feedback.js';

export default class FeedbackOverlay extends React.Component {
  /**
   * React - run after initial render.
   */
  componentDidMount() {
    this.previousFocus = document.activeElement;
    this.closeButton?.focus();

    if (hasImage(this.props.image)) {
      H5P.newRunnable(
        this.props.image,
        this.context.contentId,
        H5P.jQuery(this.imageContainer),
        false,
        { parent: this.context },
      );
    }
  }

  /**
   * React - run before unmount.
   */
  componentWillUnmount() {
    if (this.previousFocus?.isConnected) {
      this.previousFocus.focus();
    }
  }

  /**
   * Close overlay on Escape.
   * @param {KeyboardEvent} event Keyboard event.
   */
  handleKeyDown = (event) => {
    if (event.key !== 'Escape') {
      return;
    }

    event.stopPropagation();
    this.props.onClose();
  };

  /**
   * React - create DOM elements.
   * @returns {React.Element} Rendered feedback overlay.
   */
  render() {
    return (
      <div
        className='h5p-text-overlay h5p-feedback-overlay'
        role='dialog'
        aria-modal='true'
        aria-label={ this.context.l10n.feedback }
        onKeyDown={ this.handleKeyDown }
      >
        <div className='h5p-text-dialog'>
          <div className='h5p-text-content'>
            {
              hasImage(this.props.image) &&
              <div className='feedback-image' ref={ (el) => this.imageContainer = el } />
            }
            {
              hasText(this.props.text) &&
              <div className='feedback-text' dangerouslySetInnerHTML={ { __html: this.props.text } } />
            }
          </div>
          <button
            type='button'
            ref={ (el) => this.closeButton = el }
            aria-label={ this.context.l10n.closeDialog }
            className='close-button-wrapper'
            onClick={ this.props.onClose }
          />
        </div>
      </div>
    );
  }
}

FeedbackOverlay.propTypes = {
  text: PropTypes.string,
  image: PropTypes.shape({
    library: PropTypes.string,
    params: PropTypes.object,
  }),
  onClose: PropTypes.func.isRequired,
};

FeedbackOverlay.contextType = H5PContext;
