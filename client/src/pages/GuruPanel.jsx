import { Routes, Route, NavLink } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";
import GuruJadwal from "./GuruJadwal";

function GuruPanel({ user, onLogout }) {
  const [listJadwal, setListJadwal] = useState([]);
  const [isJadwalOpen, setIsJadwalOpen] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

  // State untuk dropdown profil di navbar
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Ambil Hari dan Tanggal Real-time
  const [currentDate, setCurrentDate] = useState("");

  // Warna Navy Custom (Konsisten dengan Admin)
  const navyBg = "#0a192f";
  const navyBorder = "#112240";

  useEffect(() => {
    const fetchJadwal = async () => {
      try {
        const res = await axios.get(
          `http://localhost:5000/api/jadwal/guru/${user.id}`,
        );

        const sortedData = res.data.sort((a, b) => {
          if (a.tingkat !== b.tingkat) {
            return a.tingkat - b.tingkat;
          }
          if (a.nama_kelas !== b.nama_kelas) {
            return a.nama_kelas.localeCompare(b.nama_kelas);
          }
          return a.nama_mapel.localeCompare(b.nama_mapel);
        });

        setListJadwal(sortedData);
      } catch (err) {
        console.error("Gagal mengambil jadwal", err);
      }
    };
    if (user?.id) fetchJadwal();

    const date = new Date();
    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    setCurrentDate(date.toLocaleDateString("id-ID", options));
  }, [user]);

  return (
    <div className="d-flex vh-100 bg-light position-relative overflow-hidden text-dark">
      {/* 1. BACKDROP SIDEBAR */}
      {showSidebar && (
        <div
          onClick={() => setShowSidebar(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.6)",
            zIndex: 1080,
            backdropFilter: "blur(2px)",
          }}
        ></div>
      )}

      {/* 2. SIDEBAR (Navy Color) */}
      <div
        className="d-flex flex-column shadow-lg"
        style={{
          width: "280px",
          height: "100vh",
          position: "fixed",
          top: 0,
          left: showSidebar ? "0" : "-280px",
          zIndex: 1090,
          transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
          backgroundColor: navyBg,
          color: "#ffffff",
          overflowX: "hidden",
        }}
      >
        <div
          className="p-4 text-center border-bottom flex-shrink-0 d-flex justify-content-between align-items-center"
          style={{ borderColor: navyBorder }}
        >
          <h4 className="fw-bold mb-0 text-white">Verbal ASTS</h4>
          <button
            className="btn btn-link text-white p-0 d-md-none"
            onClick={() => setShowSidebar(false)}
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        <nav
          className="nav flex-column flex-grow-1 py-3"
          style={{
            overflowY: "auto",
            display: "block",
          }}
        >
          <NavLink
            className={({ isActive }) =>
              `nav-link text-white px-4 py-3 d-flex align-items-center ${isActive ? "bg-primary bg-opacity-25" : ""}`
            }
            to="/guru"
            end
            onClick={() => setShowSidebar(false)}
          >
            <i className="bi bi-house-door me-3"></i> Dashboard
          </NavLink>

          <div
            className="nav-link text-white px-4 py-3 d-flex align-items-center justify-content-between"
            style={{ cursor: "pointer" }}
            onClick={() => setIsJadwalOpen(!isJadwalOpen)}
          >
            <div className="d-flex align-items-center">
              <i className="bi bi-calendar3 me-3"></i> Nilai ASTS
            </div>
            <i
              className={`bi bi-chevron-${isJadwalOpen ? "down" : "right"} small`}
            ></i>
          </div>

          {isJadwalOpen && (
            <div className="bg-black bg-opacity-25 w-100">
              {listJadwal.length > 0 ? (
                listJadwal.map((j) => (
                  <NavLink
                    key={j.id}
                    className="nav-link py-2 ps-4 pe-3 d-flex align-items-center"
                    to={`/guru/jadwal/${j.id}`}
                    onClick={() => setShowSidebar(false)}
                    style={({ isActive }) => ({
                      color: isActive ? "#ffffff" : "rgba(255,255,255,0.7)",
                      backgroundColor: isActive
                        ? "rgba(13, 110, 253, 0.4)"
                        : "transparent",
                      fontSize: "0.85rem",
                      width: "100%",
                      borderLeft: isActive
                        ? "4px solid #0d6efd"
                        : "4px solid transparent",
                    })}
                  >
                    <i className="bi bi-dot fs-4 me-1 flex-shrink-0"></i>
                    <span
                      className="text-truncate d-block"
                      style={{ maxWidth: "200px" }}
                    >
                      <strong className="text-white">{j.nama_kelas}</strong> -{" "}
                      {j.nama_mapel}
                    </span>
                  </NavLink>
                ))
              ) : (
                <div className="ps-5 py-2 small fst-italic text-white-50">
                  Jadwal tidak ditemukan
                </div>
              )}
            </div>
          )}
        </nav>
      </div>

      {/* 3. CONTENT AREA */}
      <div
        className="flex-grow-1 d-flex flex-column vh-100"
        style={{
          width: "100%",
          marginLeft: "0px", // Karena sidebar bersifat fixed & mobile-first
          overflowY: showSidebar ? "hidden" : "auto",
        }}
      >
        {/* NAVBAR */}
        <nav className="navbar navbar-light bg-white border-bottom sticky-top shadow-sm flex-shrink-0 py-2 px-3">
          <div className="container-fluid d-flex align-items-center justify-content-between p-0">
            <button
              className="btn btn-outline-dark border-0 shadow-none d-flex align-items-center justify-content-center"
              onClick={() => setShowSidebar(!showSidebar)}
              style={{ width: "40px", height: "40px" }}
            >
              <i className="bi bi-list fs-3"></i>
            </button>

            {/* DROPDOWN PROFIL */}
            <div className="position-relative">
              <div
                className="d-flex align-items-center p-2 rounded cursor-pointer hover-bg-light"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                style={{ cursor: "pointer" }}
              >
                <div className="text-end me-2 d-none d-sm-block text-dark">
                  <div className="fw-bold text-primary small">{user.nama}</div>
                  <small className="text-muted" style={{ fontSize: "10px" }}>
                    {user.role}
                  </small>
                </div>
                <div
                  className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center"
                  style={{ width: "35px", height: "35px" }}
                >
                  <i className="bi bi-person-fill"></i>
                </div>
              </div>

              {showProfileMenu && (
                <>
                  <div
                    className="position-fixed top-0 start-0 w-100 h-100"
                    onClick={() => setShowProfileMenu(false)}
                    style={{ zIndex: 999 }}
                  ></div>
                  <div
                    className="position-absolute shadow-lg border rounded bg-white p-3"
                    style={{
                      zIndex: 1000,
                      minWidth: "220px",
                      right: "-5px",
                      top: "50px",
                    }}
                  >
                    <div className="mb-2 border-bottom pb-2 d-flex justify-content-between align-items-start text-dark">
                      <div>
                        <div className="fw-bold">{user.nama}</div>
                        <div className="badge bg-primary-subtle text-primary small">
                          {user.role}
                        </div>
                      </div>
                      <button
                        className="btn btn-sm btn-link text-muted p-0 ms-2"
                        onClick={() => setShowProfileMenu(false)}
                      >
                        <i className="bi bi-x-lg"></i>
                      </button>
                    </div>
                    <div className="mb-3 text-dark">
                      <small className="text-muted d-block">Hari ini:</small>
                      <div className="small fw-semibold">{currentDate}</div>
                    </div>
                    <button
                      className="btn btn-danger btn-sm w-100 d-flex align-items-center justify-content-center fw-bold"
                      onClick={onLogout}
                    >
                      <i className="bi bi-box-arrow-left me-2"></i> Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </nav>

        {/* AREA KONTEN UTAMA */}
        <div className="container-fluid p-3 p-md-4">
          <Routes>
            <Route
              path="/"
              element={
                <div className="card shadow-sm border-0 p-5 text-center mt-4 bg-white">
                  <i
                    className="bi bi-person-check text-primary"
                    style={{ fontSize: "4rem" }}
                  ></i>
                  <h2 className="fw-bold mt-3 text-dark">
                    Selamat Datang, {user.nama}
                  </h2>
                  <p
                    className="text-muted mx-auto"
                    style={{ maxWidth: "500px" }}
                  >
                    Silakan tekan menu di samping untuk menginput nilai siswa.
                  </p>
                </div>
              }
            />
            <Route
              path="/jadwal/:id_jadwal"
              element={<GuruJadwal user={user} />}
            />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default GuruPanel;
