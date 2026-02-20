// ── flows.js — drag-and-drop automation flow builder ──────────────────────────

const TRIGGERS = [
  { value: 'order_created',   label: 'Order Created',   icon: '🛍️',  color: '#10b981' },
  { value: 'order_fulfilled', label: 'Order Fulfilled', icon: '📦',  color: '#8b5cf6' },
  { value: 'order_cancelled', label: 'Order Cancelled', icon: '❌',  color: '#ef4444' },
  { value: 'cart_abandoned',  label: 'Abandoned Cart',  icon: '🛒',  color: '#f59e0b' },
];

const CHANNELS = [
  { value: 'send_sms',       label: 'SMS',       icon: '📱' },
  { value: 'send_whatsapp',  label: 'WhatsApp',  icon: '💬' },
];

// ── State ──────────────────────────────────────────────────────────────────────
let _flows     = [];
let _templates = [];
let _editing   = null;   // null = create mode, string = flow id being edited
let _steps     = [];     // current builder steps
let _dragIdx   = null;

// ── Entry point ───────────────────────────────────────────────────────────────
async function loadFlows() {
  const storeId = localStorage.getItem('storeId');
  if (!storeId) return;

  document.getElementById('pageContent').innerHTML =
    `<div class="loading">Loading flows…</div>`;

  try {
    [_flows, _templates] = await Promise.all([
      api.get(`/flows?storeId=${storeId}`),
      api.get(`/templates?storeId=${storeId}`).catch(() => []),
    ]);
    renderFlowList();
  } catch (err) {
    document.getElementById('pageContent').innerHTML =
      `<div style="color:var(--danger);padding:20px">Failed to load flows: ${err.message}</div>`;
  }
}

