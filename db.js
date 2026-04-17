const mysql = require('mysql2/promise');
require('dotenv').config();

const databaseConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'uc_connect',
  connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT || 2000),
  waitForConnections: true,
  connectionLimit: 10,
  multipleStatements: true,
};

let pool;
let databaseReady;

async function getPool() {
  if (!pool) {
    pool = mysql.createPool(databaseConfig);
  }

  return pool;
}

async function query(sql, params = []) {
  const connectionPool = await getPool();
  const [rows] = await connectionPool.query(sql, params);
  return rows;
}

async function isDatabaseReady() {
  if (typeof databaseReady === 'boolean') {
    return databaseReady;
  }

  try {
    const connectionPool = await getPool();
    await connectionPool.query('SELECT 1');
    databaseReady = true;
  } catch (error) {
    databaseReady = false;
  }

  return databaseReady;
}

async function ensureSchema() {
  const connectionPool = await getPool();
  const schemaSql = `
    CREATE TABLE IF NOT EXISTS vendors (
      id INT AUTO_INCREMENT PRIMARY KEY,
      slug VARCHAR(120) NOT NULL UNIQUE,
      name VARCHAR(180) NOT NULL,
      category VARCHAR(120) NOT NULL,
      distance_km DECIMAL(5,2) NOT NULL DEFAULT 0,
      rating DECIMAL(2,1) NOT NULL DEFAULT 0,
      verified TINYINT(1) NOT NULL DEFAULT 1,
      image_url TEXT,
      summary TEXT,
      featured_rank INT NOT NULL DEFAULT 100,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      full_name VARCHAR(180) NOT NULL,
      email VARCHAR(180) NOT NULL UNIQUE,
      phone VARCHAR(50) NULL,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('customer', 'vendor', 'admin') NOT NULL DEFAULT 'customer',
      city VARCHAR(120) NOT NULL DEFAULT 'Surabaya Barat',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS forum_threads (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      author VARCHAR(180) NOT NULL,
      replies INT NOT NULL DEFAULT 0,
      likes INT NOT NULL DEFAULT 0,
      category VARCHAR(120) NOT NULL,
      excerpt TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await connectionPool.query(schemaSql);
}

module.exports = {
  query,
  isDatabaseReady,
  ensureSchema,
};