"use client";

import { useState, useEffect } from "react";

export interface PlayerInfo {
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  team: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
}

interface WaiverFormProps {
  onSubmit: (info: PlayerInfo) => void;
  loading?: boolean;
}

export default function WaiverForm({ onSubmit, loading }: WaiverFormProps) {
  const [form, setForm] = useState<PlayerInfo>({
    fullName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    team: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof PlayerInfo, string>>>({});
  const [showTeamSuggestions, setShowTeamSuggestions] = useState(false);
  const [teams, setTeams] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/teams")
      .then((res) => res.json())
      .then((data) => setTeams(data.teams || []))
      .catch(() => {});
  }, []);

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof PlayerInfo, string>> = {};

    if (!form.fullName.trim() || form.fullName.trim().length < 2) {
      newErrors.fullName = "Full legal name is required";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      newErrors.email = "Valid email is required";
    }

    if (!form.phone.trim()) {
      newErrors.phone = "Phone number is required";
    }

    if (!form.dateOfBirth) {
      newErrors.dateOfBirth = "Date of birth is required";
    } else {
      const dob = new Date(form.dateOfBirth);
      const age = (Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      if (age < 18) {
        newErrors.dateOfBirth = "You must be at least 18 years old";
      }
    }

    if (!form.team) {
      newErrors.team = "Please select a team";
    } else if (!teams.includes(form.team)) {
      newErrors.team = "Please select a valid team from the list";
    }

    if (!form.emergencyContactName.trim()) {
      newErrors.emergencyContactName = "Emergency contact name is required";
    }
    if (!form.emergencyContactPhone.trim()) {
      newErrors.emergencyContactPhone = "Emergency contact phone is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(form);
    }
  };

  const inputClass = (field: keyof PlayerInfo) =>
    `w-full px-4 py-3 border-2 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white focus:border-orange-400 transition-colors ${
      errors[field] ? "border-red-500 bg-red-50" : "border-gray-300"
    }`;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-1.5">
          Full Legal Name *
        </label>
        <input
          type="text"
          value={form.fullName}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          className={inputClass("fullName")}
          placeholder="Enter your full legal name"
        />
        {errors.fullName && (
          <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-1.5">
          Email Address *
        </label>
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className={inputClass("email")}
          placeholder="your@email.com"
        />
        {errors.email && (
          <p className="text-red-500 text-sm mt-1">{errors.email}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-1.5">
            Phone Number *
          </label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className={inputClass("phone")}
            placeholder="(555) 123-4567"
          />
          {errors.phone && (
            <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-1.5">
            Date of Birth *
          </label>
          <input
            type="date"
            value={form.dateOfBirth}
            onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
            className={inputClass("dateOfBirth")}
          />
          {errors.dateOfBirth && (
            <p className="text-red-500 text-sm mt-1">{errors.dateOfBirth}</p>
          )}
        </div>
      </div>

      <div className="relative">
        <label className="block text-sm font-semibold text-gray-800 mb-1.5">
          Team *
        </label>
        <input
          type="text"
          value={form.team}
          onChange={(e) => {
            setForm({ ...form, team: e.target.value });
            setShowTeamSuggestions(true);
          }}
          onFocus={() => setShowTeamSuggestions(true)}
          onBlur={() => {
            // Delay to allow click on suggestion
            setTimeout(() => setShowTeamSuggestions(false), 200);
          }}
          className={inputClass("team")}
          placeholder="Start typing your team name..."
          autoComplete="off"
        />
        {showTeamSuggestions && form.team.length > 0 && (() => {
          const filtered = teams.filter((t) =>
            t.toLowerCase().includes(form.team.toLowerCase())
          );
          if (filtered.length === 0 || (filtered.length === 1 && filtered[0] === form.team)) return null;
          return (
            <ul className="absolute z-20 w-full bg-white border border-gray-300 rounded-lg mt-1 max-h-48 overflow-y-auto shadow-lg">
              {filtered.map((team) => (
                <li
                  key={team}
                  onMouseDown={() => {
                    setForm({ ...form, team });
                    setShowTeamSuggestions(false);
                  }}
                  className="px-4 py-2 hover:bg-orange-50 cursor-pointer text-sm"
                >
                  {team}
                </li>
              ))}
            </ul>
          );
        })()}
        {errors.team && (
          <p className="text-red-500 text-sm mt-1">{errors.team}</p>
        )}
      </div>

      <div className="border-t-2 border-gray-200 pt-5">
        <p className="text-base font-bold text-gray-800 mb-3">
          Emergency Contact *
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1.5">Name</label>
            <input
              type="text"
              value={form.emergencyContactName}
              onChange={(e) =>
                setForm({ ...form, emergencyContactName: e.target.value })
              }
              className={inputClass("emergencyContactName")}
              placeholder="Contact name"
            />
            {errors.emergencyContactName && (
              <p className="text-red-500 text-sm mt-1">
                {errors.emergencyContactName}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1.5">Phone</label>
            <input
              type="tel"
              value={form.emergencyContactPhone}
              onChange={(e) =>
                setForm({ ...form, emergencyContactPhone: e.target.value })
              }
              className={inputClass("emergencyContactPhone")}
              placeholder="Contact phone"
            />
            {errors.emergencyContactPhone && (
              <p className="text-red-500 text-sm mt-1">
                {errors.emergencyContactPhone}
              </p>
            )}
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Checking..." : "Continue to Email Verification"}
      </button>
    </form>
  );
}
