/** @constant {string[]} COMPLETING_VERBS xAPI verbs that mark a task as completed. */
const COMPLETING_VERBS = ['completed', 'answered'];

/**
 * Determine whether H5P instance is a task, taken from H5P.GameMap.
 * @param {object} [instance] H5P instance.
 * @returns {boolean} True, if instance is a task.
 */
export const isInstanceTask = (instance = {}) => {
  if (!instance) {
    return false;
  }

  if (typeof instance.isTask === 'boolean') {
    return instance.isTask; // Content will determine if it's task on its own
  }

  const hasGetMaxScore = (typeof instance.getMaxScore === 'function');
  if (hasGetMaxScore && instance.getMaxScore() > 0) {
    return true;
  }

  return false;
};

/**
 * Determine whether xAPI event completes instance, ignoring statements of instance's subcontent.
 * @param {object} event xAPI event.
 * @param {object} instance H5P instance that triggered event.
 * @returns {boolean} True, if event has verb completed or answered and was triggered for instance itself.
 */
export const isCompletingStatement = (event, instance) => {
  if (!COMPLETING_VERBS.includes(event.getVerb())) {
    return false;
  }

  if (!instance.subContentId) {
    return true;
  }

  const objectId = event.getVerifiedStatementValue(['object', 'id']) ?? '';
  return objectId.includes(instance.subContentId);
};
