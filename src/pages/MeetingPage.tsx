import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import API from "../api";

type Meeting = {
  id: number;
  title: string;
  description?: string | null;
  meeting_date?: string | null;
  created_at: string;
  owner_id?: number | null;
  notes?: string | null;
  summary?: string | null;
};

type Task = {
  id: number;
  title: string;
  description?: string | null;
  status?: string | null;
  deadline?: string | null;
  meeting_id: number;
  assigned_to?: number | null;
};

function normalizeDateInputToISODate(input: string): string | null {
  const v = (input ?? "").trim();
  if (!v) return null;

  // Already ISO yyyy-mm-dd (from <input type="date">)
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;

  // Support dd.mm.yyyy (manual typing)
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(v);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;

  return null;
}

function formatDateForRu(input?: string | null): string | null {
  const v = (input ?? "").trim();
  if (!v) return null;

  // ISO yyyy-mm-dd
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (iso) return `${iso[3]}.${iso[2]}.${iso[1]}`;

  // dd.mm.yyyy (already fine)
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(v)) return v;

  return v;
}

export default function MeetingPage() {
  const { id } = useParams();
  const meetingId = useMemo(() => Number(id), [id]);

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskDeadline, setTaskDeadline] = useState("");
  const [taskSaving, setTaskSaving] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [taskDeletingId, setTaskDeletingId] = useState<number | null>(null);

  const [note, setNote] = useState("");
  const [summary, setSummary] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);
  const [summarySaved, setSummarySaved] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiDecisions, setAiDecisions] = useState<string[]>([]);

  // Подгружаем сохранённые заметки/итоги при загрузке встречи
  useEffect(() => {
    if (meeting) {
      setNote(meeting.notes ?? "");
      setSummary(meeting.summary ?? "");
    }
  }, [meeting]);

  function getStatus(m?: Meeting | null): "planned" | "done" {
    if (!m?.description) return "planned";
    return m.description.includes("[Завершено]") ? "done" : "planned";
  }

  function getAgenda(m?: Meeting | null): string {
    return (m?.description ?? "").replace("[Завершено]", "").trim();
  }

  const load = useCallback(async () => {
    if (!Number.isFinite(meetingId) || meetingId <= 0) {
      setError("Некорректный ID встречи.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [mRes, tRes] = await Promise.all([
        API.get<Meeting>(`/meetings/${meetingId}`),
        API.get<Task[]>("/tasks/"),
      ]);
      setMeeting(mRes.data);
      setTasks(tRes.data.filter((t) => t.meeting_id === meetingId));
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } }).response?.status;
      if (status === 401) setError("Требуется вход (401).");
      else if (status === 404) setError("Встреча не найдена (404).");
      else setError("Не удалось загрузить данные. Проверьте бэкенд.");
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createTask() {
    if (!taskTitle.trim() || !Number.isFinite(meetingId) || meetingId <= 0) return;

    setTaskSaving(true);
    setTaskError(null);
    try {
      const normalizedDeadline = normalizeDateInputToISODate(taskDeadline);
      await API.post("/tasks/", {
        title: taskTitle.trim(),
        description: taskDescription.trim() ? taskDescription.trim() : null,
        deadline: normalizedDeadline,
        meeting_id: meetingId,
        assigned_to: null,
        status: "pending",
      });
      setTaskTitle("");
      setTaskDescription("");
      setTaskDeadline("");
      await load();
    } catch {
      setTaskError("Не удалось создать задачу.");
    } finally {
      setTaskSaving(false);
    }
  }

  async function deleteTask(taskId: number) {
    if (!Number.isFinite(taskId) || taskId <= 0) return;
    const ok = window.confirm("Удалить задачу? Это действие нельзя отменить.");
    if (!ok) return;

    setTaskDeletingId(taskId);
    setTaskError(null);
    try {
      await API.delete(`/tasks/${taskId}`);
      await load();
    } catch {
      setTaskError("Не удалось удалить задачу.");
    } finally {
      setTaskDeletingId(null);
    }
  }

  async function saveNote() {
    if (!meeting || !Number.isFinite(meetingId) || meetingId <= 0) return;

    setNoteSaved(false);
    try {
      await API.put(`/meetings/${meetingId}`, {
        notes: (note || "").trim(),
      });
      setNoteSaved(true);
      window.setTimeout(() => setNoteSaved(false), 2000);
      await load();
    } catch {
      setError("Не удалось сохранить заметку встречи.");
    }
  }

  async function saveSummary() {
    if (!meeting || !Number.isFinite(meetingId) || meetingId <= 0) return;

    setSummarySaved(false);
    try {
      await API.put(`/meetings/${meetingId}`, {
        summary: (summary || "").trim(),
      });
      setSummarySaved(true);
      window.setTimeout(() => setSummarySaved(false), 2000);
      await load();
    } catch {
      setError("Не удалось сохранить итоги встречи.");
    }
  }

  async function runAiSummary() {
    if (!Number.isFinite(meetingId) || meetingId <= 0) return;

    setAiLoading(true);
    setAiError(null);
    setAiDecisions([]);

    try {
      const res = await API.post<{
        summary?: string;
        decisions?: { text: string }[];
      }>("/ai/summarize", {
        meeting_id: meetingId,
        notes: note,
        summary_draft: summary,
      });

      const summaryText = (res.data.summary ?? "").trim();
      const decisionsArr = res.data.decisions ?? [];

      setSummary(summaryText);
      setAiDecisions(decisionsArr.map((d) => d.text));
    } catch (e) {
      console.error("AI summarize error", e);
      setAiError("Не удалось получить ИИ‑резюме. Проверьте бэкенд.");
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="container">
      <div className="card" style={{ borderWidth: 2 }}>
        {loading && <p>Загрузка...</p>}

        {!loading && error && (
          <div>
            <p style={{ marginTop: 0 }}>{error}</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => void load()}>Повторить</button>
              <Link to="/login">
                <button className="secondary">Login</button>
              </Link>
            </div>
          </div>
        )}

        {!loading && !error && meeting && (
          <>
            <h3 style={{ marginTop: 0 }}>{meeting.title}</h3>
            {(() => {
              const status = getStatus(meeting);
              const text = status === "done" ? "Завершено" : "Запланировано";
              const className = status === "done" ? "status-done" : "status-planned";
              return (
                <p>
                  {meeting.meeting_date ?? ""} · <span className={className}>{text}</span>
                </p>
              );
            })()}

            <p style={{ marginBottom: 6 }}>Повестка</p>
            <textarea
              value={getAgenda(meeting)}
              readOnly
              placeholder="Повестка встречи"
              rows={8}
              style={{ minHeight: 160 }}
            />

            <button
              className="secondary"
              onClick={async () => {
                if (!Number.isFinite(meetingId) || meetingId <= 0) return;
                setCompleting(true);
                setCompleteError(null);
                try {
                  const base = (meeting.description ?? "").replace("[Завершено]", "").trim();
                  await API.put(`/meetings/${meetingId}`, {
                    description: (base ? base + "\n" : "") + "[Завершено]",
                  });
                  await load();
                } catch {
                  setCompleteError("Не удалось завершить встречу.");
                } finally {
                  setCompleting(false);
                }
              }}
              disabled={completing}
              style={{ marginBottom: 10 }}
            >
              {completing ? "Завершение..." : "Завершить собрание"}
            </button>
            {completeError && <p style={{ color: "#6b1a1a" }}>{completeError}</p>}

            <p>Заметка обсуждения</p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Заметка обсуждения"
              rows={10}
              style={{ minHeight: 200 }}
            />
            <button onClick={saveNote}>Сохранить заметки</button>
            {noteSaved && <p>Заметки сохранены (локально).</p>}
          </>
        )}
      </div>

      {!loading && !error && meeting && (
        <>
          <div className="card" style={{ borderWidth: 2 }}>
            <h3 style={{ marginTop: 0 }}>Задачи</h3>

            <button
              className="secondary"
              style={{ width: "100%", marginBottom: 15, textAlign: "left" }}
              onClick={() => setTaskFormOpen((v) => !v)}
            >
              + Добавить задачу
            </button>

            {taskFormOpen && (
              <>
                <input
                  placeholder="Название задачи"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                />
                <input
                  type="date"
                  value={taskDeadline}
                  onChange={(e) => setTaskDeadline(e.target.value)}
                />
                <textarea
                  placeholder="Описание (необязательно)"
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                />
                <button
                  onClick={() => void createTask()}
                  disabled={taskSaving || taskTitle.trim().length < 3}
                >
                  {taskSaving ? "Сохранение..." : "Создать задачу"}
                </button>
                {taskError && <p style={{ color: "#6b1a1a" }}>{taskError}</p>}
              </>
            )}

            {tasks.length === 0 ? (
              <p>Список задач пуст</p>
            ) : (
              tasks.map((t) => (
                <div key={t.id} style={{ marginTop: 10 }}>
                  <input type="checkbox" style={{ marginRight: 8 }} readOnly />
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                    <span>
                      {t.title}
                      {t.deadline ? ` · до ${formatDateForRu(t.deadline)}` : ""}
                    </span>
                    <button
                      className="secondary"
                      onClick={() => void deleteTask(t.id)}
                      disabled={taskDeletingId === t.id}
                      style={{ padding: "6px 10px" }}
                      title="Удалить задачу"
                    >
                      {taskDeletingId === t.id ? "Удаление..." : "Удалить"}
                    </button>
                  </span>
                </div>
              ))
            )}
            {taskError && <p style={{ color: "#6b1a1a", marginTop: 10 }}>{taskError}</p>}
          </div>

          <div className="card" style={{ borderWidth: 2 }}>
            <h3 style={{ marginTop: 0 }}>Итоги встречи</h3>
            <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
              <button onClick={saveSummary}>Сохранить итоги</button>
              <button className="secondary" onClick={() => void runAiSummary()} disabled={aiLoading}>
                {aiLoading ? "Происходит анализ, подождите" : "Суммаризировать обсуждения"}
              </button>
            </div>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Краткое резюме обсуждения"
              rows={15}
              style={{ marginTop: 0, minHeight: 300 }}
            />
            {summarySaved && <p>Итоги сохранены (локально).</p>}
            {aiError && <p style={{ color: "#6b1a1a" }}>{aiError}</p>}
            {aiDecisions.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <strong>Выделенные решения:</strong>
                <ul>
                  {aiDecisions.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}