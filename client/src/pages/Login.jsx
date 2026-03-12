import { useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { API_URL } from "../config";

function Login({ setUser }) {
  // State untuk menyimpan apa yang diketik user
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault(); // Supaya halaman tidak reload saat submit
    setLoading(true);

    try {
      // Mengirim data ke API Backend
      const response = await axios.post(`${API_URL}/api/login`, {
        username,
        password,
      });

      if (response.data.success) {
        Swal.fire({
          icon: "success",
          title: "Login Berhasil",
          text: `Selamat datang kembali, ${response.data.user.nama}!`,
          showConfirmButton: false,
          timer: 1500,
        });

        // Simpan ke localStorage
        localStorage.setItem("user", JSON.stringify(response.data.user));
        setUser(response.data.user);
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Login Gagal",
        text: error.response?.data?.message || "Terjadi kesalahan pada server",
        confirmButtonColor: "#3085d6",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container vh-100 d-flex justify-content-center align-items-center">
      <div
        className="card p-4 shadow-lg border-0"
        style={{ width: "400px", borderRadius: "15px" }}
      >
        <div className="text-center mb-4">
          <i className="bi bi-person-circle fs-1 text-primary"></i>
          <h3 className="fw-bold mt-2">Panitia Verbal ASTS Genap</h3>
          <p className="text-muted small">Silakan masuk ke akun Anda</p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="mb-3">
            <label className="form-label fw-bold">Username</label>
            <div className="input-group">
              <span className="input-group-text bg-light border-end-0">
                <i className="bi bi-person"></i>
              </span>
              <input
                type="text"
                className="form-control bg-light border-start-0"
                placeholder="Masukkan Username"
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="form-label fw-bold">Password</label>
            <div className="input-group">
              <span className="input-group-text bg-light border-end-0">
                <i className="bi bi-lock"></i>
              </span>
              <input
                type="password"
                className="form-control bg-light border-start-0"
                placeholder="Masukkan Password"
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary w-100 py-2 fw-bold"
            disabled={loading}
            style={{ borderRadius: "10px" }}
          >
            {loading ? (
              <span className="spinner-border spinner-border-sm me-2"></span>
            ) : (
              "Login"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
