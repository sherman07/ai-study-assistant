/** Focus Room music, ambient layers, scenes, and audio profile helpers. */
import { finiteNumber } from "./valueHelpers.js";
const commonsAudio = fileName => `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURI(fileName)}`;

const FOCUS_ROOM_MUSIC_TRACKS = [
  {
    label: "Deep Focus",
    title: "Chasing Daylight",
    artist: "Scott Buckley",
    streamUrl: "https://www.scottbuckley.com.au/library/wp-content/uploads/2021/03/sb_chasingdaylight.mp3",
    pageUrl: "https://www.scottbuckley.com.au/library/chasing-daylight/",
    license: "CC BY 4.0",
    attribution: "'Chasing Daylight' by Scott Buckley - released under CC-BY 4.0. www.scottbuckley.com.au"
  },
  {
    label: "Lo-fi",
    title: "Lofi Hip Hop Upbeat",
    artist: "raspberrymusic",
    streamUrl: commonsAudio("Raspberrymusic_-_Lofi_Hip_Hop_Upbeat.ogg"),
    pageUrl: "https://commons.wikimedia.org/wiki/File:Raspberrymusic_-_Lofi_Hip_Hop_Upbeat.ogg",
    license: "CC BY 4.0",
    attribution: "Raspberrymusic - Lofi Hip Hop Upbeat by raspberrymusic"
  },
  {
    label: "Piano",
    title: "The Long Dark",
    artist: "Scott Buckley",
    streamUrl: "https://www.scottbuckley.com.au/library/wp-content/uploads/2023/01/TheLongDark.mp3",
    pageUrl: "https://www.scottbuckley.com.au/library/the-long-dark/",
    license: "CC BY 4.0",
    attribution: "'The Long Dark' by Scott Buckley - released under CC-BY 4.0. www.scottbuckley.com.au"
  },
  {
    label: "Minimal",
    title: "Computations in a Snowstorm",
    artist: "Scott Buckley",
    streamUrl: "https://www.scottbuckley.com.au/library/wp-content/uploads/2019/01/sb_computations_altmix.mp3",
    pageUrl: "https://www.scottbuckley.com.au/library/computations/",
    license: "CC BY 4.0",
    attribution: "'Computations in a Snowstorm' by Scott Buckley - released under CC-BY 4.0. www.scottbuckley.com.au"
  }
];

const FOCUS_ROOM_AUDIO_PRESETS = Object.freeze([
  {
    id: "soft-piano",
    label: "Soft Piano",
    musicType: "Piano",
    ambientSound: "Nature",
    description: "Gentle keys and light outdoor calm for reading."
  },
  {
    id: "lofi-cafe",
    label: "Lo-fi Café",
    musicType: "Lo-fi",
    ambientSound: "Cafe Rain",
    description: "A steady beat and café rain for writing and exercises."
  },
  {
    id: "nature-flow",
    label: "Nature Flow",
    musicType: "Deep Focus",
    ambientSound: "Nature",
    description: "Restrained music with forest ambience for calm concentration."
  },
  {
    id: "warm-ambience",
    label: "Warm Ambience",
    musicType: "Minimal",
    ambientSound: "Rain",
    description: "Minimal texture and soft rain for evening study."
  },
  {
    id: "deep-focus",
    label: "Deep Focus",
    musicType: "Deep Focus",
    ambientSound: "White Noise",
    description: "A stable focus bed for difficult problem solving."
  }
]);

function focusRoomAudioPreset(id = "") {
  const value = String(id || "");
  return FOCUS_ROOM_AUDIO_PRESETS.find(preset => preset.id === value)
    || FOCUS_ROOM_AUDIO_PRESETS[FOCUS_ROOM_AUDIO_PRESETS.length - 1];
}

function focusRoomAudioPresetForConfig(source = {}) {
  return FOCUS_ROOM_AUDIO_PRESETS.find(preset => (
    preset.musicType === String(source?.musicType || "")
    && preset.ambientSound === String(source?.ambientSound || "")
  )) || null;
}

