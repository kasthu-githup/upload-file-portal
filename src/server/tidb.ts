import mysql from 'mysql2/promise';

export interface TiDBConfig {
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
}

function parseConnectionString(connectionString?: string): Partial<TiDBConfig> | null {
  if (!connectionString) return null;
  const trimmed = connectionString.trim();
  if (trimmed.startsWith('mysql://') || trimmed.startsWith('mysql2://')) {
    try {
      const url = new URL(trimmed);
      const rawDbName = url.pathname.replace(/^\//, '').trim();
      return {
        host: url.hostname || 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
        port: url.port ? parseInt(url.port, 10) : 4000,
        user: decodeURIComponent(url.username) || 'nPuPUNYSvuZ2bUe.root',
        password: decodeURIComponent(url.password) || 'ydTCXc4U04LY7KNd',
        // In TiDB Cloud, 'test' is the primary user data database. 'sys' is the internal system views schema.
        database: rawDbName === 'sys' || !rawDbName ? 'test' : rawDbName,
      };
    } catch (e) {
      console.warn('[TiDB] Could not parse mysql URL:', e);
    }
  }
  return null;
}

export function resolveTiDBConfig(): TiDBConfig {
  // Check any connection URL variable
  const rawUrl = process.env.DATABASE_URL || 
                 process.env.TIDB_URL || 
                 (process.env.TIDB_DATABASE && process.env.TIDB_DATABASE.startsWith('mysql://') ? process.env.TIDB_DATABASE : undefined);

  const parsedFromUrl = parseConnectionString(rawUrl);

  const host = parsedFromUrl?.host || process.env.TIDB_HOST || 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com';
  const port = parsedFromUrl?.port || parseInt(process.env.TIDB_PORT || '4000', 10);
  const user = parsedFromUrl?.user || process.env.TIDB_USER || 'nPuPUNYSvuZ2bUe.root';
  const password = parsedFromUrl?.password || process.env.TIDB_PASSWORD || 'ydTCXc4U04LY7KNd';
  
  let database = parsedFromUrl?.database;
  if (!database) {
    const rawDb = (process.env.TIDB_DATABASE || '').trim();
    if (rawDb && !rawDb.startsWith('mysql://')) {
      database = rawDb === 'sys' ? 'test' : rawDb;
    } else {
      database = 'test';
    }
  }

  return { host, port, user, password, database };
}

class TiDBClient {
  private pool: mysql.Pool | null = null;
  public isConnected = false;
  public lastError: string | null = null;
  public config: TiDBConfig;

  constructor() {
    this.config = resolveTiDBConfig();
  }

  public async initialize(): Promise<boolean> {
    this.config = resolveTiDBConfig();

    if (!this.config.password) {
      this.lastError = 'TIDB_PASSWORD not set in environment. Waiting for password to connect to cloud cluster.';
      console.log(`[TiDB Cloud] Configured for ${this.config.host}:${this.config.port} (User: ${this.config.user}). Set TIDB_PASSWORD to activate cloud connection.`);
      return false;
    }

    try {
      this.pool = mysql.createPool({
        host: this.config.host,
        port: this.config.port,
        user: this.config.user,
        password: this.config.password,
        database: this.config.database,
        ssl: {
          minVersion: 'TLSv1.2',
          rejectUnauthorized: true,
        },
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        connectTimeout: 15000,
      });

      // Test connection
      const connection = await this.pool.getConnection();
      console.log(`[TiDB Cloud] Successfully connected to ${this.config.host}:${this.config.port}/${this.config.database} (User: ${this.config.user})`);
      
      // Auto-migrate schema in TiDB
      await this.ensureSchema(connection);
      connection.release();

      this.isConnected = true;
      this.lastError = null;
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.lastError = msg;
      this.isConnected = false;
      console.warn(`[TiDB Cloud] Connection failed: ${msg}. Running on local persistent fallback storage.`);
      return false;
    }
  }

  private async ensureSchema(conn: mysql.PoolConnection) {
    // Create users table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at VARCHAR(64) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Create files table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS files (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        project_title VARCHAR(255),
        project_category VARCHAR(100),
        project_description TEXT,
        file_type VARCHAR(100) NOT NULL,
        file_size BIGINT NOT NULL,
        file_url VARCHAR(255) NOT NULL,
        upload_status VARCHAR(64) NOT NULL,
        created_at VARCHAR(64) NOT NULL,
        storage_path VARCHAR(500) NOT NULL,
        INDEX idx_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  }

  public getPool(): mysql.Pool | null {
    return this.pool;
  }
}

export const tidb = new TiDBClient();
