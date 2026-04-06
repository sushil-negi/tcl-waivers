"use client";

import { getWaiverText } from "@/lib/waiver-template";

interface WaiverPreviewProps {
  participantName: string;
}

export default function WaiverPreview({ participantName }: WaiverPreviewProps) {
  const waiverText = getWaiverText(participantName);
  const paragraphs = waiverText.split("\n\n");

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 max-h-[500px] overflow-y-auto text-sm leading-relaxed">
      <h3 className="text-lg font-bold text-[#3B4E8C] mb-4">
        WAIVER, RELEASE & ASSUMPTION OF RISK
      </h3>
      {paragraphs.map((para, index) => {
        const trimmed = para.trim();
        if (!trimmed) return null;

        if (trimmed.startsWith("##")) {
          return (
            <h4
              key={index}
              className="font-bold text-gray-800 mt-4 mb-2"
            >
              {trimmed.replace("## ", "")}
            </h4>
          );
        }

        return (
          <p key={index} className="text-gray-700 mb-3">
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}
