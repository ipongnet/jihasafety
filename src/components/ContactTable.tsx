"use client";

import { useState } from "react";
import { getDepartmentDisplayLabel, SIDO_TO_L1_KEYWORD } from "@/lib/department-display";
import { shortenDeptDisplayName } from "@/lib/dept-name-shorten";

interface Contact {
  id: number;
  sido: string;
  sigungu: string;
  personName: string;
  email: string;
  phone: string;
  department: string | null;
}

interface Department { id: number; name: string; parentId: number | null; }

export default function ContactTable({ initial, initialDepartments }: { initial: Contact[]; initialDepartments: Department[] }) {
  const contacts = initial;
  const departments = initialDepartments;
  const [search, setSearch] = useState("");

  // L1 지역본부 필터
  const l1Depts = departments.filter((d) => !d.parentId);
  const defaultL1 = l1Depts.find((d) => d.name.includes("경기"))?.id ?? l1Depts[0]?.id ?? 0;
  const [regionFilter, setRegionFilter] = useState<number | "all">(defaultL1);

  const contactToL1Id = (c: Contact): number | null => {
    if (c.department) {
      const matches = departments.filter((d) => d.name === c.department);
      if (matches.length === 1) {
        const dept = matches[0];
        return dept.parentId ? dept.parentId : dept.id;
      }
      if (matches.length > 1) {
        const keyword = SIDO_TO_L1_KEYWORD[c.sido];
        if (keyword) {
          const match = matches.find((d) => {
            if (!d.parentId) return false;
            const parent = departments.find((p) => p.id === d.parentId);
            return parent?.name.includes(keyword) ?? false;
          });
          if (match?.parentId) return match.parentId;
        }
      }
    }
    const keyword = SIDO_TO_L1_KEYWORD[c.sido];
    return keyword ? l1Depts.find((d) => d.name.includes(keyword))?.id ?? null : null;
  };

  const getDeptDisplay = (deptName: string | null, sido?: string) =>
    getDepartmentDisplayLabel(deptName, departments, sido);

  const regionFiltered = regionFilter === "all"
    ? contacts
    : contacts.filter((c) => contactToL1Id(c) === regionFilter);

  const filtered = regionFiltered.filter((c) => {
    if (!search) return true;
    return (
      c.sido.includes(search) ||
      c.sigungu.includes(search) ||
      c.personName.includes(search) ||
      c.email.includes(search) ||
      (c.department != null && c.department !== "" && getDeptDisplay(c.department, c.sido).includes(search))
    );
  });

  return (
    <div className="space-y-4">
      {/* 안내 */}
      <p className="text-xs text-gray-400">담당자 관리는 내부망(EngineJiha)에서 수행됩니다. 동기화 시 자동 반영됩니다.</p>

      {/* 지역본부 필터 */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-600 whitespace-nowrap">지역본부</span>
        <div className="flex gap-1 flex-wrap">
          <button
            type="button"
            onClick={() => setRegionFilter("all")}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              regionFilter === "all" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            전체
          </button>
          {l1Depts.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setRegionFilter(d.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                regionFilter === d.id ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {shortenDeptDisplayName(d.name)}
            </button>
          ))}
        </div>
      </div>

      {/* 검색 */}
      <div className="flex items-center justify-between gap-3">
        <input
          type="text"
          placeholder="지자체, 담당자, 이메일, 부서 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-200 rounded-lg px-4 py-2 text-sm w-72 focus:ring-2 focus:ring-[#1a237e] outline-none"
        />
        <span className="text-sm text-gray-500">{filtered.length}명</span>
      </div>

      {/* 테이블 */}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm [&_tbody_td]:align-middle">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-3 py-2.5 text-center">도</th>
              <th className="px-3 py-2.5 text-center">시/군/구</th>
              <th className="px-3 py-2.5 text-center">담당자</th>
              <th className="px-3 py-2.5 text-center">이메일</th>
              <th className="px-3 py-2.5 text-center">전화번호</th>
              <th className="px-3 py-2.5 text-center">부서</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-gray-400">
                  {search ? "검색 결과가 없습니다." : "등록된 담당자가 없습니다."}
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2.5 text-center text-gray-700 leading-snug">{c.sido}</td>
                  <td className="px-3 py-2.5 text-center font-medium text-gray-900 leading-snug">{c.sigungu}</td>
                  <td className="px-3 py-2.5 text-center text-gray-700 leading-snug">{c.personName}</td>
                  <td className="px-3 py-2.5 text-center text-[#1a237e] leading-snug">{c.email}</td>
                  <td className="px-3 py-2.5 text-center text-gray-600 leading-snug">{c.phone}</td>
                  <td className="px-3 py-2.5 text-center text-gray-500 leading-snug">{getDeptDisplay(c.department, c.sido)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
