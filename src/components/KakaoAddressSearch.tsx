"use client";

import { useEffect, useCallback, useState } from "react";

declare global {
  interface Window {
    daum: {
      Postcode: new (options: {
        oncomplete: (data: DaumPostcodeResult) => void;
        width?: string | number;
        height?: string | number;
      }) => { embed: (el: HTMLElement) => void };
    };
  }
}

interface DaumPostcodeResult {
  address: string;
  sido: string;
  sigungu: string;
  zonecode: string;
}

interface AddressResult {
  fullAddress: string;
  sido: string;
  sigungu: string;
  zonecode: string;
}

interface Props {
  onComplete: (data: AddressResult) => void;
}

export default function KakaoAddressSearch({ onComplete }: Props) {
  const [open, setOpen] = useState(false);

  const postcodeRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node || !open || !window.daum?.Postcode) return;
      new window.daum.Postcode({
        oncomplete(data) {
          onComplete({
            fullAddress: data.address,
            sido: data.sido,
            sigungu: data.sigungu,
            zonecode: data.zonecode,
          });
          setOpen(false);
        },
        width: "100%",
        height: "100%",
      }).embed(node);
    },
    [open, onComplete]
  );

  useEffect(() => {
    if (document.getElementById("daum-postcode-script")) return;
    const s = document.createElement("script");
    s.id = "daum-postcode-script";
    s.src = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    s.async = true;
    document.head.appendChild(s);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-blue-600 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors shrink-0"
      >
        주소 검색
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="bg-white rounded-xl shadow-xl overflow-hidden w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <span className="font-semibold text-gray-800 text-sm">주소 검색</span>
              <button type="button" onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div ref={postcodeRef} style={{ height: 460 }} />
          </div>
        </div>
      )}
    </>
  );
}
