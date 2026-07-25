import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import * as Slider from "@radix-ui/react-slider";
import { Check, Dices, Footprints, Save, Settings2, Shuffle, Users, Volume2, Waves, X } from "lucide-react";
import { FOCUS_ROOM_AMBIENT_SOUNDS, FOCUS_ROOM_MUSIC_TRACKS, FOCUS_ROOM_SCENES } from "../data.js";
import { useFocusRoomStore } from "../hooks/useFocusRoomStore.js";
import { spring } from "../utils.js";
import { GlassButton } from "./GlassButton.jsx";
import { SceneSelector } from "./SceneSelector.jsx";
import { SoundControlPanel } from "./SoundControlPanel.jsx";
import { FocusTopicsPanel } from "./FocusTopicsPanel.jsx";

const MIX_CHANNELS = [
  ["white-noise", "White noise"], ["pink-noise", "Pink noise"], ["brown-noise", "Brown noise"],
  ["light-rain", "Light rain"], ["heavy-rain", "Heavy rain"], ["ocean-waves", "Ocean waves"],
  ["wind", "Wind"], ["fireplace", "Fireplace"], ["train", "Train"], ["cafe", "Café"],
  ["street", "Street"], ["forest", "Forest"], ["summer-night", "Summer night"], ["waterfall", "Waterfall"],
  ["typing", "Typing"], ["page-turning", "Page turning"], ["writing", "Writing sounds"]
];

const FOCUS_NOISE_CHANNELS = [
  ["white-noise", "White noise"], ["pink-noise", "Pink noise"], ["brown-noise", "Brown noise"]
];

const AMBIENT_CHANNELS = [
  ["light-rain", "Light rain"], ["heavy-rain", "Heavy rain"], ["ocean-waves", "Ocean waves"],
  ["wind", "Wind"], ["fireplace", "Fireplace"], ["train", "Train"],
  ["cafe", "Café"], ["street", "Street"], ["forest", "Forest"],
  ["summer-night", "Summer night"], ["waterfall", "Waterfall"],
  ["typing", "Typing"], ["page-turning", "Page turning"], ["writing", "Writing sounds"]
];

function RoomChannelSlider({ id, label, value, icon = null, onChange, card = false }) {
  const safeValue = Number.isFinite(Number(value)) ? Number(value) : 0;
  const isActive = safeValue > 0;
  return (
    <label className={[
      "room-channel",
      icon ? "room-channel-master" : "",
      card ? "room-channel-card" : "",
      isActive ? "is-active" : ""
    ].filter(Boolean).join(" ")}>
      <span className="room-channel-head">
        <span className="room-channel-label">
          {icon || <i className={`mixer-channel-dot mixer-${id}`} aria-hidden="true" />}
          <span>{label}</span>
        </span>
        <strong>{safeValue}%</strong>
      </span>
      <Slider.Root
        className="radix-slider-root"
        value={[safeValue]}
        min={0}
        max={100}
        step={1}
        onValueChange={items => onChange(id, items[0])}
      >
        <Slider.Track className="radix-slider-track"><Slider.Range className="radix-slider-range" /></Slider.Track>
        <Slider.Thumb className="radix-slider-thumb" aria-label={`${label} volume`} />
      </Slider.Root>
    </label>
  );
}

