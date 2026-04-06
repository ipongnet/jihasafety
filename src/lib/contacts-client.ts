/**
 * Supabase Storage contacts/contacts.json 읽기.
 * 파일 없거나 Storage 미설정 시 null 반환 → 호출자가 DB fallback 처리.
 */
import { downloadFile } from "@/lib/storage-client";

export interface ContactEntry {
  id: number;
  sido: string;
  sigungu: string;
  personName: string;
  email: string;
  phone: string;
  department: string | null;
}

export interface DepartmentEntry {
  id: number;
  name: string;
  parentId: number | null;
}

export interface ContactsJson {
  contacts: ContactEntry[];
  departments: DepartmentEntry[];
  updatedAt: string;
}

// 인메모리 캐시 (서버 프로세스 내, 최대 5분)
let _cache: { data: ContactsJson; at: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function fetchContactsJson(): Promise<ContactsJson | null> {
  if (_cache && Date.now() - _cache.at < CACHE_TTL_MS) {
    return _cache.data;
  }
  try {
    const buf = await downloadFile("contacts/contacts.json");
    if (!buf || buf.length === 0) return null;
    const data = JSON.parse(buf.toString("utf-8")) as ContactsJson;
    _cache = { data, at: Date.now() };
    return data;
  } catch {
    return null;
  }
}

/** 캐시 즉시 무효화 (refresh API에서 호출) */
export function invalidateContactsCache() {
  _cache = null;
}

/** contacts.json 기반 3단계 담당자 매칭 */
export function findContactInJson(
  json: ContactsJson,
  sido: string,
  sigungu: string
): ContactEntry | null {
  // 1) sido + sigungu 정확 매칭
  let c = json.contacts.find((x) => x.sido === sido && x.sigungu === sigungu);
  if (c) return c;
  // 2) sigungu만 매칭
  c = json.contacts.find((x) => x.sigungu === sigungu);
  if (c) return c;
  // 3) 시 단위 prefix 매칭
  const cityPart = sigungu.split(" ")[0];
  if (cityPart !== sigungu) {
    c = json.contacts.find((x) => x.sido === sido && x.sigungu === cityPart);
    if (c) return c;
  }
  return null;
}
