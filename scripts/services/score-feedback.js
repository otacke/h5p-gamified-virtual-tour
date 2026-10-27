/** @constant {number} PERCENT Factor for converting ratios to percentages. */
const PERCENT = 100;

/**
 * Get feedback range that matches score, like H5P.Question.determineOverallFeedback.
 * @param {object[]} [ranges] Ranges with from and to in percent and feedback.
 * @param {number} score Score achieved.
 * @param {number} maxScore Maximum score.
 * @returns {object|undefined} Matching range, undefined if none matches.
 */
export const getScoreFeedback = (ranges = [], score, maxScore) => {
  if (typeof score !== 'number' || typeof maxScore !== 'number' || maxScore <= 0) {
    return;
  }

  const percentage = Math.floor(score / maxScore * PERCENT);

  return ranges.find((range) => range.from <= percentage && percentage <= range.to);
};

/**
 * Determine whether HTML text has visible text.
 * @param {string} [html] HTML text.
 * @returns {boolean} True, if text is not empty without markup.
 */
export const hasText = (html) => {
  return (html ?? '').replace(/<[^>]*>/g, '').trim() !== '';
};

/**
 * Determine whether H5P.Image parameters contain an image file.
 * @param {object} [image] Parameters of H5P.Image library field.
 * @returns {boolean} True, if image file is set.
 */
export const hasImage = (image) => {
  return !!image?.library && !!image.params?.file?.path;
};

/**
 * Determine whether feedback range has a text or an image to show.
 * @param {object} [range] Feedback range.
 * @returns {boolean} True, if range has a text or an image.
 */
export const hasFeedbackMessage = (range) => {
  return hasText(range?.text) || hasImage(range?.image);
};
