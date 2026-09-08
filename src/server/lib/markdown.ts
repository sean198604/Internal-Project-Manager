/**
 * 极简 Markdown 渲染器（服务端）—— 不依赖第三方库。
 * 支持：标题（#-######）、粗体/斜体/删除线、行内代码、代码块（```）、
 *      有序/无序列表（含嵌套）、引用、链接、![图片]、表格、分割线、HTML 字符转义。
 *
 * 用途：把附件中的 .md 文件渲染成浏览器可直接显示的 HTML（className 走 .md-render）。
 */

const ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ESCAPE_MAP[c]!);
}

function escapeAttr(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ESCAPE_MAP[c]!);
}

function renderInline(line: string): string {
  let s = escapeHtml(line);

  // 行内代码（先处理，避免里面被其他规则干扰）
  s = s.replace(/`([^`]+)`/g, (_, code) => `<code>${code}</code>`);

  // 图片 ![alt](url)
  s = s.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    (_, alt, url) => `<img src="${escapeAttr(url)}" alt="${escapeAttr(alt)}" />`,
  );

  // 链接 [text](url)
  s = s.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_, text, url) => {
      const href = /^(https?:|mailto:|\/)/i.test(url) ? url : '#';
      return `<a href="${escapeAttr(href)}" target="_blank" rel="noreferrer">${text}</a>`;
    },
  );

  // 粗体 / 斜体 / 删除线
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|\W)\*([^*]+)\*(?=\W|$)/g, '$1<em>$2</em>');
  s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>');

  return s;
}

type Block =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'paragraph'; lines: string[] }
  | { kind: 'code'; lang: string; content: string }
  | { kind: 'list'; ordered: boolean; items: string[][] }
  | { kind: 'blockquote'; lines: string[] }
  | { kind: 'table'; headers: string[]; rows: string[][] }
  | { kind: 'hr' };

function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;

    // 空行
    if (line.trim() === '') {
      i++;
      continue;
    }

    // 围栏代码 ```
    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      const lang = fence[1] ?? '';
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i]!)) {
        buf.push(lines[i]!);
        i++;
      }
      if (i < lines.length) i++;
      blocks.push({ kind: 'code', lang, content: buf.join('\n') });
      continue;
    }

    // 标题
    const heading = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (heading) {
      blocks.push({ kind: 'heading', level: heading[1]!.length, text: heading[2]! });
      i++;
      continue;
    }

    // 分割线
    if (/^---+\s*$/.test(line) || /^\*\*\*+\s*$/.test(line)) {
      blocks.push({ kind: 'hr' });
      i++;
      continue;
    }

    // 引用
    if (/^>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i]!)) {
        buf.push(lines[i]!.replace(/^>\s?/, ''));
        i++;
      }
      blocks.push({ kind: 'blockquote', lines: buf });
      continue;
    }

    // 表格
    if (/^\|.+\|/.test(line) && i + 1 < lines.length && /^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?$/.test(lines[i + 1]!)) {
      const headers = line.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && /^\|.+\|/.test(lines[i]!)) {
        const row = lines[i]!.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
        rows.push(row);
        i++;
      }
      blocks.push({ kind: 'table', headers, rows });
      continue;
    }

    // 列表
    const ul = line.match(/^(\s*)([-*+])\s+(.+)$/);
    const ol = line.match(/^(\s*)(\d+)\.\s+(.+)$/);
    if (ul || ol) {
      const ordered = !ul;
      const items: string[][] = [];
      const pushItem = () => {
        const item: string[] = [];
        if (items.length) {
          // 续接上方嵌套项的最后一项
          const last = items[items.length - 1]!;
          last.push(line);
        }
        items.push(item);
        void pushItem;
      };
      void pushItem;
      // 简化：以行为单位，缩进 != 0 的追加到上一个 item
      const listItems: string[][] = [];
      let current: string[] | null = null;
      while (i < lines.length) {
        const ln = lines[i]!;
        const uMatch = ln.match(/^(\s*)([-*+])\s+(.+)$/);
        const oMatch = ln.match(/^(\s*)(\d+)\.\s+(.+)$/);
        const subIndent = uMatch?.[1].length ?? oMatch?.[1].length ?? 0;
        const uo: 'ul' | 'ol' | null = uMatch ? 'ul' : oMatch ? 'ol' : null;
        if (uo === 'ul' || uo === 'ol') {
          if (ordered && uo === 'ol') {
            if (current === null) {
              current = [];
              listItems.push(current);
            }
            current.push(ln);
          } else if (ordered && uo === 'ul') {
            // ordered 列表遇到无序项，仍当作顶层项
            current = [];
            listItems.push(current);
            current.push(ln);
          } else if (!ordered && uo === 'ul') {
            if (current === null) {
              current = [];
              listItems.push(current);
            }
            current.push(ln);
          } else {
            current = [];
            listItems.push(current);
            current.push(ln);
          }
          i++;
          // 续行：空白开头或非新列表项的行
          while (i < lines.length) {
            const nx = lines[i]!;
            if (nx.trim() === '') {
              if (i + 1 < lines.length && /^(\s*)([-*+]|\d+\.)\s+/.test(lines[i + 1]!)) {
                i++;
                continue;
              }
              break;
            }
            if (/^(\s*)([-*+]|\d+\.)\s+/.test(nx)) break;
            current!.push(nx);
            i++;
          }
        } else {
          break;
        }
      }
      // 合并每项的尾随空行缩进修正
      const cleaned: string[][] = listItems.map((raw) =>
        raw
          .map((l) => l.replace(/^\s*(?:[-*+]|\d+\.)\s+/, '').replace(/^\s+/, ''))
          .filter((l) => l.trim() !== ''),
      );
      blocks.push({ kind: 'list', ordered, items: cleaned });
      continue;
    }

    // 段落：连续非空非特殊行
    const buf: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i]!.trim() !== '' &&
      !/^(#{1,6})\s/.test(lines[i]!) &&
      !/^```/.test(lines[i]!) &&
      !/^>/.test(lines[i]!) &&
      !/^(\s*)([-*+]|\d+\.)\s/.test(lines[i]!) &&
      !/^---+\s*$/.test(lines[i]!)
    ) {
      buf.push(lines[i]!);
      i++;
    }
    blocks.push({ kind: 'paragraph', lines: buf });
  }

  return blocks;
}

function renderListItems(items: string[][]): string {
  return items
    .map((itemLines) => {
      if (itemLines.length === 0) return '<li></li>';
      const text = itemLines.map(renderInline).join('<br/>');
      return `<li>${text}</li>`;
    })
    .join('');
}

export function renderMarkdown(src: string): string {
  const blocks = parseBlocks(src);
  const out: string[] = [];
  for (const b of blocks) {
    switch (b.kind) {
      case 'heading': {
        const tag = `h${Math.min(6, Math.max(1, b.level))}`;
        out.push(`<${tag}>${renderInline(b.text)}</${tag}>`);
        break;
      }
      case 'paragraph': {
        out.push(`<p>${b.lines.map(renderInline).join('<br/>')}</p>`);
        break;
      }
      case 'code': {
        out.push(
          `<pre><code${b.lang ? ` class="lang-${escapeAttr(b.lang)}"` : ''}>${escapeHtml(b.content)}</code></pre>`,
        );
        break;
      }
      case 'list': {
        const tag = b.ordered ? 'ol' : 'ul';
        out.push(`<${tag}>${renderListItems(b.items)}</${tag}>`);
        break;
      }
      case 'blockquote': {
        const inner = b.lines.map(renderInline).join('<br/>');
        out.push(`<blockquote><p>${inner}</p></blockquote>`);
        break;
      }
      case 'table': {
        const ths = b.headers.map((h) => `<th>${renderInline(h)}</th>`).join('');
        const trs = b.rows
          .map(
            (row) =>
              `<tr>${row.map((c) => `<td>${renderInline(c)}</td>`).join('')}</tr>`,
          )
          .join('');
        out.push(
          `<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`,
        );
        break;
      }
      case 'hr':
        out.push('<hr/>');
        break;
    }
  }
  return out.join('\n');
}
