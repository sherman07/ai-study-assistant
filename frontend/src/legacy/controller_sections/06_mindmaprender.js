function renderMindMap(mindMap) {
  const data = getMindMapData(mindMap);
  currentMindMap = data;

  if (!mindMapCanvas) return;
  const mindMapSettings = getStudyToolSettings("mindmap");
  mindMapCanvas.dataset.mindmapLayout = mindMapSettings.layout || "tree";
  mindMapCanvas.dataset.mindmapDetail = mindMapSettings.detail || "expanded";
  if (!data.branches.length) {
    mindMapCanvas.innerHTML = `<div class="mindmap-empty">Mind map will appear after analysis.</div>`;
    return;
  }

  if (activeMindBranchIndex >= data.branches.length) activeMindBranchIndex = 0;
  const activeBranch = data.branches[activeMindBranchIndex] || data.branches[0];
  const activeBranchCollapsed = isMindBranchCollapsed(activeBranch, activeMindBranchIndex);
  const activeBranchPoints = activeBranch.points || [];
  if (activeMindPointIndex >= activeBranchPoints.length || activeBranchCollapsed) activeMindPointIndex = 0;
  if (activeMindChildIndex < -1) activeMindChildIndex = -1;
  const activePoint = activeBranchCollapsed ? null : activeBranchPoints[activeMindPointIndex] || null;
  const activeChildren = activePoint?.children || [];
  if (activeMindChildIndex >= activeChildren.length || activeBranchCollapsed) activeMindChildIndex = -1;
  const activeChild = activeMindChildIndex >= 0 ? activeChildren[activeMindChildIndex] : null;

  const colors = ["#ff7a45", "#19a65a", "#22b8cf", "#8f5fe8", "#f6c343", "#ef4444", "#0ea5e9", "#14b8a6", "#a855f7", "#f97316", "#64748b"];
  const activeColor = colors[activeMindBranchIndex % colors.length];

  const branchHTML = data.branches.map((branch, index) => {
    const color = colors[index % colors.length];
    const isActive = index === activeMindBranchIndex;
    const isCollapsed = isMindBranchCollapsed(branch, index);
    const points = branch.points || [];
    const visiblePoints = isActive && !isCollapsed ? points : [];
    const leavesHTML = visiblePoints.map((point, pointIndex) => {
      const children = point.children || [];
      const isPointActive = isActive && pointIndex === activeMindPointIndex;
      const shouldShowChildren = isPointActive && !isCollapsed && children.length;
      const childHTML = shouldShowChildren
        ? `<div class="mm-subleaf-list">
            ${children.slice(0, 6).map((child, childIndex) => `
              <button class="mm-subleaf-node ${isPointActive && childIndex === activeMindChildIndex ? "active" : ""}"
                      type="button"
                      title="${escapeAttr(fullMindText(child.detail || child.label, child.label || "Subpoint"))}"
                      onclick="selectMindChild(${index}, ${pointIndex}, ${childIndex}, event)">
                ${escapeHTML(shortMindText(child.label || child.detail, 78))}
              </button>
            `).join("")}
          </div>`
        : "";
      return `
        <div class="mm-leaf-group ${isPointActive ? "active" : ""} ${children.length ? "has-children" : ""} ${shouldShowChildren ? "expanded" : ""}">
          <button class="mm-leaf-node ${isPointActive ? "active" : ""} ${children.length ? "has-children" : ""}"
                  type="button"
                  title="${escapeAttr(fullMindText(point.detail || point.label, point.label || "Point"))}"
                  onclick="selectMindPoint(${index}, ${pointIndex}, event)">
            <span>${escapeHTML(shortMindText(point.label || point.detail, 92))}</span>
            ${children.length ? `<span class="mm-child-count">${children.length}</span>` : ""}
          </button>
          ${childHTML}
        </div>
      `;
    }).join("");
    return `
      <div class="mm-tree-branch ${isActive ? "active" : ""} ${isCollapsed ? "collapsed" : ""}" style="--branch-color:${color};">
        <button class="mm-branch-node ${isActive ? "active" : ""}"
                type="button"
                title="${escapeAttr(fullMindText(branch.summary || branch.label, branch.label || "Branch"))}"
                onclick="selectMindBranch(${index})">
          <span class="mm-node-dot"></span>
          <span class="mm-node-label">${escapeHTML(shortMindText(branch.label || branch.summary, 82))}</span>
          <span class="mm-branch-count">${points.length}</span>
        </button>
        <div class="mm-leaf-list">
          ${isActive && !isCollapsed ? leavesHTML || `<div class="mindmap-empty-small">No points yet.</div>` : ""}
        </div>
      </div>
    `;
  }).join("");

  const detailTitle = fullMindText(activeChild ? activeChild.label : activePoint ? activePoint.label : activeBranch.label, "Selected point");
  const detailBodySource = activeChild
    ? (activeChild.rawDetail || activeChild.detail || activeChild.label)
    : activePoint
      ? (activePoint.rawDetail || activePoint.detail || activePoint.label)
      : (activeBranch.rawSummary || activeBranch.summary || activeBranch.label);
  const detailBodyHTML = mindMapDetailHTML(detailBodySource, "Open this branch for more detail.");
  const detailPath = activeChild && activePoint
    ? `${fullMindText(activeBranch.label, "Main branch")} / ${fullMindText(activePoint.label, "Point")}`
    : activePoint
      ? fullMindText(activeBranch.label, "Main branch")
      : activeBranchCollapsed
        ? "Closed main branch"
        : "Main branch";
  const showDetailPopup = mindDetailPopupOpen && !activeBranchCollapsed && Boolean(activePoint || activeChild);

  mindMapCanvas.innerHTML = `
    <div class="mm-shell">
      <div class="mm-map-scroll" aria-label="Scrollable mind map">
        <div class="mm-layout mm-tree-layout">
          <div class="mm-root-zone">
            <button class="mm-root-node" type="button" onclick="showFullSummary()">
              <span class="mm-root-dot"></span>
              <span class="mm-root-label">${escapeHTML(shortMindText(data.center || "Study Notes", 112))}</span>
            </button>
          </div>

          <div class="mm-tree-zone">
            <div class="mm-zone-title">Knowledge tree</div>
            <div class="mm-tree-list">${branchHTML}</div>
          </div>
        </div>
      </div>

      ${showDetailPopup ? `
        <div class="mm-detail-popover ${escapeAttr(mindDetailPopupPlacement)}" style="--branch-color:${activeColor}; --detail-x:${Math.round(mindDetailPopupLeft)}px; --detail-y:${Math.round(mindDetailPopupTop)}px;">
          <button class="mm-detail-close" type="button" onclick="closeMindDetailPopup()" aria-label="Close detail">
            <i class="bi bi-x-lg"></i>
          </button>
          <div class="mm-detail-head">
            <span>${escapeHTML(fullMindText(detailPath, "Main branch"))}</span>
          </div>
          <div class="mm-detail-title">${escapeHTML(detailTitle)}</div>
          <div class="mm-detail-body">${detailBodyHTML}</div>
          <div class="mm-detail-actions">
            <button class="mm-action-btn" type="button" onclick="openActiveMindMapSection()">Go to notes</button>
            <button class="mm-action-btn primary" type="button" onclick="askSelectedMindPoint()">Ask tutor</button>
          </div>
        </div>
      ` : ""}
    </div>
  `;
  renderMath();
}

