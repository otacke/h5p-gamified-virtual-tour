import { isInstanceTask } from '@scripts/services/h5p-util.js';

/** @constant {string[]} NO_INSTANCE_MACHINE_NAMES Interactions that are handled without H5P instance. */
const NO_INSTANCE_MACHINE_NAMES = ['H5P.GoToScene', 'H5P.Audio'];

/**
 * Subcontent instances of interactions, created once and re-attached when shown (like exercises of H5P.GameMap).
 */
export default class InteractionInstances {
  /**
   * @class
   * @param {object} params Parameters.
   * @param {number} params.contentId H5P content ID.
   * @param {object} params.parent Parent H5P instance.
   * @param {object} [params.previousStates] Previous states of instances, keyed by interaction ID.
   * @param {object} [callbacks] Callbacks.
   * @param {function} [callbacks.onXAPI] Called with interaction, instance and event on xAPI event of instance.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = params;
    this.previousStates = { ...params.previousStates };
    this.callbacks = {
      onXAPI: () => {},
      ...callbacks,
    };

    this.entries = {};
  }

  /**
   * Determine whether interaction is shown using an H5P instance.
   * @param {object} interaction Interaction parameters.
   * @returns {boolean} True, if interaction uses an H5P instance.
   */
  static usesInstance(interaction) {
    const machineName = H5P.libraryFromString(interaction?.action?.library ?? '')?.machineName;
    return !!machineName && !NO_INSTANCE_MACHINE_NAMES.includes(machineName);
  }

  /**
   * Set callbacks.
   * @param {object} callbacks Callbacks, see constructor.
   */
  setCallbacks(callbacks = {}) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Create instances for all interactions of all scenes.
   * @param {object[]} [scenes] Scene parameters.
   */
  createAll(scenes = []) {
    scenes.forEach((scene) => {
      (scene.interactions ?? []).forEach((interaction) => {
        this.create(interaction);
      });
    });
  }

  /**
   * Create instance for interaction unless it exists already.
   * @param {object} interaction Interaction parameters.
   * @returns {object|null} Entry with instance and wrapper, or null if interaction does not use an instance.
   */
  create(interaction) {
    if (interaction?.id === undefined || !InteractionInstances.usesInstance(interaction)) {
      return null;
    }

    if (this.entries[interaction.id]) {
      return this.entries[interaction.id];
    }

    const instance = H5P.newRunnable(
      interaction.action,
      this.params.contentId,
      undefined,
      true,
      {
        parent: this.params.parent,
        previousState: this.previousStates[interaction.id],
      },
    );

    if (!instance) {
      return null;
    }

    const wrapper = document.createElement('div');
    wrapper.classList.add('h5p-gamified-virtual-tour-instance');

    const xAPIHandler = (event) => {
      this.callbacks.onXAPI(interaction, instance, event);
    };
    instance.on('xAPI', xAPIHandler);

    this.entries[interaction.id] = {
      interaction: interaction,
      instance: instance,
      wrapper: wrapper,
      isAttached: false,
      isTask: isInstanceTask(instance),
      xAPIHandler: xAPIHandler,
    };

    return this.entries[interaction.id];
  }

  /**
   * Get entry of interaction.
   * @param {string} interactionId ID of interaction.
   * @returns {object|undefined} Entry with instance and wrapper.
   */
  get(interactionId) {
    return this.entries[interactionId];
  }

  /**
   * Get DOM of interaction's instance, attaching instance if not done yet.
   * @param {string} interactionId ID of interaction.
   * @returns {HTMLElement|undefined} Wrapper with instance.
   */
  getDOM(interactionId) {
    const entry = this.entries[interactionId];
    if (!entry) {
      return;
    }

    this.attach(entry);

    return entry.wrapper;
  }

