import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Badge, Card, CardHeader, CardBody, EmptyState } from '@/components/ui/primitives';
import { Table, Th, Td } from '@/components/ui/table';
import { StatusBadge, PriorityBadge, type Status } from '@/components/status-badge';
import { getActorOrNull } from '@/server/lib/auth';
import { getShare } from '@/server/modules/projects/subresources';
import { WorkspacePageHeader } from '@/components/layout/workspace-shell';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export default async function ShareDetailPage({ params }: Params) {
  const actor = await getActorOrNull();
  const { id } = await params;
  if (!actor) notFound();

  const data = await getShare(actor, id).catch(() => null);
  if (!data) notFound();

  const isActive = !data.revokedAt && (data.expiresAt ? new Date(data.expiresAt).getTime() > Date.now() : true);

  return (
    <div className="space-y-6">
      <WorkspacePageHeader
        eyebrow="Share Links"
        title={data.name ?? '未命名分享'}
        description={`创建于 ${data.createdAt.slice(0, 10)} · 有效期至 ${data.expiresAt ? data.expiresAt.slice(0, 10) : '永久'} · 访问 ${data.accessCount} 次`}
        actions={
          <div className="flex items-center gap-2">
            {isActive && (
              <Link href={data.shareUrl} target="_blank" className="btn-secondary">
                预览 ↗
              </Link>
            )}
            <Link href="/shares" className="btn-ghost">返回</Link>
          </div>
        }
      />
      <div className="flex flex-wrap items-center gap-3 text-sm">
            {isActive ? (
              <Badge tone="green" dot>有效</Badge>
            ) : data.revokedAt ? (
              <Badge tone="red" dot>已撤销</Badge>
            ) : (
              <Badge tone="amber" dot>已过期</Badge>
            )}
            <span className="text-muted">创建于 {data.createdAt.slice(0, 10)}</span>
            <span className="text-muted">有效期至 {data.expiresAt ? data.expiresAt.slice(0, 10) : '永久'}</span>
            <span className="text-muted">访问 {data.accessCount} 次</span>
      </div>

      <Card>
        <CardHeader title="链接中的项目" description={`共 ${data.projectCount} 个`} />
        <CardBody className="p-0">
          <Table>
            <thead>
              <tr>
                <Th>编号</Th>
                <Th>名称</Th>
                <Th>部门</Th>
                <Th>负责人</Th>
                <Th align="center">进度</Th>
                <Th>到期日</Th>
                <Th align="center">状态</Th>
                <Th align="right">优先级</Th>
              </tr>
            </thead>
            <tbody>
              {data.projects.map((p: any) => (
                <tr key={p.id}>
                  <Td className="font-mono text-xs">{p.projectCode}</Td>
                  <Td>
                    <Link href={`/projects/${p.id}`} className="font-medium text-slate-900 hover:underline">
                      {p.name}
                    </Link>
                    {p.systemName && <div className="text-xs text-muted">{p.systemName}</div>}
                  </Td>
                  <Td>{p.department ?? '—'}</Td>
                  <Td>{p.owner ?? '—'}</Td>
                  <Td align="center">
                    <span className="font-mono text-xs">{p.progress}%</span>
                  </Td>
                  <Td className="text-xs">{p.dueDate ?? '—'}</Td>
                  <Td align="center"><StatusBadge status={p.status as Status} /></Td>
                  <Td align="right"><PriorityBadge priority={p.priority} /></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardBody>
      </Card>

      <p className="text-xs text-muted">
        对方打开分享链接看到的内容与此一致（不含部署 / 服务器 / 维护说明等内部信息）。
      </p>
    </div>
  );
}
