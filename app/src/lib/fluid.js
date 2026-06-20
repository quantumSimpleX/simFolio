// Fluid type: scales linearly from `min`px at 480px viewport to `max`px at 1280px viewport
export function fluid(min, max) {
  return `clamp(${min}px, calc(${min}px + ${max - min} * ((100vw - 480px) / 800)), ${max}px)`;
}
