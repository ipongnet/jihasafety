"use client";

import { useState } from "react";
import { SIDO_LIST, SIGUNGU_MAP } from "@/data/korea-regions";
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

const EMPTY_FORM = { sido: "", sigungu: "", personName: "", email: "", phone: "", department: "" };

function SidoSelect({ value, onChange, className }: { value: string; onChange: (v: string) => void; className: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={className}>
      <option value="">시/도 선택</option>
      {SIDO_LIST.map((s) => <option key={s} value={s}>{s}</option>)}
    </select>
  );
}

function SigunguSelect({ sido, value, onChange, className }: { sido: string; value: string; onChange: (v: string) => void; className: string }) {
  const list = sido ? (SIGUNGU_MAP[sido] ?? []) : [];
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={className} disabled={!sido}>
      <option value="">{sido ? "시/군/구 선택" : "시/도 먼저"}</option>
      {list.map((s) => <option key={s} value={s}>{s}</option>)}
    </select>
  );
}

interface Department { id: number; name: string; parentId: number | null; }

function DeptSelect({ value, onChange, departments, className }: { value: string; onChange: (v: string) => void; departments: Department[]; className: string }) {
  const roots = departments.filter((d) => !d.parentId);
  const getChildren = (pid: number) => departments.filter((d) => d.parentId === pid);
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={className}>
      <option value="">부서 선택</option>
      {roots.map((root) => {
        const kids = getChildren(root.id);
        return kids.length > 0 ? (
          <optgroup key={root.id} label={root.name}>
            {kids.map((child) => (
              <option key={child.id} value={child.name}>{child.name}</option>
            ))}
          </optgroup>
        ) : (
          <option key={root.id} value={root.name}>{root.name}</option>
        );
      })}
    </select>
  );
}

