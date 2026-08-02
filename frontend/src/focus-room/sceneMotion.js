const layer = (kind, duration, intensity, density) => Object.freeze({ kind, duration, intensity, density });

export const SCENE_MOTION_PROFILES = Object.freeze({
  "morning-window": Object.freeze({
    id: "morning-window",
    layers: Object.freeze([layer("camera", 32, 0.34, 0.42), layer("foliage", 18, 0.24, 0.38), layer("light", 26, 0.2, 0.3)])
  }),
  "cabin-twilight": Object.freeze({
    id: "cabin-twilight",
    layers: Object.freeze([layer("camera", 38, 0.28, 0.32), layer("mist", 34, 0.2, 0.35), layer("light", 22, 0.2, 0.28)])
  }),
  "last-light-lounge": Object.freeze({
    id: "last-light-lounge",
    layers: Object.freeze([layer("camera", 36, 0.24, 0.3), layer("rain", 16, 0.28, 0.42), layer("mist", 32, 0.18, 0.28), layer("light", 24, 0.18, 0.24)])
  }),
  "garden-cafe": Object.freeze({
    id: "garden-cafe",
    layers: Object.freeze([layer("camera", 34, 0.26, 0.32), layer("rain", 14, 0.34, 0.52), layer("foliage", 20, 0.2, 0.38), layer("light", 28, 0.18, 0.26)])
  }),
  "sunset-classroom": Object.freeze({
    id: "sunset-classroom",
    layers: Object.freeze([layer("camera", 40, 0.2, 0.25), layer("light", 20, 0.3, 0.36), layer("foliage", 28, 0.14, 0.22)])
  }),
  "tokyo-night": Object.freeze({
    id: "tokyo-night",
    layers: Object.freeze([layer("camera", 42, 0.2, 0.26), layer("mist", 36, 0.16, 0.24), layer("light", 18, 0.24, 0.44)])
  }),
  "snow-window-cabin": Object.freeze({
    id: "snow-window-cabin",
    layers: Object.freeze([layer("camera", 38, 0.24, 0.28), layer("snow", 18, 0.34, 0.48), layer("light", 26, 0.2, 0.28)])
  }),
  "bamboo-cabin": Object.freeze({
    id: "bamboo-cabin",
    layers: Object.freeze([layer("camera", 36, 0.24, 0.3), layer("foliage", 16, 0.24, 0.46), layer("water", 24, 0.2, 0.36), layer("mist", 32, 0.16, 0.26)])
  })
});

export function sceneMotionProfile(id = "") {
  return SCENE_MOTION_PROFILES[String(id || "")] || SCENE_MOTION_PROFILES["morning-window"];
}