function selectMindBranch(index) {
  const data = getMindMapData(currentMindMap);
  const branch = data.branches[index];
  if (!branch) return;
  const key = getMindBranchKey(branch, index);
  if (index === activeMindBranchIndex) {
    if (collapsedMindBranches.has(key)) {
      collapsedMindBranches.delete(key);
    } else {
      collapsedMindBranches.add(key);
    }
  } else {
    collapsedMindBranches.delete(key);
  }
  activeMindBranchIndex = index;
  activeMindPointIndex = 0;
  activeMindChildIndex = -1;
  mindDetailPopupOpen = false;
  renderMindMap(currentMindMap);
}

function closeMindBranch(index) {
  const data = getMindMapData(currentMindMap);
  const branch = data.branches[index];
  if (!branch) return;
  collapsedMindBranches.add(getMindBranchKey(branch, index));
  activeMindBranchIndex = index;
  activeMindPointIndex = 0;
  activeMindChildIndex = -1;
  mindDetailPopupOpen = false;
  renderMindMap(currentMindMap);
}

function openMindBranch(index) {
  const data = getMindMapData(currentMindMap);
  const branch = data.branches[index];
  if (branch) collapsedMindBranches.delete(getMindBranchKey(branch, index));
  activeMindBranchIndex = index;
  activeMindPointIndex = 0;
  activeMindChildIndex = -1;
  mindDetailPopupOpen = false;
  renderMindMap(currentMindMap);
}

