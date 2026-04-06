"use client";

import { useState, useRef, useEffect } from "react";

interface VerificationInputProps {
  onVerify: (code: string) => void;
  onResend: () => void;
  loading?: boolean;
  error?: string;
  email: string;
}

export default function VerificationInput({
  onVerify,
  onResend,
  loading,
  error,
  email,
}: VerificationInputProps) {
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...digits];

    if (value.length > 1) {
      // Handle paste
      const chars = value.slice(0, 6).split("");
      chars.forEach((char, i) => {
        if (index + i < 6) newDigits[index + i] = char;
      });
      setDigits(newDigits);
      const nextIdx = Math.min(index + chars.length, 5);
      inputRefs.current[nextIdx]?.focus();

      const code = newDigits.join("");
      if (code.length === 6) onVerify(code);
      return;
    }

    newDigits[index] = value;
    setDigits(newDigits);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    const code = newDigits.join("");
    if (code.length === 6 && newDigits.every((d) => d !== "")) {
      onVerify(code);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = () => {
    onResend();
    setResendCooldown(60);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-gray-600">
          We sent a 6-digit code to{" "}
          <span className="font-semibold text-gray-900">{email}</span>
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Check your inbox and enter the code below
        </p>
      </div>

      <div className="flex justify-center gap-3">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => { inputRefs.current[index] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
        ))}
      </div>

      {error && (
        <p className="text-red-500 text-sm text-center">{error}</p>
      )}

      {loading && (
        <p className="text-orange-600 text-sm text-center">Verifying...</p>
      )}

      <div className="text-center">
        <button
          type="button"
          onClick={handleResend}
          disabled={resendCooldown > 0}
          className="text-sm text-[#3B4E8C] hover:text-[#2D3E6E] underline disabled:text-gray-400 disabled:no-underline"
        >
          {resendCooldown > 0
            ? `Resend code in ${resendCooldown}s`
            : "Resend verification code"}
        </button>
      </div>
    </div>
  );
}
