import { BrowserRouter,Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import MeetingsList from "./pages/MeetingsList";
import CreateMeeting from "./pages/CreateMeeting";
import MeetingPage from "./pages/MeetingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/create" element={<CreateMeeting />} />
          <Route path="/meetings/:id" element={<MeetingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/meetings" element={<MeetingsList />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

