/** 
 * Helper class with various methods for checking if a DOM element overflows
 * another.
 */
export class OverflowHelper {

  /**
   * Create an instance of OverflowHelper.
   * @param {number} elHeight The height of the element being checked.
   * @param {number} topPosition The element's distance from the top of the container.
   * @param {number} leftPosition The element's distance from the left of the container.
   * @param {number} containerHeight The height of the container.
   */
  constructor(elHeight, topPosition, leftPosition, containerHeight) {
    this.height = elHeight;

    this.topPosition = topPosition;
    this.leftPosition = leftPosition;

    this.containerHeight = containerHeight;

  }

  /**
   * Check whether the DOM element is overflowing the container's top edge
   * @returns {boolean} true if overflowing, false if not
   */
  overflowsTop() {
    return this.height > this.topPosition;
  }


  /**
   * Check whether the DOM element is overflowing the container's bottom edge
   * @returns {boolean} true if overflowing, false if not
   */
  overflowsBottom() {
    return this.height + this.topPosition >
      this.containerHeight;
  }
}

/**
 * Calculate correct alignment and expand direction for an element
 * @param {string} position The position of the element relative to its trigger ('left', 'right', 'top', 'bottom').
 * @param {number} height The height of the element.
 * @param {number} topPosition The element's distance from the top of the wrapper.
 * @param {number} leftPosition The element's distance from the left of the wrapper.
 * @param {number} wrapperHeight The height of the wrapper.
 * @returns {object} {expandDirection, alignment}
 */
export function willOverflow(position, height, topPosition, leftPosition, wrapperHeight) {
  const overflowHelper = new OverflowHelper(height, topPosition, leftPosition, wrapperHeight);
  let expandDirection = null;
  let alignment = null;

  switch (position) {
    case 'left':
    case 'right':
      if (overflowHelper.overflowsBottom()) {
        expandDirection = 'up';
      }
      break;
    case 'top':
      if (overflowHelper.overflowsTop()) {
        alignment = 'bottom';
      }
      break;
    case 'bottom':
      if (overflowHelper.overflowsBottom()) {
        alignment = 'top';
      }
      break;
  }

  return { expandDirection: expandDirection, alignment: alignment };
}
