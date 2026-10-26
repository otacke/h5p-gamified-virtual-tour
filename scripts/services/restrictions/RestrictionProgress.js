import Restriction, { capitalize } from '@scripts/services/restrictions/Restriction.js';
import { PROGRESS_LEVELS } from '@scripts/services/progress.js';

/** @constant {string[]} VALID_OPERATORS Operators for comparing progress. */
const VALID_OPERATORS = ['is', 'isNot'];

/**
 * Restriction comparing progress of interaction.
 */
export default class RestrictionProgress extends Restriction {
  /**
   * Get operators that restriction supports.
   * @returns {string[]} Valid operators.
   */
  getValidOperators() {
    return VALID_OPERATORS;
  }

  /**
   * Determine whether value of restriction can be used.
   * @returns {boolean} True, if value is a known progress level.
   */
  hasValidValue() {
    return PROGRESS_LEVELS.includes(this.value);
  }

  /**
   * Determine whether restriction is met.
   * @returns {boolean} True, if progress of interaction is or is not value as required by operator.
   */
  check() {
    const isSameProgress = this.getCurrentValue() === this.value;
    return this.operator === 'is' ? isSameProgress : !isSameProgress;
  }

  /**
   * Get progress for displaying.
   * @returns {string} Localized progress.
   */
  getValueRepresentation() {
    return this.l10n[`progress${capitalize(this.value)}`] ?? this.value;
  }
}
