import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../api";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onRegister() {
    if (!login.trim() || !password || !password2) return;
    if (password !== password2) {
      setError("Пароли не совпадают.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await API.post("/auth/register", {
        username: login.trim(),
        email: `${login.trim()}@mail.`,
        password,
      });
      navigate("/login");
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } }).response?.status;
      if (status === 409) setError("Пользователь с таким логином уже существует.");
      else setError("Не удалось зарегистрироваться. Проверьте бэкенд.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-outer">
        <div className="auth-subtitle">Создайте свой аккаунт</div>

        <div className="auth-inner">
          <input
            className="auth-input"
            placeholder="Логин"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
          />
          <input
            className="auth-input"
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <input
            className="auth-input"
            type="password"
            placeholder="Повторите пароль"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
          />

          <button
            className="auth-btn"
            onClick={() => void onRegister()}
            disabled={loading || !login.trim() || !password || !password2}
          >
            {loading ? "Регистрация..." : "Зарегистрироваться"}
          </button>

          {error && <div className="auth-error">{error}</div>}

          <div style={{ marginTop: 10, textAlign: "center", fontSize: 12 }}>
            <Link to="/login" className="auth-link">
              Уже есть аккаунт? Войти
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