const AMBIENT_LAYERS = {
  nature: {
    id: "nature-forest",
    title: "Forest ambience",
    artist: "nille",
    streamUrl: commonsAudio("20090610_0_ambience.ogg"),
    pageUrl: "https://commons.wikimedia.org/wiki/File:20090610_0_ambience.ogg",
    license: "Public domain",
    attribution: "Forest ambience by nille",
    volumeBias: 1
  },
  cafe: {
    id: "cafe-ambiance",
    title: "Cafe ambiance",
    artist: "Marble Toast",
    streamUrl: commonsAudio("Cafe_ambiance.ogg"),
    pageUrl: "https://commons.wikimedia.org/wiki/File:Cafe_ambiance.ogg",
    license: "CC0",
    attribution: "Cafe ambiance by Marble Toast",
    volumeBias: 0.72
  },
  rain: {
    id: "rain",
    title: "Rain",
    artist: "ezwa",
    streamUrl: commonsAudio("Rain_(1).ogg"),
    pageUrl: "https://commons.wikimedia.org/wiki/File:Rain_(1).ogg",
    license: "Public domain",
    attribution: "Rain by ezwa",
    volumeBias: 0.48
  },
  whiteNoise: {
    id: "white-noise",
    title: "White noise",
    artist: "Bautsch",
    streamUrl: commonsAudio("White.Noise.ogg"),
    pageUrl: "https://commons.wikimedia.org/wiki/File:White.Noise.ogg",
    license: "Public domain",
    attribution: "White noise by Bautsch",
    volumeBias: 1
  },
  ocean: {
    id: "ocean-waves",
    title: "Waves",
    artist: "Dsw4",
    streamUrl: commonsAudio("Waves.ogg"),
    pageUrl: "https://commons.wikimedia.org/wiki/File:Waves.ogg",
    license: "CC BY 3.0",
    attribution: "Waves by Dsw4",
    volumeBias: 1
  },
  wind: {
    id: "howling-wind",
    title: "Howling wind",
    artist: "Tvabutzku1234",
    streamUrl: commonsAudio("Howling_wind.ogg"),
    pageUrl: "https://commons.wikimedia.org/wiki/File:Howling_wind.ogg",
    license: "CC0",
    attribution: "Howling wind by Tvabutzku1234",
    volumeBias: 0.78
  }
};

const FOCUS_ROOM_AMBIENT_SOUNDS = [
  {
    label: "Nature",
    layers: [AMBIENT_LAYERS.nature],
    pageUrl: AMBIENT_LAYERS.nature.pageUrl,
    license: AMBIENT_LAYERS.nature.license
  },
  {
    label: "Cafe Rain",
    layers: [AMBIENT_LAYERS.cafe, AMBIENT_LAYERS.rain],
    pageUrl: AMBIENT_LAYERS.cafe.pageUrl,
    license: "CC0 / Public domain"
  },
  {
    label: "Rain",
    layers: [AMBIENT_LAYERS.rain],
    pageUrl: AMBIENT_LAYERS.rain.pageUrl,
    license: AMBIENT_LAYERS.rain.license
  },
  {
    label: "White Noise",
    layers: [AMBIENT_LAYERS.whiteNoise],
    pageUrl: AMBIENT_LAYERS.whiteNoise.pageUrl,
    license: AMBIENT_LAYERS.whiteNoise.license
  },
  {
    label: "Ocean",
    layers: [AMBIENT_LAYERS.ocean],
    pageUrl: AMBIENT_LAYERS.ocean.pageUrl,
    license: AMBIENT_LAYERS.ocean.license
  },
  {
    label: "Wind",
    layers: [AMBIENT_LAYERS.wind],
    pageUrl: AMBIENT_LAYERS.wind.pageUrl,
    license: AMBIENT_LAYERS.wind.license
  }
];