function RoomControlPanel({ audioState, scene, onClose }) {
  const channels = useFocusRoomStore(state => state.audioChannels);
  const setSound = useFocusRoomStore(state => state.setSound);
  const returnToSetup = useFocusRoomStore(state => state.returnToSetup);
  const musicType = useFocusRoomStore(state => state.musicType);
  const ambientSound = useFocusRoomStore(state => state.ambientSound);
  const musicVolume = useFocusRoomStore(state => state.musicVolume);
  const ambientVolume = useFocusRoomStore(state => state.ambientVolume);
  const [saved, setSaved] = useState(false);

  const setChannel = (id, value) => { setSaved(false); setSound(`audioChannel:${id}`, value); };
  const setMusicVolume = (_, value) => setSound("musicVolume", value);
  const setAmbientVolume = (_, value) => setSound("ambientVolume", value);
  const randomize = () => {
    const music = FOCUS_ROOM_MUSIC_TRACKS[Math.floor(Math.random() * FOCUS_ROOM_MUSIC_TRACKS.length)];
    const ambient = FOCUS_ROOM_AMBIENT_SOUNDS[Math.floor(Math.random() * FOCUS_ROOM_AMBIENT_SOUNDS.length)];
    setSound("musicType", music.label);
    setSound("ambientSound", ambient.label);
    setSaved(false);
  };
  const applySceneMix = () => {
    setSound("musicType", scene?.musicType || "Deep Focus");
    setSound("ambientSound", scene?.ambientSound || "Nature");
    setSaved(true);
  };

  return (
    <motion.aside
      className="focus-utility-panel room-control-panel liquid-glass"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 14 }}
      transition={spring}
      role="dialog"
      aria-label="Room settings"
    >
      <header className="room-control-head">
        <div>
          <span className="control-eyebrow">Control</span>
          <h2>Room settings</h2>
        </div>
        <GlassButton className="room-control-close" aria-label="Close room settings" onClick={onClose}><X size={16} aria-hidden="true" /></GlassButton>
      </header>
      <div className="room-control-divider" aria-hidden="true" />
      <div className="room-control-setup-actions">
        <GlassButton
          className="room-control-setup-btn"
          onClick={() => {
            onClose?.();
            returnToSetup();
          }}
          data-focus-return-setup="true"
        >
          Change scene &amp; setup
        </GlassButton>
      </div>
      <section className="room-control-topics" aria-label="Focus topics">
        <FocusTopicsPanel />
      </section>
      <div className="room-control-grid">
        <section className="room-control-col room-control-scenes" aria-label="Scenes">
          <h3 className="room-control-section-title">Scenes</h3>
          <SceneSelector />
        </section>
        <section className="room-control-col room-control-audio">
          <div className="room-control-masters">
            <div className="room-control-block">
              <div className="room-control-block-head">
                <h3 className="room-control-section-title">Music</h3>
                <GlassButton className="room-control-icon-btn" aria-label="Shuffle to a random track" onClick={randomize}><Shuffle size={15} aria-hidden="true" /></GlassButton>
              </div>
              <label className="room-select-field">
                <span className="sr-only">Music track</span>
                <select value={musicType} onChange={event => { setSaved(false); setSound("musicType", event.target.value); }}>
                  {FOCUS_ROOM_MUSIC_TRACKS.map(track => <option key={track.label} value={track.label}>{track.label}</option>)}
                </select>
              </label>
              <RoomChannelSlider id="music-volume" label="Music volume" icon={<Volume2 size={15} aria-hidden="true" />} value={musicVolume} onChange={setMusicVolume} />
            </div>

            <div className="room-control-block">
              <div className="room-control-block-head">
                <h3 className="room-control-section-title">Scene sound</h3>
                <GlassButton className="room-control-icon-btn" aria-label={saved ? "Mix saved" : "Save current mix"} onClick={() => setSaved(true)}>{saved ? <Check size={15} aria-hidden="true" /> : <Save size={15} aria-hidden="true" />}</GlassButton>
              </div>
              <p className="room-scene-recommend">Recommended for <strong>{scene?.name}</strong><span>{scene?.musicType} · {scene?.ambientSound}</span></p>
              <button type="button" className="room-scene-apply" onClick={applySceneMix}>Apply scene mix <span aria-hidden="true">↗</span></button>
              <label className="room-select-field">
                <span className="sr-only">Ambient sound</span>
                <select value={ambientSound} onChange={event => { setSaved(false); setSound("ambientSound", event.target.value); }}>
                  {FOCUS_ROOM_AMBIENT_SOUNDS.map(sound => <option key={sound.label} value={sound.label}>{sound.label}</option>)}
                </select>
              </label>
              <RoomChannelSlider id="ambient-volume" label="Ambient volume" icon={<Waves size={15} aria-hidden="true" />} value={ambientVolume} onChange={setAmbientVolume} />
            </div>
          </div>

          <div className="room-control-block">
            <h3 className="room-control-section-title">Focus noise</h3>
            <div className="room-noise-row">
              {FOCUS_NOISE_CHANNELS.map(([id, label]) => (
                <RoomChannelSlider key={id} id={id} label={label} value={channels?.[id]} onChange={setChannel} card />
              ))}
            </div>
          </div>

          <div className="room-control-block">
            <h3 className="room-control-section-title">Ambient atmosphere</h3>
            <div className="room-ambient-grid">
              {AMBIENT_CHANNELS.map(([id, label]) => (
                <RoomChannelSlider key={id} id={id} label={label} value={channels?.[id]} onChange={setChannel} card />
              ))}
            </div>
          </div>
          {audioState?.error ? <p className="audio-error">{audioState.error}</p> : null}
        </section>
      </div>
    </motion.aside>
  );
}

