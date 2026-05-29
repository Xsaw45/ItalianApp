/**
 * Renders theory JSON sections into HTML.
 */
import { el } from '../utils/dom.js';
import { getLanguage } from '../i18n.js';

function getContent(section) {
  if (getLanguage() === 'fr' && section.content_fr) return section.content_fr;
  return section.content;
}

/**
 * Render theory content into a container.
 * @param {Object} theory - The theory object with sections array
 * @param {HTMLElement} container
 */
export function renderTheory(theory, container) {
  const wrapper = el('div', { className: 'theory-content' });

  for (const section of theory.sections) {
    const rendered = renderSection(section);
    if (rendered) wrapper.appendChild(rendered);
  }

  container.appendChild(wrapper);
}

function renderSection(section) {
  switch (section.type) {
    case 'intro': return renderIntro(section);
    case 'heading': return renderHeading(section);
    case 'paragraph': return renderParagraph(section);
    case 'table': return renderTable(section);
    case 'example': return renderExample(section);
    case 'rule': return renderRule(section);
    case 'note': return renderNote(section);
    case 'list': return renderList(section);
    default:
      console.warn('Unknown theory section type:', section.type);
      return null;
  }
}

function renderIntro(section) {
  return el('div', { className: 'theory-intro' }, getContent(section));
}

function renderHeading(section) {
  return el('h3', { className: 'theory-heading' }, getContent(section));
}

function renderParagraph(section) {
  const p = el('p', { className: 'theory-paragraph' });
  p.innerHTML = formatText(getContent(section));
  return p;
}

function renderTable(section) {
  const fr = getLanguage() === 'fr';
  const wrapper = el('div', { className: 'theory-table-wrapper' });
  const table = el('table', { className: 'theory-table' });

  const caption = fr && section.caption_fr ? section.caption_fr : section.caption;
  if (caption) {
    table.appendChild(el('caption', {}, caption));
  }

  const headers = fr && section.headers_fr ? section.headers_fr : section.headers;
  if (headers) {
    const thead = el('thead');
    const tr = el('tr');
    for (const header of headers) {
      tr.appendChild(el('th', {}, header));
    }
    thead.appendChild(tr);
    table.appendChild(thead);
  }

  const rows = fr && section.rows_fr ? section.rows_fr : section.rows;
  if (rows) {
    const tbody = el('tbody');
    for (const row of rows) {
      const tr = el('tr');
      for (const cell of row) {
        const td = el('td');
        td.innerHTML = formatText(cell);
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
  }

  wrapper.appendChild(table);
  return wrapper;
}

function renderExample(section) {
  const box = el('div', { className: 'theory-example' });

  for (const item of section.items) {
    const line = el('div', { className: 'theory-example-item' });
    if (item.highlight) {
      const text = item.italian;
      const idx = text.toLowerCase().indexOf(item.highlight.toLowerCase());
      if (idx >= 0) {
        const before = text.slice(0, idx);
        const match = text.slice(idx, idx + item.highlight.length);
        const after = text.slice(idx + item.highlight.length);
        line.innerHTML = before + `<span class="highlight">${match}</span>` + after;
      } else {
        line.textContent = text;
      }
    } else {
      line.textContent = item.italian;
    }
    box.appendChild(line);
  }

  return box;
}

function renderRule(section) {
  const box = el('div', { className: 'theory-rule' });
  box.innerHTML += formatText(getContent(section));
  return box;
}

function renderNote(section) {
  const box = el('div', { className: 'theory-note' });
  box.innerHTML += formatText(getContent(section));
  return box;
}

function renderList(section) {
  const fr = getLanguage() === 'fr';
  const items = fr && section.items_fr ? section.items_fr : section.items;
  const list = el('ul', { className: 'theory-list' });
  for (const item of items) {
    const li = el('li');
    li.innerHTML = formatText(item);
    list.appendChild(li);
  }
  return list;
}

/**
 * Format text with basic markup: **bold**, *italic*, `code`
 */
function formatText(text) {
  if (!text) return '';
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
}