const FOCUS_ROOM_SCENES = [
  {
    id: "morning-window",
    name: "Morning Window",
    kicker: "Morning · Nature",
    description: "Soft daylight, quiet desk, gentle outdoor calm.",
    image: "./assets/focus-room/original/morning-window.jpg",
    motionProfile: "morning-window",
    ambientSound: "Nature",
    musicType: "Piano"
  },
  {
    id: "cabin-twilight",
    name: "Cabin Twilight",
    kicker: "Twilight · Warmth",
    description: "Blue-hour hills and gentle lamp light for a calm study block.",
    image: "./assets/focus-room/original/cabin-twilight.jpg",
    motionProfile: "cabin-twilight",
    ambientSound: "Wind",
    musicType: "Piano"
  },
  {
    id: "last-light-lounge",
    name: "Last Light Lounge",
    kicker: "Rain · Last light",
    description: "A quiet lounge with rain and the final light of day.",
    image: "./assets/focus-room/original/last-light-lounge.jpg",
    motionProfile: "last-light-lounge",
    ambientSound: "Rain",
    musicType: "Minimal",
  },
  {
    id: "garden-cafe",
    name: "Garden Café",
    kicker: "Greenery · Café",
    description: "Soft café ambience among abundant greenery.",
    image: "./assets/focus-room/original/garden-cafe.jpg",
    motionProfile: "garden-cafe",
    ambientSound: "Cafe Rain",
    musicType: "Lo-fi",
  },
  {
    id: "sunset-classroom",
    name: "Sunset Classroom",
    kicker: "Classroom · Sunset",
    description: "An empty classroom in the fading evening light.",
    image: "./assets/focus-room/original/sunset-classroom.jpg",
    motionProfile: "sunset-classroom",
    ambientSound: "Nature",
    musicType: "Piano",
  },
  {
    id: "tokyo-night",
    name: "Tokyo Night",
    kicker: "City · Night",
    description: "A city-night view for steady late study.",
    image: "./assets/focus-room/original/tokyo-night.jpg",
    motionProfile: "tokyo-night",
    ambientSound: "White Noise",
    musicType: "Deep Focus",
  },
  {
    id: "snow-window-cabin",
    name: "Snow Window Cabin",
    kicker: "Snow · Cabin",
    description: "Snow beyond the window, warmth at the desk.",
    image: "./assets/focus-room/original/snow-window-cabin.jpg",
    motionProfile: "snow-window-cabin",
    ambientSound: "Wind",
    musicType: "Minimal",
  },
  {
    id: "bamboo-cabin",
    name: "Bamboo Cabin",
    kicker: "Bamboo · Quiet",
    description: "A bamboo retreat made for quiet concentration.",
    image: "./assets/focus-room/original/bamboo-cabin.jpg",
    motionProfile: "bamboo-cabin",
    ambientSound: "Nature",
    musicType: "Deep Focus",
  }
];

const FOCUS_ROOM_GALLERY_SCENES = FOCUS_ROOM_SCENES;

const FOCUS_ROOM_DURATIONS = [25, 45, 50, 90];

function focusRoomMusicTrack(label = "") {
  const value = String(label || "");
  return FOCUS_ROOM_MUSIC_TRACKS.find(track => track.label === value) || FOCUS_ROOM_MUSIC_TRACKS[0];
}

function focusRoomAmbientSound(label = "") {
  const value = String(label || "");
  return FOCUS_ROOM_AMBIENT_SOUNDS.find(sound => sound.label === value) || FOCUS_ROOM_AMBIENT_SOUNDS[0];
}

function getFocusRoomAudioProfile(source = {}) {
  const musicTrack = focusRoomMusicTrack(source?.musicType);
  const ambientSound = focusRoomAmbientSound(source?.ambientSound);
  return {
    musicTrack,
    ambientSound,
    ambientLayers: ambientSound.layers.map(layer => ({
      ...layer,
      volumeBias: finiteNumber(layer.volumeBias, 1)
    }))
  };
}

export {
  FOCUS_ROOM_MUSIC_TRACKS,
  FOCUS_ROOM_AUDIO_PRESETS,
  FOCUS_ROOM_AMBIENT_SOUNDS,
  FOCUS_ROOM_SCENES,
  FOCUS_ROOM_GALLERY_SCENES,
  FOCUS_ROOM_DURATIONS,
  focusRoomAudioPreset,
  focusRoomAudioPresetForConfig,
  focusRoomMusicTrack,
  focusRoomAmbientSound,
  getFocusRoomAudioProfile
};
