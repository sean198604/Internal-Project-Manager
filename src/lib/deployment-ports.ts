export type DeploymentPortSource = {
  port: number | null;
  serverIp?: string | null;
  serverName?: string | null;
  hostname?: string | null;
};

/**
 * 判定可直接在公司内网访问的部署。主机名称作为兜底，避免旧记录未完整填写 IP 时丢失本地端口。
 */
export function isLocalDeployment(deployment: DeploymentPortSource): boolean {
  const ip = deployment.serverIp?.trim() ?? '';
  const host = `${deployment.serverName ?? ''} ${deployment.hostname ?? ''}`;
  const isPrivateIpv4 =
    /^10\./.test(ip) ||
    /^192\.168\./.test(ip) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip);

  return isPrivateIpv4 || host.includes('业务管理部');
}

/**
 * 展示与排序统一使用本地部署优先规则；本地不存在时才使用其他部署。
 */
export function preferredDeploymentPorts(deployments: DeploymentPortSource[] | undefined | null): number[] {
  const withPort = (deployments ?? []).filter((deployment): deployment is DeploymentPortSource & { port: number } =>
    deployment.port !== null,
  );
  const candidates = withPort.filter(isLocalDeployment);
  const selected = candidates.length > 0 ? candidates : withPort;

  return [...new Set(selected.map((deployment) => deployment.port))].sort((a, b) => a - b);
}

export function formatPreferredDeploymentPorts(deployments: DeploymentPortSource[] | undefined | null): string {
  const ports = preferredDeploymentPorts(deployments);
  return ports.length > 0 ? ports.join(', ') : '—';
}
