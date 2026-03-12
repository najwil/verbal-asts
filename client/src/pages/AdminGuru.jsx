import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import Swal from "sweetalert2";
import { API_URL } from "../config";

function AdminGuru() {
  const [listGuru, setListGuru] = useState([]);
  const [dataToUpload, setDataToUpload] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);

  // State Form
  const [id, setId] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [namaLengkap, setNamaLengkap] = useState("");
  const [editingId, setEditingId] = useState(null);

  // State Search
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
  });

  // Debouncing Search (menunggu 500ms setelah user berhenti mengetik)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchGuru = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/users/guru`);
      setListGuru(res.data);
      setSelectedIds([]);
    } catch (err) {
      console.error("Gagal ambil data guru");
    }
  };

  useEffect(() => {
    fetchGuru();
  }, []);

  // Logika Filter Pencarian
  const filteredGuru = useMemo(() => {
    return listGuru.filter((g) => {
      const search = debouncedSearch.toLowerCase();
      return (
        g.nama_lengkap.toLowerCase().includes(search) ||
        g.username.toLowerCase().includes(search) ||
        g.id.toString().includes(search)
      );
    });
  }, [listGuru, debouncedSearch]);

  const closeModal = (modalId) => {
    const modalElement = document.getElementById(modalId);
    if (modalElement) {
      const modalInstance = window.bootstrap?.Modal.getInstance(modalElement);
      if (modalInstance) modalInstance.hide();
      else modalElement.querySelector('[data-bs-dismiss="modal"]')?.click();
    }
  };

  const handleReset = () => {
    setEditingId(null);
    setId("");
    setUsername("");
    setPassword("");
    setNamaLengkap("");
    setDataToUpload([]);
    if (document.getElementById("fileInput"))
      document.getElementById("fileInput").value = "";
  };

  const handleSelectOne = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredGuru.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredGuru.map((g) => g.id));
    }
  };

  const handleSaveManual = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`${API_URL}/api/users/${editingId}`, {
          username,
          password,
          nama_lengkap: namaLengkap,
          role: "guru",
        });
        Toast.fire({ icon: "success", title: "Data guru diperbarui" });
      } else {
        await axios.post(`${API_URL}/api/users/bulk`, {
          dataUser: [[Number(id), username, password, namaLengkap, "guru"]],
        });
        Toast.fire({ icon: "success", title: "Guru berhasil ditambahkan" });
      }
      fetchGuru();
      closeModal("modalManualGuru");
      handleReset();
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Gagal Menyimpan",
        text: err.response?.data?.message || "Terjadi kesalahan server.",
      });
    }
  };

  const handleDelete = async (idVal) => {
    const isMultiple = Array.isArray(idVal);
    const result = await Swal.fire({
      title: isMultiple ? `Hapus ${idVal.length} Data?` : "Hapus Data?",
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
            idVal.map((id) => axios.delete(`${API_URL}/api/users/${id}`)),
          );
        } else {
          await axios.delete(`${API_URL}/api/users/${idVal}`);
        }
        fetchGuru();
        Toast.fire({ icon: "success", title: "Berhasil dihapus" });
      } catch (err) {
        Swal.fire("Gagal!", "Beberapa data mungkin masih terhubung.", "error");
      }
    }
  };

  const handleSaveImport = async () => {
    try {
      await axios.post(`${API_URL}/api/users/bulk`, {
        dataUser: dataToUpload,
      });
      Toast.fire({ icon: "success", title: "Berhasil impor data" });
      fetchGuru();
      closeModal("modalImportGuru");
      handleReset();
    } catch (err) {
      Swal.fire("Gagal!", "Cek format atau duplikasi data.", "error");
    }
  };

  const handleEdit = (g) => {
    setEditingId(g.id);
    setId(g.id);
    setUsername(g.username);
    setPassword(g.password);
    setNamaLengkap(g.nama_lengkap);
  };

  const downloadTemplate = () => {
    const template = [
      {
        id: 1001,
        username: "guru_contoh",
        password: "password123",
        nama_lengkap: "Nama Guru",
      },
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template_Guru");
    XLSX.writeFile(wb, "template_guru.xlsx");
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
        .map((row) => [
          Number(row[0]),
          String(row[1] || ""),
          String(row[2] || "123456"),
          String(row[3] || ""),
          "guru",
        ])
        .filter((row) => row[0] && row[1]);
      setDataToUpload(cleanData);
    };
    reader.readAsBinaryString(file);
  };

  const navyHeaderStyle = {
    backgroundColor: "#001f3f",
    color: "#ffffff",
    border: "none",
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="fw-bold text-dark">Kelola Data Guru</h3>
      </div>

      <div className="row">
        <div className="col-12">
          <div className="card shadow-sm p-3 mb-4 border-0">
            <div className="d-flex flex-wrap gap-2 align-items-center">
              <div className="fw-bold text-muted small text-uppercase me-2">
                Tambah Guru :
              </div>
              <button
                className="btn btn-primary px-4 shadow-sm fw-bold"
                data-bs-toggle="modal"
                data-bs-target="#modalManualGuru"
                onClick={handleReset}
              >
                <i className="bi bi-plus-lg me-2"></i>Manual
              </button>
              <button
                className="btn btn-success px-4 shadow-sm fw-bold"
                data-bs-toggle="modal"
                data-bs-target="#modalImportGuru"
                onClick={handleReset}
              >
                <i className="bi bi-file-earmark-excel me-2"></i>Import
              </button>
            </div>
          </div>

          <div className="card shadow-sm p-4 border-0">
            {/* SEARCH AREA */}
            <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
              <h5 className="mb-0 fw-bold">
                Daftar Guru{" "}
                <span className="badge bg-light text-primary border ms-2">
                  {filteredGuru.length}
                </span>
              </h5>

              <div className="d-flex gap-2">
                <div className="input-group" style={{ maxWidth: "250px" }}>
                  <span className="input-group-text bg-white border-end-0">
                    <i className="bi bi-search"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control border-start-0 ps-0 shadow-none"
                    placeholder="Cari ID, Nama, Username..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                {selectedIds.length > 0 && (
                  <button
                    className="btn btn-danger btn-sm px-3 fw-bold"
                    onClick={() => handleDelete(selectedIds)}
                  >
                    Hapus ({selectedIds.length})
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
                          filteredGuru.length > 0 &&
                          selectedIds.length === filteredGuru.length
                        }
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th style={navyHeaderStyle}>ID</th>
                    <th style={navyHeaderStyle}>Username</th>
                    <th style={navyHeaderStyle}>Password</th>
                    <th style={navyHeaderStyle}>Nama Lengkap</th>
                    <th className="text-center" style={navyHeaderStyle}>
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGuru.length > 0 ? (
                    filteredGuru.map((g) => (
                      <tr key={g.id}>
                        <td className="text-center">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            checked={selectedIds.includes(g.id)}
                            onChange={() => handleSelectOne(g.id)}
                          />
                        </td>
                        <td className="fw-bold text-secondary">{g.id}</td>
                        <td>{g.username}</td>
                        <td className="text-muted small">{g.password}</td>
                        <td>{g.nama_lengkap}</td>
                        <td
                          className="text-center"
                          style={{ whiteSpace: "nowrap" }}
                        >
                          <button
                            className="btn btn-warning btn-sm fw-bold me-2 px-3"
                            data-bs-toggle="modal"
                            data-bs-target="#modalManualGuru"
                            onClick={() => handleEdit(g)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-danger btn-sm fw-bold px-3"
                            onClick={() => handleDelete(g.id)}
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="text-center py-5 text-muted">
                        Data guru tidak ditemukan.
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
        id="modalManualGuru"
        tabIndex="-1"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow-lg">
            <form onSubmit={handleSaveManual}>
              <div className="modal-header bg-primary text-white border-0">
                <h5 className="modal-title fw-bold">
                  {editingId ? "Edit Data Guru" : "Tambah Guru Manual"}
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
                  <label className="form-label small fw-bold">ID Guru</label>
                  <input
                    type="number"
                    className="form-control shadow-none"
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    disabled={editingId !== null}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-bold">Username</label>
                  <input
                    type="text"
                    className="form-control shadow-none"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-bold">Password</label>
                  <input
                    type="text"
                    className="form-control shadow-none"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-bold">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    className="form-control shadow-none"
                    value={namaLengkap}
                    onChange={(e) => setNamaLengkap(e.target.value)}
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
        id="modalImportGuru"
        tabIndex="-1"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow-lg">
            <div className="modal-header bg-success text-white border-0">
              <h5 className="modal-title fw-bold">Import Data Guru</h5>
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
                  id="fileInput"
                  className="form-control shadow-none"
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                />
              </div>
              {dataToUpload.length > 0 && (
                <div className="alert alert-info mt-3 small">
                  Terdeteksi <b>{dataToUpload.length}</b> data guru valid.
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

export default AdminGuru;
