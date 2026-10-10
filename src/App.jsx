import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
} from "react";

import { Canvas, useFrame } from "@react-three/fiber";

import {
  Environment,
  Html,
  Sparkles,
  Stars,
  useGLTF,
  useAnimations,
} from "@react-three/drei";

import * as THREE from "three";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";

import "./App.css";

/* LOADER */

function Loader() {
  return (
    <Html center>
      <div className="model-loader">
        <div className="loader-ring" />
        <p>AWAKENING THE PHOENIX</p>
      </div>
    </Html>
  );
}

/* PHOENIX MODEL WITH ENHANCED LIGHT & 360 FLIGHT PHYSICS */

function PhoenixModel({ cursorRef, clickRef }) {
  const birdRef = useRef();

  const { scene, animations } = useGLTF(
    "/models/phoenix.glb"
  );

  const model = useMemo(() => {
    if (!scene) return null;
    const clonedModel = SkeletonUtils.clone(scene);

    clonedModel.updateMatrixWorld(true);

    const bounds = new THREE.Box3().setFromObject(
      clonedModel
    );

    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());

    const maxDimension = Math.max(
      size.x,
      size.y,
      size.z
    );

    if (
      !Number.isFinite(maxDimension) ||
      maxDimension <= 0
    ) {
      return clonedModel;
    }

    const scale = 3.6 / maxDimension;

    clonedModel.scale.setScalar(scale);

    clonedModel.position.set(
      -center.x * scale,
      -center.y * scale,
      -center.z * scale
    );

    clonedModel.traverse((child) => {
      if (!child.isMesh) return;

      child.castShadow = true;
      child.receiveShadow = true;
      child.frustumCulled = false;

      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material];

      materials.forEach((material) => {
        if (!material) return;

        material.side = THREE.DoubleSide;
        material.needsUpdate = true;
      });
    });

    return clonedModel;
  }, [scene]);

  const { actions, names } = useAnimations(
    animations,
    birdRef
  );

  useEffect(() => {
    if (names.length === 0) return;

    names.forEach((name) => {
      const action = actions[name];
      if (!action) return;

      action.reset();
      action.enabled = true;
      action.setLoop(THREE.LoopRepeat, Infinity);
      action.play();
    });
  }, [actions, names]);

  /* 360-DEGREE FULL DIRECTIONAL FLIGHT & LIGHT GLOW */

  useFrame((state, delta) => {
    if (!birdRef.current) return;

    const time = state.clock.elapsedTime;
    const mouseX = cursorRef.current.x;
    const mouseY = cursorRef.current.y;
    const isClicked = clickRef.current;

    const targetX = mouseX * 4.0;
    const targetY = mouseY * 2.5 + Math.sin(time * 2) * 0.2;
    const targetZ = isClicked ? 1.5 : (mouseX * 1.5);

    const currentPos = birdRef.current.position;

    currentPos.x = THREE.MathUtils.damp(currentPos.x, targetX, 5, delta);
    currentPos.y = THREE.MathUtils.damp(currentPos.y, targetY, 5, delta);
    currentPos.z = THREE.MathUtils.damp(currentPos.z, targetZ, 5, delta);

    const dx = targetX - currentPos.x;
    const dz = targetZ - currentPos.z;
    const dy = targetY - currentPos.y;

    const targetRotationY = Math.atan2(dx, dz !== 0 ? dz : 1.0);
    const targetRotationX = -dy * 0.4 + Math.sin(time * 4) * 0.05;
    const targetRotationZ = -dx * 0.4;

    birdRef.current.rotation.y = THREE.MathUtils.damp(
      birdRef.current.rotation.y,
      targetRotationY,
      6,
      delta
    );

    birdRef.current.rotation.x = THREE.MathUtils.damp(
      birdRef.current.rotation.x,
      targetRotationX,
      6,
      delta
    );

    birdRef.current.rotation.z = THREE.MathUtils.damp(
      birdRef.current.rotation.z,
      targetRotationZ,
      6,
      delta
    );
  });

  return (
    <group ref={birdRef} position={[0, 0, 0]}>
      {model && <primitive object={model} />}

      {/* Enhanced Fire Light attached to Phoenix */}
      <pointLight
        position={[0, 0.2, 0]}
        color="#ff5500"
        intensity={7.5}
        distance={14}
        decay={2}
      />
    </group>
  );
}

/* FOREST TREE */

function Tree({ position, scale }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 1, 0]}>
        <cylinderGeometry args={[0.08, 0.15, 2, 7]} />
        <meshStandardMaterial color="#25180f" />
      </mesh>

      {[0, 1, 2].map((level) => (
        <mesh
          key={level}
          position={[0, 1.4 + level * 0.5, 0]}
          scale={1 - level * 0.2}
        >
          <coneGeometry args={[0.8, 1.5, 7]} />

          <meshStandardMaterial
            color={
              level === 1 ? "#17472b" : "#0a2919"
            }
            roughness={1}
          />
        </mesh>
      ))}
    </group>
  );
}

/* FOREST BACKGROUND */

