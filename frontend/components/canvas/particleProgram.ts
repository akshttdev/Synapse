/**
 * Instanced particle field shaders.
 *
 * Per-instance attributes:
 *   - aSeed (vec3)          deterministic per-particle randomness
 *   - aColor (vec3)         modality color
 *
 * Uniforms:
 *   - uTime (float)
 *   - uMouse (vec2)         normalized -1..1
 *   - uCameraZ (float)
 *   - uFog (float)          0..1
 *   - uScale (float)        particle size multiplier
 *   - uAspect (float)       canvas aspect ratio (w/h)
 *   - uPositionsA (sampler2D)  current composition target field
 *   - uPositionsB (sampler2D)  next composition target field
 *   - uMix (float)          0..1 between A and B
 *   - uCount (int)          total particle count
 *
 * Per-particle target XYZ is packed into RGB channels of a float texture.
 * We sample by gl_InstanceID to read each particle's target in each composition.
 */
export const VERT = /* glsl */ `#version 300 es
precision highp float;

in vec3 position;
in vec3 aSeed;
in vec3 aColor;

uniform float uTime;
uniform vec2 uMouse;
uniform float uCameraZ;
uniform float uFog;
uniform float uScale;
uniform float uAspect;
uniform sampler2D uPositionsA;
uniform sampler2D uPositionsB;
uniform float uMix;
uniform int uCount;

out vec3 vColor;
out float vDepth;

vec3 fetchTarget(sampler2D tex, int id) {
  int W = textureSize(tex, 0).x;
  int x = id % W;
  int y = id / W;
  return texelFetch(tex, ivec2(x, y), 0).rgb;
}

void main() {
  int id = gl_InstanceID;
  vec3 a = fetchTarget(uPositionsA, id);
  vec3 b = fetchTarget(uPositionsB, id);
  float t = smoothstep(0.0, 1.0, uMix);
  vec3 p = mix(a, b, t);

  // Per-particle gentle noise drift
  float n = sin(uTime * 0.4 + aSeed.x * 6.28318) * 0.04;
  p.x += n * aSeed.y;
  p.y += n * aSeed.z;

  // Mouse parallax
  p.x += uMouse.x * 0.15 * (1.0 - aSeed.x);
  p.y += uMouse.y * 0.15 * (1.0 - aSeed.y);

  // Translate by camera Z (camera looks down -Z)
  vec3 view = p - vec3(0.0, 0.0, uCameraZ);

  // Perspective projection
  float fov = 1.2;
  vec2 proj = view.xy / max(0.001, -view.z * fov);
  proj.x /= uAspect;

  gl_Position = vec4(proj, 0.0, 1.0);
  float dist = length(view);
  gl_PointSize = clamp(220.0 / dist, 1.0, 14.0) * uScale;
  vColor = aColor;
  vDepth = clamp(1.0 - (dist - 1.0) / 10.0, 0.0, 1.0);
}
`;

export const FRAG = /* glsl */ `#version 300 es
precision highp float;

in vec3 vColor;
in float vDepth;
uniform float uFog;
out vec4 oColor;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;
  float alpha = smoothstep(0.5, 0.0, d);
  float fog = mix(1.0, vDepth, uFog);
  oColor = vec4(vColor * fog, alpha * fog);
}
`;
