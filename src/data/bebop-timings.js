import { bebopShipPhaseMs } from "./bebopShip";

export const ANIMATION_PHASES = {
  IDLE: "IDLE",
  CRT_ON: "CRT_ON",
  COUNTDOWN_3: "COUNTDOWN_3",
  COUNTDOWN_2: "COUNTDOWN_2",
  COUNTDOWN_1: "COUNTDOWN_1",
  JAM: "JAM",
  FADE_TO_BLACK: "FADE_TO_BLACK",
  SHIP: "SHIP",
  ENDCARD: "ENDCARD",
  CRT_OFF: "CRT_OFF",
};

/** Durations in ms — ship timing from src/data/bebopShip.js */
export const PHASE_TIMINGS = {
  CRT_ON: 500, // crtPowerOn 0.5s
  COUNTDOWN: 500, // countdownPulse 0.5s
  JAM: 800, // typewriter 0.8s
  FADE: 400, // fadeOut 0.4s
  SHIP: bebopShipPhaseMs(),
  ENDCARD: 350, // ship fadeOut 0.35s overlaps before CRT off (V33)
  CRT_OFF: 600, // crtPowerOff 0.6s
};
