"use client";

import { useEffect, useCallback, useState, useRef } from "react";

declare global {
  interface Window {
    daum: {
      Postcode: new (options: {
        oncomplete: (data: DaumPostcodeResult) => void;
        width?: string | number;
        height?: string | number;
      }) => { embed: (el: HTMLElement) => void };
    };
    kakao: {
      maps: {
        load: (cb: () => void) => void;
        Map: new (el: HTMLElement, opts: { center: unknown; level: number }) => KakaoMapInst;
        LatLng: new (lat: number, lng: number) => unknown;
        Marker: new (opts: { map: KakaoMapInst; position: unknown }) => void;
        services: {
          Geocoder: new () => {
            addressSearch: (
              addr: string,
              cb: (result: { x: string; y: string }[], status: string) => void
            ) => void;
          };
          Status: { OK: string };
        };
      };
    };
  }
}

interface KakaoMapInst {
  setCenter: (latlng: unknown) => void;
  relayout: () => void;
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
  latitude?: number;
  longitude?: number;
}

interface Props {
  onComplete: (data: AddressResult) => void;
}

type Step = "idle" | "search" | "confirm";

export default function KakaoAddressSearch({ onComplete }: Props) {
  const [step, setStep] = useState<Step>("idle");
  const [pending, setPending] = useState<DaumPostcodeResult | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const postcodeRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node || step !== "search" || !window.daum?.Postcode) return;
      new window.daum.Postcode({
        oncomplete(data) {
          setPending(data);
          setCoords(null);
          setStep("confirm");
        },
        width: "100%",
        height: "100%",
      }).embed(node);
    },
    [step]
  );

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<KakaoMapInst | null>(null);

  // 지도 초기화 & 지오코딩
  useEffect(() => {
    if (step !== "confirm" || !pending || !mapContainerRef.current) return;

    const appKey = process.env.NEXT_PUBLIC_KAKAO_APP_KEY;
    if (!appKey) {
      // API 키 없으면 좌표 없이 확인만
      return;
    }

    const initMap = () => {
      if (!mapContainerRef.current) return;
      const geocoder = new window.kakao.maps.services.Geocoder();
      geocoder.addressSearch(pending.address, (result, status) => {
        if (status !== window.kakao.maps.services.Status.OK || !mapContainerRef.current) return;
        const lat = parseFloat(result[0].y);
        const lng = parseFloat(result[0].x);
        const latlng = new window.kakao.maps.LatLng(lat, lng);

        if (!mapRef.current) {
          mapRef.current = new window.kakao.maps.Map(mapContainerRef.current, {
            center: latlng,
            level: 4,
          });
        } else {
          mapRef.current.setCenter(latlng);
          mapRef.current.relayout();
        }
        new window.kakao.maps.Marker({ map: mapRef.current!, position: latlng });
        setCoords({ lat, lng });
      });
    };

    if (window.kakao?.maps?.services) {
      initMap();
      return;
    }
    if (document.getElementById("kakao-map-script")) {
      window.kakao.maps.load(initMap);
      return;
    }
    const script = document.createElement("script");
    script.id = "kakao-map-script";
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&libraries=services&autoload=false`;
    script.async = true;
    script.onload = () => window.kakao.maps.load(initMap);
    document.head.appendChild(script);
  }, [step, pending]);

  // Daum Postcode 스크립트 로드
  useEffect(() => {
    if (document.getElementById("daum-postcode-script")) return;
    const s = document.createElement("script");
    s.id = "daum-postcode-script";
    s.src = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    s.async = true;
    document.head.appendChild(s);
  }, []);

  const handleConfirm = useCallback(() => {
    if (!pending) return;
    onComplete({
      fullAddress: pending.address,
      sido: pending.sido,
      sigungu: pending.sigungu,
      zonecode: pending.zonecode,
      latitude: coords?.lat,
      longitude: coords?.lng,
    });
    setStep("idle");
    setPending(null);
    mapRef.current = null;
  }, [pending, coords, onComplete]);

  const close = () => {
    setStep("idle");
    setPending(null);
    mapRef.current = null;
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setStep("search")}
        className="bg-blue-600 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors shrink-0"
      >
        주소 검색
      </button>

      {(step === "search" || step === "confirm") && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) => { if (e.target === e.currentTarget) close(); }}
        >
          <div className="bg-white rounded-xl shadow-xl overflow-hidden w-full max-w-lg mx-4">
            {/* 헤더 */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                {step === "confirm" && (
                  <button
                    type="button"
                    onClick={() => { setStep("search"); setCoords(null); }}
                    className="text-gray-400 hover:text-gray-600 mr-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}
                <span className="font-semibold text-gray-800 text-sm">
                  {step === "search" ? "주소 검색" : "위치 확인"}
                </span>
              </div>
              <button type="button" onClick={close} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Step 1: 주소 검색 */}
            {step === "search" && (
              <div ref={postcodeRef} style={{ height: 460 }} />
            )}

            {/* Step 2: 지도 확인 */}
            {step === "confirm" && pending && (
              <div>
                <div className="px-4 py-2.5 bg-blue-50 text-sm text-blue-800 font-medium border-b border-blue-100">
                  {pending.address}
                </div>
                <div ref={mapContainerRef} style={{ height: 340 }} className="bg-gray-100" />
                <div className="px-4 py-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={handleConfirm}
                    className="w-full bg-blue-600 text-white font-semibold py-2.5 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    이 위치로 확인
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
