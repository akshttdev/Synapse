'use client';

import { useEffect, useRef } from 'react';
import { Renderer, Program, Mesh, Geometry, Texture } from 'ogl';
import { VERT, FRAG } from './particleProgram';
import { COMPOSITIONS } from './compositions';
import { sharedState } from './SceneProvider';
import { useDeviceCapability } from '@/hooks/useDeviceCapability';
import { particleCount, dprCap } from '@/lib/particleConfig';
import { modalityColors } from '@/lib/mockData';

const hexToRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

const COLOR_POOL: [number, number, number][] = [
  hexToRgb(modalityColors.image),
  hexToRgb(modalityColors.audio),
  hexToRgb(modalityColors.video),
  hexToRgb(modalityColors.text),
  hexToRgb('#34d399'),
  hexToRgb('#34d399'),
];

const TEX_W = 256;

function buildPositionTexture(gl: WebGL2RenderingContext, count: number, data: Float32Array): Texture {
  const H = Math.ceil(count / TEX_W);
  const padded = new Float32Array(TEX_W * H * 4);
  for (let i = 0; i < count; i++) {
    padded[i * 4 + 0] = data[i * 3 + 0];
    padded[i * 4 + 1] = data[i * 3 + 1];
    padded[i * 4 + 2] = data[i * 3 + 2];
    padded[i * 4 + 3] = 0;
  }
  return new Texture(gl, {
    image: padded,
    width: TEX_W,
    height: H,
    type: gl.FLOAT,
    format: gl.RGBA,
    internalFormat: gl.RGBA32F,
    generateMipmaps: false,
    minFilter: gl.NEAREST,
    magFilter: gl.NEAREST,
    wrapS: gl.CLAMP_TO_EDGE,
    wrapT: gl.CLAMP_TO_EDGE,
  });
}

export default function CanvasRoot() {
  const cap = useDeviceCapability();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || cap.cores === 0) return;

    const COUNT = particleCount(cap);
    const renderer = new Renderer({
      dpr: dprCap(cap),
      alpha: true,
      antialias: false,
      premultipliedAlpha: true,
    });
    const glRaw = renderer.gl as WebGLRenderingContext | WebGL2RenderingContext;
    if (!(glRaw instanceof WebGL2RenderingContext)) {
      console.warn('[CanvasRoot] WebGL2 not supported, skipping particle field.');
      return;
    }
    const gl = glRaw;
    gl.getExtension('EXT_color_buffer_float');
    gl.getExtension('OES_texture_float_linear');
    el.appendChild(gl.canvas);

    const resize = () => {
      renderer.setSize(el.clientWidth, el.clientHeight);
    };
    resize();
    window.addEventListener('resize', resize);

    const seeds = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      seeds[i * 3 + 0] = Math.random();
      seeds[i * 3 + 1] = Math.random();
      seeds[i * 3 + 2] = Math.random();
      const c = COLOR_POOL[i % COLOR_POOL.length];
      colors[i * 3 + 0] = c[0];
      colors[i * 3 + 1] = c[1];
      colors[i * 3 + 2] = c[2];
    }

    const geometry = new Geometry(gl, {
      position: { size: 3, data: new Float32Array([0, 0, 0]) },
      aSeed: { size: 3, data: seeds, instanced: 1 },
      aColor: { size: 3, data: colors, instanced: 1 },
    });
    (geometry as unknown as { instancedCount: number }).instancedCount = COUNT;

    const textures: Texture[] = COMPOSITIONS.map((c) => buildPositionTexture(gl, COUNT, c(COUNT)));

    const program = new Program(gl, {
      vertex: VERT,
      fragment: FRAG,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: [0, 0] },
        uCameraZ: { value: -3.5 },
        uFog: { value: 0 },
        uScale: { value: 1 },
        uAspect: { value: 1 },
        uPositionsA: { value: textures[0] },
        uPositionsB: { value: textures[1] },
        uMix: { value: 0 },
        uCount: { value: COUNT },
      },
    });

    const mesh = new Mesh(gl, { geometry, program, mode: gl.POINTS });

    let raf = 0;
    let mouseX = 0;
    let mouseY = 0;
    const onMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      mouseY = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('mousemove', onMove);

    const t0 = performance.now();
    const loop = () => {
      const t = (performance.now() - t0) / 1000;
      const s = sharedState.current;

      const lastIndex = COMPOSITIONS.length - 1;
      const idx = Math.max(0, Math.min(s.sceneIndex, lastIndex));
      const iA = Math.floor(idx);
      const iB = Math.min(lastIndex, iA + 1);
      const mix = idx - iA;

      program.uniforms.uTime.value = t;
      program.uniforms.uMouse.value = [mouseX * 0.6, mouseY * 0.6];
      program.uniforms.uCameraZ.value = s.cameraZ;
      program.uniforms.uFog.value = s.fog;
      program.uniforms.uScale.value = s.scale;
      program.uniforms.uAspect.value = gl.canvas.width / Math.max(1, gl.canvas.height);
      program.uniforms.uPositionsA.value = textures[iA];
      program.uniforms.uPositionsB.value = textures[iB];
      program.uniforms.uMix.value = mix;

      (gl.canvas as HTMLCanvasElement).style.opacity = String(s.opacity);

      renderer.render({ scene: mesh });
      raf = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
      (gl.canvas as HTMLCanvasElement).remove();
    };
  }, [cap]);

  return (
    <div
      ref={containerRef}
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        background: 'transparent',
      }}
    />
  );
}
