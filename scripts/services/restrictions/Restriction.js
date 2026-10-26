/**
 * Capitalize first letter of text.
 * @param {string} text Text to capitalize.
 * @returns {string} Text with first letter in upper case.
 */
export const capitalize = (text) => {
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
};

/**
 * Base class of restrictions, ported from H5P.GameMap.
 */
export default class Restriction {
  /**
   * Create restriction.
   * @param {object} params Parameters.
   * @param {string} params.type Type of restriction, e.g. totalScore.
   * @param {string} params.operator Operator, e.g. greaterThan.
   * @param {number|string} params.value Value to compare current value to.
   * @param {string} [params.label] Label of interaction that restriction refers to.
   * @param {object} params.l10n Localization strings.
   * @param {function} params.getCurrentValue Callback returning current value to compare.
   */
  constructor(params) {
    this.type = params.type;
    this.operator = params.operator;
    this.value = params.value;
    this.label = params.label ?? '';
    this.l10n = params.l10n;
    this.getCurrentValue = params.getCurrentValue;
  }

  /**
   * Get operators that restriction supports, must be implemented by subclass.
   */
  getValidOperators() {
    throw new Error('Method not implemented');
  }

  /**
   * Determine whether value of restriction can be used, must be implemented by subclass.
   */
  hasValidValue() {
    throw new Error('Method not implemented');
  }

  /**
   * Determine whether restriction is met, must be implemented by subclass.
   */
  check() {
    throw new Error('Method not implemented');
  }

  /**
   * Determine whether restriction is complete and can be checked.
   * @returns {boolean} True, if operator and value are valid.
   */
  isValid() {
    return this.getValidOperators().includes(this.operator) && this.hasValidValue();
  }

  /**
   * Get value of restriction for displaying.
   * @returns {string} Representation of value.
   */
  getValueRepresentation() {
    return `${this.value}`;
  }

  /**
   * Get message explaining restriction.
   * @returns {string} Message explaining restriction.
   */
  getMessage() {
    return (this.l10n[`restriction${capitalize(this.type)}${capitalize(this.operator)}`] ?? '')
      .replaceAll('@value', this.getValueRepresentation())
      .replaceAll('@label', this.label);
  }
}
