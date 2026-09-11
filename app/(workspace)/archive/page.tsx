import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardBody, Badge } from '@/components/ui/primitives';
import { Table, Th, Td } from '@/components/ui/table';
import { StatusBadge } from '@/components/status-badge';
import { StarRating } from '@/components/star-rating';
import { prisma } from '@/server/db/prisma';
import { getActorOrNull } from '@/server/lib/auth';
import { isAdminOrMaster } from '@/server/lib/authz';
import { formatDateTime } from '@/lib/time';
import { WorkspacePageHeader } from '@/components/layout/workspace-shell';
import { formatPreferredDeploymentPorts, preferredDeploymentPorts } from '@/lib/deployment-ports';

export const dynamic = 'force-dynamic';

const fmtDate = (d: Date | null | undefined) => formatDateTime(d);

const fmtDateShort = (d: Date | null | undefined) => {
  if (!d) return '—';
  return d.toISOString().slice(0, 10);
};

// 从 URL 读取排序参数（archive 页自带排序，与项目列表共用 key 名以便日后统一）
type ArchiveSortKey = 'archivedAt' | 'projectCode' | 'port';
type ArchiveOrder = 'asc' | 'desc';
const isSortKey = (v: string | null | undefined): v is ArchiveSortKey =>
  v === 'archivedAt' || v === 'projectCode' || v === 'port';

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; order?: string }>;
}) {
  const sp = await searchParams;
  const sort: ArchiveSortKey = isSortKey(sp.sort) ? sp.sort : 'archivedAt';
  const order: ArchiveOrder = sp.order === 'asc' ? 'asc' : 'desc';

  const actor = await getActorOrNull();
  if (!actor) redirect('/login');
  if (!isAdminOrMaster(actor)) {
    redirect('/dashboard');
  }

  // port 排序：拉到足够数据后按本地服务器优先的端口规则在内存中排序；
  // take 设为 500，覆盖实际场景（21 项 / 全量也够）
  const listTake = 500;
  const [completed, archived, cancelled, merged, incomplete] = await Promise.all([
    prisma.project.findMany({
      where: { status: 'COMPLETED', deletedAt: null },
      orderBy: { actualCompletedDate: 'desc' },
      take: listTake,
      include: {
        department: { select: { name: true } },
        projectType: { select: { name: true } },
        maintainer: { select: { displayName: true } },
      },
    }),
    prisma.project.findMany({
      where: { status: 'ARCHIVED', deletedAt: null },
      orderBy: sort === 'port' ? { updatedAt: order } : { [sort]: order } as never,
      take: listTake,
      include: {
        department: { select: { name: true } },
        projectType: { select: { name: true } },
        maintainer: { select: { displayName: true } },
        deployments: { select: { port: true, serverIp: true, serverName: true, hostname: true, lastVerifiedAt: true }, orderBy: { lastVerifiedAt: 'desc' as const } },
      },
    }),
    prisma.project.count({ where: { status: 'CANCELLED', deletedAt: null } }),
    prisma.project.count({ where: { status: 'MERGED', deletedAt: null } }),
    prisma.project.findMany({
      where: {
        status: 'ARCHIVED',
        archiveCompleteness: { lt: 60 },
        deletedAt: null,
      },
      orderBy: { archivedAt: 'desc' },
      take: 15,
      include: {
        department: { select: { name: true } },
        deployments: { select: { port: true, serverIp: true, serverName: true, hostname: true, lastVerifiedAt: true }, orderBy: { lastVerifiedAt: 'desc' as const } },
      },
    }),
  ]);

  // port 排序在内存里二次排
  if (sort === 'port') {
    const dir = order === 'asc' ? -1 : 1;
    archived.sort((a: typeof archived[number], b: typeof archived[number]) => {
      const ap = preferredDeploymentPorts(a.deployments)[0] ?? Infinity;
      const bp = preferredDeploymentPorts(b.deployments)[0] ?? Infinity;
      return ap === bp ? 0 : (ap < bp ? dir : -dir);
    });
  }

  return (
    <div className="space-y-6">
      <WorkspacePageHeader
        eyebrow="Archive · 资产"
        title="历史项目 / 软件资产"
        description={
          <>
          「最近归档」为已沉淀的软件资产；已完成但未归档的项目仍在「项目 → 已完成」中维护，确认沉淀后点击归档才进入资产列表。
          列表默认按归档时间倒序；归档时间取自 docker 最后一次部署启动时间。
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="已完成" value={completed.length} tone="green" />
        <Tile label="已归档" value={archived.length} tone="slate" />
        <Tile label="已取消" value={cancelled} tone="red" />
        <Tile label="已合并" value={merged} tone="violet" />
      </div>

      <Card>
        <CardHeader
          title="⚠ 档案未完成"
          description="归档完整度 < 60% 的项目，请尽快补充资料。"
        />
        <CardBody>
          {incomplete.length === 0 ? (
            <div className="text-[13px] text-slate-500">🎉 没有档案未完成的项目</div>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th className="w-[140px]">编号</Th>
                  <Th>名称</Th>
                  <Th>部门</Th>
                  <Th align="center" className="w-[120px]">星级</Th>
                  <Th align="center" className="w-[110px]">完整度</Th>
                  <Th align="right" className="w-[110px]">操作</Th>
                </tr>
              </thead>
              <tbody>
                {incomplete.map((p) => (
                  <tr key={p.id}>
                    <Td className="font-mono text-[12px] text-slate-500">{p.projectCode}</Td>
                    <Td>
                      <Link href={`/projects/${p.id}`} className="hover:underline text-slate-800">
                        {p.name}
                      </Link>
                    </Td>
                    <Td className="text-slate-600">{p.department?.name}</Td>
                    <Td align="center"><StarRating value={p.rating} size={12} /></Td>
                    <Td align="center">
                      <Badge tone="amber">{p.archiveCompleteness}%</Badge>
                    </Td>
                    <Td align="right">
                      <Link
                        href={`/projects/${p.id}`}
                        className="text-[12px] text-[#1a365d] hover:underline font-semibold"
                      >
                        补全档案 →
                      </Link>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="最近归档"
          description={`${archived.length} 项 · 默认按归档时间倒序 · 本地服务器端口优先展示，多个端口以逗号分隔`}
          actions={
            <div className="flex max-w-[55vw] items-center gap-1 overflow-x-auto text-[12px] text-slate-600 sm:max-w-none sm:gap-2">
              <span className="text-slate-500">排序：</span>
              <SortLink sort="archivedAt" currentSort={sort} order={order} label="归档时间" />
              <SortLink sort="port" currentSort={sort} order={order} label="部署端口" />
              <SortLink sort="projectCode" currentSort={sort} order={order} label="编号" />
            </div>
          }
        />
        <CardBody>
          {archived.length === 0 ? (
            <div className="text-[13px] text-slate-500">暂无已归档项目</div>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th className="w-[140px]">编号</Th>
                  <Th>名称 / 系统名</Th>
                  <Th>部门</Th>
                  <Th>维护人</Th>
                  <Th align="center" className="w-[120px]">星级</Th>
                  <Th align="center" className="w-[80px]">端口</Th>
                  <Th align="center" className="w-[110px]">完整度</Th>
                  <Th align="right" className="w-[150px]">归档时间</Th>
                </tr>
              </thead>
              <tbody>
                {archived.map((p) => (
                  <tr key={p.id}>
                    <Td className="font-mono text-[12px] text-slate-500">{p.projectCode}</Td>
                    <Td>
                      <Link href={`/projects/${p.id}`} className="hover:underline text-slate-800 font-medium">
                        {p.name}
                      </Link>
                      {p.systemName && (
                        <div className="text-[12px] text-slate-500 mt-0.5">{p.systemName}</div>
                      )}
                    </Td>
                    <Td className="text-slate-600">{p.department?.name}</Td>
                    <Td className="text-slate-600">{p.maintainer?.displayName ?? '—'}</Td>
                    <Td align="center"><StarRating value={p.rating} size={12} /></Td>
                    <Td align="center" className="font-mono tabular-nums text-[12.5px] text-slate-700">
                      {formatPreferredDeploymentPorts(p.deployments)}
                    </Td>
                    <Td align="center">
                      <Badge tone={p.archiveCompleteness >= 60 ? 'green' : 'amber'}>
                        {p.archiveCompleteness}%
                      </Badge>
                    </Td>
                    <Td align="right" className="text-[12px] text-slate-600 tabular-nums font-medium">
                      {fmtDate(p.archivedAt)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="最近完成（待归档）"
          description="已完成但未归档：仍属在管项目，归档后才进入「最近归档」资产列表。"
        />
        <CardBody>
          {completed.length === 0 ? (
            <div className="text-[13px] text-slate-500">暂无已完成项目</div>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th className="w-[140px]">编号</Th>
                  <Th>名称</Th>
                  <Th>部门</Th>
                  <Th>类型</Th>
                  <Th align="center" className="w-[120px]">星级</Th>
                  <Th align="right" className="w-[130px]">完成日期</Th>
                  <Th align="center" className="w-[110px]">状态</Th>
                </tr>
              </thead>
              <tbody>
                {completed.map((p) => (
                  <tr key={p.id}>
                    <Td className="font-mono text-[12px] text-slate-500">{p.projectCode}</Td>
                    <Td>
                      <Link href={`/projects/${p.id}`} className="hover:underline text-slate-800 font-medium">
                        {p.name}
                      </Link>
                    </Td>
                    <Td className="text-slate-600">{p.department?.name}</Td>
                    <Td className="text-slate-600">{p.projectType?.name}</Td>
                    <Td align="center"><StarRating value={p.rating} size={12} /></Td>
                    <Td align="right" className="text-[12px] text-slate-600 tabular-nums">
                      {fmtDateShort(p.actualCompletedDate)}
                    </Td>
                    <Td align="center">
                      <StatusBadge status="COMPLETED" />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function Tile({ label, value, tone }: { label: string; value: number; tone: 'green' | 'slate' | 'red' | 'violet' }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-[11px] font-semibold text-slate-500">{label}</div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="text-[24px] font-extrabold tabular-nums tracking-tight text-slate-900">
          {value}
        </span>
        <Badge tone={tone}>项</Badge>
      </div>
    </div>
  );
}

function SortLink({
  sort,
  currentSort,
  order,
  label,
}: {
  sort: ArchiveSortKey;
  currentSort: ArchiveSortKey;
  order: ArchiveOrder;
  label: string;
}) {
  const active = currentSort === sort;
  const nextOrder: ArchiveOrder = active ? (order === 'asc' ? 'desc' : 'asc') : 'desc';
  const arrow = active ? (order === 'asc' ? ' ↑' : ' ↓') : '';
  const href = `/archive?sort=${sort}&order=${nextOrder}`;
  return (
    <Link
      href={href}
      className={
        'rounded-md px-2 py-1 text-[12px] font-semibold transition-colors ' +
        (active
          ? 'bg-[#dbeafe] text-[#1a365d]'
          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900')
      }
    >
      {label}
      {arrow}
    </Link>
  );
}
