import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";

function AdminJadwal() {
  const [listJadwal, setListJadwal] = useState([]);
  const [listMapel, setListMapel] = useState([]);
  const [listGuru, setListGuru] = useState([]);
  const [listKelas, setListKelas] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);

  // State Form (Tambah & Edit)
  const [idGuru, setIdGuru] = useState("");
  const [idMapel, setIdMapel] = useState("");
  const [selectedKelas, setSelectedKelas] = useState([]);
  const [editingId, setEditingId] = useState(null);

  // State Upload Excel
  const [fileExcel, setFileExcel] = useState(null);
  const [uploading, setUploading] = useState(false);

  // State Search
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // State Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(50);

  const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
  });

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchData = async () => {
    try {
      const [resJadwal, resMapel, resGuru, resKelas] = await Promise.all([
        axios.get("http://localhost:5000/api/jadwal"),
        axios.get("http://localhost:5000/api/mapel"),
        axios.get("http://localhost:5000/api/users/guru"),
        axios.get("http://localhost:5000/api/kelas"),
      ]);
      setListJadwal(resJadwal.data);
      setListMapel(resMapel.data);
      setListGuru(resGuru.data);
      setListKelas(resKelas.data);
    } catch (err) {
      console.error("Gagal mengambil data", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleReset = () => {
    setEditingId(null);
    setIdGuru("");
    setIdMapel("");
    setSelectedKelas([]);
    setFileExcel(null);
  };

  const closeModal = (id) => {
    const btnClose = document.querySelector(`#${id} [data-bs-dismiss="modal"]`);
    if (btnClose) btnClose.click();
  };

  // --- LOGIKA EXCEL ---
  const downloadTemplate = () => {
    const headers = ["Nama Kelas", ...listMapel.map((m) => m.nama_mapel)];
    const rows = listKelas.map((k) => [k.nama_kelas]);
    const wsMatriks = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const refGuru = [
      ["ID GURU", "NAMA GURU"],
      ...listGuru.map((g) => [g.id, g.nama_lengkap]),
    ];
    const wsGuru = XLSX.utils.aoa_to_sheet(refGuru);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, wsMatriks, "Input Jadwal");
    XLSX.utils.book_append_sheet(workbook, wsGuru, "Daftar ID Guru");
    XLSX.writeFile(workbook, "Template_Jadwal_Ujian.xlsx");
  };

  const processAndUploadExcel = () => {
    if (!fileExcel)
      return Swal.fire("Peringatan", "Pilih file terlebih dahulu!", "warning");
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
        const headers = data[0];
        const rows = data.slice(1);
        const finalPayload = [];

        rows.forEach((row) => {
          const namaKelas = row[0];
          if (!namaKelas) return;
          const kelasObj = listKelas.find(
            (k) =>
              String(k.nama_kelas).trim().toLowerCase() ===
              String(namaKelas).trim().toLowerCase(),
          );
          if (kelasObj) {
            for (let i = 1; i < headers.length; i++) {
              const namaMapel = headers[i];
              const idGuruInput = row[i];
              const mapelObj = listMapel.find(
                (m) =>
                  String(m.nama_mapel).trim().toLowerCase() ===
                  String(namaMapel).trim().toLowerCase(),
              );
              if (mapelObj && idGuruInput) {
                finalPayload.push([
                  null,
                  mapelObj.id,
                  parseInt(idGuruInput),
                  kelasObj.id,
                ]);
              }
            }
          }
        });

        await axios.post("http://localhost:5000/api/jadwal/bulk", {
          dataJadwal: finalPayload,
        });
        setUploading(false);
        closeModal("modalUploadJadwal");
        Swal.fire("Berhasil", "Jadwal berhasil diimpor", "success");
        fetchData();
      } catch (err) {
        setUploading(false);
        Swal.fire("Gagal", "Kesalahan: " + err.message, "error");
      }
    };
    reader.readAsBinaryString(fileExcel);
  };

  // --- CRUD ---
  const handleSaveManual = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        // PERBAIKAN: Fungsi Edit (PUT)
        await axios.put(`http://localhost:5000/api/jadwal/${editingId}`, {
          id_mapel: Number(idMapel),
          id_guru: Number(idGuru),
        });
        Toast.fire({ icon: "success", title: "Jadwal diperbarui" });
      } else {
        // Tambah Manual (POST)
        if (selectedKelas.length === 0)
          return Swal.fire(
            "Peringatan",
            "Pilih minimal satu kelas!",
            "warning",
          );

        const dataJadwal = selectedKelas.map((kId) => [
          null,
          Number(idMapel),
          Number(idGuru),
          Number(kId),
        ]);
        await axios.post("http://localhost:5000/api/jadwal/bulk", {
          dataJadwal,
        });
        Toast.fire({ icon: "success", title: "Jadwal ditambahkan" });
      }
      fetchData();
      closeModal("modalManualJadwal");
      handleReset();
    } catch (err) {
      Swal.fire("Gagal", "Terjadi kesalahan saat menyimpan data.", "error");
    }
  };

  const handleDelete = async (idVal) => {
    const isMultiple = Array.isArray(idVal);
    const result = await Swal.fire({
      title: isMultiple ? `Hapus ${idVal.length} data?` : "Hapus data ini?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Ya, Hapus!",
    });
    if (result.isConfirmed) {
      try {
        if (isMultiple)
          await Promise.all(
            idVal.map((id) =>
              axios.delete(`http://localhost:5000/api/jadwal/${id}`),
            ),
          );
        else await axios.delete(`http://localhost:5000/api/jadwal/${idVal}`);
        fetchData();
        setSelectedIds([]);
        Toast.fire({ icon: "success", title: "Berhasil dihapus" });
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleEdit = (j) => {
    setEditingId(j.id);
    setIdGuru(j.id_guru);
    setIdMapel(j.id_mapel);
    // Info kelas hanya untuk tampilan label (opsional)
    setSelectedKelas([j.id_kelas]);
  };

  // --- DATA PROCESSING ---
  const processedJadwal = useMemo(() => {
    return listJadwal.filter((j) => {
      return (
        j.nama_mapel.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        j.nama_guru.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        j.nama_kelas.toLowerCase().includes(debouncedSearch.toLowerCase())
      );
    });
  }, [listJadwal, debouncedSearch]);

  const currentRows = processedJadwal.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage,
  );
  const totalPages = Math.ceil(processedJadwal.length / rowsPerPage);

  const navyHeaderStyle = {
    backgroundColor: "#001f3f",
    color: "#ffffff",
    border: "none",
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="fw-bold text-dark">Kelola Jadwal</h3>
      </div>

      <div className="row">
        <div className="col-12 text-dark">
          <div className="card shadow-sm p-3 mb-4 border-0">
            <div className="d-flex flex-wrap gap-2 align-items-center">
              <div className="fw-bold text-muted small text-uppercase me-2">
                Atur Jadwal:
              </div>
              <button
                className="btn btn-primary px-4 shadow-sm fw-bold"
                data-bs-toggle="modal"
                data-bs-target="#modalManualJadwal"
                onClick={handleReset}
              >
                <i className="bi bi-plus-lg me-2"></i>Manual
              </button>
              <button
                className="btn btn-success px-4 shadow-sm fw-bold"
                data-bs-toggle="modal"
                data-bs-target="#modalUploadJadwal"
                onClick={handleReset}
              >
                <i className="bi bi-file-earmark-excel me-2"></i>Import
              </button>
            </div>
          </div>

          <div className="card shadow-sm p-4 border-0">
            <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
              <h5 className="mb-0 fw-bold">
                Daftar Jadwal{" "}
                <span className="badge bg-light text-primary border ms-2">
                  {processedJadwal.length}
                </span>
              </h5>

              <div className="d-flex gap-2 align-items-center">
                <div className="input-group" style={{ maxWidth: "250px" }}>
                  <span className="input-group-text bg-white border-end-0">
                    <i className="bi bi-search"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control border-start-0 ps-0 shadow-none"
                    placeholder="Cari..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                {selectedIds.length > 0 && (
                  <button
                    className="btn btn-danger btn-sm px-3 fw-bold"
                    onClick={() => handleDelete(selectedIds)}
                  >
                    Hapus Terpilih ({selectedIds.length})
                  </button>
                )}
              </div>
            </div>

            <div className="table-responsive">
              <table className="table table-hover align-middle border">
                <thead>
                  <tr>
                    <th
                      className="text-center"
                      style={{ ...navyHeaderStyle, width: "40px" }}
                    >
                      <input
                        type="checkbox"
                        className="form-check-input border-light"
                        checked={
                          currentRows.length > 0 &&
                          selectedIds.length === currentRows.length
                        }
                        onChange={() =>
                          setSelectedIds(
                            selectedIds.length === currentRows.length
                              ? []
                              : currentRows.map((j) => j.id),
                          )
                        }
                      />
                    </th>
                    <th style={navyHeaderStyle}>Mata Pelajaran</th>
                    <th style={navyHeaderStyle}>Guru Penguji</th>
                    <th style={navyHeaderStyle}>Kelas</th>
                    <th className="text-center" style={navyHeaderStyle}>
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentRows.map((j) => (
                    <tr key={j.id}>
                      <td className="text-center">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={selectedIds.includes(j.id)}
                          onChange={() =>
                            setSelectedIds((prev) =>
                              prev.includes(j.id)
                                ? prev.filter((i) => i !== j.id)
                                : [...prev, j.id],
                            )
                          }
                        />
                      </td>
                      <td className="fw-bold text-dark">{j.nama_mapel}</td>
                      <td>{j.nama_guru}</td>
                      <td>
                        <span className="badge bg-info-subtle text-info border">
                          {j.nama_kelas}
                        </span>
                      </td>
                      <td
                        className="text-center"
                        style={{ whiteSpace: "nowrap" }}
                      >
                        <button
                          className="btn btn-warning btn-sm fw-bold me-2 px-3"
                          data-bs-toggle="modal"
                          data-bs-target="#modalManualJadwal"
                          onClick={() => handleEdit(j)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-danger btn-sm fw-bold px-3"
                          onClick={() => handleDelete(j.id)}
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                  {currentRows.length === 0 && (
                    <tr>
                      <td
                        colSpan="5"
                        className="text-center py-5 text-muted fst-italic"
                      >
                        Data tidak ditemukan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="d-flex justify-content-between align-items-center mt-4">
              <small className="text-muted">
                Halaman {currentPage} dari {totalPages}
              </small>
              <nav>
                <ul className="pagination pagination-sm mb-0 shadow-sm">
                  <li
                    className={`page-item ${currentPage === 1 ? "disabled" : ""}`}
                  >
                    <button
                      className="page-link"
                      onClick={() => setCurrentPage((p) => p - 1)}
                    >
                      Prev
                    </button>
                  </li>
                  <li
                    className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}
                  >
                    <button
                      className="page-link"
                      onClick={() => setCurrentPage((p) => p + 1)}
                    >
                      Next
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL MANUAL JADWAL */}
      <div
        className="modal fade"
        id="modalManualJadwal"
        tabIndex="-1"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow-lg text-dark">
            <form onSubmit={handleSaveManual}>
              <div className="modal-header bg-primary text-white border-0">
                <h5 className="modal-title fw-bold">
                  {editingId ? "Edit Jadwal" : "Tambah Jadwal Manual"}
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  data-bs-dismiss="modal"
                  onClick={handleReset}
                ></button>
              </div>
              <div className="modal-body p-4">
                <div className="mb-3">
                  <label className="form-label small fw-bold text-secondary">
                    Guru Penguji
                  </label>
                  <select
                    className="form-select"
                    value={idGuru}
                    onChange={(e) => setIdGuru(e.target.value)}
                    required
                  >
                    <option value="">-- Pilih Guru --</option>
                    {listGuru.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.nama_lengkap}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-bold text-secondary">
                    Mata Pelajaran
                  </label>
                  <select
                    className="form-select"
                    value={idMapel}
                    onChange={(e) => setIdMapel(e.target.value)}
                    required
                  >
                    <option value="">-- Pilih Mapel --</option>
                    {listMapel.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nama_mapel}
                      </option>
                    ))}
                  </select>
                </div>

                {editingId ? (
                  <div className="mb-3">
                    <label className="form-label small fw-bold text-muted">
                      Kelas (Tidak bisa diedit)
                    </label>
                    <input
                      type="text"
                      className="form-control bg-light"
                      value={
                        listJadwal.find((j) => j.id === editingId)
                          ?.nama_kelas || ""
                      }
                      disabled
                    />
                  </div>
                ) : (
                  <div className="mb-3">
                    <label className="form-label small fw-bold text-secondary">
                      Pilih Kelas
                    </label>
                    <div
                      className="border rounded p-2 bg-light"
                      style={{ maxHeight: "150px", overflowY: "auto" }}
                    >
                      {listKelas.map((k) => (
                        <div key={k.id} className="form-check small">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            checked={selectedKelas.includes(k.id)}
                            onChange={() =>
                              setSelectedKelas((prev) =>
                                prev.includes(k.id)
                                  ? prev.filter((i) => i !== k.id)
                                  : [...prev, k.id],
                              )
                            }
                          />
                          <label className="form-check-label">
                            {k.nama_kelas}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer border-0">
                <button
                  type="button"
                  className="btn btn-light fw-bold"
                  data-bs-dismiss="modal"
                  onClick={handleReset}
                >
                  Batal
                </button>
                <button type="submit" className="btn btn-primary fw-bold px-4">
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* MODAL UPLOAD JADWAL */}
      <div
        className="modal fade"
        id="modalUploadJadwal"
        tabIndex="-1"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered text-dark">
          <div className="modal-content border-0 shadow-lg">
            <div className="modal-header bg-success text-white border-0">
              <h5 className="modal-title fw-bold">Import Data Jadwal</h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                data-bs-dismiss="modal"
                onClick={handleReset}
              ></button>
            </div>
            <div className="modal-body p-4 text-center">
              <button
                className="btn btn-outline-primary btn-sm fw-bold mb-4"
                onClick={downloadTemplate}
              >
                <i className="bi bi-download me-1"></i> Unduh Template
              </button>
              <div className="bg-light p-4 border-dashed rounded text-dark">
                <input
                  type="file"
                  className="form-control"
                  accept=".xlsx, .xls"
                  onChange={(e) => setFileExcel(e.target.files[0])}
                />
              </div>
            </div>
            <div className="modal-footer border-0">
              <button
                type="button"
                className="btn btn-light fw-bold"
                data-bs-dismiss="modal"
                onClick={handleReset}
              >
                Batal
              </button>
              <button
                className="btn btn-success fw-bold px-4 shadow-sm"
                onClick={processAndUploadExcel}
                disabled={uploading || !fileExcel}
              >
                {uploading ? "Memproses..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminJadwal;
