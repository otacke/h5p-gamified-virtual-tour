import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import PathShape from '@components/Shared/Paths/PathShape.js';
import { getPathVisuals, getStrokeWidth, getValidPaths } from '@components/Shared/Paths/pathVisuals.js';
import '@components/Shared/Paths/Paths.css';

/** @constant {number} BUTTON_SIZE_EM Interaction button size (2.5em at 0.92em font size of button). */
const BUTTON_SIZE_EM = 2.3;

/** @constant {number} MAX_ARC_STEP_RAD Maximum angle between sampled points of path arc. */
const MAX_ARC_STEP_RAD = 0.035;

/** @constant {number} MIN_ARC_ANGLE_RAD Minimum angle between interactions for drawing path. */
const MIN_ARC_ANGLE_RAD = 0.001;

/** @constant {number} CLIP_Z Z coordinate in view space where points are considered behind camera. */
const CLIP_Z = -0.01;

/** @constant {number} CAMERA_NEAR Near plane of reconstructed camera, same as H5P.ThreeSixty. */
const CAMERA_NEAR = 0.1;

/** @constant {number} CAMERA_FAR Far plane of reconstructed camera, same as H5P.ThreeSixty. */
const CAMERA_FAR = 1000;

/**
 * Get unit vector for position on sphere, using same convention as H5P.ThreeSixty.
 * @param {object} position Position with yaw and pitch in radians.
 * @returns {object} THREE.Vector3 on unit sphere.
 */
const getVector = (position) => {
  return new H5P.ThreeJS.Vector3(
    Math.sin(position.yaw) * Math.cos(position.pitch),
    Math.sin(position.pitch),
    -Math.cos(position.yaw) * Math.cos(position.pitch),
  );
};

/**
 * Sample great circle arc between two unit vectors.
 * @param {object} from THREE.Vector3 of start point.
 * @param {object} to THREE.Vector3 of end point.
 * @returns {object[]} THREE.Vector3 points along arc including start and end, empty if arc is undefined.
 */
const sampleArc = (from, to) => {
  const angle = from.angleTo(to);
  if (angle < MIN_ARC_ANGLE_RAD || Math.PI - angle < MIN_ARC_ANGLE_RAD) {
    return [];
  }

  const steps = Math.ceil(angle / MAX_ARC_STEP_RAD);
  const points = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const point = from.clone().multiplyScalar(Math.sin((1 - t) * angle))
      .add(to.clone().multiplyScalar(Math.sin(t * angle)))
      .divideScalar(Math.sin(angle));
    points.push(point);
  }

  return points;
};

/**
 * Split points in view space into visible polylines, clipped where they pass behind camera.
 * @param {object[]} points THREE.Vector3 points in view space.
 * @returns {object[]} Polylines with points (THREE.Vector3), hasStart and hasEnd flags.
 */
const clipPolylines = (points) => {
  const polylines = [];
  let current = null;

  points.forEach((point, index) => {
    const isVisible = point.z < CLIP_Z;
    const previous = points[index - 1];
    const wasVisible = previous !== undefined && previous.z < CLIP_Z;

    if (previous !== undefined && isVisible !== wasVisible) {
      const t = (previous.z - CLIP_Z) / (previous.z - point.z);
      const intersection = previous.clone().lerp(point, t);

      if (isVisible) {
        current = { points: [intersection], hasStart: false, hasEnd: false };
        polylines.push(current);
      }
      else {
        current.points.push(intersection);
        current = null;
      }
    }

    if (!isVisible) {
      return;
    }

    if (!current) {
      current = { points: [], hasStart: index === 0, hasEnd: false };
      polylines.push(current);
    }

    current.points.push(point);
    current.hasEnd = index === points.length - 1;
  });

  return polylines;
};

/**
 * Remove given length from start or end of polyline.
 * @param {object[]} points Points with x and y in px.
 * @param {number} length Length to remove in px.
 * @returns {object[]} Shortened points, empty if polyline is shorter than length.
 */
const trimStart = (points, length) => {
  let remaining = length;
  for (let i = 1; i < points.length; i++) {
    const segment = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    if (segment > remaining) {
      const t = remaining / segment;
      const start = {
        x: points[i - 1].x + (points[i].x - points[i - 1].x) * t,
        y: points[i - 1].y + (points[i].y - points[i - 1].y) * t,
      };
      return [start, ...points.slice(i)];
    }
    remaining -= segment;
  }

  return [];
};

/**
 * Compute screen polylines of all paths for current camera.
 * @param {object} camera Reconstructed THREE.PerspectiveCamera.
 * @param {object} frame Frame data with width, height, buttonSize, paths, positions and globalVisuals.
 * @returns {object[]} Shapes with key, polylines (points in px), visuals and strokeWidth.
 */
