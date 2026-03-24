import { useEffect, useState } from "react";
import API from "../api";

function MeetingsList() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    API.get("/meetings/")
      .then((res) => {
        setMeetings(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError("Ошибка загрузки");
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Загрузка...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div>
      <h2>Meetings</h2>

      {meetings.map((m) => (
        <div key={m.id}>
          <h3>{m.title}</h3>
          <p>{m.description}</p>
        </div>
      ))}
    </div>
  );
}

export default MeetingsList;