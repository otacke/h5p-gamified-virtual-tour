import RestrictionComparison from '@scripts/services/restrictions/RestrictionComparison.js';
import RestrictionProgress from '@scripts/services/restrictions/RestrictionProgress.js';
import RestrictionTime from '@scripts/services/restrictions/RestrictionTime.js';

/**
 * Determine whether all or any of values are true.
 * @param {boolean[]} values Values to check.
 * @param {string} allOrAny Either 'all' or 'any'.
 * @returns {boolean} True, if all or any values are true, or if there are no values.
 */
const checkAllOrAny = (values, allOrAny) => {
  if (!values.length) {
    return true;
  }

  return allOrAny === 'any' ? values.some(Boolean) : values.every(Boolean);
};

/**
 * Access restrictions of interaction, ported from H5P.GameMap.
 * Restriction sets are combined by all or any, and so are restrictions within each set.
 */
export default class Restrictions {
  /**
   * Create restrictions.
   * @param {object} [accessRestrictions] Access restriction parameters of interaction.
   * @param {object} params Parameters.
   * @param {object} params.l10n Localization strings.
   * @param {object} params.callbacks Callbacks.
   * @param {function} params.callbacks.getTotalScore Get total score.
   * @param {function} params.callbacks.getInteractionScore Get score of interaction by ID.
   * @param {function} params.callbacks.getInteractionScorePercentage Get score percentage of interaction by ID.
   * @param {function} params.callbacks.getInteractionProgress Get progress of interaction by ID.
   * @param {function} params.callbacks.isInteractionTask Get whether interaction is task by ID, undefined if unknown.
   * @param {function} params.callbacks.getInteractionLabel Get label of interaction by ID, null if not found.
   * @param {function} params.callbacks.getTime Get current time.
   */
  constructor(accessRestrictions = {}, params) {
    this.l10n = params.l10n;
    this.callbacks = params.callbacks;

    this.allOrAny = accessRestrictions.allOrAnyRestrictionSet ?? 'all';
    this.restrictionSets = (accessRestrictions.restrictionSetList ?? [])
      .map((restrictionSet) => ({
        allOrAny: restrictionSet.allOrAnyRestriction ?? 'any',
        restrictions: (restrictionSet.restrictionList ?? [])
          .map((restrictionParams) => this.createRestriction(restrictionParams))
          .filter((restriction) => restriction?.isValid()),
      }))
      .filter((restrictionSet) => restrictionSet.restrictions.length > 0);
  }

  /**
   * Create restriction from parameters.
   * @param {object} params Parameters of restriction.
   * @returns {object|null} Restriction, or null if type is unknown or referenced interaction does not exist.
   */
  createRestriction(params) {
    const type = params.restrictionType;
    const group = params[`${type}Group`] ?? {};
    const common = {
      type: type,
      operator: group[`${type}Operator`],
      value: group[`${type}Value`],
      l10n: this.l10n,
    };

    if (type === 'totalScore') {
      return new RestrictionComparison({ ...common, getCurrentValue: this.callbacks.getTotalScore });
    }

    if (type === 'time') {
      return new RestrictionTime({ ...common, getCurrentValue: this.callbacks.getTime });
    }

    const interactionId = group[`${type}Id`];
    const label = interactionId ? this.callbacks.getInteractionLabel(interactionId) : null;
    if (label === null) {
      return null;
    }

    switch (type) {
      case 'interactionScore':
        return new RestrictionComparison({
          ...common, label, getCurrentValue: () => this.callbacks.getInteractionScore(interactionId),
        });
      case 'interactionScorePercentage':
        return new RestrictionComparison({
          ...common, label, getCurrentValue: () => this.callbacks.getInteractionScorePercentage(interactionId),
        });
      case 'interactionProgress':
        return new RestrictionProgress({
          ...common,
          label,
          getCurrentValue: () => this.callbacks.getInteractionProgress(interactionId),
          isTask: () => this.callbacks.isInteractionTask(interactionId),
        });
      default:
        return null;
    }
  }

  /**
   * Determine whether restrictions exist.
   * @returns {boolean} True, if there is at least one valid restriction.
   */
  hasRestrictions() {
    return this.restrictionSets.length > 0;
  }

  /**
   * Determine whether any restriction depends on time and thus needs to be checked repeatedly.
   * @returns {boolean} True, if there is a time restriction.
   */
  includesTime() {
    return this.restrictionSets.some((restrictionSet) => {
      return restrictionSet.restrictions.some((restriction) => restriction.type === 'time');
    });
  }

  /**
   * Determine whether restrictions are met.
   * @returns {boolean} True, if restrictions are met or there are none.
   */
  isMet() {
    return checkAllOrAny(this.getCriteria().sets.map((restrictionSet) => restrictionSet.isMet), this.allOrAny);
  }

  /**
   * Get criteria with their messages and whether they are met.
   * @returns {object} Criteria with allOrAny and sets, each with allOrAny, isMet and criteria (message, isMet).
   */
  getCriteria() {
    return {
      allOrAny: this.allOrAny,
      sets: this.restrictionSets.map((restrictionSet) => {
        const criteria = restrictionSet.restrictions.map((restriction) => ({
          message: restriction.getMessage(),
          isMet: restriction.check(),
        }));

        return {
          allOrAny: restrictionSet.allOrAny,
          isMet: checkAllOrAny(criteria.map((criterion) => criterion.isMet), restrictionSet.allOrAny),
          criteria: criteria,
        };
      }),
    };
  }
}
