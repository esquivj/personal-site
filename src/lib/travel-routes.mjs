import { geoDistance, geoInterpolate } from 'd3-geo';

/** @param {[number, number]} from @param {[number, number]} to */
export function routeGeometry(from, to) {
  const interpolate = geoInterpolate(from, to);
  /** @type {number[][][]} */
  const segments = [[]];
  for (let i = 0; i <= 96; i++) {
    const point = interpolate(i / 96);
    const segment = segments[segments.length - 1];
    const previous = segment[segment.length - 1];
    if (previous && Math.abs(point[0] - previous[0]) > 180) {
      // Split at the date line instead of drawing a line across the whole world.
      const edge = previous[0] > 0 ? 180 : -180;
      const unwrapped = point[0] + (edge > 0 ? 360 : -360);
      const fraction = (edge - previous[0]) / (unwrapped - previous[0]);
      const latitude = previous[1] + fraction * (point[1] - previous[1]);
      segment.push([edge, latitude]);
      segments.push([[-edge, latitude], point]);
    } else segment.push(point);
  }
  return { type: /** @type {const} */ ('MultiLineString'), coordinates: segments };
}

/** @param {[number, number]} from @param {[number, number]} to */
export function routeDistance(from, to) {
  return Math.round(geoDistance(from, to) * 6371.0088);
}
