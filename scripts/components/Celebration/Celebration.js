import React from 'react';
import PropTypes from 'prop-types';
import '@components/Celebration/Celebration.css';

/** @constant {number} DURATION_MS Duration of celebration in milliseconds. */
const DURATION_MS = 3000;

/** @constant {string[]} COLORS Colors of balloons, fireworks and confetti. */
const COLORS = ['#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4', '#42d4f4', '#f032e6'];

/** @constant {number} BALLOON_COUNT Number of balloons. */
const BALLOON_COUNT = 15;

/** @constant {number} CONFETTI_COUNT Number of confetti pieces. */
const CONFETTI_COUNT = 80;

/** @constant {number} FIREWORK_BURST_COUNT Number of firework bursts. */
const FIREWORK_BURST_COUNT = 5;

/** @constant {number} FIREWORK_PARTICLE_COUNT Number of particles per firework burst. */
const FIREWORK_PARTICLE_COUNT = 16;

/** @constant {number} FULL_CIRCLE_DEG Degrees of full circle. */
const FULL_CIRCLE_DEG = 360;

/** @constant {object} BALLOON Ranges for random values of balloons. Delay + duration stay below total duration. */
const BALLOON = {
  xPercent: { min: 2, max: 92 },
  delayS: { min: 0, max: 0.8 },
  durationS: { min: 1.8, max: 2.2 },
  sizeEm: { min: 2.5, max: 4 },
  swayEm: { min: -2, max: 2 },
};

/** @constant {object} CONFETTI Ranges for random values of confetti pieces. */
const CONFETTI = {
  xPercent: { min: 0, max: 100 },
  delayS: { min: 0, max: 1 },
  durationS: { min: 1.5, max: 2 },
  widthEm: { min: 0.4, max: 0.7 },
  heightEm: { min: 0.8, max: 1.2 },
  driftEm: { min: -4, max: 4 },
};

/** @constant {object} FIREWORK Values and ranges for random values of firework bursts. */
const FIREWORK = {
  xPercent: { min: 15, max: 85 },
  yPercent: { min: 15, max: 60 },
  delayStepS: 0.35,
  delayJitterS: { min: 0, max: 0.2 },
  distanceEm: { min: 4, max: 7 },
  burstColorProbability: 0.5,
};

/**
 * Get random number in range.
 * @param {object} range Range.
 * @param {number} range.min Minimum value.
 * @param {number} range.max Maximum value.
 * @returns {number} Random number.
 */
const random = ({ min, max }) => min + Math.random() * (max - min);

/**
 * Get random color.
 * @returns {string} Color.
 */
const randomColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];

/**
 * Create balloons that float up.
 * @returns {React.Element[]} Balloons.
 */
const createBalloons = () => Array.from({ length: BALLOON_COUNT }, (_, index) => (
  <span
    key={ index }
    className='balloon'
    style={ {
      '--x': `${random(BALLOON.xPercent)}%`,
      '--delay': `${random(BALLOON.delayS)}s`,
      '--duration': `${random(BALLOON.durationS)}s`,
      '--size': `${random(BALLOON.sizeEm)}em`,
      '--sway': `${random(BALLOON.swayEm)}em`,
      '--color': randomColor(),
    } }
  />
));

/**
 * Create confetti pieces that rain down.
 * @returns {React.Element[]} Confetti pieces.
 */
const createConfetti = () => Array.from({ length: CONFETTI_COUNT }, (_, index) => (
  <span
    key={ index }
    className='confetti-piece'
    style={ {
      '--x': `${random(CONFETTI.xPercent)}%`,
      '--delay': `${random(CONFETTI.delayS)}s`,
      '--duration': `${random(CONFETTI.durationS)}s`,
      '--width': `${random(CONFETTI.widthEm)}em`,
      '--height': `${random(CONFETTI.heightEm)}em`,
      '--rotation': `${random({ min: 0, max: FULL_CIRCLE_DEG })}deg`,
      '--drift': `${random(CONFETTI.driftEm)}em`,
      '--color': randomColor(),
    } }
  />
));

/**
 * Create firework bursts with particles flying outwards.
 * @returns {React.Element[]} Firework bursts.
 */
const createFireworks = () => Array.from({ length: FIREWORK_BURST_COUNT }, (_, burstIndex) => {
  const color = randomColor();

  return (
    <span
      key={ burstIndex }
      className='burst'
      style={ {
        '--x': `${random(FIREWORK.xPercent)}%`,
        '--y': `${random(FIREWORK.yPercent)}%`,
        '--delay': `${burstIndex * FIREWORK.delayStepS + random(FIREWORK.delayJitterS)}s`,
      } }
    >
      {
        Array.from({ length: FIREWORK_PARTICLE_COUNT }, (_, particleIndex) => (
          <span
            key={ particleIndex }
            className='particle'
            style={ {
              '--angle': `${FULL_CIRCLE_DEG / FIREWORK_PARTICLE_COUNT * particleIndex}deg`,
              '--distance': `${random(FIREWORK.distanceEm)}em`,
              '--color': Math.random() < FIREWORK.burstColorProbability ? color : randomColor(),
            } }
          />
        ))
      }
    </span>
  );
});

/** @constant {object} CREATORS Functions creating elements for celebration types. */
const CREATORS = {
  balloons: createBalloons,
  confetti: createConfetti,
  fireworks: createFireworks,
};

export default class Celebration extends React.Component {
  /**
   * Create celebration component.
   * @param {object} props Component props.
   */
  constructor(props) {
    super(props);

    this.isReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

    // Random values must not change on re-render
    this.elements = this.isReducedMotion ? [] : (CREATORS[props.type]?.() ?? []);
  }

  /**
   * React - run after initial render.
   */
  componentDidMount() {
    if (this.isReducedMotion || !this.elements.length) {
      this.props.onDone();
      return;
    }

    this.timeout = window.setTimeout(() => {
      this.props.onDone();
    }, DURATION_MS);
  }

  /**
   * React - run before unmount.
   */
  componentWillUnmount() {
    window.clearTimeout(this.timeout);
  }

  /**
   * React - create DOM elements.
   * @returns {React.Element|null} Rendered celebration layer.
   */
  render() {
    if (!this.elements.length) {
      return null;
    }

    return (
      <div className={ `h5p-gamified-virtual-tour-celebration ${this.props.type}` } aria-hidden='true'>
        { this.elements }
      </div>
    );
  }
}

Celebration.propTypes = {
  type: PropTypes.oneOf(Object.keys(CREATORS)).isRequired,
  onDone: PropTypes.func.isRequired,
};
