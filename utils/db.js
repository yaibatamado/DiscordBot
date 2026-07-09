const defaultSql = require('mssql');

let poolPromise;
let activeSql;

const boolFromEnv = (value, fallback = false) => {
  if (value === undefined) return fallback;
  return value === 'true' || value === '1';
};

const getConfig = () => {
  const server = process.env.DB_SERVER;
  const database = process.env.DB_NAME;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const auth = (process.env.DB_AUTH || 'sql').toLowerCase();

  if (!server || !database) {
    throw new Error('Missing SQL Server env: DB_SERVER, DB_NAME');
  }

  if (auth === 'windows') {
    const driver = process.env.DB_DRIVER || 'ODBC Driver 17 for SQL Server';
    const encrypt = boolFromEnv(process.env.DB_ENCRYPT, false) ? 'yes' : 'no';
    const trustServerCertificate = boolFromEnv(process.env.DB_TRUST_SERVER_CERTIFICATE, true) ? 'yes' : 'no';

    return {
      connectionString: [
        `Driver={${driver}}`,
        `Server=${server}`,
        `Database=${database}`,
        'Trusted_Connection=yes',
        `Encrypt=${encrypt}`,
        `TrustServerCertificate=${trustServerCertificate}`,
      ].join(';'),
      server,
      database,
      driver: 'msnodesqlv8',
      options: {
        trustedConnection: true,
        encrypt: boolFromEnv(process.env.DB_ENCRYPT, false),
        trustServerCertificate: boolFromEnv(process.env.DB_TRUST_SERVER_CERTIFICATE, true),
      },
    };
  }

  if (!user || !password) {
    throw new Error('Missing SQL Server env: DB_USER, DB_PASSWORD');
  }

  return {
    server,
    port: Number(process.env.DB_PORT || 1433),
    user,
    password,
    database,
    options: {
      encrypt: boolFromEnv(process.env.DB_ENCRYPT, false),
      trustServerCertificate: boolFromEnv(process.env.DB_TRUST_SERVER_CERTIFICATE, true),
    },
  };
};

const getPool = () => {
  if (!poolPromise) {
    const config = getConfig();
    const windowsSql = config.driver === 'msnodesqlv8'
      ? require('mssql/msnodesqlv8')
      : null;
    activeSql = config.driver === 'msnodesqlv8' ? windowsSql : defaultSql;
    poolPromise = activeSql.connect(config);
  }

  return poolPromise;
};

const testConnection = async () => {
  const pool = await getPool();
  const result = await pool.request().query('SELECT 1 AS ok');

  return result.recordset[0].ok === 1;
};

module.exports = {
  getConfig,
  getPool,
  testConnection,
};
