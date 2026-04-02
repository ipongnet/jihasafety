/**
 * Supabase Storage REST API 클라이언트 (native fetch, 외부 SDK 없음)
 * SUPABASE_URL 미설정 시 mock 모드 (console.log만 출력).
 */

function getConfig() {
  const url = process.env.SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  const bucket = process.env.SUPABASE_BUCKET ?? "jiha-transfer";
  return { url, key, bucket, mock: !url || !key };
}

function headers(key: string, extra: Record<string, string> = {}): Record<string, string> {
  return {
    Authorization: `Bearer ${key}`,
    apikey: key,
    ...extra,
  };
}

export async function listFiles(prefix: string): Promise<{ name: string }[]> {
  const { url, key, bucket, mock } = getConfig();
  if (mock) {
    console.log(`[MOCK] listFiles(${prefix})`);
    return [];
  }
  const res = await fetch(`${url}/storage/v1/object/list/${bucket}`, {
    method: "POST",
    headers: headers(key, { "Content-Type": "application/json" }),
    body: JSON.stringify({ prefix }),
  });
  if (!res.ok) throw new Error(`listFiles failed: ${res.status}`);
  return res.json();
}

export async function downloadFile(path: string): Promise<Buffer> {
  const { url, key, bucket, mock } = getConfig();
  if (mock) {
    console.log(`[MOCK] downloadFile(${path})`);
    return Buffer.alloc(0);
  }
  const res = await fetch(`${url}/storage/v1/object/${bucket}/${path}`, {
    headers: headers(key),
  });
  if (!res.ok) throw new Error(`downloadFile failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

export async function uploadFile(
  path: string,
  buffer: Buffer,
  contentType: string
): Promise<void> {
  const { url, key, bucket, mock } = getConfig();
  if (mock) {
    console.log(`[MOCK] uploadFile(${path}, ${buffer.length} bytes)`);
    return;
  }
  const res = await fetch(`${url}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: headers(key, { "Content-Type": contentType }),
    body: new Uint8Array(buffer),
  });
  if (!res.ok) throw new Error(`uploadFile failed: ${res.status} ${await res.text()}`);
}

export async function moveFile(from: string, to: string): Promise<void> {
  const { url, key, bucket, mock } = getConfig();
  if (mock) {
    console.log(`[MOCK] moveFile(${from} → ${to})`);
    return;
  }
  const res = await fetch(`${url}/storage/v1/object/move`, {
    method: "POST",
    headers: headers(key, { "Content-Type": "application/json" }),
    body: JSON.stringify({ bucketId: bucket, sourceKey: from, destinationKey: to }),
  });
  if (!res.ok) throw new Error(`moveFile failed: ${res.status}`);
}
