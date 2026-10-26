import Restriction from '@scripts/services/restrictions/Restriction.js';

/** @constant {string[]} VALID_OPERATORS Operators for comparing time, is and isNot compare calendar day. */
const VALID_OPERATORS = ['before', 'is', 'isNot', 'after'];

/**
 * Determine whether two dates are on same calendar day in local time.
 * @param {Date} first First date.
 * @param {Date} second Second date.
 * @returns {boolean} True, if both dates are on same day.
 */
const isSameDay = (first, second) => {
  return first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate();
};

/**
 * Restriction comparing current time.
 */
export default class RestrictionTime extends Restriction {
  /**
   * Create time restriction.
   * @param {object} params Parameters, see Restriction. Value is ISO 8601 string.
   */
  constructor(params) {
    super(params);

    this.value = new Date(params.value);
  }

  /**
   * Get operators that restriction supports.
   * @returns {string[]} Valid operators.
   */
  getValidOperators() {
    return VALID_OPERATORS;
  }

  /**
   * Determine whether value of restriction can be used.
   * @returns {boolean} True, if value is a valid date.
   */
  hasValidValue() {
    return !Number.isNaN(this.value.getTime());
  }

  /**
   * Determine whether restriction is met.
   * @returns {boolean} True, if current time compares to value as required by operator.
   */
  check() {
    const now = this.getCurrentValue();

    switch (this.operator) {
      case 'before':
        return now < this.value;
      case 'is':
        return isSameDay(now, this.value);
      case 'isNot':
        return !isSameDay(now, this.value);
      case 'after':
        return now > this.value;
      default:
        return true;
    }
  }

  /**
   * Get date or date and time for displaying.
   * @returns {string} Localized date, plus time for before and after.
   */
  getValueRepresentation() {
    if (this.operator === 'is' || this.operator === 'isNot') {
      return this.value.toLocaleDateString();
    }

    return `${this.value.toLocaleDateString()}, ${this.value.toLocaleTimeString()}`;
  }
}
