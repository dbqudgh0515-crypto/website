"""tools/seal.py로 잠근 파일을 assets/crypto.js(WebCrypto)가 제대로 푸는지 확인한다.
틀린 열쇠와 한 바이트라도 바뀐 파일은 풀리지 않아야 한다."""
import json
import os
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))
import seal as S  # noqa: E402

payloads = [{"v": 1, "text": "평균 수면은 6.9시간이었어요. 🌙", "records": [{"date": "2026-10-12", "bed": "23:40", "wake": "06:50"}]},
            {"v": 1, "big": "가" * 50000}]
tmp = tempfile.mkdtemp()
cases = []
for i, p in enumerate(payloads):
    fid, key = S.write_sealed(tmp, p)
    path = os.path.join(tmp, "d", f"{fid}.bin")
    cases.append(dict(path=path, key=key, expect=p, mode="ok"))
    wrong = S.b64url(os.urandom(32))
    cases.append(dict(path=path, key=wrong, mode="fail"))
    bad = path + ".tampered"
    b = bytearray(open(path, "rb").read()); b[20] ^= 1
    open(bad, "wb").write(bytes(b))
    cases.append(dict(path=bad, key=key, mode="fail"))

js = r'''
import { openSealed } from "%s";
import { readFileSync } from "node:fs";
const cases = JSON.parse(readFileSync(0, "utf8"));
const out = [];
for (const c of cases) {
  try { out.push({ ok: true, value: await openSealed(new Uint8Array(readFileSync(c.path)), c.key) }); }
  catch (e) { out.push({ ok: false }); }
}
console.log(JSON.stringify(out));
''' % os.path.join(ROOT, "assets", "crypto.js").replace("\\", "/")
runner = os.path.join(tmp, "run.mjs")
open(runner, "w").write(js)
res = json.loads(subprocess.run(["node", runner], input=json.dumps(cases), capture_output=True, text=True, check=True).stdout)

fails = 0
for c, r in zip(cases, res):
    good = (r["ok"] and r["value"] == c["expect"]) if c["mode"] == "ok" else not r["ok"]
    fails += not good
print(f"암호화 테스트 {len(cases)}건 중 실패 {fails}건 (정상 풀림 {len(payloads)}, 틀린 열쇠·변조 거부 {len(cases) - len(payloads)})")
sys.exit(1 if fails else 0)
