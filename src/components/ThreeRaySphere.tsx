import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface ThreeRaySphereProps {
  isListening: boolean;
  isSpeaking: boolean;
  audioLevel?: number; // 0.0 to 1.0 from microphone
  className?: string;
  targetRotation?: { x: number; y: number };
}

// Procedural high-resolution holographic HUD text banner texture
function createHoloTextTexture(text: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Glowing boundary guidelines
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.lineTo(2048, 8);
    ctx.moveTo(0, 120);
    ctx.lineTo(2048, 120);
    ctx.stroke();

    // Precision micro tick marks
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.3)';
    ctx.lineWidth = 1;
    for (let x = 0; x < 2048; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 8);
      ctx.lineTo(x, 22);
      ctx.moveTo(x, 106);
      ctx.lineTo(x, 120);
      ctx.stroke();
    }

    // High-tech typography with glowing neon drop shadow
    ctx.font = 'bold 38px "JetBrains Mono", monospace, "Courier New", sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 14;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 1024, 64);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = true;
  return texture;
}

export const ThreeRaySphere: React.FC<ThreeRaySphereProps> = ({
  isListening,
  isSpeaking,
  audioLevel = 0,
  className = '',
  targetRotation = { x: 0, y: 0 },
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // Store reactive props in refs so React re-renders never tear down or glitch the WebGL canvas
  const stateRef = useRef({
    isListening,
    isSpeaking,
    audioLevel,
    targetRotation,
  });

  useEffect(() => {
    stateRef.current = { isListening, isSpeaking, audioLevel, targetRotation };
  }, [isListening, isSpeaking, audioLevel, targetRotation]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Detect headless test environments
    const isHeadless =
      typeof navigator !== 'undefined' &&
      (navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent));

    const width = container.clientWidth || 500;
    const height = container.clientHeight || 500;

    // 1. Scene, Camera & High-Performance Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 0, 5.2);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isHeadless,
      alpha: true,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isHeadless ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    container.appendChild(renderer.domElement);

    // Master Hierarchy Root (Scaled to fit completely inside screen view)
    const masterRoot = new THREE.Group();
    masterRoot.scale.set(0.95, 0.95, 0.95);
    scene.add(masterRoot);

    // =========================================================================
    // LAYER 1: ARC REACTOR CORE (Multilayer Emissive Singularity)
    // =========================================================================
    // Central energy singularity
    const innerCoreGeo = new THREE.SphereGeometry(0.22, 32, 32);
    const innerCoreMat = new THREE.MeshBasicMaterial({
      color: 0xecfeff,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
    });
    const innerCoreMesh = new THREE.Mesh(innerCoreGeo, innerCoreMat);
    masterRoot.add(innerCoreMesh);

    // Middle luminous corona
    const midCoreGeo = new THREE.SphereGeometry(0.38, 32, 32);
    const midCoreMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const midCoreMesh = new THREE.Mesh(midCoreGeo, midCoreMat);
    masterRoot.add(midCoreMesh);

    // Outer energetic halo
    const outerHaloGeo = new THREE.SphereGeometry(0.62, 32, 32);
    const outerHaloMat = new THREE.MeshBasicMaterial({
      color: 0x0052cc,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const outerHaloMesh = new THREE.Mesh(outerHaloGeo, outerHaloMat);
    masterRoot.add(outerHaloMesh);

    // =========================================================================
    // LAYER 2: 10-SPOKE STARK ARC INDUCTION STATOR ARRAY (Iron Man Signature)
    // =========================================================================
    const statorGroup = new THREE.Group();
    masterRoot.add(statorGroup);
    const statorCount = 10;
    const statorGeos: THREE.BufferGeometry[] = [];
    const statorMats: THREE.Material[] = [];

    for (let i = 0; i < statorCount; i++) {
      const angle = (i / statorCount) * Math.PI * 2;
      const sGeo = new THREE.BoxGeometry(0.035, 0.28, 0.05);
      const sMat = new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
      });
      const sMesh = new THREE.Mesh(sGeo, sMat);
      sMesh.position.set(Math.cos(angle) * 0.48, Math.sin(angle) * 0.48, 0);
      sMesh.rotation.z = angle + Math.PI / 2;
      statorGroup.add(sMesh);
      statorGeos.push(sGeo);
      statorMats.push(sMat);
    }

    // =========================================================================
    // LAYER 3: HOLOGRAPHIC ORBITING "METEORY + JARVIS" HUD TEXT RIBBONS
    // =========================================================================
    const ribbonText =
      'METEORY ASISTEN  ◈  METEORY TACTICAL CORE  ◈  NEURAL MATRIX ONLINE  ◈  METEORY ASISTEN  ◈  METEORY TACTICAL CORE';
    const holoTexture = createHoloTextTexture(ribbonText);

    // Primary Equatorial Hologram Ribbon
    const ribbonGeo = new THREE.CylinderGeometry(1.68, 1.68, 0.28, 64, 1, true);
    const ribbonMat = new THREE.MeshBasicMaterial({
      map: holoTexture,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ribbonMesh = new THREE.Mesh(ribbonGeo, ribbonMat);
    masterRoot.add(ribbonMesh);

    // =========================================================================
    // LAYER 4: REAL-TIME 48-BAND HOLOGRAPHIC AUDIO EQUALIZER CROWN
    // =========================================================================
    const eqBarCount = 48;
    const eqGeo = new THREE.BufferGeometry();
    const eqPositions = new Float32Array(eqBarCount * 6);
    eqGeo.setAttribute('position', new THREE.BufferAttribute(eqPositions, 3));
    const eqMat = new THREE.LineSegments(
      eqGeo,
      new THREE.LineBasicMaterial({
        color: 0x00e5ff,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    masterRoot.add(eqMat);

    // =========================================================================
    // LAYER 5: HOLOGRAPHIC GEODESIC NEURAL LATTICE & JUNCTION NODES
    // =========================================================================
    const latticeGeo = new THREE.IcosahedronGeometry(1.22, 2);
    const latticeMat = new THREE.MeshBasicMaterial({
      color: 0x0099ff,
      wireframe: true,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const latticeMesh = new THREE.Mesh(latticeGeo, latticeMat);
    masterRoot.add(latticeMesh);

    // Vertex Junction Points
    const junctionGeo = new THREE.BufferGeometry();
    junctionGeo.setAttribute('position', latticeGeo.attributes.position.clone());
    const junctionMat = new THREE.PointsMaterial({
      color: 0x67e8f9,
      size: 0.055,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const junctionPoints = new THREE.Points(junctionGeo, junctionMat);
    masterRoot.add(junctionPoints);

    // Secondary inner cage
    const innerCageGeo = new THREE.OctahedronGeometry(0.92, 2);
    const innerCageMat = new THREE.MeshBasicMaterial({
      color: 0x0284c7,
      wireframe: true,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const innerCageMesh = new THREE.Mesh(innerCageGeo, innerCageMat);
    masterRoot.add(innerCageMesh);

    // =========================================================================
    // LAYER 6: HOLOGRAPHIC GYROSCOPIC GIMBAL RINGS & RETICLES
    // =========================================================================
    const gimbalsGroup = new THREE.Group();
    masterRoot.add(gimbalsGroup);

    const createTacticalRing = (
      radius: number,
      segments: number,
      color: number,
      opacity: number,
      dashRatio: number = 0.5
    ) => {
      const positions: number[] = [];
      const totalSteps = segments * 2;
      for (let i = 0; i < totalSteps; i += 2) {
        const theta1 = (i / totalSteps) * Math.PI * 2;
        const theta2 = ((i + dashRatio) / totalSteps) * Math.PI * 2;
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

    // Primary Equatorial Ring
    const primaryRing = createTacticalRing(1.52, 64, 0x00f0ff, 0.65, 0.85);
    gimbalsGroup.add(primaryRing);

    // Secondary Azimuth Gauge Ring (inner)
    const secondaryRing = createTacticalRing(1.4, 48, 0x0284c7, 0.45, 0.5);
    secondaryRing.rotation.x = Math.PI * 0.35;
    gimbalsGroup.add(secondaryRing);

    // Tertiary Inclination Orbit Ring
    const tertiaryRing = createTacticalRing(1.64, 32, 0x38bdf8, 0.5, 0.7);
    tertiaryRing.rotation.y = Math.PI * 0.4;
    tertiaryRing.rotation.z = Math.PI * 0.15;
    gimbalsGroup.add(tertiaryRing);

    // Axis Crosshair Reticle Ring
    const reticleGeo = new THREE.BufferGeometry();
    const reticlePoints: number[] = [];
    const rSize = 1.82;
    for (let a = 0; a < 4; a++) {
      const rad = (a * Math.PI) / 2;
      const x1 = Math.cos(rad) * (rSize - 0.08);
      const y1 = Math.sin(rad) * (rSize - 0.08);
      const x2 = Math.cos(rad) * (rSize + 0.08);
      const y2 = Math.sin(rad) * (rSize + 0.08);
      reticlePoints.push(x1, y1, 0, x2, y2, 0);
    }
    reticleGeo.setAttribute('position', new THREE.Float32BufferAttribute(reticlePoints, 3));
    const reticleMat = new THREE.LineBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });
    const reticleMesh = new THREE.LineSegments(reticleGeo, reticleMat);
    gimbalsGroup.add(reticleMesh);

    // Holographic Radar Sweep Beam
    const scanGeo = new THREE.PlaneGeometry(3.3, 0.015);
    const scanMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const scanMesh = new THREE.Mesh(scanGeo, scanMat);
    masterRoot.add(scanMesh);

    // =========================================================================
    // LAYER 7: ORGANIC PLASMA FILAMENTS (Smooth Bezier Electrical Flux)
    // =========================================================================
    const arcCount = 36;
    const arcPointsCount = 20;
    const arcGeometries: THREE.BufferGeometry[] = [];
    const arcLines: THREE.Line[] = [];
    const arcAnchors: { start: THREE.Vector3; mid: THREE.Vector3; end: THREE.Vector3 }[] = [];

    const arcMat = new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    for (let i = 0; i < arcCount; i++) {
      const geo = new THREE.BufferGeometry();
      const posArray = new Float32Array(arcPointsCount * 3);
      geo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

      const phi1 = Math.acos(2 * Math.random() - 1);
      const theta1 = Math.random() * Math.PI * 2;
      const start = new THREE.Vector3(
        0.35 * Math.sin(phi1) * Math.cos(theta1),
        0.35 * Math.sin(phi1) * Math.sin(theta1),
        0.35 * Math.cos(phi1)
      );

      const phi2 = Math.acos(2 * Math.random() - 1);
      const theta2 = Math.random() * Math.PI * 2;
      const rOuter = 1.35 + Math.random() * 0.2;
      const end = new THREE.Vector3(
        rOuter * Math.sin(phi2) * Math.cos(theta2),
        rOuter * Math.sin(phi2) * Math.sin(theta2),
        rOuter * Math.cos(phi2)
      );

      const mid = new THREE.Vector3()
        .addVectors(start, end)
        .multiplyScalar(0.5)
        .add(
          new THREE.Vector3(
            (Math.random() - 0.5) * 0.4,
            (Math.random() - 0.5) * 0.4,
            (Math.random() - 0.5) * 0.4
          )
        );

      arcAnchors.push({ start, mid, end });
      const line = new THREE.Line(geo, arcMat);
      masterRoot.add(line);
      arcGeometries.push(geo);
      arcLines.push(line);
    }

    // =========================================================================
    // LAYER 8: QUANTUM DATA ORBITAL PARTICLES / CELESTIAL SWARM
    // =========================================================================
    const particleCount = 450;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const inDisk = Math.random() < 0.65;
      if (inDisk) {
        const radius = 1.3 + Math.random() * 0.6;
        const angle = Math.random() * Math.PI * 2;
        particlePos[i * 3] = Math.cos(angle) * radius;
        particlePos[i * 3 + 1] = (Math.random() - 0.5) * 0.18;
        particlePos[i * 3 + 2] = Math.sin(angle) * radius;
      } else {
        const radius = 1.1 + Math.random() * 0.8;
        const phi = Math.acos(2 * Math.random() - 1);
        const theta = Math.random() * Math.PI * 2;
        particlePos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
        particlePos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        particlePos[i * 3 + 2] = radius * Math.cos(phi);
      }
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.028,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    masterRoot.add(particleSystem);

    // =========================================================================
    // INTERACTIVE TACTILE PHYSICS (Fluid Drag & Momentum)
    // =========================================================================
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let targetRotVelX = 0;
    let targetRotVelY = 0;
    let rotVelX = 0.0015;
    let rotVelY = 0.004;

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
      targetRotVelX = 0;
      targetRotVelY = 0;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      masterRoot.rotation.y += deltaX * 0.006;
      masterRoot.rotation.x += deltaY * 0.006;

      targetRotVelY = deltaX * 0.002;
      targetRotVelX = deltaY * 0.002;
    };

    const onPointerUp = () => {
      isDragging = false;
      rotVelY = THREE.MathUtils.clamp(targetRotVelY, -0.04, 0.04);
      rotVelX = THREE.MathUtils.clamp(targetRotVelX, -0.04, 0.04);
      if (Math.abs(rotVelY) < 0.002) rotVelY = 0.004;
    };

    const domElement = renderer.domElement;
    domElement.style.touchAction = 'none';
    domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    // =========================================================================
    // RENDER LOOP & REAL-TIME AUDIO DYNAMICS
    // =========================================================================
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.1);
      const time = clock.getElapsedTime();

      const { isListening: listening, isSpeaking: speaking, audioLevel: vol } = stateRef.current;

      // Smooth Inertial Sphere Rotation
      if (!isDragging) {
        masterRoot.rotation.y += rotVelY;
        masterRoot.rotation.x += rotVelX;
        rotVelY = THREE.MathUtils.damp(rotVelY, 0.004, 0.6, delta);
        rotVelX = THREE.MathUtils.damp(rotVelX, 0.001, 0.6, delta);
        
        // Gaze tracking influence (smoothly lerp towards targetRotation)
        const { targetRotation } = stateRef.current;
        masterRoot.rotation.y = THREE.MathUtils.lerp(masterRoot.rotation.y, targetRotation.y, 0.05);
        masterRoot.rotation.x = THREE.MathUtils.lerp(masterRoot.rotation.x, targetRotation.x, 0.05);
      }

      // Rotate Gimbal Rings & Stators
      const speedMultiplier = speaking ? 2.2 : listening ? 1.6 : 1.0;
      primaryRing.rotation.z += 0.005 * speedMultiplier;
      secondaryRing.rotation.y -= 0.007 * speedMultiplier;
      tertiaryRing.rotation.x += 0.006 * speedMultiplier;
      reticleMesh.rotation.z -= 0.002 * speedMultiplier;
      statorGroup.rotation.z += 0.008 * speedMultiplier;
      scanMesh.rotation.z += 0.02 * speedMultiplier;

      // Continuous Holographic Ribbon Orbit & Texture scroll
      ribbonMesh.rotation.y += 0.003 * speedMultiplier;
      holoTexture.offset.x -= 0.0012 * speedMultiplier;

      // Rotate particle swarm and neural lattice
      particleSystem.rotation.y += 0.003 * speedMultiplier;
      latticeMesh.rotation.y -= 0.002;
      innerCageMesh.rotation.x += 0.004;
      innerCageMesh.rotation.y += 0.003;

      // Realtime Audio Equalizer Crown updates
      const posAttr = eqGeo.getAttribute('position') as THREE.BufferAttribute;
      const eqArray = posAttr.array as Float32Array;
      const innerR = 1.48;

      for (let b = 0; b < eqBarCount; b++) {
        const angle = (b / eqBarCount) * Math.PI * 2;
        const wave = Math.sin(time * 12 + b * 0.7) * 0.5 + 0.5;
        const dynamicLen =
          0.05 + (speaking ? wave * 0.28 : listening ? Math.max(vol * 0.38, wave * 0.12) : 0.035);
        const outerR = innerR + dynamicLen;

        eqArray[b * 6] = Math.cos(angle) * innerR;
        eqArray[b * 6 + 1] = Math.sin(angle) * innerR;
        eqArray[b * 6 + 2] = 0;

        eqArray[b * 6 + 3] = Math.cos(angle) * outerR;
        eqArray[b * 6 + 4] = Math.sin(angle) * outerR;
        eqArray[b * 6 + 5] = 0;
      }
      posAttr.needsUpdate = true;

      // Color Palette & Emission States
      let targetColor = new THREE.Color(0x00e5ff); // Radiant neon cyan (idle default)
      let targetCore = new THREE.Color(0xffffff);
      let targetHalo = new THREE.Color(0x0055ff);
      let targetOpacity = 0.7;
      let pulseScale = 1.0;
      let electricIntensity = 0.035;

      if (listening) {
        const boost = Math.max(vol * 2.5, 0.25);
        targetColor = new THREE.Color(0x38bdf8);
        targetCore = new THREE.Color(0xffffff);
        targetHalo = new THREE.Color(0x0284c7);
        targetOpacity = 0.95;
        pulseScale = 1.05 + boost * 0.35;
        electricIntensity = 0.08 + boost * 0.18;
      } else if (speaking) {
        const wave = Math.sin(time * 9) * 0.15 + 0.85;
        targetColor = new THREE.Color(0x38bdf8);
        targetCore = new THREE.Color(0x93c5fd);
        targetHalo = new THREE.Color(0x1d4ed8);
        targetOpacity = 0.85 * wave;
        pulseScale = 1.0 + Math.sin(time * 6) * 0.12;
        electricIntensity = 0.06 * wave;
      } else {
        pulseScale = 1.0 + Math.sin(time * 2.2) * 0.04;
      }

      // Smooth color transitions
      arcMat.color.lerp(targetColor, 0.12);
      midCoreMat.color.lerp(targetColor, 0.12);
      outerHaloMat.color.lerp(targetHalo, 0.12);
      innerCoreMat.color.lerp(targetCore, 0.15);
      latticeMat.color.lerp(targetHalo, 0.12);
      junctionMat.color.lerp(targetColor, 0.12);
      ribbonMat.opacity = THREE.MathUtils.damp(ribbonMat.opacity, targetOpacity, 4, delta);

      // Core breath scaling
      innerCoreMesh.scale.setScalar(pulseScale);
      midCoreMesh.scale.setScalar(pulseScale * 1.05);
      outerHaloMesh.scale.setScalar(pulseScale * 1.08);

      // Procedural Electrical Flux Arc Generation (Smooth Quadratic Bezier curves)
      for (let i = 0; i < arcCount; i++) {
        const g = arcGeometries[i];
        const { start, mid, end } = arcAnchors[i];
        const pAttr = g.getAttribute('position') as THREE.BufferAttribute;
        const positions = pAttr.array as Float32Array;

        const jitter = (Math.random() - 0.5) * electricIntensity;
        const arcPhase = time * 8 + i;

        for (let s = 0; s < arcPointsCount; s++) {
          const t = s / (arcPointsCount - 1);
          const omt = 1 - t;
          const curveX = omt * omt * start.x + 2 * omt * t * (mid.x + jitter) + t * t * end.x;
          const curveY = omt * omt * start.y + 2 * omt * t * (mid.y + jitter) + t * t * end.y;
          const curveZ = omt * omt * start.z + 2 * omt * t * (mid.z + jitter) + t * t * end.z;

          const waveOffset = Math.sin(arcPhase + t * Math.PI * 3) * electricIntensity * 0.6;
          positions[s * 3] = curveX + waveOffset;
          positions[s * 3 + 1] = curveY + waveOffset;
          positions[s * 3 + 2] = curveZ + waveOffset;
        }
        pAttr.needsUpdate = true;
      }

      renderer.render(scene, camera);
    };

    animate();

    // Responsive Canvas Resize
    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth || 500;
      const newH = container.clientHeight || 500;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };

    window.addEventListener('resize', handleResize);

    // Full Resource & Memory Disposal
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);

      innerCoreGeo.dispose();
      innerCoreMat.dispose();
      midCoreGeo.dispose();
      midCoreMat.dispose();
      outerHaloGeo.dispose();
      outerHaloMat.dispose();

      statorGeos.forEach((g) => g.dispose());
      statorMats.forEach((m) => m.dispose());

      ribbonGeo.dispose();
      ribbonMat.dispose();
      holoTexture.dispose();

      eqGeo.dispose();
      (eqMat.material as THREE.Material).dispose();

      latticeGeo.dispose();
      latticeMat.dispose();
      junctionGeo.dispose();
      junctionMat.dispose();
      innerCageGeo.dispose();
      innerCageMat.dispose();

      primaryRing.geometry.dispose();
      (primaryRing.material as THREE.Material).dispose();
      secondaryRing.geometry.dispose();
      (secondaryRing.material as THREE.Material).dispose();
      tertiaryRing.geometry.dispose();
      (tertiaryRing.material as THREE.Material).dispose();
      reticleGeo.dispose();
      reticleMat.dispose();
      scanGeo.dispose();
      scanMat.dispose();

      arcGeometries.forEach((g) => g.dispose());
      arcMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      renderer.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className={`relative w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing select-none ${className}`}
      data-testid="three-ray-sphere-canvas"
      aria-label="Esfera 3D interactiva de rayos de plasma y reactor táctico Meteory Jarvis"
    />
  );
};