function Forest() {
  const trees = useMemo(
    () =>
      Array.from({ length: 55 }, (_, index) => {
        const side = index % 2 === 0 ? -1 : 1;

        return {
          position: [
            side * (5 + Math.random() * 10),
            -3,
            -4 - Math.random() * 25,
          ],
          scale: 0.8 + Math.random() * 1.2,
        };
      }),
    []
  );

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -3.1, -10]}
      >
        <planeGeometry args={[100, 100]} />

        <meshStandardMaterial color="#07120b" />
      </mesh>

      {trees.map((tree, index) => (
        <Tree
          key={index}
          position={tree.position}
          scale={tree.scale}
        />
      ))}

      <Sparkles
        count={100}
        scale={[25, 12, 30]}
        size={2}
        speed={0.25}
        color="#28a96d"
      />
    </group>
  );
}

/* FIRE PARTICLES */

function FireParticles() {
  const pointsRef = useRef();

  const count = 650;

  const positions = useMemo(() => {
    const values = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      values[i * 3] =
        (Math.random() - 0.5) * 10;

      values[i * 3 + 1] =
        (Math.random() - 0.5) * 8;

      values[i * 3 + 2] =
        Math.random() * 8 - 4;
    }

    return values;
  }, []);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;

    const attribute =
      pointsRef.current.geometry.attributes.position;

    const array = attribute.array;
    const time = clock.elapsedTime;

    for (let i = 0; i < count; i++) {
      const yIndex = i * 3 + 1;

      array[yIndex] += 0.008;

      array[i * 3] +=
        Math.sin(time + i) * 0.001;

      if (array[yIndex] > 4) {
        array[yIndex] = -4;
      }
    }

    attribute.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>

      <pointsMaterial
        color="#ff9b36"
        size={0.045}
        transparent
        opacity={0.9}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

/* 3D SCENE */

function Scene({ cursorRef, clickRef }) {
  return (
    <>
      <color
        attach="background"
        args={["#030805"]}
      />

      <fog
        attach="fog"
        args={["#06100b", 15, 45]}
      />

      <ambientLight intensity={1.5} />

      <directionalLight
        position={[5, 8, 5]}
        intensity={2.5}
        color="#ffe1b2"
      />

      <pointLight
        position={[0, 2, 3]}
        intensity={5}
        color="#ff4a12"
        distance={15}
      />

      <pointLight
        position={[-5, 3, -5]}
        intensity={3}
        color="#21b879"
        distance={18}
      />

      <Forest />

      <Suspense fallback={<Loader />}>
        <PhoenixModel cursorRef={cursorRef} clickRef={clickRef} />
        <Environment preset="night" />
      </Suspense>

      <FireParticles />

      <Sparkles
        count={180}
        scale={[14, 10, 12]}
        size={2.5}
        speed={0.5}
        color="#ffc05a"
      />

      <Stars
        radius={80}
        depth={50}
        count={500}
        factor={3}
        fade
        speed={0.4}
      />
    </>
  );
}

/* MAIN APP */

export default function App() {
  const cursorRef = useRef({ x: 0, y: 0 });
  const clickRef = useRef(false);

  useEffect(() => {
    document.title = "Phoenix Reborn | 3D Experience";

    const handleMouseMove = (event) => {
      cursorRef.current.x =
        (event.clientX / window.innerWidth) * 2 - 1;

      cursorRef.current.y =
        1 - (event.clientY / window.innerHeight) * 2;
    };

    const handleMouseDown = () => {
      clickRef.current = true;
    };

    const handleMouseUp = () => {
      clickRef.current = false;
    };

    const handleTouchStart = () => {
      clickRef.current = true;
    };

    const handleTouchEnd = () => {
      clickRef.current = false;
    };

    const handleTouchMove = (event) => {
      const touch = event.touches[0];

      if (!touch) return;

      cursorRef.current.x =
        (touch.clientX / window.innerWidth) * 2 - 1;

      cursorRef.current.y =
        1 - (touch.clientY / window.innerHeight) * 2;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchend", handleTouchEnd);
    window.addEventListener("touchmove", handleTouchMove, {
      passive: true,
    });

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, []);

  return (
    <main className="phoenix-page">
      <Canvas
        camera={{
          position: [0, 0, 9],
          fov: 45,
          near: 0.1,
          far: 100,
        }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          powerPreference: "high-performance",
        }}
      >
        <Scene cursorRef={cursorRef} clickRef={clickRef} />
      </Canvas>

      <header className="top-label">
        <span className="status-dot" />
        IMMORTAL FIRE
      </header>

      <section className="hero-content">
        <p className="eyebrow">
          RISE FROM THE ASHES
        </p>

        <h1>
          PHOENIX
          <span>REBORN</span>
        </h1>

        <div className="gold-line" />

        <p className="description">
          Beyond darkness, a legend awakens.
          <br />
          Experience the eternal flame.
        </p>

        <div className="bottom-info">
          <span>AN ETERNAL LEGEND</span>
          <span>001 — FIRE</span>
        </div>
      </section>

      <div className="side-text">
        ETERNAL FLAME · 3D EXPERIENCE
      </div>

      <div className="bottom-glow" />
    </main>
  );
}

useGLTF.preload("/models/phoenix.glb");