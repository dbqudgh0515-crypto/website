// 개인 결과 페이지: 주소의 # 뒤에서 파일 ID와 열쇠를 읽고, 암호문을 받아 브라우저에서 푼다.
import { openSealed } from "./crypto.js";
import { renderResults } from "./render.js";

const out = document.getElementById("out");
const meta = document.getElementById("meta");
const KEY = "rhythm-link";

function readLink() {
  const h = new URLSearchParams(location.hash.slice(1));
  if (h.get("i") && h.get("k")) {
    const link = { i: h.get("i"), k: h.get("k") };
    try { sessionStorage.setItem(KEY, JSON.stringify(link)); } catch (e) { /* 새로고침 대비 저장 실패해도 진행 */ }
    // 주소창에서 열쇠를 지운다. 주소를 복사해 넘겨도 열쇠가 따라가지 않게.
    history.replaceState(null, "", location.pathname);
    return link;
  }
  try { return JSON.parse(sessionStorage.getItem(KEY) || "null"); } catch (e) { return null; }
}

function fail(msg) {
  meta.textContent = "";
  out.innerHTML = `<section class="card"><h2>결과를 열지 못했어요</h2><p>${msg}</p>
    <p class="note">받은 메시지의 링크를 다시 눌러 보세요. 그래도 안 되면 연구자에게 알려 주세요.</p></section>`;
}

async function main() {
  const link = readLink();
  if (!link || !/^[0-9a-f]{32}$/.test(link.i)) return fail("링크에 결과 정보가 없어요.");
  let bytes;
  try {
    const res = await fetch(`../d/${link.i}.bin`, { cache: "no-store", referrerPolicy: "no-referrer" });
    if (!res.ok) return fail("결과 파일을 찾지 못했어요. 조사가 끝나 결과를 지웠을 수도 있어요.");
    bytes = new Uint8Array(await res.arrayBuffer());
  } catch (e) { return fail("인터넷 연결을 확인해 주세요."); }
  let p;
  try { p = await openSealed(bytes, link.k); } catch (e) { return fail("링크가 잘렸거나 바뀐 것 같아요."); }
  // 예: "본조사 10/19~10/26 기록 (10/26 아침 기록까지 반영)"
  meta.textContent = p.periodNote || (p.generatedAt ? `${p.generatedAt} 아침 기록까지 반영` : "");
  renderResults(out, { records: p.records, survey: p.survey, classRef: p.classRef,
    feedbackText: p.feedback && p.feedback.text, storageKey: `goal-${link.i}` });
}
main();
