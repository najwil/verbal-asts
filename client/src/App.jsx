import { Routes, Route, useNavigate, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import GuruPanel from "./pages/GuruPanel";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Cek sesi login saat aplikasi dimuat
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
    navigate("/");
  };

  if (loading) return null;

  return (
    <Routes>
      {/* 1. RUTE LOGIN */}
      <Route
        path="/"
        element={
          !user ? (
            <Login setUser={setUser} />
          ) : user.role === "admin" ? (
            <Navigate to="/dashboard" replace />
          ) : (
            // Diarahkan ke /guru, biarkan GuruPanel yang mengatur rute internalnya
            <Navigate to="/guru" replace />
          )
        }
      />

      {/* 2. RUTE DASHBOARD ADMIN */}
      <Route
        path="/dashboard/*"
        element={
          user && user.role === "admin" ? (
            <Dashboard user={user} onLogout={handleLogout} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />

      {/* 3. RUTE DASHBOARD GURU */}
      <Route
        path="/guru/*"
        element={
          user && user.role === "guru" ? (
            <GuruPanel user={user} onLogout={handleLogout} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />

      {/* RUTE JIKA URL TIDAK DITEMUKAN */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
