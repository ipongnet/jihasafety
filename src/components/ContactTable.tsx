"use client";

import { useState } from "react";

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

export default function ContactTable({ initial }: { initial: Contact[] }) {
  const [contacts, setContacts] = useState<Contact[]>(initial);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

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

  return (
    <div className="space-y-4">
      {/* 검색 + 추가 버튼 */}
      <div className="flex items-center justify-between gap-3">
        <input
          type="text"
          placeholder="시/도, 시/군/구, 이름, 이메일 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-200 rounded-lg px-4 py-2 text-sm w-72 focus:ring-2 focus:ring-blue-400 outline-none"
        />
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
                <td className="px-4 py-2"><input className={inputCls} value={addForm.sido} onChange={(e) => setAddForm((f) => ({ ...f, sido: e.target.value }))} placeholder="서울특별시" /></td>
                <td className="px-4 py-2"><input className={inputCls} value={addForm.sigungu} onChange={(e) => setAddForm((f) => ({ ...f, sigungu: e.target.value }))} placeholder="강남구" /></td>
                <td className="px-4 py-2"><input className={inputCls} value={addForm.personName} onChange={(e) => setAddForm((f) => ({ ...f, personName: e.target.value }))} placeholder="홍길동" /></td>
                <td className="px-4 py-2"><input className={inputCls} value={addForm.email} onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))} placeholder="example@gov.kr" /></td>
                <td className="px-4 py-2"><input className={inputCls} value={addForm.phone} onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))} placeholder="02-1234-5678" /></td>
                <td className="px-4 py-2"><input className={inputCls} value={addForm.department} onChange={(e) => setAddForm((f) => ({ ...f, department: e.target.value }))} placeholder="도로관리과" /></td>
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
                    <td className="px-4 py-2"><input className={inputCls} value={editForm.sido} onChange={(e) => setEditForm((f) => ({ ...f, sido: e.target.value }))} /></td>
                    <td className="px-4 py-2"><input className={inputCls} value={editForm.sigungu} onChange={(e) => setEditForm((f) => ({ ...f, sigungu: e.target.value }))} /></td>
                    <td className="px-4 py-2"><input className={inputCls} value={editForm.personName} onChange={(e) => setEditForm((f) => ({ ...f, personName: e.target.value }))} /></td>
                    <td className="px-4 py-2"><input className={inputCls} value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} /></td>
                    <td className="px-4 py-2"><input className={inputCls} value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} /></td>
                    <td className="px-4 py-2"><input className={inputCls} value={editForm.department} onChange={(e) => setEditForm((f) => ({ ...f, department: e.target.value }))} /></td>
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
                    <td className="px-4 py-3 text-gray-500">{c.department ?? "-"}</td>
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

      <p className="text-xs text-gray-400">총 {contacts.length}개 지역 담당자 등록됨</p>
    </div>
  );
}
