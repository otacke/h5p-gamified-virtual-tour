import React from 'react';
import './Button.css';

export default class Button extends React.Component {
  /**
   * Trigger button click handler.
   */
  handleClick = () => {
    if (!this.props.disabled) {
      this.props.onClick();
    }
  };

  /**
   * React - update after render.
   * @param {object} prevProps Props from previous render.
   * @param {object} prevState State from previous render.
   */
  componentDidUpdate(prevProps, prevState) {
    if (prevProps.nextFocus !== this.props.nextFocus && this.props.type === this.props.nextFocus) {
      this.element.focus();
    }
  }

  /**
   * React - create DOM elements.
   * @returns {React.Element} Rendered button element.
   */
  render() {
    return (
      <div className="btn-wrap">
        <button
          type="button"
          ref={ (el) => this.element = el }
          className={ `hud-btn ${  this.props.type}` }
          onClick={ this.handleClick }
          aria-label={ this.props.label }
          disabled={ !!this.props.disabled }
          tabIndex={ this.props.isHiddenBehindOverlay ? '-1' : undefined }
        />
        <div className="tooltip" aria-hidden="true">
          <div className="text-wrap">{ this.props.label }</div>
        </div>
      </div>
    );
  }
}
