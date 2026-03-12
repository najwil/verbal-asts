import { Routes, Route, NavLink } from "react-router-dom";
import { useState, useEffect } from "react";
import AdminSiswa from "./AdminSiswa";
import AdminKelas from "./AdminKelas";
import AdminGuru from "./AdminGuru";
import AdminMapel from "./AdminMapel";
import AdminJadwal from "./AdminJadwal";
import AdminRekap from "./AdminRekap";

function Dashboard({ user, onLogout }) {
  // State untuk dropdown profil di navbar
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Ambil Hari dan Tanggal Real-time
  const [currentDate, setCurrentDate] = useState("");

  useEffect(() => {
    // Format Tanggal Indonesia
    const date = new Date();
    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    setCurrentDate(date.toLocaleDateString("id-ID", options));
  }, []);

  // Warna Navy Custom
  const navyBg = "#0a192f"; // Navy gelap yang sangat elegan
  const navyBorder = "#112240";

  return (
    <div className="d-flex vh-100 bg-light position-relative overflow-hidden text-dark">
      {/* 1. SIDEBAR (Warna Navy) */}
      <div
        className="sidebar d-flex flex-column shadow-lg"
        style={{
          width: "280px",
          height: "100vh",
          position: "relative",
          zIndex: 1090,
          backgroundColor: navyBg, // Berubah ke Navy
          color: "#ffffff",
        }}
      >
        <div
          className="p-4 text-center border-bottom flex-shrink-0"
          style={{ borderColor: navyBorder }}
        >
          <h4
            className="fw-bold mb-0 text-white"
            style={{ letterSpacing: "1px" }}
          >
            Verbal ASTS
          </h4>
        </div>

        <nav
          className="nav flex-column flex-grow-1 py-3"
          style={{ overflowY: "auto" }}
        >
          <NavLink
            className={({ isActive }) =>
              `nav-link text-white px-4 py-3 d-flex align-items-center ${isActive ? "bg-primary bg-opacity-25" : ""}`
            }
            to="/dashboard"
            end
          >
            <i className="bi bi-speedometer2 me-3"></i>
            <span style={{ color: "#ffffff" }}>Dashboard Utama</span>
          </NavLink>

          <div
            className="px-4 py-2 mt-2 small text-uppercase fw-bold text-white-50"
            style={{ fontSize: "10px", letterSpacing: "1px" }}
          >
            Master Data
          </div>

          <NavLink
            className={({ isActive }) =>
              `nav-link text-white px-4 py-2 d-flex align-items-center ${isActive ? "bg-primary bg-opacity-25" : ""}`
            }
            to="/dashboard/kelas"
          >
            <i className="bi bi-door-open me-3"></i>
            <span style={{ color: "#ffffff" }}>Data Kelas</span>
          </NavLink>

          <NavLink
            className={({ isActive }) =>
              `nav-link text-white px-4 py-2 d-flex align-items-center ${isActive ? "bg-primary bg-opacity-25" : ""}`
            }
            to="/dashboard/siswa"
          >
            <i className="bi bi-people me-3"></i>
            <span style={{ color: "#ffffff" }}>Data Siswa</span>
          </NavLink>

          <NavLink
            className={({ isActive }) =>
              `nav-link text-white px-4 py-2 d-flex align-items-center ${isActive ? "bg-primary bg-opacity-25" : ""}`
            }
            to="/dashboard/guru"
          >
            <i className="bi bi-person-badge me-3"></i>
            <span style={{ color: "#ffffff" }}>Data Guru</span>
          </NavLink>

          <NavLink
            className={({ isActive }) =>
              `nav-link text-white px-4 py-2 d-flex align-items-center ${isActive ? "bg-primary bg-opacity-25" : ""}`
            }
            to="/dashboard/mapel"
          >
            <i className="bi bi-book me-3"></i>
            <span style={{ color: "#ffffff" }}>Data Mapel</span>
          </NavLink>

          <div
            className="px-4 py-2 mt-3 small text-uppercase fw-bold text-white-50"
            style={{ fontSize: "10px", letterSpacing: "1px" }}
          >
            Pengaturan
          </div>

          <NavLink
            className={({ isActive }) =>
              `nav-link text-white px-4 py-2 d-flex align-items-center ${isActive ? "bg-primary bg-opacity-25" : ""}`
            }
            to="/dashboard/jadwal"
          >
            <i className="bi bi-calendar-check me-3"></i>
            <span style={{ color: "#ffffff" }}>Atur Jadwal</span>
          </NavLink>

          <NavLink
            className={({ isActive }) =>
              `nav-link text-white px-4 py-2 d-flex align-items-center ${isActive ? "bg-primary bg-opacity-25" : ""}`
            }
            to="/dashboard/rekap"
          >
            <i className="bi bi-file-earmark-spreadsheet me-3"></i>
            <span style={{ color: "#ffffff" }}>Rekap Nilai</span>
          </NavLink>
        </nav>
      </div>

      {/* 2. CONTENT AREA */}
      <div
        className="flex-grow-1 d-flex flex-column vh-100"
        style={{ overflowY: "auto" }}
      >
        {/* NAVBAR */}
        <nav className="navbar navbar-light bg-white border-bottom sticky-top shadow-sm flex-shrink-0 py-2 px-3">
          <div className="container-fluid d-flex align-items-center justify-content-between p-0">
            <div className="navbar-brand fw-bold text-dark d-none d-md-block">
              Panel Administrator
            </div>

            {/* DROPDOWN PROFIL POJOK KANAN */}
            <div className="position-relative ms-auto">
              <div
                className="d-flex align-items-center p-2 rounded cursor-pointer hover-bg-light"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                style={{ cursor: "pointer" }}
              >
                <div className="text-end me-2 d-none d-sm-block">
                  <div className="fw-bold text-primary small leading-none">
                    {user.nama}
                  </div>
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

              {/* Menu Dropdown */}
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
                      top: "-5px",
                    }}
                  >
                    <div className="mb-2 border-bottom pb-2 d-flex justify-content-between align-items-start">
                      <div>
                        <div className="fw-bold text-dark">{user.nama}</div>
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
                    <div className="mb-3">
                      <small className="text-muted d-block">Hari ini:</small>
                      <div className="small fw-semibold text-dark">
                        {currentDate}
                      </div>
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
                    className="bi bi-shield-lock text-primary"
                    style={{ fontSize: "4rem" }}
                  ></i>
                  <h2 className="fw-bold mt-3 text-dark">
                    Selamat Datang, {user.nama}
                  </h2>
                  <p
                    className="text-muted mx-auto"
                    style={{ maxWidth: "500px" }}
                  >
                    Anda masuk sebagai <b>Administrator</b>. Silakan gunakan
                    menu di samping untuk mengelola data master aplikasi.
                  </p>
                </div>
              }
            />
            <Route path="/kelas" element={<AdminKelas />} />
            <Route path="/siswa" element={<AdminSiswa />} />
            <Route path="/guru" element={<AdminGuru />} />
            <Route path="/mapel" element={<AdminMapel />} />
            <Route path="/jadwal" element={<AdminJadwal />} />
            <Route path="/rekap" element={<AdminRekap />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
