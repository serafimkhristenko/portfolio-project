(() => {
  const params = new URLSearchParams(window.location.search);
  if (!params.has("edit")) return;

  const editorAttribute = "data-element-picker-ui";
  const maxTextLength = 180;
  let selectedElement = null;
  let hoveredElement = null;

  const styles = document.createElement("style");
  styles.setAttribute(editorAttribute, "");
  styles.textContent = `
    [data-element-picker-ui] { box-sizing: border-box; }
    .element-picker-outline {
      position: fixed;
      z-index: 2147483645;
      display: none;
      pointer-events: none;
      border: 2px solid #c8f135;
      background: rgba(200, 241, 53, 0.12);
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.72), 0 0 22px rgba(200, 241, 53, 0.4);
    }
    .element-picker-outline.is-selected {
      border-color: #58d7ff;
      background: rgba(88, 215, 255, 0.14);
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.72), 0 0 24px rgba(88, 215, 255, 0.48);
    }
    .element-picker-panel {
      position: fixed;
      right: 16px;
      bottom: 16px;
      z-index: 2147483646;
      width: min(430px, calc(100vw - 32px));
      padding: 14px;
      border: 1px solid rgba(200, 241, 53, 0.76);
      border-radius: 12px;
      background: rgba(8, 12, 18, 0.96);
      box-shadow: 0 16px 44px rgba(0, 0, 0, 0.46);
      color: #f7f7f2;
      font: 13px/1.45 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    .element-picker-panel * { box-sizing: border-box; }
    .element-picker-panel strong { color: #c8f135; }
    .element-picker-panel p { margin: 6px 0 10px; color: rgba(247, 247, 242, 0.82); }
    .element-picker-panel label { display: block; margin: 8px 0 5px; color: #58d7ff; }
    .element-picker-panel textarea {
      display: block;
      width: 100%;
      min-height: 72px;
      resize: vertical;
      padding: 9px;
      border: 1px solid rgba(247, 247, 242, 0.22);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.06);
      color: #fff;
      font: inherit;
    }
    .element-picker-selection {
      min-height: 38px;
      overflow-wrap: anywhere;
      padding: 8px;
      border-radius: 8px;
      background: rgba(88, 215, 255, 0.1);
      color: #fff;
    }
    .element-picker-actions { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 10px; }
    .element-picker-panel button {
      padding: 8px 10px;
      border: 1px solid rgba(247, 247, 242, 0.28);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.08);
      color: #fff;
      cursor: pointer !important;
      font: inherit;
    }
    .element-picker-panel button:hover { border-color: #c8f135; background: rgba(200, 241, 53, 0.12); }
    .element-picker-panel .element-picker-copy { border-color: rgba(200, 241, 53, 0.72); color: #c8f135; }
    .element-picker-status { min-height: 18px; margin-top: 8px; color: #c8f135; }
  `;
  document.head.append(styles);

  const hoverOutline = createOutline();
  const selectedOutline = createOutline("is-selected");
  const panel = document.createElement("aside");
  panel.className = "element-picker-panel";
  panel.setAttribute(editorAttribute, "");
  panel.setAttribute("aria-label", "Режим выбора элементов для правок");
  panel.innerHTML = `
    <strong>Режим выбора элементов</strong>
    <p>Кликните по элементу страницы. Затем опишите изменение и скопируйте запрос в чат.</p>
    <label>Выбранный элемент</label>
    <div class="element-picker-selection" data-picker-selection>Пока ничего не выбрано.</div>
    <label for="element-picker-request">Что изменить</label>
    <textarea id="element-picker-request" data-picker-request placeholder="Например: сделай этот заголовок меньше и добавь больше воздуха сверху"></textarea>
    <div class="element-picker-actions">
      <button class="element-picker-copy" type="button" data-picker-copy disabled>Скопировать запрос</button>
      <button type="button" data-picker-clear disabled>Сбросить выбор</button>
      <button type="button" data-picker-exit>Выйти из режима</button>
    </div>
    <div class="element-picker-status" data-picker-status role="status" aria-live="polite"></div>
  `;
  document.body.append(panel);

  const selection = panel.querySelector("[data-picker-selection]");
  const request = panel.querySelector("[data-picker-request]");
  const copyButton = panel.querySelector("[data-picker-copy]");
  const clearButton = panel.querySelector("[data-picker-clear]");
  const status = panel.querySelector("[data-picker-status]");

  function createOutline(className = "") {
    const outline = document.createElement("div");
    outline.className = `element-picker-outline ${className}`.trim();
    outline.setAttribute(editorAttribute, "");
    document.body.append(outline);
    return outline;
  }

  function isEditorElement(element) {
    return element instanceof Element && Boolean(element.closest(`[${editorAttribute}]`));
  }

  function escapeSelector(value) {
    if (window.CSS && typeof window.CSS.escape === "function") return window.CSS.escape(value);
    return value.replace(/[^a-zA-Z0-9_-]/g, (character) => `\\${character}`);
  }

  function getSelector(element) {
    const parts = [];
    let current = element;
    while (current && current !== document.body) {
      let part = current.tagName.toLowerCase();
      if (current.id) {
        parts.unshift(`${part}#${escapeSelector(current.id)}`);
        break;
      }

      const classes = [...current.classList]
        .filter((className) => !className.startsWith("is-"))
        .slice(0, 2);
      if (classes.length) part += classes.map((className) => `.${escapeSelector(className)}`).join("");

      const parent = current.parentElement;
      if (parent) {
        const sameTagSiblings = [...parent.children].filter((child) => child.tagName === current.tagName);
        if (sameTagSiblings.length > 1) part += `:nth-of-type(${sameTagSiblings.indexOf(current) + 1})`;
      }

      parts.unshift(part);
      current = parent;
    }
    return parts.join(" > ");
  }

  function getText(element) {
    const text = (element.getAttribute("alt") || element.textContent || "")
      .replace(/\s+/g, " ")
      .trim();
    return text.length > maxTextLength ? `${text.slice(0, maxTextLength - 1)}…` : text;
  }

  function getSelectionDetails(element) {
    const selector = getSelector(element);
    const text = getText(element);
    const details = [`Страница: ${window.location.pathname}`, `CSS-селектор: ${selector}`, `Тег: <${element.tagName.toLowerCase()}>`];
    if (text) details.push(`Текст: ${text}`);
    return details.join("\n");
  }

  function updateOutline(outline, element) {
    if (!element || !document.documentElement.contains(element)) {
      outline.style.display = "none";
      return;
    }
    const rect = element.getBoundingClientRect();
    outline.style.display = "block";
    outline.style.left = `${rect.left}px`;
    outline.style.top = `${rect.top}px`;
    outline.style.width = `${rect.width}px`;
    outline.style.height = `${rect.height}px`;
  }

  function refreshOutlines() {
    updateOutline(hoverOutline, hoveredElement);
    updateOutline(selectedOutline, selectedElement);
  }

  function selectElement(element) {
    selectedElement = element;
    selection.textContent = getSelectionDetails(element);
    copyButton.disabled = false;
    clearButton.disabled = false;
    status.textContent = "Элемент выбран. Добавьте команду и скопируйте запрос.";
    refreshOutlines();
  }

  function clearSelection() {
    selectedElement = null;
    selection.textContent = "Пока ничего не выбрано.";
    copyButton.disabled = true;
    clearButton.disabled = true;
    status.textContent = "Выбор сброшен.";
    refreshOutlines();
  }

  function getPrompt() {
    const task = request.value.trim() || "Опишите, как лучше изменить выбранный элемент.";
    return `Хочу изменить элемент на опубликованном сайте.\n\n${getSelectionDetails(selectedElement)}\n\nЗадача: ${task}`;
  }

  async function copyPrompt() {
    if (!selectedElement) return;
    const prompt = getPrompt();
    try {
      await navigator.clipboard.writeText(prompt);
    } catch (error) {
      const fallback = document.createElement("textarea");
      fallback.value = prompt;
      fallback.style.position = "fixed";
      fallback.style.opacity = "0";
      document.body.append(fallback);
      fallback.select();
      document.execCommand("copy");
      fallback.remove();
    }
    status.textContent = "Запрос скопирован. Вставьте его в чат и отправьте мне.";
  }

  function exitPicker() {
    params.delete("edit");
    const query = params.toString();
    window.location.href = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
  }

  document.addEventListener("pointerover", (event) => {
    if (isEditorElement(event.target)) return;
    hoveredElement = event.target;
    refreshOutlines();
  }, true);

  document.addEventListener("click", (event) => {
    if (isEditorElement(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
    selectElement(event.target);
  }, true);

  window.addEventListener("scroll", refreshOutlines, { passive: true });
  window.addEventListener("resize", refreshOutlines);
  copyButton.addEventListener("click", copyPrompt);
  clearButton.addEventListener("click", clearSelection);
  panel.querySelector("[data-picker-exit]").addEventListener("click", exitPicker);
})();
