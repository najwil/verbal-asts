import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import Swal from "sweetalert2";

function AdminSiswa() {
  const [listSiswa, setListSiswa] = useState([]);
  const [listKelas, setListKelas] = useState([]);
  const [fileName, setFileName] = useState("");
  const [dataToUpload, setDataToUpload] = useState([]);

  // State Form
  const [nis, setNis] = useState("");
  const [nama, setNama] = useState("");
  const [jk, setJk] = useState("L");
  const [idKelas, setIdKelas] = useState("");
  const [editingNis, setEditingNis] = useState(null);

  // State Checkbox, Search, Filter & Sort
  const [selectedNis, setSelectedNis] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterKelas, setFilterKelas] = useState([]);
  const [filterJK, setFilterJK] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

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

  const fetchSiswa = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/siswa");
      setListSiswa(res.data);
      const uniqueKelas = [...new Set(res.data.map((s) => s.nama_kelas))]
        .filter(Boolean)
        .sort();
      setListKelas(uniqueKelas);
      setSelectedNis([]);
    } catch (err) {
      console.error("Gagal ambil data siswa");
    }
  };

  useEffect(() => {
    fetchSiswa();
  }, []);

  const processedSiswa = useMemo(() => {
    let filtered = listSiswa.filter((s) => {
      const matchesSearch =
        s.nama_siswa.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        s.nis.toString().includes(debouncedSearch) ||
        (s.nama_kelas &&
          s.nama_kelas.toLowerCase().includes(debouncedSearch.toLowerCase()));
      const matchesKelas =
        filterKelas.length === 0 || filterKelas.includes(s.nama_kelas);
      const matchesJK =
        filterJK.length === 0 || filterJK.includes(s.jenis_kelamin);
      return matchesSearch && matchesKelas && matchesJK;
    });

    if (sortConfig.key !== null) {
      filtered.sort((a, b) => {
        const valA = String(a[sortConfig.key] || "").toLowerCase();
        const valB = String(b[sortConfig.key] || "").toLowerCase();
        if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
        if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return filtered;
  }, [listSiswa, debouncedSearch, filterKelas, filterJK, sortConfig]);

  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = processedSiswa.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(processedSiswa.length / rowsPerPage);

  const getPageNumbers = () => {
    const pages = [];
    const showMax = 3;
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > showMax + 1) pages.push("...");
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - showMax) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  const requestSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc")
      direction = "desc";
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key)
      return <i className="bi bi-arrow-down-up ms-1 small text-white-50"></i>;
    return sortConfig.direction === "asc" ? (
      <i className="bi bi-sort-alpha-down ms-1 text-white"></i>
    ) : (
      <i className="bi bi-sort-alpha-up-alt ms-1 text-white"></i>
    );
  };

  const toggleFilter = (state, setState, value) => {
    setState((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  };

  const resetFilter = () => {
    setFilterKelas([]);
    setFilterJK([]);
    setSearchTerm("");
    setSortConfig({ key: null, direction: "asc" });
    setCurrentPage(1);
  };

  const closeModal = (id) => {
    const modalElement = document.getElementById(id);
    if (modalElement) {
      const modalInstance = window.bootstrap?.Modal.getInstance(modalElement);
      if (modalInstance) modalInstance.hide();
      else modalElement.querySelector('[data-bs-dismiss="modal"]')?.click();
    }
  };

  const handleReset = () => {
    setEditingNis(null);
    setNis("");
    setNama("");
    setJk("L");
    setIdKelas("");
    setFileName("");
    setDataToUpload([]);
    if (document.getElementById("fileInput"))
      document.getElementById("fileInput").value = "";
  };

  const handleSaveManual = async (e) => {
    e.preventDefault();
    if (String(nis).length !== 6) {
      return Swal.fire({
        icon: "error",
        title: "NIS Tidak Valid",
        text: "NIS harus tepat 6 digit angka!",
      });
    }
    try {
      if (editingNis) {
        await axios.put(`http://localhost:5000/api/siswa/${editingNis}`, {
          nama_siswa: nama,
          jenis_kelamin: jk,
          id_kelas: Number(idKelas),
        });
        Toast.fire({ icon: "success", title: "Data diperbarui" });
      } else {
        await axios.post("http://localhost:5000/api/siswa/bulk", {
          dataSiswa: [[Number(nis), nama, jk, Number(idKelas)]],
        });
        Toast.fire({ icon: "success", title: "Siswa ditambahkan" });
      }
      fetchSiswa();
      closeModal("modalManual");
      handleReset();
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Gagal Menyimpan",
        text: err.response?.data?.message || "Kesalahan server.",
      });
    }
  };

  const handleDelete = async (nisVal) => {
    const result = await Swal.fire({
      title: "Hapus Siswa?",
      text: `Siswa dengan NIS ${nisVal} akan dihapus!`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Ya, Hapus!",
    });
    if (result.isConfirmed) {
      try {
        await axios.delete(`http://localhost:5000/api/siswa/${nisVal}`);
        fetchSiswa();
        Toast.fire({ icon: "success", title: "Data berhasil dihapus" });
      } catch (err) {
        Swal.fire("Gagal!", "Data tidak bisa dihapus.", "error");
      }
    }
  };

  const handleHapusTerpilih = async () => {
    const result = await Swal.fire({
      title: "Hapus Siswa?",
      text: `Anda akan menghapus ${selectedNis.length} siswa!`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Ya, Hapus!",
    });
    if (result.isConfirmed) {
      try {
        await Promise.all(
          selectedNis.map((id) =>
            axios.delete(`http://localhost:5000/api/siswa/${id}`),
          ),
        );
        fetchSiswa();
        Toast.fire({
          icon: "success",
          title: "Data terpilih berhasil dihapus",
        });
      } catch (err) {
        Swal.fire("Error", "Beberapa data gagal dihapus", "error");
      }
    }
  };

  const handleSaveImport = async () => {
    try {
      await axios.post("http://localhost:5000/api/siswa/bulk", {
        dataSiswa: dataToUpload,
      });
      Toast.fire({
        icon: "success",
        title: `Berhasil impor ${dataToUpload.length} data`,
      });
      fetchSiswa();
      closeModal("modalImport");
      handleReset();
    } catch (err) {
      Swal.fire("Gagal!", "Proses impor gagal.", "error");
    }
  };

  const handleEdit = (s) => {
    setEditingNis(s.nis);
    setNis(s.nis);
    setNama(s.nama_siswa);
    setJk(s.jenis_kelamin);
    setIdKelas(s.id_kelas);
  };

  const downloadTemplate = () => {
    const template = [
      {
        nis: 100001,
        nama_siswa: "Contoh Nama",
        jenis_kelamin: "L",
        id_kelas: 1,
      },
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "template_siswa.xlsx");
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
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
      const cleanData = data
        .slice(1)
        .map((row) => [
          Number(row[0]),
          String(row[1] || ""),
          String(row[2] || "L").toUpperCase(),
          Number(row[3]),
        ])
        .filter((row) => row[0] && row[0].toString().length === 6);
      setDataToUpload(cleanData);
    };
    reader.readAsBinaryString(file);
  };

  // Objek Style untuk Header Tabel Navy
  const navyHeaderStyle = {
    backgroundColor: "#001f3f",
    color: "#ffffff",
    border: "none",
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="fw-bold text-dark">Kelola Data Siswa</h3>
      </div>

      <div className="row">
        <div className="col-12">
          {/* TOMBOL AKSI DI ATAS */}
          <div className="card shadow-sm p-3 mb-4 border-0">
            <div className="d-flex flex-wrap gap-2 align-items-center">
              <div className="fw-bold text-muted small text-uppercase me-2">
                Tambah Siswa:
              </div>
              <button
                className="btn btn-primary px-4 shadow-sm fw-bold"
                data-bs-toggle="modal"
                data-bs-target="#modalManual"
                onClick={handleReset}
              >
                <i className="bi bi-plus-lg me-2"></i>Manual
              </button>
              <button
                className="btn btn-success px-4 shadow-sm fw-bold"
                data-bs-toggle="modal"
                data-bs-target="#modalImport"
                onClick={handleReset}
              >
                <i className="bi bi-file-earmark-excel me-2"></i>Import
              </button>
            </div>
          </div>

          <div className="card shadow-sm p-4 border-0">
            {/* SEARCH & FILTER */}
            <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
              <h5 className="mb-0 fw-bold">
                Daftar Siswa{" "}
                <span className="badge bg-light text-primary border ms-2">
                  {processedSiswa.length}
                </span>
              </h5>

              <div className="d-flex gap-2">
                <div className="input-group" style={{ maxWidth: "250px" }}>
                  <span className="input-group-text bg-white border-end-0">
                    <i className="bi bi-search"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control border-start-0 ps-0"
                    placeholder="Cari..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="dropdown">
                  <button
                    className="btn btn-outline-secondary dropdown-toggle"
                    type="button"
                    data-bs-toggle="dropdown"
                    data-bs-auto-close="outside"
                  >
                    <i className="bi bi-filter"></i>
                  </button>
                  <div
                    className="dropdown-menu dropdown-menu-end p-3 shadow-lg border-0"
                    style={{ width: "250px" }}
                  >
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="fw-bold small">Filter</span>
                      <button
                        className="btn btn-sm btn-link text-danger p-0 text-decoration-none"
                        onClick={resetFilter}
                      >
                        Reset
                      </button>
                    </div>
                    <hr className="my-2" />
                    <div className="mb-3">
                      <p className="small fw-bold mb-1">Jenis Kelamin</p>
                      {["L", "P"].map((jkVal) => (
                        <div className="form-check small" key={jkVal}>
                          <input
                            className="form-check-input"
                            type="checkbox"
                            checked={filterJK.includes(jkVal)}
                            onChange={() =>
                              toggleFilter(filterJK, setFilterJK, jkVal)
                            }
                          />
                          <label className="form-check-label">
                            {jkVal === "L" ? "Laki-laki" : "Perempuan"}
                          </label>
                        </div>
                      ))}
                    </div>
                    <div>
                      <p className="small fw-bold mb-1">Kelas</p>
                      <div style={{ maxHeight: "150px", overflowY: "auto" }}>
                        {listKelas.map((k) => (
                          <div className="form-check small" key={k}>
                            <input
                              className="form-check-input"
                              type="checkbox"
                              checked={filterKelas.includes(k)}
                              onChange={() =>
                                toggleFilter(filterKelas, setFilterKelas, k)
                              }
                            />
                            <label className="form-check-label">{k}</label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {selectedNis.length > 0 && (
                  <button
                    className="btn btn-danger btn-sm px-3 fw-bold"
                    onClick={handleHapusTerpilih}
                  >
                    Hapus Siswa Terpilih ({selectedNis.length})
                  </button>
                )}
              </div>
            </div>

            {/* TABEL DENGAN HEADER NAVY */}
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
                          setSelectedNis(
                            selectedNis.length === currentRows.length
                              ? []
                              : currentRows.map((s) => s.nis),
                          )
                        }
                        checked={
                          currentRows.length > 0 &&
                          selectedNis.length === currentRows.length
                        }
                      />
                    </th>
                    <th
                      onClick={() => requestSort("nis")}
                      style={{ ...navyHeaderStyle, cursor: "pointer" }}
                    >
                      NIS {getSortIcon("nis")}
                    </th>
                    <th
                      onClick={() => requestSort("nama_siswa")}
                      style={{ ...navyHeaderStyle, cursor: "pointer" }}
                    >
                      Nama {getSortIcon("nama_siswa")}
                    </th>
                    <th className="text-center" style={navyHeaderStyle}>
                      JK
                    </th>
                    <th className="text-center" style={navyHeaderStyle}>
                      ID Kelas
                    </th>
                    <th className="text-center" style={navyHeaderStyle}>
                      Tingkat
                    </th>
                    <th
                      onClick={() => requestSort("nama_kelas")}
                      style={{ ...navyHeaderStyle, cursor: "pointer" }}
                    >
                      Kelas {getSortIcon("nama_kelas")}
                    </th>
                    <th className="text-center" style={navyHeaderStyle}>
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentRows.map((s) => (
                    <tr key={s.nis}>
                      <td className="text-center">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={selectedNis.includes(s.nis)}
                          onChange={() =>
                            toggleFilter(selectedNis, setSelectedNis, s.nis)
                          }
                        />
                      </td>
                      <td className="fw-bold text-secondary">{s.nis}</td>
                      <td>{s.nama_siswa}</td>
                      <td className="text-center">
                        <span
                          className={`badge ${s.jenis_kelamin === "L" ? "bg-primary" : "bg-success"}`}
                        >
                          {s.jenis_kelamin}
                        </span>
                      </td>
                      <td className="text-center text-muted small">
                        {s.id_kelas}
                      </td>
                      <td className="text-center">{s.tingkat || "-"}</td>
                      <td>{s.nama_kelas || "-"}</td>
                      <td
                        className="text-center"
                        style={{ whiteSpace: "nowrap" }}
                      >
                        <button
                          className="btn btn-warning btn-sm fw-bold me-2 px-3"
                          data-bs-toggle="modal"
                          data-bs-target="#modalManual"
                          onClick={() => handleEdit(s)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-danger btn-sm fw-bold px-3"
                          onClick={() => handleDelete(s.nis)}
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                  {currentRows.length === 0 && (
                    <tr>
                      <td colSpan="8" className="text-center py-5 text-muted">
                        Data tidak ditemukan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINATION */}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mt-4 gap-3">
              <span className="small text-muted">
                Menampilkan <b>{indexOfFirstRow + 1}</b> -{" "}
                <b>{Math.min(indexOfLastRow, processedSiswa.length)}</b> dari{" "}
                <b>{processedSiswa.length}</b> data
              </span>
              <nav>
                <ul className="pagination pagination-sm mb-0 shadow-sm">
                  <li
                    className={`page-item ${currentPage === 1 ? "disabled" : ""}`}
                  >
                    <button
                      className="page-link"
                      onClick={() => setCurrentPage((prev) => prev - 1)}
                    >
                      &laquo;
                    </button>
                  </li>
                  {getPageNumbers().map((page, index) => (
                    <li
                      key={index}
                      className={`page-item ${page === currentPage ? "active" : ""} ${page === "..." ? "disabled" : ""}`}
                    >
                      <button
                        className="page-link"
                        onClick={() =>
                          typeof page === "number" && setCurrentPage(page)
                        }
                      >
                        {page}
                      </button>
                    </li>
                  ))}
                  <li
                    className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}
                  >
                    <button
                      className="page-link"
                      onClick={() => setCurrentPage((prev) => prev + 1)}
                    >
                      &raquo;
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL MANUAL */}
      <div
        className="modal fade"
        id="modalManual"
        tabIndex="-1"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow-lg">
            <form onSubmit={handleSaveManual}>
              <div className="modal-header bg-primary text-white border-0">
                <h5 className="modal-title fw-bold">
                  {editingNis ? "Edit Data Siswa" : "Tambah Siswa"}
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
                  <label className="form-label small fw-bold">
                    NIS (6 Digit)
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    value={nis}
                    onChange={(e) => setNis(e.target.value)}
                    disabled={editingNis !== null}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-bold">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    required
                  />
                </div>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label small fw-bold">
                      Jenis Kelamin
                    </label>
                    <select
                      className="form-select"
                      value={jk}
                      onChange={(e) => setJk(e.target.value)}
                    >
                      <option value="L">Laki-laki (L)</option>
                      <option value="P">Perempuan (P)</option>
                    </select>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label small fw-bold">ID Kelas</label>
                    <input
                      type="number"
                      className="form-control"
                      value={idKelas}
                      onChange={(e) => setIdKelas(e.target.value)}
                      required
                    />
                  </div>
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
        id="modalImport"
        tabIndex="-1"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow-lg">
            <div className="modal-header bg-success text-white border-0">
              <h5 className="modal-title fw-bold">Import Data Siswa</h5>
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
                  className="form-control"
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                />
              </div>
              {dataToUpload.length > 0 && (
                <div className="alert alert-info mt-3 small">
                  Terdeteksi <b>{dataToUpload.length}</b> data valid.
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

export default AdminSiswa;
