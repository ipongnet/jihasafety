"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Map as LeafletMap, Marker, Polyline } from "leaflet";
import "leaflet/dist/leaflet.css";
import KakaoAddressSearch from "./KakaoAddressSearch";
import type { AddressData, FormErrors } from "@/types";

const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "pdf", "hwp", "doc", "docx", "xlsx"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_TOTAL_SIZE = 10 * 1024 * 1024; // 10MB

export default function SubmissionForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [projectName, setProjectName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [submitterEmail, setSubmitterEmail] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [address, setAddress] = useState<AddressData | null>(null);
  const [mapCoords, setMapCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [matchedContact, setMatchedContact] = useState<{
    id: number; personName: string; email: string; department: string | null;
  } | null>(null);
  const [contactLoaded, setContactLoaded] = useState(false);
  const [availableContacts, setAvailableContacts] = useState<Array<{
    id: number; sido: string; sigungu: string; personName: string; email: string; phone: string; department: string | null;
  }>>([]);
  const [selectedContactId, setSelectedContactId] = useState<string>("");
  const [adjustedCoords, setAdjustedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [drawMode, setDrawMode] = useState(false);
  const [drawCoords, setDrawCoords] = useState<[number, number][]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [consentChecked, setConsentChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const vwMapRef = useRef<LeafletMap | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletRef = useRef<any>(null);
  const markerRef = useRef<Marker | null>(null);
  const polylineRef = useRef<Polyline | null>(null);

  const handleAddressComplete = useCallback(
    (data: { fullAddress: string; sido: string; sigungu: string; zonecode: string }) => {
      setAddress(data);
      setMapCoords(null);
      setLocationConfirmed(false);
      setMapError(null);
      vwMapRef.current = null;
      setAdjustedCoords(null);
      setDrawMode(false);
      setDrawCoords([]);
      setMatchedContact(null);
      setAvailableContacts([]);
      setSelectedContactId("");
      setContactLoaded(false);
      setErrors((prev) => ({ ...prev, address: undefined, locationConfirmed: undefined }));
    },
    []
  );

  // 주소 선택 시 V-World 지오코딩
  useEffect(() => {
    if (!address) return;
    setMapCoords(null);
    setMapError(null);

    fetch(`/api/geocode?address=${encodeURIComponent(address.fullAddress)}`)
      .then((res) => res.ok ? res.json() : Promise.reject(res))
      .then(({ lat, lng }) => setMapCoords({ lat, lng }))
      .catch(() => setMapError("주소의 좌표를 찾을 수 없습니다. 지도 없이 접수할 수 있습니다."));
  }, [address]);

  // 주소 변경 시 담당자 확인
  useEffect(() => {
    if (!address) {
      setMatchedContact(null);
      setAvailableContacts([]);
      setSelectedContactId("");
      setContactLoaded(false);
      return;
    }
    setContactLoaded(false);
    fetch(`/api/contacts/check?sido=${encodeURIComponent(address.sido)}&sigungu=${encodeURIComponent(address.sigungu)}`)
      .then(res => res.json())
      .then(data => {
        setMatchedContact(data.matchedContact ?? null);
        setAvailableContacts(data.contacts ?? []);
        if (data.matchedContact) {
          setSelectedContactId(String(data.matchedContact.id));
        } else {
          setSelectedContactId("");
        }
        setContactLoaded(true);
      })
      .catch(() => { setMatchedContact(null); setContactLoaded(true); });
  }, [address]);

  // 좌표 획득 후 Leaflet 지도 초기화
  useEffect(() => {
    if (!mapCoords || !mapContainerRef.current) return;
    const { lat, lng } = mapCoords;
    const apiKey = process.env.NEXT_PUBLIC_VWORLD_API_KEY;
    const container = mapContainerRef.current;

    const initMap = async () => {
      const L = (await import("leaflet")).default;
      leafletRef.current = L;

      // 기존 맵 정리
      if (vwMapRef.current) {
        vwMapRef.current.remove();
        vwMapRef.current = null;
      }
      polylineRef.current = null;
      markerRef.current = null;

      try {
        const map = L.map(container).setView([lat, lng], 15);

        L.tileLayer(
          apiKey
            ? `https://api.vworld.kr/req/wmts/1.0.0/${apiKey}/Base/{z}/{y}/{x}.png`
            : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
          {
            attribution: apiKey ? "© VWorld" : "© OpenStreetMap",
            maxZoom: 19,
          }
        ).addTo(map);

        // 마커 아이콘 (Leaflet 번들링 이슈 우회)
        const icon = L.icon({
          iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
          iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
          shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
          iconSize: [25, 41],
          iconAnchor: [12, 41],
        });

        const marker = L.marker([lat, lng], { icon, draggable: true }).addTo(map);
        marker.on("dragend", () => {
          const pos = marker.getLatLng();
          setAdjustedCoords({ lat: pos.lat, lng: pos.lng });
        });
        markerRef.current = marker;
        vwMapRef.current = map;
      } catch {
        setMapError("지도를 불러오는데 실패했습니다. 지도 없이 접수할 수 있습니다.");
      }
    };

    initMap();

    return () => {
      if (vwMapRef.current) {
        vwMapRef.current.remove();
        vwMapRef.current = null;
      }
    };
  }, [mapCoords]);

  // drawCoords 변경 시 폴리라인 업데이트
  useEffect(() => {
    const L = leafletRef.current;
    const map = vwMapRef.current;
    if (!L || !map) return;

    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    if (drawCoords.length >= 2) {
      polylineRef.current = L.polyline(drawCoords, {
        color: "#ef4444",
        weight: 4,
        opacity: 0.8,
        dashArray: "10, 6",
      }).addTo(map);
    }
  }, [drawCoords]);

  // drawMode 변경 시 커서 + 클릭 핸들러
  useEffect(() => {
    const map = vwMapRef.current;
    if (!map) return;
    const container = map.getContainer();

    const onClick = (e: { latlng: { lat: number; lng: number } }) => {
      setDrawCoords(prev => [...prev, [e.latlng.lat, e.latlng.lng]]);
    };

    if (drawMode) {
      container.style.cursor = "crosshair";
      map.on("click", onClick);
    } else {
      container.style.cursor = "";
      map.off("click", onClick);
    }

    return () => {
      container.style.cursor = "";
      map.off("click", onClick);
    };
  }, [drawMode]);

  const validateFile = (file: File): string | null => {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return `허용되지 않는 파일 형식입니다: ${file.name}`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `파일 크기가 5MB를 초과합니다: ${file.name}`;
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
      setErrors((prev) => ({ ...prev, files: "총 파일 크기가 10MB를 초과합니다." }));
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

    if (!submitterEmail.trim()) newErrors.submitterEmail = "이메일 주소를 입력해주세요.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submitterEmail)) newErrors.submitterEmail = "올바른 이메일 형식을 입력해주세요.";

    if (!startDate) newErrors.constructionStartDate = "공사 시작일을 선택해주세요.";
    if (!endDate) newErrors.constructionEndDate = "공사 종료일을 선택해주세요.";
    if (startDate && endDate && endDate < startDate) {
      newErrors.constructionEndDate = "종료일은 시작일 이후여야 합니다.";
    }

    if (!address) newErrors.address = "공사 위치를 검색해주세요.";
    else if (!locationConfirmed && !mapError) newErrors.locationConfirmed = "지도에서 위치를 확인해주세요.";

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
      formData.append("submitterEmail", submitterEmail.trim());
      formData.append("constructionStartDate", startDate);
      formData.append("constructionEndDate", endDate);
      formData.append("fullAddress", address.fullAddress);
      formData.append("sido", address.sido);
      formData.append("sigungu", address.sigungu);
      const finalCoords = adjustedCoords ?? mapCoords;
      if (finalCoords) {
        formData.append("latitude", String(finalCoords.lat));
        formData.append("longitude", String(finalCoords.lng));
      }
      if (drawCoords.length >= 2) {
        const geojson = JSON.stringify({
          type: "LineString",
          coordinates: drawCoords.map(([lat, lng]) => [lng, lat]),
        });
        formData.append("constructionRoute", geojson);
      }
      formData.append("consentGiven", "true");

      if (selectedContactId) {
        formData.append("selectedContactId", selectedContactId);
      }

      for (const file of files) {
        formData.append("files", file);
      }

      const res = await fetch("/api/request", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        sessionStorage.setItem("submissionResult", JSON.stringify({
          submissionNumber: data.submissionNumber ?? null,
          emailSentTo: data.emailSentTo ?? null,
          contact: data.contact ?? null,
        }));
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
            이메일 주소 <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={submitterEmail}
            onChange={(e) => setSubmitterEmail(e.target.value)}
            maxLength={200}
            placeholder="예: contact@company.co.kr"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
          {errors.submitterEmail && (
            <p className="text-red-500 text-xs mt-1">{errors.submitterEmail}</p>
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
            {mapError ? (
              <div style={{ height: 280 }} className="bg-gray-100 w-full flex items-center justify-center">
                <p className="text-sm text-red-500">{mapError}</p>
              </div>
            ) : (
              <div style={{ height: 280 }} className="relative bg-gray-100 w-full">
                <div ref={mapContainerRef} style={{ height: 280 }} className="w-full" />
                {!mapCoords && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-sm text-gray-400">좌표 변환 중...</p>
                  </div>
                )}
              </div>
            )}
            {mapCoords && !mapError && (
              <p className="text-xs text-gray-400 px-4 pt-2">마커를 드래그하여 정확한 위치로 조정할 수 있습니다.</p>
            )}
            <div className="px-4 py-2 bg-white border-t border-gray-200 flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setDrawMode(prev => !prev)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  drawMode
                    ? "bg-red-100 text-red-700 border border-red-300"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200"
                }`}
              >
                {drawMode ? "그리기 종료" : "공사구간 그리기"}
              </button>
              {drawCoords.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => setDrawCoords(prev => prev.slice(0, -1))}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200"
                  >
                    되돌리기
                  </button>
                  <button
                    type="button"
                    onClick={() => setDrawCoords([])}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200"
                  >
                    초기화
                  </button>
                  <span className="text-xs text-gray-400 ml-auto">{drawCoords.length}개 점</span>
                </>
              )}
            </div>
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

      {/* 담당자 선택 */}
      {address && contactLoaded && (
        <div className={`rounded-lg p-4 space-y-3 ${matchedContact ? "bg-blue-50 border border-blue-200" : "bg-amber-50 border border-amber-200"}`}>
          {matchedContact ? (
            <p className="text-sm text-blue-700">
              자동 매칭된 담당자: <strong>{matchedContact.personName}</strong> ({matchedContact.email})
              {matchedContact.department && <span className="text-blue-500"> — {matchedContact.department}</span>}
            </p>
          ) : (
            <p className="text-sm text-amber-700">
              해당 지역의 담당자가 등록되어 있지 않습니다.
              아래 목록에서 담당자를 선택해주세요.
            </p>
          )}
          {availableContacts.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                담당자 {matchedContact ? "변경" : "선택"} <span className="text-sm font-normal text-gray-400">(선택)</span>
              </label>
              <select
                value={selectedContactId}
                onChange={(e) => setSelectedContactId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              >
                <option value="">-- 담당자를 선택하세요 --</option>
                {availableContacts.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.department ? `[${c.department}] ` : ""}{c.personName} ({c.sido} {c.sigungu}) - {c.email}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

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
          <span className="text-xs text-gray-400 shrink-0">파일당 5MB · 총 10MB</span>
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
