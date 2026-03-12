import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import { API_URL } from "../config";

function GuruJadwal({ user }) {
  const { id_jadwal } = useParams();
  const [listSiswa, setListSiswa] = useState([]);
  const [nilaiSiswa, setNilaiSiswa] = useState({});
  const [infoJadwal, setInfoJadwal] = useState(null);

  // State untuk Modal
  const [showModal, setShowModal] = useState(false);
  const [tempNilai, setTempNilai] = useState({
    id_siswa: "",
    nama: "",
    l1: 0,
    l2: 0,
    l3: 0,
  });

  const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000,
  });

  // Warna Navy Custom
  const navyStyle = {
    backgroundColor: "#001f3f",
    color: "#ffffff",
    border: "none",
  };

  useEffect(() => {
    fetchData();
  }, [id_jadwal]);

  const fetchData = async () => {
    try {
      const resJadwal = await axios.get(`${API_URL}/api/jadwal`);
      const detail = resJadwal.data.find((j) => j.id.toString() === id_jadwal);
      setInfoJadwal(detail);

      if (detail) {
        const resSiswa = await axios.get(
          `${API_URL}/api/siswa/kelas/${detail.id_kelas}`,
        );
        setListSiswa(resSiswa.data);

        const resNilai = await axios.get(`${API_URL}/api/nilai/${id_jadwal}`);
        const dataTerSimpan = {};
        resNilai.data.forEach((n) => {
          dataTerSimpan[n.id_siswa] = {
            l1: n.l1,
            l2: n.l2,
            l3: n.l3,
            total: n.total,
          };
        });
        setNilaiSiswa(dataTerSimpan);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditClick = (siswa) => {
    const current = nilaiSiswa[siswa.id] || { l1: 0, l2: 0, l3: 0 };
    setTempNilai({
      id_siswa: siswa.id,
      nama: siswa.nama_lengkap,
      l1: current.l1,
      l2: current.l2,
      l3: current.l3,
    });
    setShowModal(true);
  };

  const handleModalInputChange = (field, value) => {
    let numValue = value === "" ? 0 : parseFloat(value);
    if (field === "l1" && numValue > 25) numValue = 25;
    if (field === "l2" && numValue > 35) numValue = 35;
    if (field === "l3" && numValue > 40) numValue = 40;

    setTempNilai((prev) => ({ ...prev, [field]: numValue }));
  };

  const handleSimpanSiswa = async () => {
    try {
      const dataNilai = [
        {
          id_jadwal,
          id_siswa: tempNilai.id_siswa,
          l1: tempNilai.l1,
          l2: tempNilai.l2,
          l3: tempNilai.l3,
        },
      ];

      await axios.post(`${API_URL}/api/nilai/bulk`, { dataNilai });

      setNilaiSiswa((prev) => ({
        ...prev,
        [tempNilai.id_siswa]: {
          l1: tempNilai.l1,
          l2: tempNilai.l2,
          l3: tempNilai.l3,
        },
      }));

      setShowModal(false);
      Toast.fire({ icon: "success", title: "Nilai berhasil disimpan" });
    } catch (err) {
      Swal.fire("Gagal", "Gagal menyimpan data", "error");
    }
  };

  const handleHapusNilai = async (siswaId, namaSiswa) => {
    const result = await Swal.fire({
      title: "Hapus Nilai?",
      text: `Nilai untuk ${namaSiswa} akan dihapus secara permanen!`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#001f3f",
      cancelButtonColor: "#d33",
      confirmButtonText: "Ya, Hapus!",
      cancelButtonText: "Batal",
    });

    if (result.isConfirmed) {
      try {
        await axios.delete(`${API_URL}/api/nilai/${id_jadwal}/${siswaId}`);

        const currentNilai = { ...nilaiSiswa };
        delete currentNilai[siswaId];
        setNilaiSiswa(currentNilai);

        Toast.fire({ icon: "success", title: "Nilai berhasil dihapus" });
      } catch (err) {
        Swal.fire("Gagal", "Terjadi kesalahan saat menghapus nilai", "error");
      }
    }
  };

  if (!infoJadwal) return <div className="p-4">Memuat data...</div>;

  return (
    <div className="container-fluid">
      <div className="card shadow-sm border-0">
        <div className="card-header bg-white py-3 border-bottom">
          <h5 className="mb-0 fw-bold text-dark">{infoJadwal.nama_mapel}</h5>
          <span className="badge bg-primary-subtle text-primary mt-1">
            Kelas: {infoJadwal.nama_kelas}
          </span>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0 align-middle">
              <thead>
                <tr>
                  <th
                    className="ps-4 py-3 text-center"
                    style={navyStyle}
                    width="70"
                  >
                    No
                  </th>
                  <th style={navyStyle}>Nama Lengkap Siswa</th>
                  <th className="text-center" style={navyStyle} width="150">
                    Nilai Total
                  </th>
                  <th className="text-center" style={navyStyle} width="250">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {listSiswa.map((s, index) => {
                  const nilai = nilaiSiswa[s.id];
                  const total = nilai ? nilai.l1 + nilai.l2 + nilai.l3 : 0;
                  return (
                    <tr key={s.id}>
                      <td className="ps-4 text-center text-muted">
                        {index + 1}
                      </td>
                      <td className="fw-medium text-dark">{s.nama_lengkap}</td>
                      <td className="text-center fw-bold">
                        {total > 0 ? (
                          <span className="text-primary">{total}</span>
                        ) : (
                          <span className="text-muted small">Belum diisi</span>
                        )}
                      </td>
                      <td className="text-center">
                        <button
                          className="btn btn-sm btn-outline-primary px-3 me-2 fw-bold"
                          onClick={() => handleEditClick(s)}
                        >
                          <i className="bi bi-pencil-square me-1"></i> Input
                          Nilai
                        </button>
                        {nilai && (
                          <button
                            className="btn btn-sm btn-outline-danger px-3 fw-bold"
                            onClick={() =>
                              handleHapusNilai(s.id, s.nama_lengkap)
                            }
                          >
                            <i className="bi bi-trash me-1"></i> Hapus
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {listSiswa.length === 0 && (
                  <tr>
                    <td colSpan="4" className="text-center py-5 text-muted">
                      Tidak ada data siswa di kelas ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL INPUT NILAI */}
      {showModal && (
        <div
          className="modal d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1100 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header border-0 pb-0">
                <h5 className="fw-bold text-dark">Input Nilai Siswa</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <div className="modal-body px-4">
                <div className="mb-4">
                  <label className="form-label small fw-bold text-muted mb-1">
                    Nama Siswa
                  </label>
                  <input
                    type="text"
                    className="form-control bg-light border-0 fw-bold text-dark"
                    value={tempNilai.nama}
                    readOnly
                  />
                </div>
                <div className="row g-3">
                  <div className="col-4">
                    <label className="form-label small fw-bold mb-1">
                      L1 (Max 25)
                    </label>
                    <input
                      type="number"
                      className="form-control text-center fw-bold"
                      value={tempNilai.l1}
                      onChange={(e) =>
                        handleModalInputChange("l1", e.target.value)
                      }
                    />
                  </div>
                  <div className="col-4">
                    <label className="form-label small fw-bold mb-1">
                      L2 (Max 35)
                    </label>
                    <input
                      type="number"
                      className="form-control text-center fw-bold"
                      value={tempNilai.l2}
                      onChange={(e) =>
                        handleModalInputChange("l2", e.target.value)
                      }
                    />
                  </div>
                  <div className="col-4">
                    <label className="form-label small fw-bold mb-1">
                      L3 (Max 40)
                    </label>
                    <input
                      type="number"
                      className="form-control text-center fw-bold"
                      value={tempNilai.l3}
                      onChange={(e) =>
                        handleModalInputChange("l3", e.target.value)
                      }
                    />
                  </div>
                </div>
                <div
                  className="mt-4 p-3 rounded text-center"
                  style={{
                    backgroundColor: "#f8f9fa",
                    border: "1px dashed #dee2e6",
                  }}
                >
                  <small
                    className="text-muted d-block text-uppercase fw-bold"
                    style={{ fontSize: "10px" }}
                  >
                    Total Skor Keseluruhan
                  </small>
                  <h1 className="fw-bold mb-0" style={{ color: "#001f3f" }}>
                    {tempNilai.l1 + tempNilai.l2 + tempNilai.l3}
                  </h1>
                </div>
              </div>
              <div className="modal-footer border-0 px-4 pb-4">
                <button
                  className="btn btn-light fw-bold px-3 shadow-sm"
                  onClick={() => setShowModal(false)}
                >
                  Batal
                </button>
                <button
                  className="btn px-4 fw-bold shadow-sm"
                  style={{ backgroundColor: "#001f3f", color: "#fff" }}
                  onClick={handleSimpanSiswa}
                >
                  Simpan Nilai
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GuruJadwal;
