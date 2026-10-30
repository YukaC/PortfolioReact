const WILL_CHANGE_PROPS = "transform, opacity";

export function setWillChange(targets, isActive) {
  const list = Array.isArray(targets) ? targets : [targets];
  list.forEach((node) => {
    if (!node?.style) return;
    node.style.willChange = isActive ? WILL_CHANGE_PROPS : "auto";
  });
}

export function willChangeVars(extra = {}) {
  const { onStart, onComplete, onInterrupt, ...rest } = extra;

  return {
    ...rest,
    onStart(...args) {
      setWillChange(this.targets(), true);
      onStart?.apply(this, args);
    },
    onComplete(...args) {
      setWillChange(this.targets(), false);
      onComplete?.apply(this, args);
    },
    onInterrupt(...args) {
      setWillChange(this.targets(), false);
      onInterrupt?.apply(this, args);
    },
  };
}
