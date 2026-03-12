import { useState, useEffect } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import Swal from "sweetalert2";

function AdminKelas() {
  const [listKelas, setListKelas] = useState([]);
  const [fileName, setFileName] = useState("");
  const [dataImport, setDataImport] = useState([]);

  // State Form
  const [idInput, setIdInput] = useState("");
  const [tingkat, setTingkat] = useState("");
  const [namaKelas, setNamaKelas] = useState("");
  const [editingId, setEditingId] = useState(null);

  // State Checkbox
  const [selectedIds, setSelectedIds] = useState([]);

  // Konfigurasi SweetAlert Toast
  const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
  });

  const fetchKelas = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/kelas");
      setListKelas(res.data);
      setSelectedIds([]);
    } catch (err) {
      console.error("Gagal ambil data kelas");
    }
  };

  useEffect(() => {
    fetchKelas();
  }, []);

  const closeModal = (id) => {
    const modalElement = document.getElementById(id);
    if (modalElement) {
      const modalInstance = window.bootstrap?.Modal.getInstance(modalElement);
      if (modalInstance) modalInstance.hide();
      else modalElement.querySelector('[data-bs-dismiss="modal"]')?.click();
    }
  };

  const handleReset = () => {
    setEditingId(null);
    setIdInput("");
    setTingkat("");
    setNamaKelas("");
    setFileName("");
    setDataImport([]);
    if (document.getElementById("fileKelas"))
      document.getElementById("fileKelas").value = "";
  };

  // --- CRUD Functions ---
  const handleSaveManual = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`http://localhost:5000/api/kelas/${editingId}`, {
          tingkat: String(tingkat),
          nama_kelas: namaKelas,
        });
        Toast.fire({ icon: "success", title: "Kelas berhasil diperbarui" });
      } else {
        await axios.post("http://localhost:5000/api/kelas/bulk", {
          dataKelas: [[Number(idInput), String(tingkat), namaKelas]],
        });
        Toast.fire({ icon: "success", title: "Kelas berhasil ditambahkan" });
      }
      fetchKelas();
      closeModal("modalManualKelas");
      handleReset();
    } catch (err) {
      Swal.fire(
        "Gagal",
        "Cek apakah ID sudah ada atau server bermasalah.",
        "error",
      );
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Hapus Kelas?",
      text: "Data yang dihapus tidak bisa dikembalikan!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Ya, Hapus!",
      cancelButtonText: "Batal",
    });

    if (result.isConfirmed) {
      try {
        await axios.delete(`http://localhost:5000/api/kelas/${id}`);
        fetchKelas();
        Toast.fire({ icon: "success", title: "Kelas berhasil dihapus" });
      } catch (err) {
        Swal.fire(
          "Gagal",
          "Kelas mungkin masih digunakan oleh data siswa.",
          "error",
        );
      }
    }
  };

  const handleHapusTerpilih = async () => {
    const result = await Swal.fire({
      title: "Hapus Kelas?",
      text: `Hapus ${selectedIds.length} kelas yang dipilih?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Ya, Hapus Semua!",
    });

    if (result.isConfirmed) {
      try {
        await Promise.all(
          selectedIds.map((id) =>
            axios.delete(`http://localhost:5000/api/kelas/${id}`),
          ),
        );
        fetchKelas();
        Toast.fire({ icon: "success", title: "Data terpilih dihapus" });
      } catch (err) {
        Swal.fire(
          "Error",
          "Beberapa kelas gagal dihapus (masih digunakan).",
          "error",
        );
      }
    }
  };

  const handleEdit = (k) => {
    setEditingId(k.id);
    setIdInput(k.id);
    setTingkat(k.tingkat);
    setNamaKelas(k.nama_kelas);
  };

  // --- Excel Logic ---
  const downloadTemplate = () => {
    const template = [{ id: 1, tingkat: "10", nama_kelas: "10-IPA-1" }];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "template_kelas.xlsx");
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 });
      const cleanData = rawData
        .slice(1)
        .map((row) => [
          Number(row[0]),
          String(row[1] || "").trim(),
          String(row[2] || "").trim(),
        ])
        .filter(
          (row) =>
            row[0] && ["10", "11", "12"].includes(row[1]) && row[2] !== "",
        );
      setDataImport(cleanData);
    };
    reader.readAsBinaryString(file);
  };

  const handleSaveImport = async () => {
    try {
      await axios.post("http://localhost:5000/api/kelas/bulk", {
        dataKelas: dataImport,
      });
      Toast.fire({
        icon: "success",
        title: `Berhasil impor ${dataImport.length} kelas`,
      });
      fetchKelas();
      closeModal("modalImportKelas");
      handleReset();
    } catch (err) {
      Swal.fire("Gagal", "Cek duplikasi ID atau format file.", "error");
    }
  };

  // Style Header Navy
  const navyHeaderStyle = {
    backgroundColor: "#001f3f",
    color: "#ffffff",
    border: "none",
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="fw-bold text-dark">Kelola Data Kelas</h3>
      </div>

      <div className="row">
        <div className="col-12">
          {/* BAGIAN TOMBOL AKSI DI ATAS */}
          <div className="card shadow-sm p-3 mb-4 border-0">
            <div className="d-flex flex-wrap gap-2 align-items-center">
              <div className="fw-bold text-muted small text-uppercase me-2">
                Aksi Kelas:
              </div>
              <button
                className="btn btn-primary px-4 shadow-sm fw-bold"
                data-bs-toggle="modal"
                data-bs-target="#modalManualKelas"
                onClick={handleReset}
              >
                <i className="bi bi-plus-lg me-2"></i>Manual
              </button>
              <button
                className="btn btn-success px-4 shadow-sm fw-bold"
                data-bs-toggle="modal"
                data-bs-target="#modalImportKelas"
                onClick={handleReset}
              >
                <i className="bi bi-file-earmark-excel me-2"></i>Import
              </button>
            </div>
          </div>

          {/* TABEL DATA KELAS */}
          <div className="card shadow-sm p-4 border-0">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 className="mb-0 fw-bold">
                Daftar Kelas{" "}
                <span className="badge bg-light text-primary border ms-2">
                  {listKelas.length}
                </span>
              </h5>
              {selectedIds.length > 0 && (
                <button
                  className="btn btn-danger btn-sm px-3 fw-bold"
                  onClick={handleHapusTerpilih}
                >
                  Hapus Kelas Terpilih ({selectedIds.length})
                </button>
              )}
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
                        onChange={() =>
                          setSelectedIds(
                            selectedIds.length === listKelas.length
                              ? []
                              : listKelas.map((k) => k.id),
                          )
                        }
                        checked={
                          listKelas.length > 0 &&
                          selectedIds.length === listKelas.length
                        }
                      />
                    </th>
                    <th style={navyHeaderStyle}>ID Kelas</th>
                    <th style={navyHeaderStyle}>Tingkat</th>
                    <th style={navyHeaderStyle}>Nama Kelas</th>
                    <th className="text-center" style={navyHeaderStyle}>
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {listKelas.length > 0 ? (
                    listKelas.map((k) => (
                      <tr key={k.id}>
                        <td className="text-center">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            checked={selectedIds.includes(k.id)}
                            onChange={() =>
                              setSelectedIds(
                                selectedIds.includes(k.id)
                                  ? selectedIds.filter((i) => i !== k.id)
                                  : [...selectedIds, k.id],
                              )
                            }
                          />
                        </td>
                        <td className="fw-bold text-secondary">{k.id}</td>
                        <td>
                          <span className="badge bg-secondary-subtle text-secondary border">
                            {k.tingkat}
                          </span>
                        </td>
                        <td>{k.nama_kelas}</td>
                        <td
                          className="text-center"
                          style={{ whiteSpace: "nowrap" }}
                        >
                          <button
                            className="btn btn-warning btn-sm fw-bold me-2 px-3"
                            data-bs-toggle="modal"
                            data-bs-target="#modalManualKelas"
                            onClick={() => handleEdit(k)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-danger btn-sm fw-bold px-3"
                            onClick={() => handleDelete(k.id)}
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="text-center py-5 text-muted">
                        Belum ada data kelas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL MANUAL */}
      <div
        className="modal fade"
        id="modalManualKelas"
        tabIndex="-1"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow-lg">
            <form onSubmit={handleSaveManual}>
              <div className="modal-header bg-primary text-white border-0">
                <h5 className="modal-title fw-bold">
                  {editingId ? "Edit Kelas" : "Tambah Kelas Manual"}
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
                  <label className="form-label small fw-bold">ID Kelas</label>
                  <input
                    type="number"
                    className="form-control"
                    value={idInput}
                    onChange={(e) => setIdInput(e.target.value)}
                    disabled={editingId !== null}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-bold">Tingkat</label>
                  <select
                    className="form-select"
                    value={tingkat}
                    onChange={(e) => setTingkat(e.target.value)}
                    required
                  >
                    <option value="">Pilih Tingkat</option>
                    <option value="10">10</option>
                    <option value="11">11</option>
                    <option value="12">12</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-bold">Nama Kelas</label>
                  <input
                    type="text"
                    className="form-control"
                    value={namaKelas}
                    onChange={(e) => setNamaKelas(e.target.value)}
                    required
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
                <button type="submit" className="btn btn-primary fw-bold px-4">
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* MODAL IMPORT */}
      <div
        className="modal fade"
        id="modalImportKelas"
        tabIndex="-1"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow-lg">
            <div className="modal-header bg-success text-white border-0">
              <h5 className="modal-title fw-bold">Import Data Kelas</h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                data-bs-dismiss="modal"
                onClick={handleReset}
              ></button>
            </div>
            <div className="modal-body text-center p-4">
              <button
                className="btn btn-outline-success mb-4 fw-bold"
                onClick={downloadTemplate}
              >
                ↓ Unduh Template
              </button>
              <div className="bg-light p-4 border-dashed rounded">
                <input
                  type="file"
                  id="fileKelas"
                  className="form-control"
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                />
              </div>
              {dataImport.length > 0 && (
                <div className="alert alert-info mt-3 small">
                  Terdeteksi <b>{dataImport.length}</b> data valid.
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
              <button
                type="button"
                className="btn btn-success fw-bold px-4"
                onClick={handleSaveImport}
                disabled={dataImport.length === 0}
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminKelas;