function updateMindDetailPopupPosition(event) {
  if (!event?.currentTarget || !mindMapCanvas) {
    mindDetailPopupLeft = 24;
    mindDetailPopupTop = 72;
    mindDetailPopupPlacement = "right";
    return;
  }

  const clicked = event.currentTarget;
  const target = clicked.classList?.contains("mm-subleaf-node")
    ? clicked
    : clicked.closest(".mm-leaf-group") || clicked;
  const canvasRect = mindMapCanvas.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const gap = 18;
  const canvasWidth = mindMapCanvas.clientWidth || canvasRect.width || 900;
  const canvasHeight = mindMapCanvas.clientHeight || canvasRect.height || 520;
  const popupWidth = Math.min(390, Math.max(300, canvasWidth - 32));
  const popupHeight = Math.min(520, Math.max(300, window.innerHeight * 0.58));
  const targetLeft = targetRect.left - canvasRect.left;
  const targetRight = targetRect.right - canvasRect.left;
  const targetTop = targetRect.top - canvasRect.top;
  const targetBottom = targetRect.bottom - canvasRect.top;
  const spaceRight = canvasWidth - targetRight - gap;
  const spaceLeft = targetLeft - gap;

  if (spaceRight >= popupWidth) {
    mindDetailPopupPlacement = "right";
    mindDetailPopupLeft = targetRight + gap;
    mindDetailPopupTop = targetTop - 6;
  } else if (spaceLeft >= popupWidth) {
    mindDetailPopupPlacement = "left";
    mindDetailPopupLeft = targetLeft - popupWidth - gap;
    mindDetailPopupTop = targetTop - 6;
  } else {
    mindDetailPopupPlacement = "below";
    mindDetailPopupLeft = Math.min(Math.max(16, targetLeft), Math.max(16, canvasWidth - popupWidth - 16));
    mindDetailPopupTop = targetBottom + 12;
  }

  const maxLeft = Math.max(16, canvasWidth - popupWidth - 16);
  const maxTop = Math.max(72, canvasHeight - popupHeight - 16);
  mindDetailPopupLeft = Math.min(Math.max(16, mindDetailPopupLeft), maxLeft);
  mindDetailPopupTop = Math.min(Math.max(24, mindDetailPopupTop), maxTop);
}

function selectMindPoint(branchIndex, pointIndex, event) {
  const data = getMindMapData(currentMindMap);
  const branch = data.branches[branchIndex];
  if (branch) collapsedMindBranches.delete(getMindBranchKey(branch, branchIndex));
  activeMindBranchIndex = branchIndex;
  activeMindPointIndex = pointIndex;
  activeMindChildIndex = -1;
  mindDetailPopupOpen = true;
  updateMindDetailPopupPosition(event);
  if (typeof recordStudyActivity === "function") recordStudyActivity("mindmap_point_opened", {
    tool: "mindmap",
    sectionTitle: branch?.section || branch?.label || "",
    label: `Opened mind map point: ${branch?.points?.[pointIndex]?.label || branch?.label || "point"}`
  });
  renderMindMap(currentMindMap);
}

function selectMindChild(branchIndex, pointIndex, childIndex, event) {
  const data = getMindMapData(currentMindMap);
  const branch = data.branches[branchIndex];
  if (branch) collapsedMindBranches.delete(getMindBranchKey(branch, branchIndex));
  activeMindBranchIndex = branchIndex;
  activeMindPointIndex = pointIndex;
  activeMindChildIndex = childIndex;
  mindDetailPopupOpen = true;
  updateMindDetailPopupPosition(event);
  if (typeof recordStudyActivity === "function") recordStudyActivity("mindmap_point_opened", {
    tool: "mindmap",
    sectionTitle: branch?.section || branch?.label || "",
    label: `Opened mind map detail: ${branch?.points?.[pointIndex]?.children?.[childIndex]?.label || "detail"}`
  });
  renderMindMap(currentMindMap);
}

function closeMindDetailPopup() {
  mindDetailPopupOpen = false;
  renderMindMap(currentMindMap);
}

function openActiveMindMapSection() {
  const data = getMindMapData(currentMindMap);
  const branch = data.branches[activeMindBranchIndex];
  if (!branch) return;
  activateSectionFromMap(branch.section || branch.label);
}

function askSelectedMindPoint() {
  const data = getMindMapData(currentMindMap);
  const branch = data.branches[activeMindBranchIndex];
  if (!branch) return;
  const point = branch.points[activeMindPointIndex];
  const child = activeMindChildIndex >= 0 ? point?.children?.[activeMindChildIndex] : null;
  const prompt = child
    ? `Explain this subpoint from "${branch.label}" > "${point.label}": ${child.rawDetail || child.detail}`
    : point
    ? `Explain this point from "${branch.label}": ${point.rawDetail || point.detail}`
    : `Explain the key ideas in "${branch.label}".`;
  switchTab("chat", document.querySelector('.asst-tab[onclick*="chat"]'));
  openAssistant();
  if (questionInput) {
    questionInput.value = prompt;
    questionInput.focus();
  }
}

function activateSectionFromMap(sectionName) {
  const exact = Object.keys(sections).find(key => key === sectionName || key.toLowerCase() === String(sectionName).toLowerCase());
  if (!exact) return;
  const buttons = [...document.querySelectorAll(".section-btn")];
  const target = buttons.find(button => (button.querySelector("span")?.textContent?.trim() || "") === exact);
  if (target) {
    target.click();
  } else {
    renderSectionNotes(exact);
  }
  document.getElementById("summaryContent")?.scrollIntoView({ behavior: "smooth", block: "start" });
}
