import Restriction from '@scripts/services/restrictions/Restriction.js';

/** @constant {string[]} VALID_OPERATORS Operators for comparing numbers. */
const VALID_OPERATORS = ['lessThan', 'equalTo', 'notEqualTo', 'greaterThan'];

/**
 * Restriction comparing numbers, used for total score, interaction score and interaction score percentage.
 */
export default class RestrictionComparison extends Restriction {
  /**
   * Get operators that restriction supports.
   * @returns {string[]} Valid operators.
   */
  getValidOperators() {
    return VALID_OPERATORS;
  }

  /**
   * Determine whether value of restriction can be used.
   * @returns {boolean} True, if value is a number.
   */
  hasValidValue() {
    return typeof this.value === 'number' && !Number.isNaN(this.value);
  }

  /**
   * Determine whether restriction is met.
   * @returns {boolean} True, if current value compares to value as required by operator.
   */
  check() {
    const currentValue = this.getCurrentValue();

    switch (this.operator) {
      case 'lessThan':
        return currentValue < this.value;
      case 'equalTo':
        return currentValue === this.value;
      case 'notEqualTo':
        return currentValue !== this.value;
      case 'greaterThan':
        return currentValue > this.value;
      default:
        return true;
    }
  }
}
