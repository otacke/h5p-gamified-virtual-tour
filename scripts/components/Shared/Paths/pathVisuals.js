/** @constant {object} DEFAULT_PATH_VISUALS Fallback path visuals if no global settings exist. */
export const DEFAULT_PATH_VISUALS = {
  colorPath: 'rgba(0, 0, 0, 0.7)',
  pathWidth: '0.2',
  pathStyle: 'dotted',
};

/** @constant {number} MIN_STROKE_WIDTH_PX Minimum stroke width of path in px. */
const MIN_STROKE_WIDTH_PX = 1;

/**
 * Remove properties without value, so they do not override other visuals.
 * @param {object} [visuals] Visual settings.
 * @returns {object} Visual settings that have a value.
 */
const getDefinedVisuals = (visuals = {}) => {
  return Object.fromEntries(Object.entries(visuals).filter(([, value]) => value !== undefined && value !== ''));
};

/**
 * Get visuals of path, using custom visuals if set, else global visuals.
 * @param {object} [globalVisuals] Global path visuals from behavioural settings.
 * @param {object} path Path parameters.
 * @returns {object} Visuals with colorPath, pathWidth and pathStyle.
 */
export const getPathVisuals = (globalVisuals, path) => {
  const visuals = { ...DEFAULT_PATH_VISUALS, ...getDefinedVisuals(globalVisuals) };
  if (path.visualsType === 'custom') {
    Object.assign(visuals, getDefinedVisuals(path.customVisuals));
  }

  return visuals;
};

/**
 * Get stroke width of path relative to size of interaction buttons.
 * @param {object} visuals Path visuals.
 * @param {number} buttonSize Size of interaction button in px.
 * @returns {number} Stroke width in px.
 */
export const getStrokeWidth = (visuals, buttonSize) => {
  return Math.max(MIN_STROKE_WIDTH_PX, buttonSize * parseFloat(visuals.pathWidth));
};

/**
 * Get paths whose interactions both exist.
 * @param {object} sceneParams Scene parameters.
 * @returns {object[]} Paths with from and to referring to existing interactions.
 */
export const getValidPaths = (sceneParams) => {
  const ids = (sceneParams.interactions ?? []).map((interaction) => interaction.id);

  return (sceneParams.paths ?? []).filter((path) => {
    return path.from !== path.to && ids.includes(path.from) && ids.includes(path.to);
  });
};