export default function ContactTable({ initial, initialDepartments }: { initial: Contact[]; initialDepartments: Department[] }) {
  const [contacts, setContacts] = useState<Contact[]>(initial);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_FORM);
  const [nameDropdown, setNameDropdown] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  // L1 지역본부 필터
  const l1Depts = initialDepartments.filter((d) => !d.parentId);
  const defaultL1 = l1Depts.find((d) => d.name.includes("경기"))?.id ?? l1Depts[0]?.id ?? 0;
  const [regionFilter, setRegionFilter] = useState<number | "all">(defaultL1);
  const contactToL1Id = (c: Contact): number | null => {
    // 1) 부서가 L1(지역본부) 자체이면 직접 매칭
    const deptAsL1 = l1Depts.find((d) => d.name === c.department);
    if (deptAsL1) return deptAsL1.id;
    // 2) 부서가 L2이면 sido 기반으로 올바른 L1 찾기
    const keyword = SIDO_TO_L1_KEYWORD[c.sido];
    if (!keyword) return null;
    return l1Depts.find((d) => d.name.includes(keyword))?.id ?? null;
  };

  // 부서 관리
  const [departments, setDepartments] = useState<Department[]>(initialDepartments);
  const [showDeptManager, setShowDeptManager] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptParentId, setNewDeptParentId] = useState<number | null>(null);
  const [deptError, setDeptError] = useState("");
  const [bulkAdding, setBulkAdding] = useState(false);

  const getDeptDisplay = (deptName: string | null, sido?: string) =>
    getDepartmentDisplayLabel(deptName, departments, sido);

  const addDepartment = async () => {
    if (!newDeptName.trim()) return;
    setDeptError("");
    const res = await fetch("/api/departments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newDeptName.trim(), parentId: newDeptParentId }),
    });
    const data = await res.json();
    if (!res.ok) { setDeptError(data.message); return; }
    setDepartments((prev) => [...prev, data]);
    setNewDeptName("");
  };

  const bulkAddSub = async (subName: string) => {
    if (!confirm(`모든 L1 부서 하위에 "${subName}"을(를) 추가하시겠습니까?`)) return;
    setBulkAdding(true);
    setDeptError("");
    const res = await fetch("/api/departments/bulk-add-sub", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: subName }),
    });
    const data = await res.json();
    setBulkAdding(false);
    if (!res.ok) { setDeptError(data.message); return; }
    setDepartments(data.departments);
    if (data.skipped > 0) {
      setDeptError(`${data.added}개 추가, ${data.skipped}개는 이미 존재하여 건너뜀`);
    }
  };

  const deleteDepartment = async (id: number) => {
    if (!confirm("부서를 삭제하시겠습니까?")) return;
    const res = await fetch(`/api/departments/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setDeptError(data.message ?? "삭제 실패");
      return;
    }
    setDeptError("");
    setDepartments((prev) => prev.filter((d) => d.id !== id));
  };

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

  const startEdit = (c: Contact) => {
    setEditingId(c.id);
    setEditForm({
      sido: c.sido,
      sigungu: c.sigungu,
      personName: c.personName,
      email: c.email,
      phone: c.phone,
      department: c.department ?? "",
    });
    setError("");
  };

  const saveEdit = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/contacts/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message); return; }
      setContacts((prev) => prev.map((c) => (c.id === editingId ? data : c)));
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  };

  const deleteContact = async (id: number) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    const res = await fetch(`/api/contacts/${id}`, { method: "DELETE" });
    if (res.ok) setContacts((prev) => prev.filter((c) => c.id !== id));
  };

  const addContact = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message); return; }
      setContacts((prev) => [...prev, data]);
      setAddForm(EMPTY_FORM);
      setShowAdd(false);
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "border border-gray-200 rounded px-2 py-1 text-sm w-full focus:ring-1 focus:ring-blue-400 outline-none";
  const selectCls = "border border-gray-200 rounded px-2 py-1 text-sm w-full focus:ring-1 focus:ring-blue-400 outline-none bg-white disabled:bg-gray-100 disabled:text-gray-400";
  const inputClsTable =
    "border border-gray-200 rounded px-2 py-0.5 text-sm w-full text-center focus:ring-1 focus:ring-blue-400 outline-none";
  const selectClsTable =
    "border border-gray-200 rounded px-2 py-0.5 text-sm w-full text-center focus:ring-1 focus:ring-blue-400 outline-none bg-white disabled:bg-gray-100 disabled:text-gray-400";
  /** 수정·삭제 전용 (기본 대비 약 80% 크기) */
  const btnRowActionCls =
    "text-[10px] font-medium px-2 py-0.5 rounded-md shadow-sm leading-tight";

  return (
    <div className="space-y-4">
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

      {/* 검색 + 버튼 */}
      <div className="flex items-center justify-between gap-3">
        <input
          type="text"
          placeholder="지자체, 담당자, 이메일, 부서 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-200 rounded-lg px-4 py-2 text-sm w-72 focus:ring-2 focus:ring-blue-400 outline-none"
        />
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowDeptManager(!showDeptManager); setDeptError(""); }}
            className="border border-gray-200 text-gray-600 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            부서 관리
          </button>
          <button
            onClick={() => { setShowAdd(true); setError(""); }}
            className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            담당자 추가
          </button>
        </div>
      </div>

      {/* 부서 관리 패널 */}
      {showDeptManager && (
        <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-3">
          <p className="text-sm font-medium text-gray-700">부서 구조</p>
          <div className="space-y-0.5">
            {departments.filter((d) => !d.parentId).map((root) => {
              const kids = departments.filter((d) => d.parentId === root.id);
              return (
                <div key={root.id}>
                  <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-100">
                    <span className="text-sm font-semibold text-gray-800 flex-1">{root.name}</span>
                    <button onClick={() => deleteDepartment(root.id)} title="삭제" className="text-red-400 hover:text-red-600">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  {kids.map((child) => (
                    <div key={child.id} className="flex items-center gap-2 py-1 px-2 ml-5 rounded-lg hover:bg-gray-100">
                      <span className="text-gray-400 text-xs mr-0.5">└</span>
                      <span className="text-sm text-gray-700 flex-1">{child.name}</span>
                      <button onClick={() => deleteDepartment(child.id)} title="삭제" className="text-red-400 hover:text-red-600">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          <div className="flex gap-2 pt-2 border-t border-gray-200">
            <select
              value={newDeptParentId ?? ""}
              onChange={(e) => setNewDeptParentId(e.target.value ? Number(e.target.value) : null)}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:ring-2 focus:ring-blue-400 outline-none"
            >
              <option value="">L1 (최상위)</option>
              {departments.filter((d) => !d.parentId).map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <input
              type="text"
              value={newDeptName}
              onChange={(e) => setNewDeptName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addDepartment()}
              placeholder="부서명 입력"
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm flex-1 focus:ring-2 focus:ring-blue-400 outline-none"
            />
            <button onClick={addDepartment} className="bg-gray-700 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-gray-800">추가</button>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => bulkAddSub("관로보전부")}
              disabled={bulkAdding}
              className="border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-indigo-100 disabled:opacity-50 transition-colors"
            >
              {bulkAdding ? "추가 중..." : "관로보전부 전체 L1에 일괄 추가"}
            </button>
          </div>
          {deptError && <p className="text-xs mt-1" style={{ color: deptError.includes("건너뜀") ? "#6366f1" : "#ef4444" }}>{deptError}</p>}
        </div>
      )}

      {error && <p className="text-red-500 text-sm">{error}</p>}

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
              <th className="px-3 py-2.5 text-center whitespace-nowrap w-32">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {/* 추가 행 */}
            {showAdd && (
              <tr className="bg-blue-50">
                <td className="px-3 py-1.5 text-center">
                  <SidoSelect value={addForm.sido} onChange={(v) => setAddForm((f) => ({ ...f, sido: v, sigungu: "" }))} className={selectClsTable} />
                </td>
                <td className="px-3 py-1.5 text-center">
                  <SigunguSelect sido={addForm.sido} value={addForm.sigungu} onChange={(v) => setAddForm((f) => ({ ...f, sigungu: v }))} className={selectClsTable} />
                </td>
                <td className="px-3 py-1.5 text-center">
                  <div className="relative">
                    <input
                      className={inputClsTable}
                      value={addForm.personName}
                      onChange={(e) => {
                        setAddForm((f) => ({ ...f, personName: e.target.value }));
                        setNameDropdown(true);
                      }}
                      onBlur={() => setTimeout(() => setNameDropdown(false), 150)}
                      placeholder="홍길동"
                      autoComplete="off"
                    />
                    {nameDropdown && (() => {
                      const q = addForm.personName.trim();
                      const seen = new Set<string>();
                      const suggestions = q
                        ? contacts.filter((c) => {
                            if (seen.has(c.personName)) return false;
                            seen.add(c.personName);
                            return c.personName.includes(q);
                          })
                        : [];
                      return suggestions.length > 0 ? (
                        <ul className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                          {suggestions.map((c) => (
                            <li
                              key={c.id}
                              onMouseDown={() => {
                                setAddForm((f) => ({
                                  ...f,
                                  personName: c.personName,
                                  email: c.email,
                                  phone: c.phone,
                                  department: c.department ?? "",
                                }));
                                setNameDropdown(false);
                              }}
                              className="px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 cursor-pointer flex items-center justify-between gap-2"
                            >
                              <span className="font-medium">{c.personName}</span>
                              <span className="text-xs text-gray-400 truncate">{c.department ?? ""}</span>
                            </li>
                          ))}
                        </ul>
                      ) : null;
                    })()}
                  </div>
                </td>
                <td className="px-3 py-1.5 text-center"><input className={inputClsTable} value={addForm.email} onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))} placeholder="example@gov.kr" /></td>
                <td className="px-3 py-1.5 text-center"><input className={inputClsTable} value={addForm.phone} onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))} placeholder="02-1234-5678" /></td>
                <td className="px-3 py-1.5 text-center">
                  <DeptSelect value={addForm.department} onChange={(v) => setAddForm((f) => ({ ...f, department: v }))} departments={departments} className={selectClsTable} />
                </td>
                <td className="px-3 py-1.5 text-center">
                  <div className="flex items-center justify-center gap-1.5 flex-wrap">
                    <button type="button" onClick={addContact} disabled={saving} className="text-[10px] font-medium bg-blue-600 text-white px-2 py-0.5 rounded-md hover:bg-blue-700 disabled:opacity-50 shadow-sm leading-tight">저장</button>
                    <button type="button" onClick={() => { setShowAdd(false); setError(""); }} className="text-[10px] font-medium border border-gray-300 bg-white text-gray-700 px-2 py-0.5 rounded-md hover:bg-gray-50 leading-tight">취소</button>
                  </div>
                </td>
              </tr>
            )}

            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-gray-400">
                  {search ? "검색 결과가 없습니다." : "등록된 담당자가 없습니다."}
                </td>
              </tr>
            ) : (
              filtered.map((c) =>
                editingId === c.id ? (
                  <tr key={c.id} className="bg-yellow-50">
                    <td className="px-3 py-1.5 text-center">
                      <SidoSelect value={editForm.sido} onChange={(v) => setEditForm((f) => ({ ...f, sido: v, sigungu: "" }))} className={selectClsTable} />
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      <SigunguSelect sido={editForm.sido} value={editForm.sigungu} onChange={(v) => setEditForm((f) => ({ ...f, sigungu: v }))} className={selectClsTable} />
                    </td>
                    <td className="px-3 py-1.5 text-center"><input className={inputClsTable} value={editForm.personName} onChange={(e) => setEditForm((f) => ({ ...f, personName: e.target.value }))} /></td>
                    <td className="px-3 py-1.5 text-center"><input className={inputClsTable} value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} /></td>
                    <td className="px-3 py-1.5 text-center"><input className={inputClsTable} value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} /></td>
                    <td className="px-3 py-1.5 text-center">
                      <DeptSelect value={editForm.department} onChange={(v) => setEditForm((f) => ({ ...f, department: v }))} departments={departments} className={selectClsTable} />
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        <button type="button" onClick={saveEdit} disabled={saving} className="text-[10px] font-medium bg-blue-600 text-white px-2 py-0.5 rounded-md hover:bg-blue-700 disabled:opacity-50 shadow-sm leading-tight">저장</button>
                        <button type="button" onClick={() => setEditingId(null)} className="text-[10px] font-medium border border-gray-300 bg-white text-gray-700 px-2 py-0.5 rounded-md hover:bg-gray-50 leading-tight">취소</button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2.5 text-center text-gray-700 leading-snug">{c.sido}</td>
                    <td className="px-3 py-2.5 text-center font-medium text-gray-900 leading-snug">{c.sigungu}</td>
                    <td className="px-3 py-2.5 text-center text-gray-700 leading-snug">{c.personName}</td>
                    <td className="px-3 py-2.5 text-center text-blue-600 leading-snug">{c.email}</td>
                    <td className="px-3 py-2.5 text-center text-gray-600 leading-snug">{c.phone}</td>
                    <td className="px-3 py-2.5 text-center text-gray-500 leading-snug">{getDeptDisplay(c.department, c.sido)}</td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => startEdit(c)}
                          className={`${btnRowActionCls} border border-blue-200 bg-white text-blue-700 hover:bg-blue-50 hover:border-blue-300`}
                        >
                          수정
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteContact(c.id)}
                          className={`${btnRowActionCls} border border-red-200 bg-white text-red-600 hover:bg-red-50 hover:border-red-300`}
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
