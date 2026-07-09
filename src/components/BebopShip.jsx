import { memo, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  isBebopGltfCached,
  prefetchBebopGLTF,
  prefetchBebopSceneChunk,
} from "@/data/bebopShip";

const BebopShipScene = dynamic(
  () => import("@/components/bebop/BebopShipScene"),
  { ssr: false },
);

const BebopShip = memo(({ active, onReady }) => {
  const [sceneReady, setSceneReady] = useState(() => isBebopGltfCached());

  useEffect(() => {
    if (!active) return undefined;
    // Kick webpack chunk IMMEDIATELY — don't serialize behind GLTF (V34).
    // Cold start used to wait gltfPrefetch → then start dynamic() → double lag.
    void prefetchBebopSceneChunk();
    if (sceneReady) return undefined;
    let cancelled = false;
    const markReady = () => {
      if (!cancelled) setSceneReady(true);
    };
    prefetchBebopGLTF().then(markReady).catch(markReady);
    return () => {
      cancelled = true;
    };
  }, [active, sceneReady]);

  if (!active) return null;

  // Placeholder negro CRT mientras GLTF calienta — chunk ya descarga en paralelo.
  if (!sceneReady) {
    return <div className="bebopShipSystem" aria-hidden="true" />;
  }

  return (
    <div className="bebopShipSystem" aria-label="Swordfish II fly-by">
      <BebopShipScene onReady={onReady} />
    </div>
  );
});

BebopShip.displayName = "BebopShip";
export default BebopShip;
