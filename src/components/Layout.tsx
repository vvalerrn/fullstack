import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const isAuthPage = location.pathname === "/login" || location.pathname === "/register";
  const hasToken = Boolean(localStorage.getItem("token"));

  function handleLogout() {
    localStorage.removeItem("token");
    navigate("/login");
  }

  return (
    <>
      {!isAuthPage && (
        <header
          style={{
            backgroundColor: "#d8d8dc",
            borderBottom: "2px solid #2f80ed",
            padding: "10px 40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontWeight: 600 }}>Протоколы собраний</div>
          {hasToken && (
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <Link to="/create" style={{ textDecoration: "none" }}>
                <button className="secondary">Создать встречу</button>
              </Link>
              <button className="secondary" onClick={handleLogout}>
                Выйти
              </button>
            </div>
          )}
        </header>
      )}
      <Outlet />
    </>
  );
};

export default Layout;