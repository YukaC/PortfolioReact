import { useEffect, useMemo, forwardRef } from "react";
import { useGLTF } from "@react-three/drei";
import { MeshBasicMaterial, Color, DoubleSide } from "three";
import { SHIP_SCALE, BEBOP_SHIP_COLOR } from "@/data/bebopShots";
import { BEBOP_SHIP } from "@/data/bebopShip";

const ShipModel = forwardRef(function ShipModel({ onReady, ...props }, ref) {
  const { scene } = useGLTF(BEBOP_SHIP.gltfUrl);

  // Clone so we never irreversibly mutate the drei/GLTF cache.
  const localScene = useMemo(() => scene.clone(true), [scene]);

  useEffect(() => {
    // Blanco puro sin tone-mapping — el Bloom del EffectComposer lo
    // convierte en silueta neón sobre el fondo CRT negro.
    const neonMat = new MeshBasicMaterial({
      color: new Color(BEBOP_SHIP_COLOR),
      side: DoubleSide,
      toneMapped: false,
    });

    localScene.traverse((obj) => {
      if (!obj.isMesh) return;
      obj.material = neonMat;
      obj.castShadow = false;
      obj.receiveShadow = false;
    });

    onReady?.();

    return () => {
      neonMat.dispose();
    };
  }, [localScene, onReady]);

  // Scale calibrated pixel-a-pixel contra refPng (wingspan 32% viewport height @ f01-34)
  return (
    <primitive ref={ref} object={localScene} scale={SHIP_SCALE} {...props} />
  );
});

ShipModel.displayName = "ShipModel";
useGLTF.preload(BEBOP_SHIP.gltfUrl);
export default ShipModel;
