/**
 * Supabase Storage 업로드 재시도 유틸.
 * 서버리스(Vercel) 제한을 고려해 지수 백오프: 1s → 2s → 4s.
 * 3회 모두 실패 시 마지막 에러를 throw.
 */
import { uploadFile } from "@/lib/storage-client";

const MAX_ATTEMPTS = 3;

export async function uploadFileWithRetry(
  path: string,
  buffer: Buffer,
  contentType: string,
): Promise<void> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await uploadFile(path, buffer, contentType);
      return;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      console.warn(
        `[storage] 업로드 실패 (${attempt}/${MAX_ATTEMPTS}): ${path} — ${lastError.message}`,
      );
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
      }
    }
  }

  throw lastError;
}
