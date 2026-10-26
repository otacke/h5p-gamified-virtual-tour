/**
 * Decode HTML entities of text, e.g. from H5P text fields.
 * @param {string} html Text that may contain HTML entities or markup.
 * @returns {string} Plain text.
 */
export const decodeHTML = (html) => {
  return new DOMParser().parseFromString(html, 'text/html').documentElement.textContent;
};

/**
 * Get human readable label of interaction.
 * @param {object} interaction Interaction parameters.
 * @returns {string} Label text, title of content, or machine name of library as plain text.
 */
export const getInteractionLabel = (interaction) => {
  return decodeHTML(
    interaction.labelText ||
    interaction.action.metadata?.title ||
    H5P.libraryFromString(interaction.action.library).machineName,
  );
};
