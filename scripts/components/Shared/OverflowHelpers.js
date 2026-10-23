/**
 * Helper class with various methods for checking if DOM element overflows another.
 */
export class OverflowHelper {

  /**
   * Create instance of OverflowHelper.
   * @param {number} elHeight Height of element being checked.
   * @param {number} topPosition Distance of element from top of container.
   * @param {number} leftPosition Distance of element from left of container.
   * @param {number} containerHeight Height of container.
   */
  constructor(elHeight, topPosition, leftPosition, containerHeight) {
    this.height = elHeight;

    this.topPosition = topPosition;
    this.leftPosition = leftPosition;

    this.containerHeight = containerHeight;
  }

  /**
   * Check if DOM element overflows top edge of container.
   * @returns {boolean} Whether element overflows top edge, false if not.
   */
  overflowsTop() {
    return this.height > this.topPosition;
  }

  /**
   * Check if DOM element overflows bottom edge of container.
   * @returns {boolean} Whether element overflows bottom edge, false if not.
   */
  overflowsBottom() {
    return this.height + this.topPosition > this.containerHeight;
  }
}

/**
 * Calculate correct alignment and expand direction for element.
 * @param {string} position Position of element relative to its trigger ('left', 'right', 'top', 'bottom').
 * @param {number} height Height of element.
 * @param {number} topPosition Distance of element from top of wrapper.
 * @param {number} leftPosition Distance of element from left of wrapper.
 * @param {number} wrapperHeight Height of wrapper.
 * @returns {object} Object with expand direction and alignment.
 */
export const willOverflow = (position, height, topPosition, leftPosition, wrapperHeight) => {
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
};
