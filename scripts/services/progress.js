/** @constant {string[]} PROGRESS_LEVELS Progress of interaction, ordered from lowest to highest. */
export const PROGRESS_LEVELS = ['unstarted', 'opened', 'completed', 'cleared'];

/** @constant {number} PERCENT Factor for converting ratios to percentages. */
const PERCENT = 100;

/**
 * Get progress of interaction.
 * @param {object} states States of interactions, keyed by interaction ID.
 * @param {string} interactionId ID of interaction.
 * @returns {string} Progress, one of PROGRESS_LEVELS.
 */
export const getInteractionProgress = (states, interactionId) => {
  return states[interactionId]?.progress ?? 'unstarted';
};

/**
 * Determine whether interaction has been completed.
 * @param {object} states States of interactions, keyed by interaction ID.
 * @param {string} interactionId ID of interaction.
 * @returns {boolean} True, if interaction is completed or cleared.
 */
export const isInteractionDone = (states, interactionId) => {
  return PROGRESS_LEVELS.indexOf(getInteractionProgress(states, interactionId)) >=
    PROGRESS_LEVELS.indexOf('completed');
};

/**
 * Get latest score of interaction.
 * @param {object} states States of interactions, keyed by interaction ID.
 * @param {string} interactionId ID of interaction.
 * @returns {number} Score, 0 if interaction has not been scored.
 */
export const getInteractionScore = (states, interactionId) => {
  return states[interactionId]?.score ?? 0;
};

/**
 * Get latest score of interaction relative to its maximum score.
 * @param {object} states States of interactions, keyed by interaction ID.
 * @param {string} interactionId ID of interaction.
 * @returns {number} Score in percent, 0 if interaction has not been scored.
 */
export const getInteractionScorePercentage = (states, interactionId) => {
  const maxScore = states[interactionId]?.maxScore ?? 0;
  if (!maxScore) {
    return 0;
  }

  return getInteractionScore(states, interactionId) / maxScore * PERCENT;
};

/**
 * Get sum of latest scores of all interactions.
 * @param {object} states States of interactions, keyed by interaction ID.
 * @returns {number} Total score.
 */
export const getTotalScore = (states) => {
  return Object.values(states).reduce((sum, state) => sum + (state.score ?? 0), 0);
};

/**
 * Merge changes into state of interaction, never lowering its progress.
 * @param {object} [state] Current state of interaction.
 * @param {object} changes Changes with progress, score and maxScore.
 * @returns {object} New state of interaction.
 */
export const mergeInteractionState = (state = {}, changes) => {
  const currentLevel = PROGRESS_LEVELS.indexOf(state.progress ?? 'unstarted');
  const newLevel = PROGRESS_LEVELS.indexOf(changes.progress ?? 'unstarted');

  return {
    ...state,
    ...changes,
    progress: PROGRESS_LEVELS[Math.max(currentLevel, newLevel)],
  };
};

/**
 * Convert state saved by earlier versions, which only stored IDs of completed interactions.
 * @param {object} [previousState] State to resume from.
 * @returns {object} States of interactions, keyed by interaction ID.
 */
export const getInitialInteractionStates = (previousState) => {
  if (previousState?.interactionStates) {
    return previousState.interactionStates;
  }

  const states = {};
  (previousState?.completedInteractions ?? []).forEach((interactionId) => {
    states[interactionId] = { progress: 'completed' };
  });

  return states;
};
