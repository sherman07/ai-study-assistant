import * as Slider from "@radix-ui/react-slider";
import { Volume2, Waves } from "lucide-react";
import {
  FOCUS_ROOM_AMBIENT_SOUNDS,
  FOCUS_ROOM_AUDIO_PRESETS,
  FOCUS_ROOM_MUSIC_TRACKS,
  focusRoomAudioPresetForConfig,
  getFocusRoomAudioProfile
} from "../data.js";
import { useFocusRoomStore } from "../hooks/useFocusRoomStore.js";
import { GlassButton } from "./GlassButton.jsx";

function VolumeSlider({ label, icon, value, onChange }) {
  return (
    <label className="sound-slider">
      <span className="sound-slider-head">
        <span className="sound-slider-label">{icon}<span>{label}</span></span>
        <strong>{value}%</strong>
      </span>
      <Slider.Root
        className="radix-slider-root"
        style={{ "--slider-progress": `${value}%` }}
        value={[value]}
        min={0}
        max={100}
        step={1}
        onValueChange={items => onChange(items[0])}
      >
        <Slider.Track className="radix-slider-track">
          <Slider.Range className="radix-slider-range" />
        </Slider.Track>
        <Slider.Thumb className="radix-slider-thumb" aria-label={label} />
      </Slider.Root>
    </label>
  );
}

export function SoundControlPanel({ audioState }) {
  const musicType = useFocusRoomStore(state => state.musicType);
  const ambientSound = useFocusRoomStore(state => state.ambientSound);
  const musicVolume = useFocusRoomStore(state => state.musicVolume);
  const ambientVolume = useFocusRoomStore(state => state.ambientVolume);
  const audioPlaying = useFocusRoomStore(state => state.audioPlaying);
  const setSound = useFocusRoomStore(state => state.setSound);
  const applyAudioPreset = useFocusRoomStore(state => state.applyAudioPreset);
  const toggleAudio = useFocusRoomStore(state => state.toggleAudio);
  const profile = getFocusRoomAudioProfile({ musicType, ambientSound, musicVolume, ambientVolume });
  const activePreset = focusRoomAudioPresetForConfig({ musicType, ambientSound });
  const ambientTitle = profile.ambientLayers.map(layer => layer.title).filter(Boolean).join(" + ");

  return (
    <div className="sound-panel">
      <div className="sound-preset-list" aria-label="Focus audio presets">
        {FOCUS_ROOM_AUDIO_PRESETS.map(preset => (
          <button
            key={preset.id}
            type="button"
            className={activePreset?.id === preset.id ? "is-active" : ""}
            aria-pressed={activePreset?.id === preset.id}
            title={preset.description}
            onClick={() => applyAudioPreset(preset.id)}
          >
            <strong>{preset.label}</strong>
            <small>{preset.description}</small>
          </button>
        ))}
      </div>
      <label className="focus-field">
        Music selector
        <select value={musicType} onChange={event => setSound("musicType", event.target.value)}>
          {FOCUS_ROOM_MUSIC_TRACKS.map(track => (
            <option key={track.label} value={track.label}>{track.label}</option>
          ))}
        </select>
      </label>
      <VolumeSlider
        label="Music volume"
        icon={<Volume2 size={16} aria-hidden="true" />}
        value={musicVolume}
        onChange={value => setSound("musicVolume", value)}
      />
      <label className="focus-field">
        Ambient sound selector
        <select value={ambientSound} onChange={event => setSound("ambientSound", event.target.value)}>
          {FOCUS_ROOM_AMBIENT_SOUNDS.map(sound => (
            <option key={sound.label} value={sound.label}>{sound.label}</option>
          ))}
        </select>
      </label>
      <VolumeSlider
        label="Ambient volume"
        icon={<Waves size={16} aria-hidden="true" />}
        value={ambientVolume}
        onChange={value => setSound("ambientVolume", value)}
      />
      <div className="audio-preview liquid-glass-lite">
        <div>
          <span className="focus-kicker">Theme audio preview</span>
          <strong>{profile.musicTrack.title}</strong>
          <p>{ambientTitle}</p>
          {audioState?.error ? <p className="audio-error">{audioState.error}</p> : null}
        </div>
        <GlassButton variant={audioPlaying ? "primary" : "ghost"} onClick={toggleAudio}>
          {audioPlaying ? "Pause audio" : "Play audio"}
        </GlassButton>
      </div>
      <div className="audio-links">
        {[profile.musicTrack, ...profile.ambientLayers].filter(item => item?.pageUrl).map(item => (
          <a key={item.pageUrl} href={item.pageUrl} target="_blank" rel="noreferrer">
            {item.title || item.label || "Audio source"}
          </a>
        ))}
      </div>
    </div>
  );
}
