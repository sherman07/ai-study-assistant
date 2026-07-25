const TOPIC_STATUSES = new Set(["pending", "active", "done"]);

export function createFocusTopicId() {
  return `topic-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeFocusTopic(source = {}, fallbackStatus = "pending") {
  const title = String(source.title || source.name || "").trim();
  const description = String(source.description || source.detail || source.notes || "").trim();
  const status = TOPIC_STATUSES.has(source.status) ? source.status : fallbackStatus;
  const id = String(source.id || "").trim() || createFocusTopicId();
  return {
    id,
    title: title || "Untitled topic",
    description,
    status
  };
}

export function normalizeFocusTopics(source, fallbackGoal = "Deep work block") {
  const list = Array.isArray(source) ? source.map(item => normalizeFocusTopic(item)).filter(Boolean) : [];
  if (!list.length) {
    const seed = normalizeFocusTopic({
      title: String(fallbackGoal || "Deep work block").trim() || "Deep work block",
      description: "",
      status: "active"
    }, "active");
    return { focusTopics: [seed], activeTopicId: seed.id, studyGoal: seed.title };
  }

  let activeTopicId = "";
  const focusTopics = list.map((topic, index) => {
    if (topic.status === "active" && !activeTopicId) {
      activeTopicId = topic.id;
      return topic;
    }
    if (topic.status === "active" && activeTopicId) {
      return { ...topic, status: "pending" };
    }
    return topic;
  });

  if (!activeTopicId) {
    const firstOpen = focusTopics.find(topic => topic.status !== "done") || focusTopics[0];
    activeTopicId = firstOpen.id;
    return {
      focusTopics: focusTopics.map(topic => (
        topic.id === activeTopicId
          ? { ...topic, status: "active" }
          : topic.status === "active"
            ? { ...topic, status: "pending" }
            : topic
      )),
      activeTopicId,
      studyGoal: firstOpen.title
    };
  }

  const active = focusTopics.find(topic => topic.id === activeTopicId) || focusTopics[0];
  return {
    focusTopics,
    activeTopicId,
    studyGoal: active?.title || String(fallbackGoal || "Deep work block")
  };
}

export function activeFocusTopic(topics = [], activeTopicId = "") {
  const list = Array.isArray(topics) ? topics : [];
  return list.find(topic => topic.id === activeTopicId)
    || list.find(topic => topic.status === "active")
    || list.find(topic => topic.status !== "done")
    || list[0]
    || null;
}

export function promoteNextFocusTopic(topics = [], preferredId = "") {
  const list = Array.isArray(topics) ? topics.map(topic => ({ ...topic })) : [];
  if (!list.length) {
    const seeded = normalizeFocusTopics([], "Deep work block");
    return seeded;
  }

  const next = preferredId
    ? list.find(topic => topic.id === preferredId && topic.status !== "done")
    : list.find(topic => topic.status === "pending") || list.find(topic => topic.status !== "done");

  if (!next) {
    return {
      focusTopics: list,
      activeTopicId: "",
      studyGoal: list[list.length - 1]?.title || "Deep work block"
    };
  }

  const focusTopics = list.map(topic => {
    if (topic.id === next.id) return { ...topic, status: "active" };
    if (topic.status === "active") return { ...topic, status: "pending" };
    return topic;
  });

  return {
    focusTopics,
    activeTopicId: next.id,
    studyGoal: next.title
  };
}

export function topicsSnapshotFields(source = {}) {
  const normalized = normalizeFocusTopics(source.focusTopics, source.studyGoal);
  return {
    focusTopics: normalized.focusTopics,
    activeTopicId: normalized.activeTopicId,
    studyGoal: normalized.studyGoal
  };
}