// ── Flow list view ─────────────────────────────────────────────────────────────
function renderFlowList() {
  const storeId = localStorage.getItem('storeId');

  const flowCards = _flows.length
    ? _flows.map(f => flowCard(f)).join('')
    : `<div class="card" style="text-align:center;padding:48px 24px;color:var(--text-muted)">
         <div style="font-size:2.5rem;margin-bottom:12px">⚡</div>
         <div style="font-weight:600;color:var(--text);margin-bottom:6px">No flows yet</div>
         <div style="font-size:0.85rem">Create your first automation flow below.</div>
       </div>`;

  document.getElementById('pageContent').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:16px">
      <div style="display:flex;justify-content:flex-end">
        <button class="btn btn-primary" onclick="openBuilder(null)">+ New Flow</button>
      </div>
      ${flowCards}
    </div>
    ${builderOverlayHTML()}
  `;

  // attach list events
  _flows.forEach(f => {
    document.getElementById(`toggle-${f.id}`)
      ?.addEventListener('change', e => handleToggle(f.id, e.target.checked, e.target));
    document.getElementById(`edit-${f.id}`)
      ?.addEventListener('click', () => openBuilder(f));
    document.getElementById(`delete-${f.id}`)
      ?.addEventListener('click', () => handleDelete(f.id, f.name));
  });

  // builder events (overlay already in DOM)
  document.getElementById('builderOverlay')
    ?.addEventListener('click', e => { if (e.target.id === 'builderOverlay') closeBuilder(); });
  document.getElementById('builderCancel')?.addEventListener('click', closeBuilder);
  document.getElementById('builderSave')?.addEventListener('click', saveFlow);
  document.getElementById('addStepBtn')?.addEventListener('click', addStep);
}

function flowCard(f) {
  const t = TRIGGERS.find(x => x.value === f.trigger) || { label: f.trigger, icon: '⚙️', color: '#6b7280' };
  const steps = f.automationSteps?.length ?? 0;
  const last  = f.lastTriggeredAt ? new Date(f.lastTriggeredAt).toLocaleString() : 'Never';

  return `
  <div class="card" style="display:flex;align-items:center;gap:20px;padding:18px 24px">
    <div style="width:10px;height:10px;border-radius:50%;flex-shrink:0;
                background:${f.isActive ? 'var(--success)' : 'var(--text-muted)'};
                box-shadow:${f.isActive ? '0 0 8px rgba(16,185,129,.5)' : 'none'}"></div>

    <div style="flex:1;min-width:0">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;flex-wrap:wrap">
        <span style="font-weight:600">${esc(f.name)}</span>
        <span style="font-size:0.72rem;font-weight:600;padding:2px 10px;border-radius:999px;
                     background:${t.color}22;color:${t.color}">
          ${t.icon} ${t.label}
        </span>
      </div>
      <div style="font-size:0.8rem;color:var(--text-muted);display:flex;gap:20px;flex-wrap:wrap">
        <span>Steps: <b style="color:var(--text)">${steps}</b></span>
        <span>Triggered: <b style="color:var(--text)">${f.triggerCount ?? 0}×</b></span>
        <span>Last run: <b style="color:var(--text)">${last}</b></span>
      </div>
    </div>

    <div style="display:flex;align-items:center;gap:12px;flex-shrink:0">
      <button class="btn btn-ghost btn-sm" id="edit-${f.id}">✏️ Edit</button>
      <button class="btn btn-ghost btn-sm" id="delete-${f.id}"
              style="color:var(--danger)">🗑️</button>
      <label class="flow-toggle" title="${f.isActive ? 'Disable' : 'Enable'}">
        <input type="checkbox" id="toggle-${f.id}" ${f.isActive ? 'checked' : ''}>
        <span class="flow-toggle-slider"></span>
      </label>
    </div>
  </div>`;
}

// ── Builder overlay HTML (rendered once into DOM) ──────────────────────────────
function builderOverlayHTML() {
  return `
  <div id="builderOverlay" class="builder-overlay" style="display:none">
    <div class="builder-panel">

      <div class="builder-header">
        <span id="builderTitle" style="font-size:1.1rem;font-weight:700">New Flow</span>
        <button class="btn btn-ghost btn-sm" id="builderCancel">✕ Cancel</button>
      </div>

      <div class="builder-body">

        <!-- Flow name -->
        <div class="field-group">
          <label class="field-label">Flow Name</label>
          <input id="flowName" class="field-input" type="text"
                 placeholder="e.g. Order Confirmation SMS" maxlength="80">
        </div>

        <!-- Trigger selector -->
        <div class="field-group">
          <label class="field-label">Trigger Event</label>
          <div id="triggerGrid" class="trigger-grid">
            ${TRIGGERS.map(t => `
              <div class="trigger-card" data-value="${t.value}" onclick="selectTrigger('${t.value}')">
                <div class="trigger-icon">${t.icon}</div>
                <div class="trigger-label">${t.label}</div>
              </div>`).join('')}
          </div>
        </div>

        <!-- Steps -->
        <div class="field-group">
          <label class="field-label">Steps
            <span style="font-weight:400;color:var(--text-muted);font-size:0.75rem;margin-left:6px">
              drag to reorder
            </span>
          </label>
          <div id="stepList" class="step-list"></div>
          <button id="addStepBtn" class="btn btn-ghost btn-sm"
                  style="margin-top:10px;width:100%;border:1px dashed var(--border)">
            + Add Step
          </button>
        </div>

      </div>

      <div class="builder-footer">
        <button class="btn btn-ghost btn-sm" id="builderCancel2"
                onclick="closeBuilder()">Cancel</button>
        <button class="btn btn-primary" id="builderSave">Save Flow</button>
      </div>

    </div>
  </div>`;
}

// ── Builder open / close ───────────────────────────────────────────────────────
function openBuilder(flow) {
  _editing = flow ? flow.id : null;
  _steps   = flow
    ? (flow.automationSteps || []).map(s => ({
        id:         Date.now() + Math.random(),
        actionType: s.actionType,
        delay:      s.config?.delay ?? 0,
        delayUnit:  (s.config?.delay ?? 0) >= 60 ? 'hours' : 'minutes',
        message:    s.config?.message || '',
        templateId: s.config?.templateId || '',
      }))
    : [];

  const overlay = document.getElementById('builderOverlay');
  overlay.style.display = 'flex';

  document.getElementById('builderTitle').textContent =
    flow ? `Edit: ${flow.name}` : 'New Flow';

  document.getElementById('flowName').value = flow?.name || '';

  // Set trigger
  document.querySelectorAll('.trigger-card').forEach(el => el.classList.remove('selected'));
  if (flow?.trigger) {
    document.querySelector(`.trigger-card[data-value="${flow.trigger}"]`)
      ?.classList.add('selected');
  }

  renderSteps();
}

function closeBuilder() {
  document.getElementById('builderOverlay').style.display = 'none';
  _steps   = [];
  _editing = null;
}

// ── Trigger selection ──────────────────────────────────────────────────────────
function selectTrigger(value) {
  document.querySelectorAll('.trigger-card').forEach(el => el.classList.remove('selected'));
  document.querySelector(`.trigger-card[data-value="${value}"]`)?.classList.add('selected');
}

function getSelectedTrigger() {
  return document.querySelector('.trigger-card.selected')?.dataset.value || null;
}

// ── Step management ────────────────────────────────────────────────────────────
function addStep() {
  _steps.push({
    id:         Date.now() + Math.random(),
    actionType: 'send_sms',
    delay:      0,
    delayUnit:  'minutes',
    message:    '',
    templateId: '',
  });
  renderSteps();
}

function removeStep(idx) {
  _steps.splice(idx, 1);
  renderSteps();
}

function updateStep(idx, field, value) {
  _steps[idx][field] = value;
}

function renderSteps() {
  const list = document.getElementById('stepList');
  if (!list) return;

  if (_steps.length === 0) {
    list.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-muted);
                               font-size:0.85rem">No steps yet. Click "+ Add Step" to begin.</div>`;
    return;
  }

  list.innerHTML = _steps.map((s, i) => stepHTML(s, i)).join('');

  // Attach step-level events
  _steps.forEach((s, i) => {
    // Channel buttons
    list.querySelectorAll(`[data-step="${i}"][data-channel]`).forEach(btn => {
      btn.addEventListener('click', () => {
        updateStep(i, 'actionType', btn.dataset.channel);
        renderSteps();
      });
    });

    // Delay value
    list.querySelector(`#stepDelay-${i}`)?.addEventListener('input', e => {
      updateStep(i, 'delay', parseInt(e.target.value) || 0);
    });

    // Delay unit
    list.querySelector(`#stepDelayUnit-${i}`)?.addEventListener('change', e => {
      updateStep(i, 'delayUnit', e.target.value);
    });

    // Template select
    list.querySelector(`#stepTemplate-${i}`)?.addEventListener('change', e => {
      updateStep(i, 'templateId', e.target.value);
      if (e.target.value) updateStep(i, 'message', '');
      renderSteps();
    });

    // Message textarea
    list.querySelector(`#stepMsg-${i}`)?.addEventListener('input', e => {
      updateStep(i, 'message', e.target.value);
      if (e.target.value) updateStep(i, 'templateId', '');
    });

    // Delete
    list.querySelector(`#stepDel-${i}`)?.addEventListener('click', () => removeStep(i));

    // Drag handles
    const card = list.querySelector(`[data-stepcard="${i}"]`);
    if (card) attachDrag(card, i);
  });
}

