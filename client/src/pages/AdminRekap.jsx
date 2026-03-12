import { useState, useEffect } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";
import { API_URL } from "../config";

function AdminRekap() {
  const [listKelas, setListKelas] = useState([]);
  const [listMapel, setListMapel] = useState([]);
  const [selectedKelas, setSelectedKelas] = useState([]);
  const [selectedMapels, setSelectedMapels] = useState([]);
  const [displayedMapels, setDisplayedMapels] = useState([]);
  const [dataRekap, setDataRekap] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const KKM = 72;

  useEffect(() => {
    fetchFilterData();
  }, []);

  const fetchFilterData = async () => {
    try {
      const resKelas = await axios.get(`${API_URL}/api/kelas`);
      const resMapel = await axios.get(`${API_URL}/api/mapel`);
      const sortedKelas = resKelas.data.sort(
        (a, b) =>
          a.tingkat - b.tingkat || a.nama_kelas.localeCompare(b.nama_kelas),
      );
      setListKelas(sortedKelas);
      setListMapel(resMapel.data);
    } catch (err) {
      console.error("Gagal mengambil data filter", err);
    }
  };

  const handleSelectAll = (type) => {
    if (type === "kelas") {
      if (selectedKelas.length === listKelas.length) setSelectedKelas([]);
      else setSelectedKelas(listKelas.map((k) => k.id));
    } else {
      if (selectedMapels.length === listMapel.length) setSelectedMapels([]);
      else setSelectedMapels(listMapel.map((m) => m.id));
    }
  };

  const handleCheck = (id, type) => {
    const setFn = type === "kelas" ? setSelectedKelas : setSelectedMapels;
    setFn((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleReset = () => {
    setSelectedKelas([]);
    setSelectedMapels([]);
    setDisplayedMapels([]);
    setDataRekap([]);
    setCurrentPage(1);
  };

  const handleTampilkan = async () => {
    if (selectedKelas.length === 0 || selectedMapels.length === 0) {
      Swal.fire(
        "Peringatan",
        "Pilih minimal satu kelas dan satu mapel!",
        "warning",
      );
      return;
    }
    setLoading(true);
    try {
      const idsKelas = selectedKelas.join(",");
      const idsMapel = selectedMapels.join(",");
      const res = await axios.get(
        `${API_URL}/api/rekap-nilai?id_kelas=${idsKelas}&id_mapel=${idsMapel}`,
      );

      const grouped = res.data.reduce((acc, curr) => {
        if (!acc[curr.nis]) {
          acc[curr.nis] = {
            nis: curr.nis,
            nama: curr.nama_siswa,
            jk: curr.jenis_kelamin,
            kelas: curr.nama_kelas,
            tingkat: curr.tingkat,
            nilai: {},
          };
        }
        acc[curr.nis].nilai[curr.id_mapel] = curr.total;
        return acc;
      }, {});

      const finalData = Object.values(grouped).sort(
        (a, b) =>
          a.tingkat - b.tingkat ||
          a.kelas.localeCompare(b.kelas) ||
          a.nama.localeCompare(b.nama),
      );

      setDisplayedMapels(
        listMapel.filter((m) => selectedMapels.includes(m.id)),
      );
      setDataRekap(finalData);
      setCurrentPage(1);
    } catch (err) {
      Swal.fire("Error", "Gagal mengambil data", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleHapusNilai = () => {
    if (selectedKelas.length === 0 || selectedMapels.length === 0) {
      Swal.fire(
        "Peringatan",
        "Filter kelas dan mapel harus dipilih!",
        "warning",
      );
      return;
    }

    const namaMapels = displayedMapels.map((m) => m.nama_mapel).join(", ");

    Swal.fire({
      title: "Hapus Nilai?",
      text: `Seluruh nilai untuk mapel (${namaMapels}) pada kelas terpilih akan dihapus permanen!`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Ya, Hapus!",
      cancelButtonText: "Batal",
    }).then(async (result) => {
      if (result.isConfirmed) {
        setLoading(true);
        try {
          const idsKelas = selectedKelas.join(",");
          const idsMapel = selectedMapels.join(",");

          // Menggunakan URL /massal/hapus agar sinkron dengan index.js terbaru
          const res = await axios.delete(`${API_URL}/api/nilai/massal/hapus`, {
            params: { id_kelas: idsKelas, id_mapel: idsMapel },
          });

          if (res.data.success) {
            Swal.fire("Berhasil", res.data.message, "success");
            // Refresh data tabel agar tampilan kembali kosong/nol
            handleTampilkan();
          }
        } catch (err) {
          console.error("Error saat hapus massal:", err);
          Swal.fire("Error", "Gagal menghapus data secara massal", "error");
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleExportExcel = () => {
    const headers = [
      "No",
      "NIS",
      "Nama Siswa",
      "JK",
      "Kelas",
      ...displayedMapels.map((m) => m.nama_mapel),
    ];
    const rows = dataRekap.map((item, index) => [
      index + 1,
      item.nis,
      item.nama,
      item.jk,
      item.kelas,
      ...displayedMapels.map((m) => item.nilai[m.id] || 0),
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap Nilai");
    XLSX.writeFile(wb, `Rekap_Nilai_${new Date().getTime()}.xlsx`);
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = dataRekap.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(dataRekap.length / itemsPerPage);

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4 text-dark">
        <h3 className="fw-bold mb-0">Rekap Nilai Siswa</h3>
        {dataRekap.length > 0 && (
          <div className="d-flex gap-2">
            <button
              className="btn btn-danger btn-sm px-3 fw-bold shadow-sm"
              onClick={handleHapusNilai}
            >
              Hapus Nilai
            </button>
            <button
              className="btn btn-success btn-sm px-3 fw-bold shadow-sm"
              onClick={handleExportExcel}
            >
              Download Excel
            </button>
          </div>
        )}
      </div>

      <div className="card shadow-sm border-0 mb-4 bg-white text-dark">
        <div className="card-body row g-3">
          <div className="col-md-5">
            <label className="fw-bold small mb-2 d-flex justify-content-between">
              Pilih Kelas{" "}
              <span
                className="text-primary pointer"
                style={{ fontSize: "11px" }}
                onClick={() => handleSelectAll("kelas")}
              >
                {selectedKelas.length === listKelas.length
                  ? "Hapus Semua"
                  : "Pilih Semua"}
              </span>
            </label>
            <div
              className="border rounded p-2 overflow-auto bg-light"
              style={{ maxHeight: "150px" }}
            >
              {listKelas.map((k) => (
                <div key={k.id} className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id={`k-${k.id}`}
                    onChange={() => handleCheck(k.id, "kelas")}
                    checked={selectedKelas.includes(k.id)}
                  />
                  <label
                    className="form-check-label small"
                    htmlFor={`k-${k.id}`}
                  >
                    {k.nama_kelas}
                  </label>
                </div>
              ))}
            </div>
          </div>
          <div className="col-md-5">
            <label className="fw-bold small mb-2 d-flex justify-content-between">
              Pilih Mapel{" "}
              <span
                className="text-primary pointer"
                style={{ fontSize: "11px" }}
                onClick={() => handleSelectAll("mapel")}
              >
                {selectedMapels.length === listMapel.length
                  ? "Hapus Semua"
                  : "Pilih Semua"}
              </span>
            </label>
            <div
              className="border rounded p-2 overflow-auto bg-light"
              style={{ maxHeight: "150px" }}
            >
              {listMapel.map((m) => (
                <div key={m.id} className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id={`m-${m.id}`}
                    onChange={() => handleCheck(m.id, "mapel")}
                    checked={selectedMapels.includes(m.id)}
                  />
                  <label
                    className="form-check-label small"
                    htmlFor={`m-${m.id}`}
                  >
                    {m.nama_mapel}
                  </label>
                </div>
              ))}
            </div>
          </div>
          <div className="col-md-2 d-flex flex-column justify-content-end gap-2">
            <button
              className="btn btn-outline-secondary btn-sm fw-bold"
              onClick={handleReset}
            >
              Reset
            </button>
            <button
              className="btn btn-dark w-100 fw-bold"
              onClick={handleTampilkan}
              disabled={loading}
            >
              {loading ? "..." : "Tampilkan"}
            </button>
          </div>
        </div>
      </div>

      {dataRekap.length > 0 ? (
        <>
          <div className="card shadow-sm border-0 bg-white">
            <div className="table-responsive">
              <table className="table table-bordered mb-0 align-middle">
                <thead className="table-dark text-center">
                  <tr>
                    <th>No</th>
                    <th>NIS</th>
                    <th>Nama</th>
                    <th>JK</th>
                    <th>Kelas</th>
                    {displayedMapels.map((m) => (
                      <th key={m.id} className="small py-3">
                        {m.nama_mapel}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((item, index) => (
                    <tr key={item.nis}>
                      <td className="text-center">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>
                      <td className="text-center fw-bold">{item.nis}</td>
                      <td className="fw-medium">{item.nama}</td>
                      <td className="text-center">{item.jk}</td>
                      <td className="text-center">{item.kelas}</td>
                      {displayedMapels.map((m) => {
                        const n = item.nilai[m.id] || 0;
                        return (
                          <td
                            key={m.id}
                            className={`text-center fw-bold ${n < KKM ? "text-danger" : ""}`}
                          >
                            {n}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="d-flex justify-content-between align-items-center mt-3 mb-5 px-2 text-dark">
            <small className="text-muted">
              Halaman {currentPage} dari {totalPages}
            </small>
            <nav>
              <ul className="pagination pagination-sm mb-0">
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
        </>
      ) : (
        !loading && (
          <div className="text-center py-5 bg-white border rounded text-dark">
            Pilih filter dan klik tampilkan.
          </div>
        )
      )}
    </div>
  );
}

export default AdminRekap;
