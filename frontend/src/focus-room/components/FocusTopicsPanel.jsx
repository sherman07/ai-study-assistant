import { Check, Plus, Trash2 } from "lucide-react";
import { useFocusRoomStore } from "../hooks/useFocusRoomStore.js";
import { activeFocusTopic } from "../focusTopics.js";

export function FocusTopicsPanel({ compact = false, className = "" }) {
  const focusTopics = useFocusRoomStore(state => state.focusTopics);
  const activeTopicId = useFocusRoomStore(state => state.activeTopicId);
  const addFocusTopic = useFocusRoomStore(state => state.addFocusTopic);
  const updateFocusTopic = useFocusRoomStore(state => state.updateFocusTopic);
  const finishFocusTopic = useFocusRoomStore(state => state.finishFocusTopic);
  const removeFocusTopic = useFocusRoomStore(state => state.removeFocusTopic);
  const activateFocusTopic = useFocusRoomStore(state => state.activateFocusTopic);
  const active = activeFocusTopic(focusTopics, activeTopicId);
  const openCount = (focusTopics || []).filter(topic => topic.status !== "done").length;
  const doneCount = (focusTopics || []).filter(topic => topic.status === "done").length;

  return (
    <section
      className={`focus-topics-panel ${compact ? "is-compact" : ""} ${className}`.trim()}
      aria-label="Focus topics"
      data-focus-topics="true"
    >
      <header className="focus-topics-head">
        <div>
          <span className="focus-topics-eyebrow">Topics queue</span>
          <h3>What will you protect?</h3>
        </div>
        <button
          type="button"
          className="focus-topics-add"
          onClick={() => addFocusTopic()}
          aria-label="Add focus topic"
          data-focus-topic-add="true"
        >
          <Plus size={14} aria-hidden="true" />
          Add
        </button>
      </header>

      <p className="focus-topics-hint">
        Finish or remove the active topic to switch into the next one automatically.
        {doneCount ? ` ${doneCount} done · ${openCount} open.` : null}
      </p>

      <div className="focus-topics-list">
        {(focusTopics || []).map((topic, index) => {
          const isActive = topic.id === active?.id;
          const isDone = topic.status === "done";
          return (
            <article
              key={topic.id}
              className={`focus-topic-card ${isActive ? "is-active" : ""} ${isDone ? "is-done" : ""}`.trim()}
              data-focus-topic-id={topic.id}
              data-focus-topic-status={topic.status}
            >
              <div className="focus-topic-card-top">
                <span className="focus-topic-index">{String(index + 1).padStart(2, "0")}</span>
                <span className="focus-topic-status">{isDone ? "Done" : isActive ? "Active" : "Next"}</span>
                <div className="focus-topic-actions">
                  {!isDone && !isActive ? (
                    <button
                      type="button"
                      className="focus-topic-action"
                      onClick={() => activateFocusTopic(topic.id)}
                      aria-label={`Activate topic ${topic.title}`}
                    >
                      Use
                    </button>
                  ) : null}
                  {!isDone ? (
                    <button
                      type="button"
                      className="focus-topic-action is-success"
                      onClick={() => finishFocusTopic(topic.id)}
                      aria-label={`Mark topic ${topic.title} as done`}
                      data-focus-topic-finish={topic.id}
                    >
                      <Check size={13} aria-hidden="true" />
                      Done
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="focus-topic-action is-danger"
                    onClick={() => removeFocusTopic(topic.id)}
                    aria-label={`Delete topic ${topic.title}`}
                    data-focus-topic-remove={topic.id}
                    disabled={(focusTopics || []).length <= 1}
                  >
                    <Trash2 size={13} aria-hidden="true" />
                  </button>
                </div>
              </div>

              <label className="focus-topic-field">
                <span>Topic</span>
                <input
                  type="text"
                  value={topic.title}
                  onChange={event => updateFocusTopic(topic.id, { title: event.target.value })}
                  placeholder="Topic title"
                  disabled={isDone}
                  data-focus-topic-title={topic.id}
                />
              </label>

              <label className="focus-topic-field">
                <span>Description</span>
                <textarea
                  value={topic.description}
                  onChange={event => updateFocusTopic(topic.id, { description: event.target.value })}
                  placeholder="What will you do in this block?"
                  rows={compact ? 2 : 3}
                  disabled={isDone}
                  data-focus-topic-description={topic.id}
                />
              </label>
            </article>
          );
        })}
      </div>
    </section>
  );
}
