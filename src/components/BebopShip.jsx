import { Component, memo, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  isBebopGLTFCached,
  isBebopGLTFFailed,
  prefetchBebopGLTF,
  prefetchBebopSceneChunk,
} from "@/data/bebopShip";
import styles from "@/components/bebop/bebop.module.css";

const BebopShipScene = dynamic(
  () => import("@/components/bebop/BebopShipScene"),
  { ssr: false },
);

/** Catches WebGL / R3F mount failures so the easter egg never hangs. */
class BebopWebGLErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    this.props.onError?.();
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

const BebopShip = memo(({ active, playing = true, onReady, onFailed }) => {
  const [sceneReady, setSceneReady] = useState(() => isBebopGLTFCached());

  useEffect(() => {
    if (!active) return undefined;
    // Kick webpack chunk IMMEDIATELY — don't serialize behind GLTF (V34).
    void prefetchBebopSceneChunk();
    if (isBebopGLTFFailed()) {
      onFailed?.();
      return undefined;
    }
    if (sceneReady) return undefined;
    let cancelled = false;
    prefetchBebopGLTF()
      .then(() => {
        if (!cancelled) setSceneReady(true);
      })
      .catch(() => {
        if (!cancelled) onFailed?.();
      });
    return () => {
      cancelled = true;
    };
  }, [active, sceneReady, onFailed]);

  // Suspense / chunk hang ceiling — never leave a black placeholder forever.
  useEffect(() => {
    if (!active || sceneReady) return undefined;
    const id = setTimeout(() => {
      if (!isBebopGLTFCached()) onFailed?.();
    }, 15000);
    return () => clearTimeout(id);
  }, [active, sceneReady, onFailed]);

  if (!active) return null;

  // Placeholder negro CRT mientras GLTF calienta — chunk ya descarga en paralelo.
  if (!sceneReady) {
    return <div className={styles.bebopShipSystem} aria-hidden="true" />;
  }

  return (
    <div className={styles.bebopShipSystem} aria-label="Swordfish II fly-by">
      <BebopWebGLErrorBoundary onError={onFailed}>
        <BebopShipScene onReady={onReady} onFailed={onFailed} playing={playing} />
      </BebopWebGLErrorBoundary>
    </div>
  );
});

BebopShip.displayName = "BebopShip";
export default BebopShip;
