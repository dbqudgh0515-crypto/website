// 개인 결과 풀기. 열쇠는 링크의 # 뒷부분에만 있고 서버로 가지 않는다.
// 파일 형식: [12바이트 nonce][AES-256-GCM 암호문+태그]. tools/seal.py가 만든다.

export function b64urlToBytes(s) {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function openSealed(bytes, keyB64url) {
  const raw = b64urlToBytes(keyB64url);
  if (raw.length !== 32) throw new Error("열쇠 길이가 맞지 않아요");
  const key = await crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["decrypt"]);
  const iv = bytes.slice(0, 12);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, bytes.slice(12));
  return JSON.parse(new TextDecoder().decode(plain));
}
