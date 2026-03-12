import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const db = mysql.createPool({
  // Baris di bawah akan mencoba membaca variabel Railway dulu,
  // jika tidak ada baru membaca variabel dari file .env kamu.
  host: process.env.MYSQLHOST || process.env.DB_HOST || "localhost",
  user: process.env.MYSQLUSER || process.env.DB_USER || "root",
  password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || "",
  database: process.env.MYSQLDATABASE || process.env.DB_NAME || "db_schnw",
  port: process.env.MYSQLPORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Tes Koneksi
db.getConnection()
  .then((connection) => {
    console.log("Database MySQL Terkoneksi!");
    connection.release();
  })
  .catch((err) => {
    console.error("Gagal Tersambung ke database: ", err);
  });

export default db;
