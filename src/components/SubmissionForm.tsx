"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import KakaoAddressSearch from "./KakaoAddressSearch";
import type { AddressData, FormErrors } from "@/types";

declare global {
  interface Window {
    kakao: {
      maps: {
        load: (callback: () => void) => void;
        Map: new (container: HTMLElement, options: object) => KakaoMapInstance;
        LatLng: new (lat: number, lng: number) => object;
        Marker: new (options: object) => KakaoMarker;
        services: {
          Geocoder: new () => KakaoGeocoder;
          Status: { OK: string };
        };
      };
    };
  }
}

interface KakaoMapInstance {
  setCenter: (latlng: object) => void;
}

interface KakaoMarker {
  setMap: (map: KakaoMapInstance | null) => void;
}

interface KakaoGeocoder {
  addressSearch: (
    address: string,
    callback: (result: Array<{ x: string; y: string }>, status: string) => void
  ) => void;
}

const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "pdf", "hwp", "doc", "docx", "xlsx"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB

export default function SubmissionForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [projectName, setProjectName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [address, setAddress] = useState<AddressData | null>(null);
  const [mapCoords, setMapCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [consentChecked, setConsentChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<KakaoMapInstance | null>(null);
  const markerRef = useRef<KakaoMarker | null>(null);

  const handleAddressComplete = useCallback(
    (data: { fullAddress: string; sido: string; sigungu: string; zonecode: string }) => {
      setAddress(data);
      setMapCoords(null);
      setLocationConfirmed(false);
      mapRef.current = null;
      markerRef.current = null;
      setErrors((prev) => ({ ...prev, address: undefined, locationConfirmed: undefined }));
    },
    []
  );

  // 주소 선택 시 Kakao Maps 지오코딩 + 지도 초기화
  useEffect(() => {
    if (!address || !mapContainerRef.current) return;

    const initMap = () => {
      if (!mapContainerRef.current || !window.kakao?.maps) return;

      const geocoder = new window.kakao.maps.services.Geocoder();
      geocoder.addressSearch(address.fullAddress, (result, status) => {
        if (status !== window.kakao.maps.services.Status.OK || !result[0]) return;

        const lat = parseFloat(result[0].y);
        const lng = parseFloat(result[0].x);
        const latlng = new window.kakao.maps.LatLng(lat, lng);

        if (!mapRef.current && mapContainerRef.current) {
          mapRef.current = new window.kakao.maps.Map(mapContainerRef.current, {
            center: latlng,
            level: 3,
          });
        } else {
          mapRef.current?.setCenter(latlng);
        }

        markerRef.current?.setMap(null);
        markerRef.current = new window.kakao.maps.Marker({ position: latlng });
        markerRef.current.setMap(mapRef.current!);

        setMapCoords({ lat, lng });
      });
    };

    const loadKakaoMap = () => {
      if (window.kakao?.maps?.load) {
        window.kakao.maps.load(initMap);
        return;
      }

      const appKey = process.env.NEXT_PUBLIC_KAKAO_APP_KEY;
      if (!appKey) return;

      if (!document.getElementById("kakao-map-script")) {
        const script = document.createElement("script");
        script.id = "kakao-map-script";
        script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&libraries=services&autoload=false`;
        script.onload = () => window.kakao.maps.load(initMap);
        document.head.appendChild(script);
      } else {
        window.kakao.maps.load(initMap);
      }
    };

    loadKakaoMap();
  }, [address]);

  const validateFile = (file: File): string | null => {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return `허용되지 않는 파일 형식입니다: ${file.name}`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `파일 크기가 10MB를 초과합니다: ${file.name}`;
    }
    return null;
  };

  const addFiles = (newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    const validFiles: File[] = [];
    for (const file of fileArray) {
      const error = validateFile(file);
      if (error) {
        setErrors((prev) => ({ ...prev, files: error }));
        return;
      }
      validFiles.push(file);
    }
    const totalSize = [...files, ...validFiles].reduce((sum, f) => sum + f.size, 0);
    if (totalSize > MAX_TOTAL_SIZE) {
      setErrors((prev) => ({ ...prev, files: "총 파일 크기가 50MB를 초과합니다." }));
      return;
    }
    setFiles((prev) => [...prev, ...validFiles]);
    setErrors((prev) => ({ ...prev, files: undefined }));
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!projectName.trim()) newErrors.projectName = "공사명을 입력해주세요.";
    else if (projectName.length > 200) newErrors.projectName = "공사명은 200자 이내로 입력해주세요.";

    if (!companyName.trim()) newErrors.companyName = "시공업체명을 입력해주세요.";
    else if (companyName.length > 100) newErrors.companyName = "시공업체명은 100자 이내로 입력해주세요.";

    if (!startDate) newErrors.constructionStartDate = "공사 시작일을 선택해주세요.";
    if (!endDate) newErrors.constructionEndDate = "공사 종료일을 선택해주세요.";
    if (startDate && endDate && endDate < startDate) {
      newErrors.constructionEndDate = "종료일은 시작일 이후여야 합니다.";
    }

    if (!address) newErrors.address = "공사 위치를 검색해주세요.";
    else if (!locationConfirmed) newErrors.locationConfirmed = "지도에서 위치를 확인해주세요.";

    if (!consentChecked) newErrors.consentGiven = "개인정보 수집에 동의해주세요.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !address) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("projectName", projectName.trim());
      formData.append("companyName", companyName.trim());
      formData.append("constructionStartDate", startDate);
      formData.append("constructionEndDate", endDate);
      formData.append("fullAddress", address.fullAddress);
      formData.append("sido", address.sido);
      formData.append("sigungu", address.sigungu);
      if (mapCoords) {
        formData.append("latitude", String(mapCoords.lat));
        formData.append("longitude", String(mapCoords.lng));
      }
      formData.append("consentGiven", "true");

      for (const file of files) {
        formData.append("files", file);
      }

      const res = await fetch("/api/request", { method: "POST", body: formData });
      if (res.ok) {
        router.push("/request/complete");
        return;
      }
      const data = await res.json().catch(() => ({}));
      setErrors({ projectName: data.message || "접수에 실패했습니다. 다시 시도해주세요." });
    } catch {
      setErrors({ projectName: "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* 섹션 1: 공사 정보 */}
      <div className="space-y-5">
        <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
          공사 정보
        </h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            공사명 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            maxLength={200}
            placeholder="예: OO구간 도로굴착 공사"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
          {errors.projectName && (
            <p className="text-red-500 text-xs mt-1">{errors.projectName}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            시공업체명 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            maxLength={100}
            placeholder="예: OO건설(주)"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
          {errors.companyName && (
            <p className="text-red-500 text-xs mt-1">{errors.companyName}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            공사예정기간 <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <span className="text-gray-400">~</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          {(errors.constructionStartDate || errors.constructionEndDate) && (
            <p className="text-red-500 text-xs mt-1">
              {errors.constructionStartDate || errors.constructionEndDate}
            </p>
          )}
        </div>
      </div>

      {/* 섹션 2: 공사 위치 */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
          공사 위치
        </h3>
        <div className="flex items-center gap-3">
          <KakaoAddressSearch onComplete={handleAddressComplete} />
          {address ? (
            <span className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 flex-1 truncate">
              {address.fullAddress}
            </span>
          ) : (
            <span className="text-sm text-gray-400">주소를 검색해주세요</span>
          )}
        </div>
        {errors.address && (
          <p className="text-red-500 text-xs">{errors.address}</p>
        )}

        {/* 지도 + 위치 확인 체크박스 */}
        {address && (
          <div className="rounded-xl overflow-hidden border border-gray-200">
            <div
              ref={mapContainerRef}
              style={{ height: 280 }}
              className="bg-gray-100 w-full"
            />
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={locationConfirmed}
                  onChange={(e) => {
                    setLocationConfirmed(e.target.checked);
                    if (e.target.checked) {
                      setErrors((prev) => ({ ...prev, locationConfirmed: undefined }));
                    }
                  }}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  지도에서 공사 위치를 확인했습니다.
                </span>
              </label>
              {errors.locationConfirmed && (
                <p className="text-red-500 text-xs mt-1">{errors.locationConfirmed}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 섹션 3: 첨부파일 */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
          첨부파일 <span className="text-sm font-normal text-gray-400">(선택)</span>
        </h3>
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="flex items-center gap-3 border border-dashed border-gray-300 rounded-lg px-4 py-3 hover:border-blue-400 transition-colors"
        >
          <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <span className="text-sm text-gray-500 flex-1">
            드래그하거나{" "}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-blue-600 hover:underline"
            >
              클릭하여 파일 선택
            </button>
          </span>
          <span className="text-xs text-gray-400 shrink-0">파일당 10MB · 총 50MB</span>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.pdf,.hwp,.doc,.docx,.xlsx"
            onChange={(e) => e.target.files && addFiles(e.target.files)}
            className="hidden"
          />
        </div>
        {errors.files && (
          <p className="text-red-500 text-xs">{errors.files}</p>
        )}
        {files.length > 0 && (
          <ul className="space-y-1">
            {files.map((file, i) => (
              <li key={i} className="flex items-center justify-between bg-gray-50 rounded px-3 py-1.5 text-xs">
                <span className="text-gray-700 truncate mr-3">{file.name}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-gray-400">{(file.size / 1024 / 1024).toFixed(1)}MB</span>
                  <button type="button" onClick={() => removeFile(i)} className="text-red-400 hover:text-red-600">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 섹션 4: 개인정보 동의 */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
          개인정보 수집 동의
        </h3>
        <div className="bg-gray-50 rounded-lg p-4 text-xs text-gray-500 leading-relaxed max-h-32 overflow-y-auto">
          본 서비스는 굴착공사 안전신고 접수를 위해 다음과 같은 정보를 수집합니다.<br /><br />
          <strong>수집 항목:</strong> 공사명, 시공업체명, 공사예정기간, 공사위치(주소, 좌표)<br />
          <strong>수집 목적:</strong> 해당 지역 지하매설물 담당자에게 굴착공사 정보 전달<br />
          <strong>보유 기간:</strong> 접수일로부터 1년<br /><br />
          귀하는 위 동의를 거부할 권리가 있으나, 동의를 거부할 경우 접수가 불가합니다.
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={consentChecked}
            onChange={(e) => setConsentChecked(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">
            위 내용을 확인하였으며, 개인정보 수집에 동의합니다.
          </span>
        </label>
        {errors.consentGiven && (
          <p className="text-red-500 text-xs">{errors.consentGiven}</p>
        )}
      </div>

      {/* 제출 버튼 */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-blue-600 text-white font-semibold py-3.5 rounded-xl hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-base"
      >
        {isSubmitting ? "접수 중..." : "접수하기"}
      </button>
    </form>
  );
}