  /**
   * Attach instance to its wrapper once. Listeners would go missing on re-attaching.
   * @param {object} entry Entry with instance and wrapper.
   */
  attach(entry) {
    if (entry.isAttached) {
      return;
    }

    entry.instance.attach(H5P.jQuery(entry.wrapper));
    entry.isAttached = true;
  }

  /**
   * Determine whether interaction is a task.
   * @param {string} interactionId ID of interaction.
   * @returns {boolean} True, if interaction's instance is a task.
   */
  isTask(interactionId) {
    return this.entries[interactionId]?.isTask ?? false;
  }

  /**
   * Get entries of all tasks.
   * @returns {object[]} Entries of tasks.
   */
  getTaskEntries() {
    return Object.values(this.entries).filter((entry) => entry.isTask);
  }

  /**
   * Get sum of scores of all tasks.
   * @returns {number} Score.
   */
  getScore() {
    return this.getTaskEntries().reduce((sum, entry) => {
      const score = entry.instance.getScore?.();
      return sum + ((typeof score === 'number') ? score : 0);
    }, 0);
  }

  /**
   * Get sum of maximum scores of all tasks.
   * @returns {number} Maximum score.
   */
  getMaxScore() {
    return this.getTaskEntries().reduce((sum, entry) => {
      const maxScore = entry.instance.getMaxScore?.();
      return sum + ((typeof maxScore === 'number') ? maxScore : 0);
    }, 0);
  }

  /**
   * Determine whether an answer was given in any instance.
   * @returns {boolean} True, if an answer was given.
   */
  getAnswerGiven() {
    return Object.values(this.entries).some((entry) => entry.instance.getAnswerGiven?.() ?? false);
  }

  /**
   * Show solutions of all tasks.
   */
  showSolutions() {
    this.getTaskEntries().forEach((entry) => {
      this.attach(entry);
      entry.instance.showSolutions?.();
    });
  }

  /**
   * Reset all instances. Instances that cannot be reset are recreated.
   */
  reset() {
    this.previousStates = {};

    Object.values(this.entries).forEach((entry) => {
      // If not attached yet, some contents can fail (e.g. CP)
      this.attach(entry);

      if (typeof entry.instance.resetTask === 'function') {
        entry.instance.resetTask();
        delete entry.instance.activityStartTime;
        return;
      }

      const interaction = entry.interaction;
      this.destroy(interaction.id);
      delete this.previousStates[interaction.id];
      this.create(interaction);
    });
  }

  /**
   * Get xAPI data of all instances.
   * @returns {object[]} xAPI data of instances that provide it.
   */
  getXAPIData() {
    return Object.values(this.entries)
      .map((entry) => {
        if (typeof entry.instance.getXAPIData !== 'function') {
          return;
        }

        try {
          return entry.instance.getXAPIData();
        }
        catch (error) {
          // Guard against content types that crash when calling getXAPIData, see HFP-4202
          console.warn('Could not get xAPI data from content type:', error);
          return;
        }
      })
      .filter((data) => data !== undefined);
  }

  /**
   * Get current states of all instances.
   * @returns {object} Current states, keyed by interaction ID.
   */
  getCurrentStates() {
    const states = { ...this.previousStates };

    Object.entries(this.entries).forEach(([interactionId, entry]) => {
      const state = entry.instance.getCurrentState?.();
      if (state === undefined || state === null) {
        delete states[interactionId];
      }
      else {
        states[interactionId] = state;
      }
    });

    return states;
  }

  /**
   * Destroy instance of interaction, keeping its current state for next creation.
   * @param {string} interactionId ID of interaction.
   */
  destroy(interactionId) {
    const entry = this.entries[interactionId];
    if (!entry) {
      return;
    }

    const state = entry.instance.getCurrentState?.();
    if (state === undefined || state === null) {
      delete this.previousStates[interactionId];
    }
    else {
      this.previousStates[interactionId] = state;
    }

    entry.instance.off('xAPI', entry.xAPIHandler);
    entry.wrapper.remove();
    delete this.entries[interactionId];
  }
}
