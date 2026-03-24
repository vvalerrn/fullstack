import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../api";

type Meeting = {
  id: number;
  title: string;
  description?: string | null;
  meeting_date?: string | null;
  created_at: string;
  owner_id?: number | null;
};

export default function MeetingsList() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateSort, setDateSort] = useState<"" | "asc" | "desc">("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await API.get<Meeting[]>("/meetings/");
      setMeetings(res.data);
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } }).response?.status;
      if (status === 401) setError("Требуется вход (401). Перейдите на страницу Login.");
      else setError("Не удалось загрузить список встреч. Проверьте, что бэкенд запущен.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function getStatus(meeting: Meeting): "planned" | "done" {
    if (!meeting.description) return "planned";
    return meeting.description.includes("[Завершено]") ? "done" : "planned";
  }

  return (
    <div className="container">
      <h2 className="title" style={{ marginTop: 0 }}>
        Протоколы собраний
      </h2>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <button className="secondary" onClick={() => void load()} disabled={loading}>
          Обновить список
        </button>
        <Link to="/create">
          <button>Создать встречу</button>
        </Link>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 15 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
          <select value={dateSort} onChange={(e) => setDateSort(e.target.value as "" | "asc" | "desc")}>
            <option value="" disabled>
              Отсортировать
            </option>
            <option value="asc">Сначала ранние</option>
            <option value="desc">Сначала поздние</option>
          </select>
        </div>
      </div>

      {loading && <p>Загрузка...</p>}

      {!loading && error && (
        <div className="card">
          <p style={{ marginTop: 0 }}>{error}</p>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => void load()}>Повторить</button>
            <Link to="/login">
              <button className="secondary">Login</button>
            </Link>
          </div>
        </div>
      )}

      {!loading && !error && meetings.length === 0 && <p>Создайте первую встречу!</p>}

      {!loading && !error && meetings.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 16,
            marginTop: 10,
          }}
        >
          {(dateSort
            ? [...meetings].sort((a, b) => {
                const aTime = a.meeting_date ? new Date(a.meeting_date).getTime() : Number.POSITIVE_INFINITY;
                const bTime = b.meeting_date ? new Date(b.meeting_date).getTime() : Number.POSITIVE_INFINITY;
                const diff = aTime - bTime;
                return dateSort === "asc" ? diff : -diff;
              })
            : meetings
          ).map((m) => (
            <div key={m.id} className="card" style={{ cursor: "pointer" }}>
              <Link to={`/meetings/${m.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                <h4 style={{ marginTop: 0 }}>{m.title}</h4>
                {(() => {
                  const status = getStatus(m);
                  const text = status === "done" ? "Завершено" : "Запланировано";
                  const className = status === "done" ? "status-done" : "status-planned";
                  return (
                    <p>
                      {m.meeting_date ?? ""} <span className={className}>{text}</span>
                    </p>
                  );
                })()}
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}