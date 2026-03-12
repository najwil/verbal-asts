import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const db = mysql.createPool({
  // Mengambil dari .env, jika .env kosong baru pakai default setelah tanda ||
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "db_verbal_asts", // Sesuaikan defaultnya di sini
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Tes Koneksi
db.getConnection()
  .then((connection) => {
    console.log(
      `Database ${process.env.DB_NAME || "db_verbal_asts"} Terkoneksi!`,
    );
    connection.release();
  })
  .catch((err) => {
    console.error("Gagal Tersambung ke database: ", err.message);
  });

export default db;
