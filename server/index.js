import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import db from "./db.js";

dotenv.config();
const app = express();

// Konfigurasi Middleware
// Mengembalikan settingan CORS ke localhost:5173 agar lebih aman dan stabil di komputer sendiri
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

app.use(express.json()); // Mengizinkan server menerima dan membaca data berformat JSON di body request

// ================= API LOGIN =================
/**
 * Endpoint untuk menangani proses autentikasi pengguna.
 * Memeriksa kecocokan username dan password di tabel 'users'.
 */
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const [rows] = await db.execute(
      "SELECT * FROM users WHERE username = ? AND password = ?",
      [username, password],
    );
    if (rows.length > 0) {
      const user = rows[0];
      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          nama: user.nama_lengkap,
          role: user.role,
        },
      });
    } else {
      res
        .status(401)
        .json({ success: false, message: "Username atau Password salah!" });
    }
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Terjadi kesalahan server" });
  }
});

// ================= API KHUSUS PANEL GURU =================

/**
 * Mendapatkan daftar jadwal mengajar berdasarkan ID Guru.
 * Menggabungkan (JOIN) tabel jadwal dengan mapel dan kelas untuk informasi yang lengkap.
 */
app.get("/api/jadwal/guru/:id_guru", async (req, res) => {
  const { id_guru } = req.params;
  try {
    const [rows] = await db.execute(
      `SELECT j.*, m.nama_mapel, k.nama_kelas 
       FROM jadwal j
       JOIN mapel m ON j.id_mapel = m.id 
       JOIN kelas k ON j.id_kelas = k.id 
       WHERE j.id_guru = ?`,
      [id_guru],
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Mendapatkan daftar siswa yang terdaftar di kelas tertentu.
 * Digunakan untuk menampilkan daftar input nilai oleh guru.
 */
app.get("/api/siswa/kelas/:id_kelas", async (req, res) => {
  const { id_kelas } = req.params;
  try {
    const [rows] = await db.execute(
      "SELECT nis as id, nama_siswa as nama_lengkap FROM siswa WHERE id_kelas = ? ORDER BY nama_siswa ASC",
      [id_kelas],
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Menyimpan nilai siswa dalam jumlah banyak sekaligus (Massal).
 * Menghitung total dari L1, L2, L3 dan melakukan pembaharuan otomatis
 * jika data siswa pada jadwal tersebut sudah ada (ON DUPLICATE KEY UPDATE).
 */
app.post("/api/nilai/bulk", async (req, res) => {
  const { dataNilai } = req.body;
  try {
    const values = dataNilai.map((n) => {
      const l1 = Number(n.l1) || 0;
      const l2 = Number(n.l2) || 0;
      const l3 = Number(n.l3) || 0;
      const total = l1 + l2 + l3;
      return [n.id_jadwal, n.id_siswa, l1, l2, l3, total];
    });

    const query = `
      INSERT INTO nilai (id_jadwal, id_siswa, l1, l2, l3, total) 
      VALUES ? 
      ON DUPLICATE KEY UPDATE 
      l1 = VALUES(l1), 
      l2 = VALUES(l2), 
      l3 = VALUES(l3),
      total = VALUES(total)
    `;

    await db.query(query, [values]);
    res.json({ success: true, message: "Nilai berhasil disimpan!" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "Gagal menyimpan nilai ke database" });
  }
});

/**
 * Mendapatkan data nilai yang sudah tersimpan berdasarkan ID Jadwal tertentu.
 * Digunakan untuk mengisi kembali form input nilai yang sudah ada datanya.
 */
app.get("/api/nilai/:id_jadwal", async (req, res) => {
  const { id_jadwal } = req.params;
  try {
    const [rows] = await db.execute(
      "SELECT id_siswa, l1, l2, l3, total FROM nilai WHERE id_jadwal = ?",
      [id_jadwal],
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ================= HAPUS NILAI MASSAL (REKAP ADMIN) =================
/**
 * Menghapus data nilai secara massal berdasarkan filter Kelas dan Mapel.
 * Melakukan pencarian ID Jadwal terlebih dahulu sebelum melakukan penghapusan di tabel 'nilai'.
 */
app.delete("/api/nilai/massal/hapus", async (req, res) => {
  const { id_kelas, id_mapel } = req.query;

  try {
    if (!id_kelas || !id_mapel) {
      return res
        .status(400)
        .json({ success: false, message: "Filter tidak lengkap" });
    }

    const cleanKelas = id_kelas
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id !== "")
      .join(",");
    const cleanMapel = id_mapel
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id !== "")
      .join(",");

    console.log("DEBUG: Proses Hapus Massal...");

    // 1. Cari semua ID Jadwal yang cocok dengan filter Kelas dan Mapel
    const [jadwalRows] = await db.execute(`
      SELECT id FROM jadwal 
      WHERE id_kelas IN (${cleanKelas}) 
      AND id_mapel IN (${cleanMapel})
    `);

    if (jadwalRows.length === 0) {
      return res.json({
        success: true,
        affectedRows: 0,
        message: "Tidak ditemukan jadwal untuk filter ini.",
      });
    }

    const targetJadwalIds = jadwalRows.map((row) => row.id).join(",");

    // 2. Eksekusi Penghapusan di tabel 'nilai' berdasarkan ID Jadwal yang ditemukan
    const [result] = await db.execute(`
      DELETE FROM nilai WHERE id_jadwal IN (${targetJadwalIds})
    `);

    res.json({
      success: true,
      affectedRows: result.affectedRows,
      message: `${result.affectedRows} data nilai rekap berhasil dihapus.`,
    });
  } catch (error) {
    console.error("Error Delete Massal:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Menghapus data nilai individu siswa berdasarkan ID Jadwal dan ID Siswa.
 */
app.delete("/api/nilai/:id_jadwal/:id_siswa", async (req, res) => {
  const { id_jadwal, id_siswa } = req.params;
  try {
    await db.execute("DELETE FROM nilai WHERE id_jadwal = ? AND id_siswa = ?", [
      id_jadwal,
      id_siswa,
    ]);
    res.json({ success: true, message: "Nilai berhasil dihapus" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ================= API KELAS =================

/**
 * Mengambil semua daftar kelas untuk kebutuhan menu Admin.
 */
app.get("/api/kelas", async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT * FROM kelas ORDER BY tingkat ASC, nama_kelas ASC",
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Menambahkan data kelas dalam jumlah banyak sekaligus (Massal).
 */
app.post("/api/kelas/bulk", async (req, res) => {
  const { dataKelas } = req.body;
  try {
    const query = "INSERT INTO kelas (id, tingkat, nama_kelas) VALUES ?";
    const [result] = await db.query(query, [dataKelas]);
    res.json({
      success: true,
      message: `${result.affectedRows} kelas berhasil ditambahkan!`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal: ID sudah ada" });
  }
});

/**
 * Memperbaharui data kelas berdasarkan ID.
 */
app.put("/api/kelas/:id", async (req, res) => {
  const { id } = req.params;
  const { tingkat, nama_kelas } = req.body;
  try {
    await db.execute(
      "UPDATE kelas SET tingkat = ?, nama_kelas = ? WHERE id = ?",
      [tingkat, nama_kelas, id],
    );
    res.json({ success: true, message: "Kelas diperbarui" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Menghapus data kelas. Gagal jika kelas masih memiliki keterkaitan data (Foreign Key).
 */
app.delete("/api/kelas/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await db.execute("DELETE FROM kelas WHERE id = ?", [id]);
    res.json({ success: true });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Gagal hapus: Data masih digunakan" });
  }
});

// ================= API SISWA =================

/**
 * Mengambil daftar seluruh siswa beserta nama kelas dan tingkatnya.
 */
app.get("/api/siswa", async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT siswa.*, kelas.nama_kelas, kelas.tingkat 
      FROM siswa 
      LEFT JOIN kelas ON siswa.id_kelas = kelas.id
      ORDER BY siswa.nis ASC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Menambahkan data siswa dalam jumlah banyak sekaligus (Massal).
 */
app.post("/api/siswa/bulk", async (req, res) => {
  const { dataSiswa } = req.body;
  try {
    const query =
      "INSERT INTO siswa (nis, nama_siswa, jenis_kelamin, id_kelas) VALUES ?";
    const [result] = await db.query(query, [dataSiswa]);
    res.json({
      success: true,
      message: `${result.affectedRows} siswa berhasil ditambahkan!`,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Cek duplikasi NIS atau ID Kelas" });
  }
});

/**
 * Menghapus data siswa berdasarkan Nomor Induk Siswa (NIS).
 */
app.delete("/api/siswa/:nis", async (req, res) => {
  const { nis } = req.params;
  try {
    await db.execute("DELETE FROM siswa WHERE nis = ?", [nis]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ================= API USERS (GURU) =================

/**
 * Mengambil daftar pengguna yang memiliki role 'guru'.
 */
app.get("/api/users/guru", async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT id, username, password, nama_lengkap, role FROM users WHERE role = 'guru' ORDER BY id ASC",
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Menambahkan data pengguna/guru dalam jumlah banyak sekaligus (Massal).
 */
app.post("/api/users/bulk", async (req, res) => {
  const { dataUser } = req.body;
  try {
    const query =
      "INSERT INTO users (id, username, password, nama_lengkap, role) VALUES ?";
    await db.query(query, [dataUser]);
    res.json({ success: true, message: "Data guru berhasil ditambahkan!" });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Gagal: Duplikasi ID/Username" });
  }
});

/**
 * Memperbaharui data pengguna/guru berdasarkan ID.
 */
app.put("/api/users/:id", async (req, res) => {
  const { id } = req.params;
  const { username, password, nama_lengkap, role } = req.body;
  try {
    await db.execute(
      "UPDATE users SET username = ?, password = ?, nama_lengkap = ?, role = ? WHERE id = ?",
      [username, password, nama_lengkap, role, id],
    );
    res.json({ success: true, message: "Data guru diperbarui" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Menghapus data pengguna/guru. Gagal jika guru tersebut sudah terdaftar di jadwal mengajar.
 */
app.delete("/api/users/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await db.execute("DELETE FROM users WHERE id = ?", [id]);
    res.json({ success: true });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Gagal hapus: Data terelasi" });
  }
});

// ================= API MAPEL =================

/**
 * Mengambil daftar seluruh mata pelajaran.
 */
app.get("/api/mapel", async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT * FROM mapel ORDER BY nama_mapel ASC",
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Menambahkan data mata pelajaran dalam jumlah banyak sekaligus (Massal).
 */
app.post("/api/mapel/bulk", async (req, res) => {
  const { dataMapel } = req.body;
  try {
    const query = "INSERT INTO mapel (id, nama_mapel) VALUES ?";
    await db.query(query, [dataMapel]);
    res.json({ success: true, message: "Mapel berhasil ditambahkan!" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal simpan mapel" });
  }
});

/**
 * Menghapus mata pelajaran berdasarkan ID.
 */
app.delete("/api/mapel/:id", async (req, res) => {
  try {
    await db.execute("DELETE FROM mapel WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Gagal: Terelasi dengan jadwal" });
  }
});

// ================= API JADWAL =================

/**
 * Mengambil seluruh data jadwal lengkap dengan JOIN ke mapel, users(guru), dan kelas.
 */
app.get("/api/jadwal", async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT j.id, j.id_mapel, j.id_guru, j.id_kelas, m.nama_mapel, u.nama_lengkap AS nama_guru, k.nama_kelas
      FROM jadwal j
      JOIN mapel m ON j.id_mapel = m.id
      JOIN users u ON j.id_guru = u.id
      JOIN kelas k ON j.id_kelas = k.id
      ORDER BY j.id ASC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Menghapus jadwal berdasarkan ID.
 */
app.delete("/api/jadwal/:id", async (req, res) => {
  try {
    await db.execute("DELETE FROM jadwal WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ================= API JADWAL (BULK INSERT/UPDATE) =================
/**
 * Menyimpan banyak jadwal sekaligus.
 * Menggunakan ON DUPLICATE KEY UPDATE agar jika kombinasi Mapel dan Kelas sudah ada,
 * maka hanya Guru pengujinya saja yang diperbarui.
 */
app.post("/api/jadwal/bulk", async (req, res) => {
  const { dataJadwal } = req.body;
  try {
    if (!dataJadwal || dataJadwal.length === 0) {
      return res.status(400).json({ success: false, message: "Data kosong" });
    }

    const query = `
      INSERT INTO jadwal (id, id_mapel, id_guru, id_kelas) 
      VALUES ? 
      ON DUPLICATE KEY UPDATE id_guru = VALUES(id_guru)
    `;

    const [result] = await db.query(query, [dataJadwal]);
    res.json({
      success: true,
      message: `${result.affectedRows} data jadwal berhasil diproses!`,
    });
  } catch (error) {
    console.error("Error Bulk Jadwal:", error);
    res.status(500).json({
      success: false,
      message: "Gagal simpan jadwal: " + error.message,
    });
  }
});

/**
 * Memperbarui data jadwal (Edit).
 * Digunakan untuk mengganti Guru atau Mata Pelajaran pada jadwal yang sudah ada.
 */
app.put("/api/jadwal/:id", async (req, res) => {
  const { id } = req.params;
  const { id_mapel, id_guru } = req.body;
  try {
    await db.execute(
      "UPDATE jadwal SET id_mapel = ?, id_guru = ? WHERE id = ?",
      [id_mapel, id_guru, id],
    );
    res.json({ success: true, message: "Jadwal berhasil diperbarui" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ================= REKAP NILAI UNTUK ADMIN =================

/**
 * Menghasilkan rekap nilai lengkap berdasarkan filter Kelas dan Mapel yang dipilih.
 * Menggunakan JOIN dan CROSS JOIN untuk memetakan nilai ke setiap siswa pada mapel yang difilter.
 */
app.get("/api/rekap-nilai", async (req, res) => {
  const { id_kelas, id_mapel } = req.query;

  try {
    if (!id_kelas || !id_mapel) {
      return res.status(400).json({ error: "Filter diperlukan" });
    }

    const cleanKelas =
      id_kelas
        .split(",")
        .map((id) => id.trim())
        .filter((id) => id !== "")
        .join(",") || "0";
    const cleanMapel =
      id_mapel
        .split(",")
        .map((id) => id.trim())
        .filter((id) => id !== "")
        .join(",") || "0";

    const sql = `
      SELECT 
        s.nis, 
        s.nama_siswa, 
        s.jenis_kelamin, 
        k.nama_kelas,
        k.tingkat,
        m.id as id_mapel,
        m.nama_mapel,
        IFNULL(n.total, 0) as total
      FROM siswa s
      JOIN kelas k ON s.id_kelas = k.id
      CROSS JOIN mapel m 
      LEFT JOIN jadwal j ON j.id_kelas = k.id AND j.id_mapel = m.id
      LEFT JOIN nilai n ON n.id_siswa = s.nis AND n.id_jadwal = j.id
      WHERE s.id_kelas IN (${cleanKelas}) 
        AND m.id IN (${cleanMapel})
      ORDER BY k.tingkat ASC, k.nama_kelas ASC, s.nama_siswa ASC
    `;

    const [rows] = await db.execute(sql);
    res.json(rows);
  } catch (error) {
    console.error("Error Rekap:", error);
    res.status(500).json({ error: error.message });
  }
});

// ================= RUN SERVER =================
/**
 * Menjalankan server Express pada port yang ditentukan (default: 5000).
 */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server Running on Port ${PORT}`);
});