function stepHTML(s, i) {
  const channelColor = s.actionType === 'send_sms' ? 'var(--accent)' : '#25D366';

  // Filter templates by current channel
  const channelKey = s.actionType === 'send_sms' ? 'sms' : 'whatsapp';
  const tplOptions = _templates.filter(t => t.channel === channelKey);
  const tplSelect  = `
    <option value="">— write custom message —</option>
    ${tplOptions.map(t =>
      `<option value="${t.id}" ${s.templateId === t.id ? 'selected' : ''}>${esc(t.name)}</option>`
    ).join('')}`;

  const showTextarea = !s.templateId;
  const displayDelay = s.delayUnit === 'hours' ? Math.round(s.delay / 60) || 0 : s.delay;

  return `
  <div class="step-card" data-stepcard="${i}" draggable="true">
    <div class="step-drag-handle" title="Drag to reorder">⠿</div>

    <div style="flex:1;display:flex;flex-direction:column;gap:12px">

      <!-- Row 1: channel + delete -->
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:0.75rem;color:var(--text-muted);font-weight:600;
                     text-transform:uppercase;letter-spacing:.05em">Step ${i + 1}</span>
        <div style="flex:1;display:flex;gap:6px">
          ${CHANNELS.map(c => `
            <button class="channel-btn ${s.actionType === c.value ? 'active' : ''}"
                    data-step="${i}" data-channel="${c.value}"
                    style="${s.actionType === c.value ? `background:${channelColor}22;color:${channelColor};border-color:${channelColor}44` : ''}">
              ${c.icon} ${c.label}
            </button>`).join('')}
        </div>
        <button id="stepDel-${i}" class="btn btn-ghost btn-sm"
                style="color:var(--danger);padding:4px 8px">🗑️</button>
      </div>

      <!-- Row 2: delay -->
      <div style="display:flex;align-items:center;gap:10px">
        <span style="font-size:0.8rem;color:var(--text-muted);white-space:nowrap">Send after</span>
        <input id="stepDelay-${i}" type="number" min="0" max="9999"
               class="field-input" style="width:80px;padding:6px 10px"
               value="${displayDelay}"
               placeholder="0">
        <select id="stepDelayUnit-${i}" class="field-input" style="width:110px;padding:6px 10px">
          <option value="minutes" ${s.delayUnit === 'minutes' ? 'selected' : ''}>minutes</option>
          <option value="hours"   ${s.delayUnit === 'hours'   ? 'selected' : ''}>hours</option>
        </select>
        ${displayDelay === 0 ? `<span style="font-size:0.78rem;color:var(--success)">immediately</span>` : ''}
      </div>

      <!-- Row 3: template or message -->
      <div>
        <select id="stepTemplate-${i}" class="field-input" style="margin-bottom:${showTextarea ? '8px' : '0'}">
          ${tplSelect}
        </select>
        ${showTextarea ? `
          <textarea id="stepMsg-${i}" class="field-input" rows="3"
                    style="resize:vertical;font-size:0.85rem"
                    placeholder="Type your message… Use {{customer_name}}, {{order_number}}, {{total_amount}}"
          >${esc(s.message)}</textarea>` : ''}
      </div>

    </div>
  </div>`;
}