function UtilityShell({ title, kicker, icon, children, onClose, className = "" }) {
  return (
    <motion.aside className={`focus-utility-panel liquid-glass ${className}`.trim()} initial={{ opacity: 0, y: 12, x: -18 }} animate={{ opacity: 1, y: 0, x: 0 }} exit={{ opacity: 0, y: 10, x: -18 }} transition={spring} role="dialog" aria-label={title}>
      <div className="drawer-head">
        <div className="utility-title"><span className="utility-title-icon">{icon}</span><div><span className="focus-kicker">{kicker}</span><h2>{title}</h2></div></div>
        <GlassButton aria-label={`Close ${title}`} onClick={onClose}><X size={16} aria-hidden="true" /></GlassButton>
      </div>
      <div className="utility-panel-body">{children}</div>
    </motion.aside>
  );
}

function SoundMixer({ audioState, scene }) {
  const channels = useFocusRoomStore(state => state.audioChannels);
  const setSound = useFocusRoomStore(state => state.setSound);
  const [saved, setSaved] = useState(false);
  const update = (id, value) => { setSaved(false); setSound(`audioChannel:${id}`, value); };
  const randomize = () => {
    const music = FOCUS_ROOM_MUSIC_TRACKS[Math.floor(Math.random() * FOCUS_ROOM_MUSIC_TRACKS.length)];
    const ambient = FOCUS_ROOM_AMBIENT_SOUNDS[Math.floor(Math.random() * FOCUS_ROOM_AMBIENT_SOUNDS.length)];
    setSound("musicType", music.label);
    setSound("ambientSound", ambient.label);
    setSaved(true);
  };
  const applySceneMix = () => {
    setSound("musicType", scene?.musicType || "Deep Focus");
    setSound("ambientSound", scene?.ambientSound || "Nature");
    setSaved(true);
  };
  return (
    <div className="sound-mixer">
      <div className="mixer-featured-row"><span className="focus-kicker">Music library</span><GlassButton onClick={randomize}><Dices size={14} aria-hidden="true" /> Random track</GlassButton></div>
      <SoundControlPanel audioState={audioState} compact />
      <div className="mixer-preset-row"><button type="button" className="mixer-preset-button" onClick={applySceneMix}>Apply scene mix <span>↗</span></button><GlassButton onClick={() => setSaved(true)}>{saved ? <Check size={14} aria-hidden="true" /> : <Save size={14} aria-hidden="true" />} {saved ? "Saved" : "Save current mix"}</GlassButton></div>
      <div className="mixer-channel-grid">
        {MIX_CHANNELS.map(([id, label]) => (
          <label key={id} className="mixer-channel"><span><i className={`mixer-channel-dot mixer-${id}`} />{label}</span><strong>{channels[id]}%</strong><input type="range" min="0" max="100" value={channels[id]} aria-label={`${label} volume`} onChange={event => update(id, event.target.value)} /></label>
        ))}
      </div>
      {audioState?.error ? <p className="audio-error">{audioState.error}</p> : null}
    </div>
  );
}

