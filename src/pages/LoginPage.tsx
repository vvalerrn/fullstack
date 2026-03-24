import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../api";

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onLogin() {
    setLoading(true);
    setError(null);

    try {
      const body = new URLSearchParams();
      body.set("username", username);
      body.set("password", password);

      const res = await API.post<{ access_token: string; token_type: string }>(
        "/auth/login",
        body,
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );

      localStorage.setItem("token", res.data.access_token);
      navigate("/meetings");
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } }).response?.status;
      if (status === 401) setError("Неверный логин/пароль.");
      else setError("Не удалось войти. Проверьте, что бэкенд запущен.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-outer">
        <div className="auth-subtitle">
          Добро пожаловать!
          <br />
          Введите данные для входа
        </div>

        <div className="auth-inner">
          <input
            className="auth-input"
            placeholder="Логин"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            className="auth-input"
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="auth-btn" onClick={() => void onLogin()} disabled={loading || !username || !password}>
            {loading ? "Вход..." : "Войти"}
          </button>

          {error && <div className="auth-error">{error}</div>}

          <div className="auth-bottom">
            <div style={{ fontSize: 12 }}>Еще нет аккаунта?</div>
            <Link to="/register" className="auth-link">
              Зарегистрируйтесь
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}