// ── Drag and drop ──────────────────────────────────────────────────────────────
function attachDrag(card, idx) {
  card.addEventListener('dragstart', e => {
    _dragIdx = idx;
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });
  card.addEventListener('dragend', () => {
    card.classList.remove('dragging');
    document.querySelectorAll('.step-card').forEach(c => c.classList.remove('drag-over'));
    _dragIdx = null;
  });
  card.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (_dragIdx !== null && _dragIdx !== idx) {
      document.querySelectorAll('.step-card').forEach(c => c.classList.remove('drag-over'));
      card.classList.add('drag-over');
    }
  });
  card.addEventListener('drop', e => {
    e.preventDefault();
    if (_dragIdx === null || _dragIdx === idx) return;
    // Reorder
    const moved = _steps.splice(_dragIdx, 1)[0];
    _steps.splice(idx, 0, moved);
    renderSteps();
  });
}

// ── Save flow ──────────────────────────────────────────────────────────────────
async function saveFlow() {
  const storeId = localStorage.getItem('storeId');
  const name    = document.getElementById('flowName').value.trim();
  const trigger = getSelectedTrigger();

  if (!name)    { alert('Please enter a flow name.');     return; }
  if (!trigger) { alert('Please select a trigger event.'); return; }
  if (_steps.length === 0) { alert('Add at least one step.'); return; }

  // Validate steps
  for (let i = 0; i < _steps.length; i++) {
    const s = _steps[i];
    if (!s.templateId && !s.message.trim()) {
      alert(`Step ${i + 1}: please select a template or write a message.`);
      return;
    }
  }

  const saveBtn = document.getElementById('builderSave');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving…';

  try {
    const steps = _steps.map((s, i) => {
      const delayMinutes = s.delayUnit === 'hours'
        ? (parseInt(s.delay) || 0) * 60
        : (parseInt(s.delay) || 0);
      return {
        stepOrder:  i + 1,
        actionType: s.actionType,
        config: {
          delay:      delayMinutes,
          templateId: s.templateId || undefined,
          message:    s.templateId ? undefined : s.message.trim(),
        },
      };
    });

    const payload = { storeId, name, trigger, isActive: true, steps };

    if (_editing) {
      await api.patch(`/flows/${_editing}`, payload);
    } else {
      await api.post('/flows', payload);
    }

    closeBuilder();
    await loadFlows();   // Refresh list
  } catch (err) {
    alert(`Failed to save flow: ${err.message}`);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Flow';
  }
}

// ── Toggle / Delete ────────────────────────────────────────────────────────────
async function handleToggle(flowId, isActive, el) {
  el.disabled = true;
  try {
    await api.patch(`/flows/${flowId}`, { isActive });
    const flow = _flows.find(f => f.id === flowId);
    if (flow) flow.isActive = isActive;
  } catch {
    el.checked = !isActive;
    alert('Failed to update flow.');
  } finally {
    el.disabled = false;
  }
}

async function handleDelete(flowId, name) {
  if (!confirm(`Delete flow "${name}"? This cannot be undone.`)) return;
  try {
    await api.delete(`/flows/${flowId}`);
    await loadFlows();
  } catch (err) {
    alert(`Failed to delete: ${err.message}`);
  }
}

// ── Utility ────────────────────────────────────────────────────────────────────
function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
