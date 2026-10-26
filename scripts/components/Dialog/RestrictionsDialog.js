import '@components/Dialog/RestrictionsDialog.css';

/** @constant {number} REMOVE_DELAY_MS Delay before removing dialog, so it can animate when closing. */
const REMOVE_DELAY_MS = 1000;

/**
 * Escape text for use in HTML.
 * @param {string} text Text to escape.
 * @returns {string} Escaped text.
 */
const escapeHTML = (text) => {
  const element = document.createElement('div');
  element.textContent = text;
  return element.innerHTML;
};

/**
 * Build HTML of single criterion.
 * @param {object} criterion Criterion with message and isMet.
 * @param {object} l10n Localization strings.
 * @returns {string} HTML of criterion.
 */
const buildCriterionHTML = (criterion, l10n) => {
  const status = criterion.isMet ? l10n.criterionMet : l10n.criterionNotMet;

  return `<li class="criterion ${criterion.isMet ? 'met' : 'not-met'}">` +
    `${escapeHTML(criterion.message)}<span class="criterion-status"> (${escapeHTML(status)})</span></li>`;
};

/**
 * Build HTML of criteria set, introduced by all of/any of if it has more than one criterion.
 * @param {object} criteriaSet Set with allOrAny and criteria.
 * @param {object} l10n Localization strings.
 * @returns {string} HTML of criteria set.
 */
const buildSetHTML = (criteriaSet, l10n) => {
  const criteriaHTML = criteriaSet.criteria.map((criterion) => buildCriterionHTML(criterion, l10n)).join('');
  if (criteriaSet.criteria.length <= 1) {
    return criteriaHTML;
  }

  const intro = criteriaSet.allOrAny === 'any' ? l10n.restrictionsAnyOf : l10n.restrictionsAllOf;
  return `<li class="criteria-set">${escapeHTML(intro)}<ul>${criteriaHTML}</ul></li>`;
};

/**
 * Build HTML explaining which criteria need to be met.
 * @param {object} criteria Criteria with allOrAny and sets.
 * @param {object} l10n Localization strings.
 * @returns {string} HTML for dialog text.
 */
const buildDialogHTML = (criteria, l10n) => {
  const intro = criteria.allOrAny === 'any' ? l10n.restrictionsAnyOfLong : l10n.restrictionsAllOfLong;
  const setsHTML = criteria.sets.map((criteriaSet) => buildSetHTML(criteriaSet, l10n)).join('');

  return `<p>${escapeHTML(l10n.interactionLockedDialog)}</p>` +
    `<p>${escapeHTML(intro)}</p>` +
    `<ul class="restriction-criteria">${setsHTML}</ul>`;
};

/**
 * Show dialog explaining criteria to unlock interaction, like H5P.GameMap does for stages.
 * @param {object} params Parameters.
 * @param {HTMLElement} params.container Container of content, so dialog also works in fullscreen.
 * @param {object} params.instance H5P instance showing dialog.
 * @param {object} params.criteria Criteria with allOrAny and sets, see Restrictions.getCriteria.
 * @param {object} params.l10n Localization strings.
 */
export const showRestrictionsDialog = ({ container, instance, criteria, l10n }) => {
  const wrapper = document.createElement('div');
  wrapper.classList.add('restrictions-dialog');
  wrapper.addEventListener('click', (event) => {
    event.stopPropagation();
  });
  container.append(wrapper);

  const dialog = new H5P.ConfirmationDialog({
    instance: instance,
    headerText: l10n.interactionLockedHeader,
    dialogText: buildDialogHTML(criteria, l10n),
    confirmText: l10n.ok,
    hideCancel: true,
    theme: true,
  });

  const removeDialog = () => {
    window.setTimeout(() => wrapper.remove(), REMOVE_DELAY_MS);
  };
  dialog.once('confirmed', removeDialog);
  dialog.once('canceled', removeDialog);

  dialog.appendTo(wrapper);
  dialog.show();
};
