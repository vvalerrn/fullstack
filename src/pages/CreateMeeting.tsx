import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";

type MeetingCreate = {
  title: string;
  description: string;
  meeting_date: string;
};

export default function CreateMeeting() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState<string>("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSave() {
    const titleTrimmed = title.trim();
    const descriptionTrimmed = description.trim();
    const meetingDateTrimmed = meetingDate.trim();

    if (titleTrimmed.length < 3 || !meetingDateTrimmed || !descriptionTrimmed) {
      setError("Заполните все поля: название, дата и повестка.");
      return;
    }

    setLoading(true);
    setError(null);
    const payload: MeetingCreate = {
      title: titleTrimmed,
      description: descriptionTrimmed,
      meeting_date: meetingDateTrimmed,
    };

    try {
      await API.post("/meetings/", payload);
      navigate("/");
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } }).response?.status;
      if (status === 401) setError("Нужно войти (401). Перейдите на страницу Login.");
      else setError("Не удалось создать встречу. Проверьте данные и бэкенд.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <h2 className="title" style={{ marginTop: 0, marginBottom: 20, textAlign: "center" }}>
        Создание встречи
      </h2>
      <input
        placeholder="Название встречи"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />
      <input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} required />
      <textarea
        placeholder="Повестка встречи"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        required
      />
      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={() => void onSave()}
          disabled={loading || title.trim().length < 3 || !meetingDate.trim() || !description.trim()}
        >
          {loading ? "Сохранение..." : "Сохранить"}
        </button>
        <button className="secondary" onClick={() => navigate(-1)} disabled={loading}>
          Отмена
        </button>
      </div>
      {error && <p style={{ color: "#6b1a1a" }}>{error}</p>}
    </div>
  );
}