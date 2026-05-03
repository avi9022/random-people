import { Routes, Route } from "react-router-dom";
import Home from "@/routes/Home";
import RandomUsers from "@/routes/RandomUsers";
import SavedProfiles from "@/routes/SavedProfiles";
import Profile from "@/routes/Profile";
import Chat from "@/routes/Chat";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/random" element={<RandomUsers />} />
      <Route path="/saved" element={<SavedProfiles />} />
      <Route path="/profile/:uuid" element={<Profile />} />
      <Route path="/chat" element={<Chat />} />
    </Routes>
  );
}
