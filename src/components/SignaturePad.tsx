"use client";

import { useRef, useEffect, useState } from "react";
import SignaturePadLib from "signature_pad";

interface SignaturePadProps {
  onSignatureChange: (dataUrl: string | null) => void;
}

export default function SignaturePad({ onSignatureChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signaturePadRef = useRef<SignaturePadLib | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(ratio, ratio);
      }
      // Restore signature after resize if we have one
      if (signaturePadRef.current && !signaturePadRef.current.isEmpty()) {
        const data = signaturePadRef.current.toData();
        signaturePadRef.current.clear();
        signaturePadRef.current.fromData(data);
      }
    };

    const pad = new SignaturePadLib(canvas, {
      backgroundColor: "rgb(255, 255, 255)",
      penColor: "rgb(0, 0, 0)",
      minWidth: 1,
      maxWidth: 2.5,
    });

    pad.addEventListener("endStroke", () => {
      setIsEmpty(pad.isEmpty());
      if (!pad.isEmpty()) {
        onSignatureChange(pad.toDataURL("image/png"));
      }
    });

    signaturePadRef.current = pad;
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      pad.off();
    };
  }, [onSignatureChange]);

  const handleClear = () => {
    signaturePadRef.current?.clear();
    setIsEmpty(true);
    onSignatureChange(null);
  };

  return (
    <div>
      <div className="border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          className="w-full touch-none"
          style={{ height: "200px" }}
        />
      </div>
      <div className="flex items-center justify-between mt-2">
        <p className="text-sm text-gray-500">
          {isEmpty ? "Sign above using your mouse or finger" : "Signature captured"}
        </p>
        <button
          type="button"
          onClick={handleClear}
          className="text-sm text-red-600 hover:text-red-800 underline"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
