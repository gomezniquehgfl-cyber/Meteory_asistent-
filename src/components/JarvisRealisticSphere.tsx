import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface JarvisRealisticSphereProps {
  isListening: boolean;
  isSpeaking: boolean;
  audioLevel?: number; // 0.0 to 1.0 from microphone
  className?: string;
}

export const JarvisRealisticSphere: React.FC<JarvisRealisticSphereProps> = ({
  isListening,
  isSpeaking,
  audioLevel = 0,
  className = '',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // Store reactive props in a ref so the Three.js loop reads them without re-initializing the canvas
  const stateRef = useRef({
    isListening,
    isSpeaking,
    audioLevel,
  });

  useEffect(() => {
    stateRef.current = { isListening, isSpeaking, audioLevel };
  }, [isListening, isSpeaking, audioLevel]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 360;
    const height = container.clientHeight || 360;

    // 1. Scene & Perspective Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 4.2);

    // 2. High-Performance WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
      stencil: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);

    // 3. Master Hierarchy Root Group
    const masterRoot = new THREE.Group();
    masterRoot.scale.set(0.92, 0.92, 0.92);
    scene.add(masterRoot);

    // =========================================================================
    // LAYER 1: DEFORMING HOLOGRAPHIC JARVIS PLASMA CORE
    // =========================================================================
    // Base geometry with high vertex density for smooth wave displacement
    const sphereRadius = 1.05;
    const baseGeo = new THREE.IcosahedronGeometry(sphereRadius, 5);
    const originalPositions = Float32Array.from(baseGeo.attributes.position.array);

    // Inner Glowing Core Material
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      wireframe: true,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const deformingSphereMesh = new THREE.Mesh(baseGeo, coreMat);
    masterRoot.add(deformingSphereMesh);

    // Inner Solid Singularity (Arc Reactor Heart)
    const heartGeo = new THREE.SphereGeometry(0.35, 32, 32);
    const heartMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
    });
    const heartMesh = new THREE.Mesh(heartGeo, heartMat);
    masterRoot.add(heartMesh);

    // Luminous Corona
    const coronaGeo = new THREE.SphereGeometry(0.55, 32, 32);
    const coronaMat = new THREE.MeshBasicMaterial({
      color: 0x00b4d8,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const coronaMesh = new THREE.Mesh(coronaGeo, coronaMat);
    masterRoot.add(coronaMesh);

    // Outer Vertex Glow Points
    const pointsGeo = new THREE.BufferGeometry();
    pointsGeo.setAttribute('position', baseGeo.attributes.position.clone());
    const pointsMat = new THREE.PointsMaterial({
      color: 0x67e8f9,
      size: 0.035,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const glowPoints = new THREE.Points(pointsGeo, pointsMat);
    masterRoot.add(glowPoints);

    // =========================================================================
    // LAYER 2: GYROSCOPIC TACTICAL GIMBAL RINGS
    // =========================================================================
    const createTacticalRing = (radius: number, segments: number, color: number, opacity: number) => {
      const positions: number[] = [];
      const totalSteps = segments * 2;
      for (let i = 0; i < totalSteps; i += 2) {
        const theta1 = (i / totalSteps) * Math.PI * 2;
        const theta2 = ((i + 0.6) / totalSteps) * Math.PI * 2;
        positions.push(
          Math.cos(theta1) * radius,
          Math.sin(theta1) * radius,
          0,
          Math.cos(theta2) * radius,
          Math.sin(theta2) * radius,
          0
        );
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      const mat = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      return new THREE.LineSegments(geo, mat);
    };

    const ringPrimary = createTacticalRing(1.5, 48, 0x00f0ff, 0.7);
    const ringSecondary = createTacticalRing(1.68, 36, 0x0284c7, 0.5);
    const ringTertiary = createTacticalRing(1.85, 24, 0x38bdf8, 0.35);

    ringSecondary.rotation.x = Math.PI / 3;
    ringTertiary.rotation.y = Math.PI / 4;

    masterRoot.add(ringPrimary);
    masterRoot.add(ringSecondary);
    masterRoot.add(ringTertiary);

    // =========================================================================
    // LAYER 3: ORBITAL DATA DUST PARTICLES
    // =========================================================================
    const particleCount = 180;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const radius = 1.25 + Math.random() * 0.9;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      particlePositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      particlePositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      particlePositions[i * 3 + 2] = radius * Math.cos(phi);
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.028,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    masterRoot.add(particles);

    // =========================================================================
    // TOUCH & POINTER INTERACTION (Fluid 3D Rotation with Inertia)
    // =========================================================================
    let isDragging = false;
    let prevPointerX = 0;
    let prevPointerY = 0;
    let velX = 0;
    let velY = 0.003; // Default idle spin

    const domElement = renderer.domElement;

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      prevPointerX = e.clientX;
      prevPointerY = e.clientY;
      velX = 0;
      velY = 0;
      domElement.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevPointerX;
      const deltaY = e.clientY - prevPointerY;
      prevPointerX = e.clientX;
      prevPointerY = e.clientY;

      velY = deltaX * 0.005;
      velX = deltaY * 0.005;

      masterRoot.rotation.y += velY;
      masterRoot.rotation.x += velX;
    };

    const onPointerUp = (e: PointerEvent) => {
      isDragging = false;
      try {
        domElement.releasePointerCapture(e.pointerId);
      } catch {}
    };

    domElement.addEventListener('pointerdown', onPointerDown);
    domElement.addEventListener('pointermove', onPointerMove);
    domElement.addEventListener('pointerup', onPointerUp);
    domElement.addEventListener('pointercancel', onPointerUp);

    // =========================================================================
    // ANIMATION & REALISTIC DEFORMATION LOOP
    // =========================================================================
    let animationFrameId: number;
    const clock = new THREE.Clock();

    let frameSkipCount = 0;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // In Real OS Power-Saver Mode, throttle idle rendering to conserve CPU/GPU battery
      if (typeof window !== 'undefined' && window.__METEORY_POWER_SAVER && !stateRef.current.isSpeaking && !stateRef.current.isListening) {
        frameSkipCount++;
        if (frameSkipCount % 3 !== 0) return;
      }

      const delta = clock.getDelta();
      const time = clock.getElapsedTime();
      const { isListening, isSpeaking, audioLevel } = stateRef.current;

      // 1. Inertial Rotation with damping
      if (!isDragging) {
        masterRoot.rotation.y += velY;
        masterRoot.rotation.x += velX;
        velY = THREE.MathUtils.damp(velY, 0.0035, 0.95, delta);
        velX = THREE.MathUtils.damp(velX, 0.0005, 0.95, delta);
      }

      // Rotate Tactical Rings at differentiated rates
      ringPrimary.rotation.z += 0.006;
      ringSecondary.rotation.x += 0.008;
      ringSecondary.rotation.z -= 0.004;
      ringTertiary.rotation.y += 0.007;
      ringTertiary.rotation.z += 0.005;
      particles.rotation.y -= 0.002;

      // 2. Dynamic Deformation of the Sphere Vertices (Jarvis Speech Reaction)
      const posAttr = baseGeo.attributes.position as THREE.BufferAttribute;
      const currentPos = posAttr.array as Float32Array;
      const pointsPosAttr = pointsGeo.attributes.position as THREE.BufferAttribute;
      const currentPointsPos = pointsPosAttr.array as Float32Array;

      // Calculate deformation amplitude
      let targetAmplitude = 0.035; // Idle breathing
      if (isSpeaking) {
        // High-energy organic wave deformation when Jarvis talks
        targetAmplitude = 0.18 + Math.sin(time * 8) * 0.06;
      } else if (isListening) {
        // Voice reactive ripple when listening to user
        targetAmplitude = 0.06 + audioLevel * 0.14;
      }

      const frequency = isSpeaking ? 4.2 : 2.5;
      const speed = isSpeaking ? 7.5 : 2.0;

      for (let i = 0; i < originalPositions.length; i += 3) {
        const ox = originalPositions[i];
        const oy = originalPositions[i + 1];
        const oz = originalPositions[i + 2];

        // 3D Harmonic Wave Equation
        const wave =
          Math.sin(ox * frequency + time * speed) *
          Math.cos(oy * frequency + time * (speed * 0.8)) *
          Math.sin(oz * frequency + time * (speed * 1.2));

        const displacement = 1 + wave * targetAmplitude;

        const nx = ox * displacement;
        const ny = oy * displacement;
        const nz = oz * displacement;

        currentPos[i] = nx;
        currentPos[i + 1] = ny;
        currentPos[i + 2] = nz;

        currentPointsPos[i] = nx;
        currentPointsPos[i + 1] = ny;
        currentPointsPos[i + 2] = nz;
      }

      posAttr.needsUpdate = true;
      pointsPosAttr.needsUpdate = true;
      baseGeo.computeVertexNormals();

      // 3. Heart Singularity Pulse
      const heartPulse = isSpeaking
        ? 1.0 + Math.sin(time * 14) * 0.22
        : isListening
        ? 1.0 + audioLevel * 0.35
        : 1.0 + Math.sin(time * 2.5) * 0.08;
      heartMesh.scale.set(heartPulse, heartPulse, heartPulse);
      coronaMesh.scale.set(heartPulse * 1.05, heartPulse * 1.05, heartPulse * 1.05);

      // 4. Color Shifts on Status
      if (isSpeaking) {
        coreMat.color.setHex(0x00f0ff);
        pointsMat.color.setHex(0xffffff);
        heartMat.color.setHex(0xffffff);
      } else if (isListening) {
        coreMat.color.setHex(0x38bdf8);
        pointsMat.color.setHex(0x00e5ff);
        heartMat.color.setHex(0x00f0ff);
      } else {
        coreMat.color.setHex(0x0284c7);
        pointsMat.color.setHex(0x38bdf8);
        heartMat.color.setHex(0xecfeff);
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth || 360;
      const newH = container.clientHeight || 360;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      domElement.removeEventListener('pointerdown', onPointerDown);
      domElement.removeEventListener('pointermove', onPointerMove);
      domElement.removeEventListener('pointerup', onPointerUp);
      domElement.removeEventListener('pointercancel', onPointerUp);

      baseGeo.dispose();
      coreMat.dispose();
      heartGeo.dispose();
      heartMat.dispose();
      coronaGeo.dispose();
      coronaMat.dispose();
      pointsGeo.dispose();
      pointsMat.dispose();
      ringPrimary.geometry.dispose();
      (ringPrimary.material as THREE.Material).dispose();
      ringSecondary.geometry.dispose();
      (ringSecondary.material as THREE.Material).dispose();
      ringTertiary.geometry.dispose();
      (ringTertiary.material as THREE.Material).dispose();
      particleGeo.dispose();
      particleMat.dispose();
      renderer.dispose();

      if (container.contains(domElement)) {
        container.removeChild(domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className={`relative w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing select-none ${className}`}
      data-testid="jarvis-realistic-3d-sphere"
      aria-label="Esfera 3D realista con deformación de plasma estilo Jarvis"
    />
  );
};
