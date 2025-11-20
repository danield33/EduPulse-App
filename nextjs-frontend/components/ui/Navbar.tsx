// components/Navbar.tsx
import { useState } from "react";

export default function Navbar({ onRoleChange }: { onRoleChange: (role: string) => void }) {
  const [role, setRole] = useState("student");

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = event.target.value;
    setRole(newRole);
    onRoleChange(newRole);
  };

  return (
    <nav className="flex justify-between items-center p-4 bg-gray-800 text-white">
      <h1 className="text-xl font-bold">EduPulse</h1>
      <select
        value={role}
        onChange={handleChange}
        className="bg-gray-700 border border-gray-500 rounded px-2 py-1"
      >
        <option value="student">Student</option>
        <option value="instructor">Instructor</option>
      </select>
    </nav>
  );
}
