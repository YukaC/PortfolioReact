import { useEffect, forwardRef } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { SHIP_SCALE, BEBOP_SHIP_COLOR } from "@/data/bebopShots";

const GLTF_URL = "/bebop/scene.gltf";

const ShipModel = forwardRef(function ShipModel(props, ref) {
  const { scene } = useGLTF(GLTF_URL);

  useEffect(() => {
    // Blanco puro sin tone-mapping — el Bloom del EffectComposer lo
    // convierte en silueta neón sobre el fondo CRT negro.
    const neonMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(BEBOP_SHIP_COLOR),
      side: THREE.DoubleSide,
      toneMapped: false,
    });

    scene.traverse((obj) => {
      if (!obj.isMesh) return;
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => {
          m.map = null;
          m.needsUpdate = true;
        });
      }
      obj.material = neonMat;
      obj.castShadow = false;
      obj.receiveShadow = false;
    });

    return () => {
      neonMat.dispose();
    };
  }, [scene]);

  // Scale calibrated pixel-a-pixel contra refPng (wingspan 32% viewport height @ f01-34)
  return <primitive ref={ref} object={scene} scale={SHIP_SCALE} {...props} />;
});

ShipModel.displayName = "ShipModel";
useGLTF.preload(GLTF_URL);
export default ShipModel;
