"use client";

import { useState } from "react";

interface DaumPostcodeResult {
  sido: string;
  sigungu: string;
  roadAddress: string;
}

interface Contact {
  id: number;
  sido: string;
  sigungu: string;
  personName: string;
  department: string | null;
  phone: string;
}

interface Department {
  id: number;
  name: string;
  parentId: number | null;
}

const SIDO_MAP: Record<string, string> = {
  서울: "서울특별시", 부산: "부산광역시", 대구: "대구광역시", 인천: "인천광역시",
  광주: "광주광역시", 대전: "대전광역시", 울산: "울산광역시", 세종: "세종특별자치시",
  경기: "경기도", 강원: "강원특별자치도", 충북: "충청북도", 충남: "충청남도",
  전북: "전북특별자치도", 전남: "전라남도", 경북: "경상북도", 경남: "경상남도",
  제주: "제주특별자치도",
};

function normalizeSido(sido: string) {
  return SIDO_MAP[sido] || sido;
}

function findContactInList(contacts: Contact[], rawSido: string, sigungu: string): Contact | null {
  const sido = normalizeSido(rawSido);
  // 1) 정확 매칭
  let c = contacts.find((x) => x.sido === sido && x.sigungu === sigungu);
  if (c) return c;
  // 2) sigungu만 매칭
  c = contacts.find((x) => x.sigungu === sigungu);
  if (c) return c;
  // 3) 시 단위 prefix 매칭
  const cityPart = sigungu.split(" ")[0];
  if (cityPart !== sigungu) {
    c = contacts.find((x) => x.sido === sido && x.sigungu === cityPart);
    if (c) return c;
  }
  return null;
}

function deptDisplay(name: string | null, departments: Department[]): string {
  if (!name) return "-";
  const dept = departments.find((d) => d.name === name);
  if (!dept || !dept.parentId) return name;
  const parent = departments.find((d) => d.id === dept.parentId);
  return parent ? `${parent.name} > ${name}` : name;
}

export default function ContactsClient({ contacts, departments }: { contacts: Contact[]; departments: Department[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [searchResult, setSearchResult] = useState<Contact | null | "none">(null);
  const [searchAddress, setSearchAddress] = useState("");
  const [loading, setLoading] = useState(false);

  const toggle = (sido: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(sido) ? next.delete(sido) : next.add(sido);
      return next;
    });
  };

  const openAddressSearch = () => {
    const run = () => {
      new window.daum.Postcode({
        oncomplete: (data) => {
          const sigungu = data.sigungu || "";
          const sido = data.sido || "";
          setSearchAddress(data.address || `${sido} ${sigungu}`);
          const match = findContactInList(contacts, sido, sigungu);
          setSearchResult(match ?? "none");
        },
      }).open();
    };

    if (window.daum?.Postcode) {
      run();
    } else {
      setLoading(true);
      const s = document.createElement("script");
      s.src = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
      s.onload = () => { setLoading(false); run(); };
      document.head.appendChild(s);
    }
  };

  // 시/도별 그룹
  const grouped = contacts.reduce<Record<string, Contact[]>>((acc, c) => {
    (acc[c.sido] ??= []).push(c);
    return acc;
  }, {});
  const sidoList = Object.keys(grouped).sort();

  return (
    <div className="space-y-6">
      {/* 주소 검색 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <p className="text-sm font-medium text-gray-700">주소로 담당부서 찾기</p>
        <div className="flex gap-3">
          <button
            onClick={openAddressSearch}
            disabled={loading}
            className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
            </svg>
            {loading ? "로딩 중..." : "주소 검색"}
          </button>
          {searchAddress && (
            <span className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 flex-1 flex items-center truncate">
              {searchAddress}
            </span>
          )}
        </div>

        {/* 검색 결과 */}
        {searchResult !== null && (
          <div className={`rounded-lg px-4 py-3 border ${searchResult === "none" ? "bg-amber-50 border-amber-200" : "bg-blue-50 border-blue-200"}`}>
            {searchResult === "none" ? (
              <p className="text-sm text-amber-700">해당 지역의 등록된 담당자가 없습니다.</p>
            ) : (
              <div className="space-y-1.5">
                <p className="text-xs text-blue-400 font-medium">담당부서 정보</p>
                <div className="flex flex-wrap gap-x-6 gap-y-1">
                  <span className="text-sm text-blue-900 font-semibold">
                    {deptDisplay(searchResult.department, departments)}
                  </span>
                  {searchResult.phone && (
                    <span className="text-sm text-blue-800">{searchResult.phone}</span>
                  )}
                </div>
                <p className="text-xs text-blue-500">{searchResult.sido} {searchResult.sigungu} 담당</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 트리 목록 */}
      {contacts.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 px-6 py-16 text-center text-gray-400">
          등록된 담당자가 없습니다.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
          {sidoList.map((sido) => {
            const isOpen = expanded.has(sido);
            const list = grouped[sido];
            return (
              <div key={sido}>
                {/* 시/도 헤더 (토글) */}
                <button
                  onClick={() => toggle(sido)}
                  className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <svg
                      className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isOpen ? "rotate-90" : ""}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="text-sm font-semibold text-gray-800">{sido}</span>
                  </div>
                  <span className="text-xs text-gray-400">{list.length}개</span>
                </button>

                {/* 시/군/구 목록 */}
                {isOpen && (
                  <div className="border-t border-gray-100">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-xs text-gray-400">
                        <tr>
                          <th className="pl-12 pr-4 py-2 text-left font-medium">시/군/구</th>
                          <th className="px-4 py-2 text-left font-medium">담당부서</th>
                          <th className="px-4 py-2 text-left font-medium">연락처</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {list.map((c) => (
                          <tr key={c.id} className="hover:bg-gray-50">
                            <td className="pl-12 pr-4 py-2.5 text-gray-700">{c.sigungu}</td>
                            <td className="px-4 py-2.5 text-gray-600">{deptDisplay(c.department, departments)}</td>
                            <td className="px-4 py-2.5 text-gray-500">{c.phone || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