const getShapes = (camera, frame) => {
  // eslint-disable-next-line no-magic-numbers
  const radius = frame.buttonSize / 2;

  return frame.paths.map((path) => {
    const visuals = getPathVisuals(frame.globalVisuals, path);
    const arc = sampleArc(getVector(frame.positions[path.from]), getVector(frame.positions[path.to]));
    const viewPoints = arc.map((point) => point.applyMatrix4(camera.matrixWorldInverse));

    const polylines = clipPolylines(viewPoints).map((polyline) => {
      let points = polyline.points.map((point) => {
        const projected = point.clone().applyMatrix4(camera.projectionMatrix);
        return {
          // eslint-disable-next-line no-magic-numbers
          x: (projected.x + 1) / 2 * frame.width,
          // eslint-disable-next-line no-magic-numbers
          y: (1 - projected.y) / 2 * frame.height,
        };
      });

      // Paths should start and end at the edge of the buttons
      if (polyline.hasStart) {
        points = trimStart(points, radius);
      }
      if (polyline.hasEnd) {
        points = trimStart(points.reverse(), radius).reverse();
      }

      return points;
    }).filter((points) => points.length > 1);

    return {
      key: `${path.from}-${path.to}`,
      polylines: polylines,
      visuals: visuals,
      strokeWidth: getStrokeWidth(visuals, frame.buttonSize),
    };
  });
};

/**
 * Get position of interaction from parameters.
 * @param {object} interaction Interaction parameters.
 * @returns {object} Position with yaw and pitch in radians.
 */
const getStoredPosition = (interaction) => {
  return {
    yaw: parseFloat(interaction.interactionPosition.x),
    pitch: parseFloat(interaction.interactionPosition.y),
  };
};

/**
 * Get data describing what needs to be drawn for current camera and parameters.
 * @param {object} threeSixty H5P.ThreeSixty instance.
 * @param {HTMLElement} container Container of paths.
 * @param {object} props Latest component props with sceneParams, globalVisuals and getInteractionPosition.
 * @returns {object} Frame data.
 */
const getFrame = (threeSixty, container, props) => {
  const getPosition = props.getInteractionPosition ?? getStoredPosition;

  const paths = getValidPaths(props.sceneParams);
  const positions = {};
  (props.sceneParams.interactions ?? []).forEach((interaction) => {
    positions[interaction.id] = getPosition(interaction);
  });

  return {
    width: container.clientWidth,
    height: container.clientHeight,
    buttonSize: BUTTON_SIZE_EM * parseFloat(window.getComputedStyle(container).fontSize),
    camera: threeSixty.getCurrentPosition(),
    fov: threeSixty.getCurrentFov(),
    paths: paths,
    positions: positions,
    globalVisuals: props.globalVisuals,
  };
};

/**
 * Render paths between interactions of 360 scene on top of panorama.
 * H5P.ThreeSixty does not report camera movement continuously, so paths are updated in own animation loop.
 * @param {object} props Component props.
 * @param {object} props.threeSixty H5P.ThreeSixty instance.
 * @param {object} props.sceneParams Scene parameters.
 * @param {object} [props.globalVisuals] Global path visuals.
 * @param {function} [props.getInteractionPosition] Get current yaw and pitch of interaction, e.g. while dragged.
 * @returns {React.Element|null} Rendered paths, or null if nothing to draw.
 */
const ThreeSixtyPaths = ({ threeSixty, sceneParams, globalVisuals, getInteractionPosition }) => {
  const [container, setContainer] = useState(null);
  const [drawing, setDrawing] = useState(null);

  const latestProps = useRef();
  latestProps.current = { sceneParams, globalVisuals, getInteractionPosition };

  useEffect(() => {
    const pathsContainer = document.createElement('div');
    pathsContainer.classList.add('paths-overlay-container');

    // Place paths between panorama and interactions
    threeSixty.getElement().insertBefore(pathsContainer, threeSixty.getCameraElement());
    setContainer(pathsContainer);

    const camera = new H5P.ThreeJS.PerspectiveCamera();
    camera.rotation.order = 'YXZ';

    let lastFrameKey = null;
    let animationFrameId = null;

    const update = () => {
      const frame = getFrame(threeSixty, pathsContainer, latestProps.current);

      const frameKey = JSON.stringify(frame);
      if (frameKey !== lastFrameKey && frame.width && frame.height) {
        lastFrameKey = frameKey;

        camera.fov = frame.fov;
        camera.aspect = frame.width / frame.height;
        camera.near = CAMERA_NEAR;
        camera.far = CAMERA_FAR;
        camera.rotation.y = -frame.camera.yaw;
        camera.rotation.x = frame.camera.pitch;
        camera.updateProjectionMatrix();
        camera.updateMatrixWorld();

        setDrawing({ width: frame.width, height: frame.height, shapes: getShapes(camera, frame) });
      }

      animationFrameId = window.requestAnimationFrame(update);
    };
    update();

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      pathsContainer.remove();
    };
  }, [threeSixty]);

  if (!container || !drawing) {
    return null;
  }

  return createPortal(
    <svg className='paths-overlay' width={drawing.width} height={drawing.height} aria-hidden='true'>
      {
        drawing.shapes.map((shape) => shape.polylines.map((points, index) => (
          <PathShape
            key={`${shape.key}-${index}`}
            points={points}
            visuals={shape.visuals}
            strokeWidth={shape.strokeWidth}
          />
        )))
      }
    </svg>,
    container,
  );
};

export default ThreeSixtyPaths;
