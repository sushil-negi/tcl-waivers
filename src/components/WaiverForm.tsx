"use client";

import { useState, useEffect } from "react";

export interface PlayerInfo {
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  team: string; // comma-separated for multiple teams
  cricclubsId: string;
  isMinor: boolean;
  guardianName: string;
  guardianRelationship: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
}

const GUARDIAN_RELATIONSHIPS = ["Parent", "Mother", "Father", "Legal Guardian"];

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
    cricclubsId: "",
    isMinor: false,
    guardianName: "",
    guardianRelationship: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof PlayerInfo, string>>>({});
  const [showTeamSuggestions, setShowTeamSuggestions] = useState(false);
  const [teamInput, setTeamInput] = useState("");
  const [teams, setTeams] = useState<string[]>([]);

  // Parse selected teams from comma-separated string
  const selectedTeams = form.team ? form.team.split(",").map((t) => t.trim()).filter(Boolean) : [];

  const addTeam = (teamName: string) => {
    if (!selectedTeams.includes(teamName)) {
      const updated = [...selectedTeams, teamName].join(", ");
      setForm({ ...form, team: updated });
    }
    setTeamInput("");
    setShowTeamSuggestions(false);
  };

  const removeTeam = (teamName: string) => {
    const updated = selectedTeams.filter((t) => t !== teamName).join(", ");
    setForm({ ...form, team: updated });
  };

  useEffect(() => {
    fetch("/api/teams")
      .then((res) => res.json())
      .then((data) => setTeams(data.teams || []))
      .catch(() => {});
  }, []);

  // Compute isMinor whenever DOB changes
  useEffect(() => {
    if (form.dateOfBirth) {
      const dob = new Date(form.dateOfBirth);
      const age = (Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      const minor = age < 18;
      if (minor !== form.isMinor) {
        setForm((prev) => ({ ...prev, isMinor: minor }));
      }
    }
  }, [form.dateOfBirth, form.isMinor]);

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
    }

    if (selectedTeams.length === 0) {
      newErrors.team = "Please select at least one team";
    } else {
      const invalidTeam = selectedTeams.find((t) => !teams.includes(t));
      if (invalidTeam) {
        newErrors.team = `"${invalidTeam}" is not a valid team`;
      }
    }

    // CricClubs Player ID validation
    if (!form.cricclubsId.trim()) {
      newErrors.cricclubsId = "CricClubs Player ID is required";
    } else if (!/^\d{6,7}$/.test(form.cricclubsId.trim())) {
      newErrors.cricclubsId = "CricClubs Player ID must be exactly 6 or 7 digits";
    }

    // Guardian validation when minor
    if (form.isMinor) {
      if (!form.guardianName.trim() || form.guardianName.trim().length < 2) {
        newErrors.guardianName = "Parent/Guardian name is required";
      }
      if (!form.guardianRelationship) {
        newErrors.guardianRelationship = "Please select your relationship to the player";
      }
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

      {/* Minor notice */}
      {form.isMinor && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4">
          <p className="text-amber-800 text-sm font-semibold">
            Player is under 18 years old
          </p>
          <p className="text-amber-700 text-sm mt-1">
            A parent or legal guardian must provide their information and sign the waiver on behalf of the minor.
          </p>
        </div>
      )}

      {/* Guardian section — shown only for minors */}
      {form.isMinor && (
        <div className="border-2 border-amber-200 bg-amber-50/30 rounded-lg p-5 space-y-4">
          <p className="text-base font-bold text-gray-800">
            Parent/Guardian Information *
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                Full Name *
              </label>
              <input
                type="text"
                value={form.guardianName}
                onChange={(e) => setForm({ ...form, guardianName: e.target.value })}
                className={inputClass("guardianName")}
                placeholder="Parent/Guardian full name"
              />
              {errors.guardianName && (
                <p className="text-red-500 text-sm mt-1">{errors.guardianName}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                Relationship *
              </label>
              <select
                value={form.guardianRelationship}
                onChange={(e) => setForm({ ...form, guardianRelationship: e.target.value })}
                className={inputClass("guardianRelationship")}
              >
                <option value="">Select relationship</option>
                {GUARDIAN_RELATIONSHIPS.map((rel) => (
                  <option key={rel} value={rel}>{rel}</option>
                ))}
              </select>
              {errors.guardianRelationship && (
                <p className="text-red-500 text-sm mt-1">{errors.guardianRelationship}</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="relative">
        <label className="block text-sm font-semibold text-gray-800 mb-1.5">
          Team(s) * <span className="font-normal text-gray-500 text-xs">— you can select more than one</span>
        </label>

        {/* Selected team chips */}
        {selectedTeams.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {selectedTeams.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 bg-orange-100 text-orange-800 text-sm font-medium px-3 py-1 rounded-full"
              >
                {t}
                <button
                  type="button"
                  onClick={() => removeTeam(t)}
                  className="text-orange-600 hover:text-orange-900 font-bold text-xs ml-0.5"
                >
                  x
                </button>
              </span>
            ))}
          </div>
        )}

        <input
          type="text"
          value={teamInput}
          onChange={(e) => {
            setTeamInput(e.target.value);
            setShowTeamSuggestions(true);
          }}
          onFocus={() => setShowTeamSuggestions(true)}
          onBlur={() => {
            setTimeout(() => setShowTeamSuggestions(false), 200);
          }}
          className={inputClass("team")}
          placeholder={selectedTeams.length > 0 ? "Add another team..." : "Start typing your team name..."}
          autoComplete="off"
        />
        {showTeamSuggestions && teamInput.length > 0 && (() => {
          const filtered = teams.filter(
            (t) =>
              t.toLowerCase().includes(teamInput.toLowerCase()) &&
              !selectedTeams.includes(t)
          );
          if (filtered.length === 0) return null;
          return (
            <ul className="absolute z-20 w-full bg-white border border-gray-300 rounded-lg mt-1 max-h-48 overflow-y-auto shadow-lg">
              {filtered.map((team) => (
                <li
                  key={team}
                  onMouseDown={() => addTeam(team)}
                  className="px-4 py-3 hover:bg-orange-50 cursor-pointer text-sm font-medium text-gray-900"
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

      {/* CricClubs Player ID */}
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-1.5">
          CricClubs Player ID *
        </label>
        <input
          type="text"
          value={form.cricclubsId}
          onChange={(e) => setForm({ ...form, cricclubsId: e.target.value.replace(/\D/g, "").slice(0, 7) })}
          className={inputClass("cricclubsId")}
          placeholder="e.g. 123456"
          inputMode="numeric"
        />
        {errors.cricclubsId && (
          <p className="text-red-500 text-sm mt-1">{errors.cricclubsId}</p>
        )}
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 mt-2">
          <p className="text-amber-800 text-xs font-medium">
            Incorrect player IDs or partially signed waivers will delay the onboarding of the players to the team roster.
          </p>
        </div>
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
