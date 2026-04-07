"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import WaiverForm, { PlayerInfo } from "@/components/WaiverForm";
import VerificationInput from "@/components/VerificationInput";
import WaiverPreview from "@/components/WaiverPreview";
import SignaturePad from "@/components/SignaturePad";
import { gatherClientInfo, ClientInfo } from "@/lib/client-info";

type Step = "form" | "verify" | "sign" | "success";

interface SuccessData {
  documentId: string;
  driveFileUrl?: string;
}

export default function Home() {
  const [step, setStep] = useState<Step>("form");
  const [playerInfo, setPlayerInfo] = useState<PlayerInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [consentElectronic, setConsentElectronic] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [successData, setSuccessData] = useState<SuccessData | null>(null);
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);

  // Gather client info on page load
  useEffect(() => {
    gatherClientInfo().then(setClientInfo);
  }, []);

  const handleFormSubmit = async (info: PlayerInfo) => {
    setLoading(true);
    setError("");

    try {
      const statusRes = await fetch("/api/check-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: info.email }),
      });
      const statusData = await statusRes.json();

      if (statusData.alreadySigned) {
        setError(
          "This email has already been used to sign a waiver. Each participant can only sign once."
        );
        setLoading(false);
        return;
      }

      const codeRes = await fetch("/api/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: info.email }),
      });
      const codeData = await codeRes.json();

      if (!codeRes.ok) {
        setError(codeData.error || "Failed to send verification code");
        setLoading(false);
        return;
      }

      setPlayerInfo(info);
      setStep("verify");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (code: string) => {
    setLoading(true);
    setVerifyError("");

    try {
      const res = await fetch("/api/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: playerInfo?.email, code }),
      });
      const data = await res.json();

      if (!res.ok) {
        setVerifyError(data.error || "Verification failed");
        setLoading(false);
        return;
      }

      setStep("sign");
    } catch {
      setVerifyError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await fetch("/api/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: playerInfo?.email }),
      });
    } catch {
      // Silent fail on resend
    }
  };

  const handleSubmitWaiver = async () => {
    if (!signatureDataUrl) {
      setError("Please provide your signature");
      return;
    }
    if (!consentElectronic || !agreeTerms) {
      setError("Please check both consent boxes");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/submit-waiver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...playerInfo,
          signatureDataUrl,
          consentToElectronic: consentElectronic,
          agreeToTerms: agreeTerms,
          clientInfo,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to submit waiver");
        setLoading(false);
        return;
      }

      setSuccessData({
        documentId: data.documentId,
        driveFileUrl: data.driveFileUrl,
      });
      setStep("success");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignatureChange = useCallback((dataUrl: string | null) => {
    setSignatureDataUrl(dataUrl);
  }, []);

  const steps = [
    { key: "form", label: "Details" },
    { key: "verify", label: "Verify" },
    { key: "sign", label: "Sign" },
    { key: "success", label: "Done" },
  ];
  const currentStepIndex = steps.findIndex((s) => s.key === step);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-orange-50/40 flex flex-col">
      <header className="bg-[#1E2533] text-white py-5 px-4 shadow-lg">
        <div className="flex items-center justify-center gap-4">
          <div className="bg-white rounded-full p-1.5 shadow-md">
            <Image
              src="/tcl-logo.png"
              alt="Tennis Cricket League Logo"
              width={52}
              height={52}
            />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-wide">Tennis Cricket League</h1>
            <p className="text-orange-300 text-sm mt-0.5">
              Player Registration & Waiver
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full px-4 mt-6">
        <div className="flex items-center justify-between mb-8">
          {steps.map((s, index) => (
            <div key={s.key} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                    index <= currentStepIndex
                      ? "bg-orange-500 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {index < currentStepIndex ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={`text-xs mt-1 ${
                    index <= currentStepIndex
                      ? "text-orange-600 font-semibold"
                      : "text-gray-400"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`h-0.5 flex-1 mx-2 -mt-5 ${
                    index < currentStepIndex ? "bg-orange-500" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <main className="max-w-2xl mx-auto w-full px-4 pb-16">
        <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-6 md:p-8 relative overflow-hidden">
          {/* Watermark */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
            <Image
              src="/tcl-logo.png"
              alt=""
              width={300}
              height={300}
              className="opacity-[0.06]"
              aria-hidden="true"
            />
          </div>
          {/* Content above watermark */}
          <div className="relative z-10">
          {step === "form" && (
            <>
              <h2 className="text-xl font-bold text-[#1E2533] mb-2">
                Participant Information
              </h2>
              <p className="text-gray-600 text-sm mb-6">
                Please fill in your details. All fields marked * are required.
              </p>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                  {error}
                </div>
              )}
              <WaiverForm onSubmit={handleFormSubmit} loading={loading} />
            </>
          )}

          {step === "verify" && playerInfo && (
            <>
              <h2 className="text-xl font-bold text-[#1E2533] mb-2">
                Verify Your Email
              </h2>
              <p className="text-gray-600 text-sm mb-6">
                For security, we need to verify your email address before you
                can sign the waiver.
              </p>
              <VerificationInput
                email={playerInfo.email}
                onVerify={handleVerify}
                onResend={handleResend}
                loading={loading}
                error={verifyError}
              />
              <button
                onClick={() => {
                  setStep("form");
                  setVerifyError("");
                }}
                className="mt-6 text-sm text-gray-500 hover:text-gray-700 underline block mx-auto"
              >
                Back to form
              </button>
            </>
          )}

          {step === "sign" && playerInfo && (
            <>
              <h2 className="text-xl font-bold text-[#1E2533] mb-2">
                Review & Sign Waiver
              </h2>
              <p className="text-gray-600 text-sm mb-6">
                Please read the waiver carefully, then sign below.
              </p>

              <WaiverPreview participantName={playerInfo.fullName} />

              <div className="mt-6 space-y-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentElectronic}
                    onChange={(e) => setConsentElectronic(e.target.checked)}
                    className="mt-1 h-4 w-4 text-green-600 rounded"
                  />
                  <span className="text-sm text-gray-700">
                    I consent to signing this document electronically and
                    acknowledge that my electronic signature has the same legal
                    effect as a handwritten signature.
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="mt-1 h-4 w-4 text-green-600 rounded"
                  />
                  <span className="text-sm text-gray-700">
                    I have read this waiver and release, fully understand its
                    terms, and understand that I am giving up substantial rights.
                    I sign it freely and voluntarily.
                  </span>
                </label>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Your Signature *
                </label>
                <SignaturePad onSignatureChange={handleSignatureChange} />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mt-4">
                  {error}
                </div>
              )}

              <button
                onClick={handleSubmitWaiver}
                disabled={loading || !signatureDataUrl || !consentElectronic || !agreeTerms}
                className="w-full mt-6 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Submitting..." : "Sign & Submit Waiver"}
              </button>

              <button
                onClick={() => setStep("verify")}
                className="mt-3 text-sm text-gray-500 hover:text-gray-700 underline block mx-auto"
              >
                Back
              </button>
            </>
          )}

          {step === "success" && successData && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Waiver Signed Successfully!
              </h2>
              <p className="text-gray-600 mb-6">
                Your waiver has been recorded and stored securely.
              </p>

              <div className="bg-gray-50 rounded-lg p-4 inline-block text-left">
                <p className="text-sm text-gray-500">Document Reference</p>
                <p className="text-lg font-mono font-bold text-[#3B4E8C]">
                  {successData.documentId}
                </p>
              </div>

              <p className="text-sm text-gray-500 mt-6">
                Please save your document reference for your records.
                <br />A copy of the signed waiver has been stored securely.
              </p>
            </div>
          )}
          </div>{/* end relative z-10 */}
        </div>

        <p className="text-center text-xs text-gray-400 mt-8">
          Tennis Cricket League &middot; Electronic signatures comply with ESIGN
          Act & UETA
        </p>
      </main>
    </div>
  );
}
