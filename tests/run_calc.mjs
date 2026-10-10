// 표준입력으로 받은 가상 기록을 calc.js로 계산해 JSON으로 내보낸다 (test_js_vs_py.py가 부른다).
import { computeMetrics, compareToClass, travelFor } from "../assets/calc.js";

let buf = "";
process.stdin.on("data", (d) => (buf += d));
process.stdin.on("end", () => {
  const { cases, classRef } = JSON.parse(buf);
  const out = cases.map((recs) => {
    const m = computeMetrics(recs);
    return { metrics: m, compare: compareToClass(m, classRef), travel: travelFor(m.socialJetlag) };
  });
  process.stdout.write(JSON.stringify(out));   // NaN은 JSON에서 null이 된다
});
