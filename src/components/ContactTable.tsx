"use client";

import { useState } from "react";
import { SIDO_LIST, SIGUNGU_MAP } from "@/data/korea-regions";

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

  // 부서 관리
  const [departments, setDepartments] = useState<Department[]>(initialDepartments);
  const [showDeptManager, setShowDeptManager] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptParentId, setNewDeptParentId] = useState<number | null>(null);
  const [deptError, setDeptError] = useState("");

  const getDeptDisplay = (deptName: string | null) => {
    if (!deptName) return "-";
    const dept = departments.find((d) => d.name === deptName);
    if (!dept || !dept.parentId) return deptName;
    const parent = departments.find((d) => d.id === dept.parentId);
    return parent ? `${parent.name} > ${deptName}` : deptName;
  };

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

  const filtered = contacts.filter(
    (c) =>
      c.sido.includes(search) ||
      c.sigungu.includes(search) ||
      c.personName.includes(search) ||
      c.email.includes(search)
  );

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

  return (
    <div className="space-y-4">
      {/* 검색 + 버튼 */}
      <div className="flex items-center justify-between gap-3">
        <input
          type="text"
          placeholder="시/도, 시/군/구, 이름, 이메일 검색"
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
          {deptError && <p className="text-red-500 text-xs">{deptError}</p>}
        </div>
      )}

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {/* 테이블 */}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">시/도</th>
              <th className="px-4 py-3 text-left">시/군/구</th>
              <th className="px-4 py-3 text-left">담당자</th>
              <th className="px-4 py-3 text-left">이메일</th>
              <th className="px-4 py-3 text-left">전화번호</th>
              <th className="px-4 py-3 text-left">부서</th>
              <th className="px-4 py-3 text-center w-24">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {/* 추가 행 */}
            {showAdd && (
              <tr className="bg-blue-50">
                <td className="px-4 py-2">
                  <SidoSelect value={addForm.sido} onChange={(v) => setAddForm((f) => ({ ...f, sido: v, sigungu: "" }))} className={selectCls} />
                </td>
                <td className="px-4 py-2">
                  <SigunguSelect sido={addForm.sido} value={addForm.sigungu} onChange={(v) => setAddForm((f) => ({ ...f, sigungu: v }))} className={selectCls} />
                </td>
                <td className="px-4 py-2">
                  <div className="relative">
                    <input
                      className={inputCls}
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
                <td className="px-4 py-2"><input className={inputCls} value={addForm.email} onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))} placeholder="example@gov.kr" /></td>
                <td className="px-4 py-2"><input className={inputCls} value={addForm.phone} onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))} placeholder="02-1234-5678" /></td>
                <td className="px-4 py-2">
                  <DeptSelect value={addForm.department} onChange={(v) => setAddForm((f) => ({ ...f, department: v }))} departments={departments} className={selectCls} />
                </td>
                <td className="px-4 py-2 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={addContact} disabled={saving} className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:opacity-50">저장</button>
                    <button onClick={() => { setShowAdd(false); setError(""); }} className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded hover:bg-gray-300">취소</button>
                  </div>
                </td>
              </tr>
            )}

            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  {search ? "검색 결과가 없습니다." : "등록된 담당자가 없습니다."}
                </td>
              </tr>
            ) : (
              filtered.map((c) =>
                editingId === c.id ? (
                  <tr key={c.id} className="bg-yellow-50">
                    <td className="px-4 py-2">
                      <SidoSelect value={editForm.sido} onChange={(v) => setEditForm((f) => ({ ...f, sido: v, sigungu: "" }))} className={selectCls} />
                    </td>
                    <td className="px-4 py-2">
                      <SigunguSelect sido={editForm.sido} value={editForm.sigungu} onChange={(v) => setEditForm((f) => ({ ...f, sigungu: v }))} className={selectCls} />
                    </td>
                    <td className="px-4 py-2"><input className={inputCls} value={editForm.personName} onChange={(e) => setEditForm((f) => ({ ...f, personName: e.target.value }))} /></td>
                    <td className="px-4 py-2"><input className={inputCls} value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} /></td>
                    <td className="px-4 py-2"><input className={inputCls} value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} /></td>
                    <td className="px-4 py-2">
                      <DeptSelect value={editForm.department} onChange={(v) => setEditForm((f) => ({ ...f, department: v }))} departments={departments} className={selectCls} />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={saveEdit} disabled={saving} className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:opacity-50">저장</button>
                        <button onClick={() => setEditingId(null)} className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded hover:bg-gray-300">취소</button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700">{c.sido}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{c.sigungu}</td>
                    <td className="px-4 py-3 text-gray-700">{c.personName}</td>
                    <td className="px-4 py-3 text-blue-600">{c.email}</td>
                    <td className="px-4 py-3 text-gray-600">{c.phone}</td>
                    <td className="px-4 py-3 text-gray-500">{getDeptDisplay(c.department)}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => startEdit(c)} className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50">수정</button>
                        <button onClick={() => deleteContact(c.id)} className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50">삭제</button>
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
