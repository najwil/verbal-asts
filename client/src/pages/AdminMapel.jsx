import { useState, useEffect } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import Swal from "sweetalert2";
import { API_URL } from "../config";

function AdminMapel() {
  const [listMapel, setListMapel] = useState([]);
  const [dataToUpload, setDataToUpload] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);

  // State Form
  const [id, setId] = useState("");
  const [namaMapel, setNamaMapel] = useState("");
  const [editingId, setEditingId] = useState(null);

  const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
  });

  const fetchMapel = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/mapel`);
      setListMapel(res.data);
      setSelectedIds([]);
    } catch (err) {
      console.error("Gagal ambil data mapel");
    }
  };

  useEffect(() => {
    fetchMapel();
  }, []);

  const closeModal = (modalId) => {
    const modalElement = document.getElementById(modalId);
    if (modalElement) {
      const modalInstance = window.bootstrap?.Modal.getInstance(modalElement);
      if (modalInstance) {
        modalInstance.hide();
      } else {
        modalElement.querySelector('[data-bs-dismiss="modal"]')?.click();
      }
    }
  };

  const handleReset = () => {
    setEditingId(null);
    setId("");
    setNamaMapel("");
    setDataToUpload([]);
    if (document.getElementById("fileInput"))
      document.getElementById("fileInput").value = "";
  };

  // --- Checkbox Logic ---
  const handleSelectOne = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === listMapel.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(listMapel.map((m) => m.id));
    }
  };

  // --- CRUD Functions ---
  const handleSaveManual = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`${API_URL}/api/mapel/${editingId}`, {
          nama_mapel: namaMapel,
        });
        Toast.fire({ icon: "success", title: "Mapel diperbarui" });
      } else {
        await axios.post(`${API_URL}/api/mapel/bulk`, {
          dataMapel: [[Number(id), namaMapel]],
        });
        Toast.fire({ icon: "success", title: "Mapel berhasil ditambah" });
      }
      fetchMapel();
      closeModal("modalManualMapel");
      handleReset();
    } catch (err) {
      Swal.fire(
        "Gagal",
        err.response?.data?.message || "Terjadi kesalahan",
        "error",
      );
    }
  };

  const handleDelete = async (idVal) => {
    const isMultiple = Array.isArray(idVal);
    const result = await Swal.fire({
      title: isMultiple ? `Hapus ${idVal.length} Mapel?` : "Hapus Mapel?",
      text: "Data yang dihapus tidak bisa dikembalikan!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Ya, Hapus!",
    });

    if (result.isConfirmed) {
      try {
        if (isMultiple) {
          await Promise.all(
            idVal.map((id) => axios.delete(`${API_URL}/api/mapel/${id}`)),
          );
        } else {
          await axios.delete(`${API_URL}/api/mapel/${idVal}`);
        }
        fetchMapel();
        Toast.fire({ icon: "success", title: "Berhasil dihapus" });
      } catch (err) {
        Swal.fire(
          "Gagal",
          "Beberapa data mungkin sedang digunakan di Jadwal",
          "error",
        );
      }
    }
  };

  const downloadTemplate = () => {
    const template = [{ id: 2001, nama_mapel: "Matematika" }];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "template_mapel.xlsx");
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
      const cleanData = data
        .slice(1)
        .map((row) => [Number(row[0]), String(row[1] || "")])
        .filter((row) => row[0] && row[1]);
      setDataToUpload(cleanData);
    };
    reader.readAsBinaryString(file);
  };

  const handleSaveImport = async () => {
    try {
      await axios.post(`${API_URL}/api/mapel/bulk`, {
        dataMapel: dataToUpload,
      });
      Toast.fire({ icon: "success", title: "Impor berhasil" });
      fetchMapel();
      closeModal("modalImportMapel");
      handleReset();
    } catch (err) {
      Swal.fire("Error", "Cek duplikasi ID", "error");
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
        <h3 className="fw-bold text-dark">Kelola Data Mata Pelajaran</h3>
      </div>

      <div className="row">
        <div className="col-12">
          {/* TOMBOL AKSI DI ATAS */}
          <div className="card shadow-sm p-3 mb-4 border-0">
            <div className="d-flex flex-wrap gap-2 align-items-center">
              <div className="fw-bold text-muted small text-uppercase me-2">
                Tambah Mata Pelajaran :
              </div>
              <button
                className="btn btn-primary px-4 shadow-sm fw-bold"
                data-bs-toggle="modal"
                data-bs-target="#modalManualMapel"
                onClick={handleReset}
              >
                <i className="bi bi-plus-lg me-2"></i>Manual
              </button>
              <button
                className="btn btn-success px-4 shadow-sm fw-bold"
                data-bs-toggle="modal"
                data-bs-target="#modalImportMapel"
                onClick={handleReset}
              >
                <i className="bi bi-file-earmark-excel me-2"></i>Import
              </button>
            </div>
          </div>

          <div className="card shadow-sm p-4 border-0">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 className="mb-0 fw-bold">
                Daftar Mata Pelajaran{" "}
                <span className="badge bg-light text-primary border ms-2">
                  {listMapel.length}
                </span>
              </h5>
              {selectedIds.length > 0 && (
                <button
                  className="btn btn-danger btn-sm px-3 fw-bold"
                  onClick={() => handleDelete(selectedIds)}
                >
                  Hapus Terpilih ({selectedIds.length})
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
                        checked={
                          listMapel.length > 0 &&
                          selectedIds.length === listMapel.length
                        }
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th style={{ ...navyHeaderStyle, width: "15%" }}>
                      ID Mapel
                    </th>
                    <th style={navyHeaderStyle}>Nama Mata Pelajaran</th>
                    <th
                      className="text-center"
                      style={{ ...navyHeaderStyle, width: "20%" }}
                    >
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {listMapel.length > 0 ? (
                    listMapel.map((m) => (
                      <tr key={m.id}>
                        <td className="text-center">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            checked={selectedIds.includes(m.id)}
                            onChange={() => handleSelectOne(m.id)}
                          />
                        </td>
                        <td className="fw-bold text-secondary">{m.id}</td>
                        <td>{m.nama_mapel}</td>
                        <td
                          className="text-center"
                          style={{ whiteSpace: "nowrap" }}
                        >
                          <button
                            className="btn btn-warning btn-sm fw-bold me-2 px-3"
                            data-bs-toggle="modal"
                            data-bs-target="#modalManualMapel"
                            onClick={() => {
                              setEditingId(m.id);
                              setId(m.id);
                              setNamaMapel(m.nama_mapel);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-danger btn-sm fw-bold px-3"
                            onClick={() => handleDelete(m.id)}
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="text-center py-5 text-muted">
                        Belum ada data mata pelajaran.
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
        id="modalManualMapel"
        tabIndex="-1"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow-lg">
            <form onSubmit={handleSaveManual}>
              <div className="modal-header bg-primary text-white border-0">
                <h5 className="modal-title fw-bold">
                  {editingId ? "Edit Mata Pelajaran" : "Tambah Mata Pelajaran"}
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
                  <label className="form-label small fw-bold">ID Mapel</label>
                  <input
                    type="number"
                    className="form-control"
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    disabled={editingId !== null}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-bold">Nama Mapel</label>
                  <input
                    type="text"
                    className="form-control"
                    value={namaMapel}
                    onChange={(e) => setNamaMapel(e.target.value)}
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
        id="modalImportMapel"
        tabIndex="-1"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow-lg">
            <div className="modal-header bg-success text-white border-0">
              <h5 className="modal-title fw-bold">Import Data Mapel</h5>
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
                ↓ Unduh Template Excel
              </button>
              <div className="bg-light p-4 border-dashed rounded">
                <input
                  type="file"
                  id="fileInput"
                  className="form-control"
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                />
              </div>
              {dataToUpload.length > 0 && (
                <div className="alert alert-info mt-3 small">
                  Terdeteksi <b>{dataToUpload.length}</b> data mapel valid.
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
                disabled={dataToUpload.length === 0}
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

export default AdminMapel;
