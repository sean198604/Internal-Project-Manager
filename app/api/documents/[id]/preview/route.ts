import { handle } from '@/server/lib/api';
import { requireActor } from '@/server/lib/auth';
import { downloadDocument } from '@/server/modules/projects/subresources';
import { renderMarkdown } from '@/server/lib/markdown';
import { createReadStream, statSync } from 'node:fs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Context = { params: Promise<{ id: string }> };

/**
 * GET /api/documents/[id]/preview
 *
 * - text/markdown | *.md  → 渲染成 HTML 返回 text/html
 * - image/*               → 返回图片字节（inline disposition，浏览器直接展示）
 * - text/*                → 返回 text/plain
 * - 其他（MIME 不在 inline 白名单）→ 503，引导前端用下载链接
 */
export async function GET(request: Request, { params }: Context) {
  try {
    const actor = await requireActor();
    const { id } = await params;
    const file = await downloadDocument(actor, id);
    const stat = statSync(file.filePath);
    const mime = (file.mimeType ?? '').toLowerCase();
    const lowerName = file.fileName.toLowerCase();
    const isMdExt = lowerName.endsWith('.md') || lowerName.endsWith('.markdown');
    const isMdMime = mime === 'text/markdown' || mime === 'text/x-markdown' || mime === '';

    if (isMdExt || (isMdMime && isMdExt)) {
      // 真正的 .md 文件：渲染为 HTML
      const raw = await readFileString(file.filePath);
      const body = renderMarkdown(raw);
      return new Response(`<div class="md-render">${body}</div>`, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'private, max-age=60',
        },
      });
    }

    // image/*  → inline
    if (mime.startsWith('image/')) {
      const stream = createReadStream(file.filePath);
      return new Response(stream as unknown as ReadableStream, {
        headers: {
          'Content-Type': mime,
          'Content-Length': String(stat.size),
          'Content-Disposition': `inline; filename="${encodeURIComponent(file.fileName)}"`,
          'Cache-Control': 'private, max-age=60',
        },
      });
    }

    // 文本类 → 原样返回
    if (mime.startsWith('text/') || lowerName.endsWith('.txt') || lowerName.endsWith('.csv') || lowerName.endsWith('.log')) {
      const stream = createReadStream(file.filePath);
      return new Response(stream as unknown as ReadableStream, {
        headers: {
          'Content-Type': mime || 'text/plain; charset=utf-8',
          'Content-Length': String(stat.size),
          'Content-Disposition': `inline; filename="${encodeURIComponent(file.fileName)}"`,
          'Cache-Control': 'private, max-age=60',
        },
      });
    }

    // PDF → inline（浏览器原生 PDF 阅读器）
    if (mime === 'application/pdf' || lowerName.endsWith('.pdf')) {
      const stream = createReadStream(file.filePath);
      return new Response(stream as unknown as ReadableStream, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Length': String(stat.size),
          'Content-Disposition': `inline; filename="${encodeURIComponent(file.fileName)}"`,
          'Cache-Control': 'private, max-age=60',
        },
      });
    }

    // 其他：保持原状（让前端 fallback）
    const { fail } = await import('@/server/lib/api');
    return fail({
      status: 415,
      code: 'UNSUPPORTED_PREVIEW',
      message: '该文件类型不支持在线预览，请下载查看',
    });
  } catch (err) {
    const { fail } = await import('@/server/lib/api');
    return fail(err);
  }
}

async function readFileString(filePath: string): Promise<string> {
  const { promises: fs } = await import('node:fs');
  return fs.readFile(filePath, 'utf8');
}