function useSynapseSession() {
  const read = () => globalThis.window?.SynapseAuth?.getStoredSession?.() || null;
  const [session, setSession] = useState(read);
  useEffect(() => {
    let mounted = true;
    const refresh = event => {
      if (!mounted) return;
      setSession(event?.detail?.session || read());
    };
    globalThis.window?.addEventListener("synapse-auth-changed", refresh);
    const sync = globalThis.window?.SynapseAuth?.syncSessionFromProvider?.();
    Promise.resolve(sync).finally(() => refresh());
    return () => {
      mounted = false;
      globalThis.window?.removeEventListener("synapse-auth-changed", refresh);
    };
  }, []);
  return session;
}

function FocusTrailPanel({ onWorkspace, session }) {
  const authenticated = Boolean(session);
  return authenticated ? (
    <div className="utility-empty-state"><Footprints size={28} aria-hidden="true" /><h3>Your Focus Trail</h3><p>Recent sessions and progress remain available through Synapse history.</p><GlassButton variant="primary" onClick={() => onWorkspace?.("", "history")}>Open session history</GlassButton></div>
  ) : (
    <div className="utility-login-state"><Footprints size={28} aria-hidden="true" /><span className="focus-kicker">Your rhythm, remembered</span><h3>Sign in to view your Focus Trail</h3><p>Track deep-work time, completed goals, and your study streak across devices.</p><GlassButton variant="primary" onClick={() => onWorkspace?.()}>Sign in with Synapse</GlassButton><small>Your current session continues without an account.</small></div>
  );
}

function CompanionPanel({ onWorkspace, session }) {
  const authenticated = Boolean(session);
  return authenticated ? (
    <div className="utility-empty-state"><Users size={28} aria-hidden="true" /><h3>Companion Room</h3><p>Invite a study partner from your Synapse workspace to share this quiet room.</p><GlassButton variant="primary" onClick={() => onWorkspace?.("", "companion")}>Open Companion Room</GlassButton></div>
  ) : (
    <div className="utility-login-state"><Users size={28} aria-hidden="true" /><span className="focus-kicker">Study alongside someone</span><h3>Sign in to use Companion Room</h3><p>Keep your own goal private while sharing the feeling of showing up together.</p><GlassButton variant="primary" onClick={() => onWorkspace?.()}>Go to sign in</GlassButton><small>No companion data is created in Focus Room.</small></div>
  );
}

export function FocusRoomDrawers({ audioState, utilityPanel, onClose, onWorkspace }) {
  const activeDrawer = useFocusRoomStore(state => state.activeDrawer);
  const closeDrawer = useFocusRoomStore(state => state.closeDrawer);
  const selectedScene = useFocusRoomStore(state => state.selectedScene);
  const session = useSynapseSession();
  const scene = useMemo(() => FOCUS_ROOM_SCENES.find(item => item.id === selectedScene) || FOCUS_ROOM_SCENES[0], [selectedScene]);

  return (
    <AnimatePresence>
      {utilityPanel === "trail" ? <UtilityShell title="Focus Trail" kicker="Your progress" icon={<Footprints size={16} />} onClose={onClose}><FocusTrailPanel onWorkspace={onWorkspace} session={session} /></UtilityShell> : null}
      {utilityPanel === "companion" ? <UtilityShell title="Companion Room" kicker="Shared focus" icon={<Users size={16} />} onClose={onClose}><CompanionPanel onWorkspace={onWorkspace} session={session} /></UtilityShell> : null}
      {utilityPanel === "settings" ? <RoomControlPanel audioState={audioState} scene={scene} onClose={onClose} /> : null}
      {!utilityPanel && activeDrawer === "scene" ? <UtilityShell title="Choose scene" kicker="Scene" icon={<Settings2 size={16} />} onClose={closeDrawer}><SceneSelector /></UtilityShell> : null}
      {!utilityPanel && activeDrawer === "music" ? <UtilityShell title="Sound atmosphere" kicker="Room audio" icon={<Volume2 size={16} />} onClose={closeDrawer}><SoundMixer audioState={audioState} scene={scene} /></UtilityShell> : null}
    </AnimatePresence>
  );
}
