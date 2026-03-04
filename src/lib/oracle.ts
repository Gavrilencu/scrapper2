import oracledb from 'oracledb';

export type OracleConfig = {
  user: string;
  password: string;
  connectString: string; // host:port/service_name
};

export function buildConnectString(host: string, port: number, serviceName: string): string {
  return `${host}:${port}/${serviceName}`;
}

export async function getOracleConnection(config: OracleConfig): Promise<oracledb.Connection> {
  return oracledb.getConnection({
    user: config.user,
    password: config.password,
    connectString: config.connectString,
  });
}

export async function runOracleScript(
  config: OracleConfig,
  script: string,
  bindParams: Record<string, unknown> = {}
): Promise<{ rows?: unknown[]; rowsAffected?: number }> {
  const conn = await getOracleConnection(config);
  try {
    const isSelect = /^\s*SELECT\s/i.test(script.trim());
    if (isSelect) {
      const result = await conn.execute(script, bindParams, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      return { rows: (result.rows as unknown[]) || [] };
    }
    const result = await conn.execute(script, bindParams, { autoCommit: true });
    return { rowsAffected: result.rowsAffected ?? 0 };
  } finally {
    await conn.close();
  }
}

export async function testOracleConnection(host: string, port: number, serviceName: string, user: string, password: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const conn = await getOracleConnection({
      user,
      password,
      connectString: buildConnectString(host, port, serviceName),
    });
    await conn.close();
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}
