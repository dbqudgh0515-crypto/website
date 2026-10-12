"""학급 기준값(assets/class_ref.js)을 만든다. 개인 값은 넣지 않는다.

  python tools/make_class_ref.py --data 기록.csv --label "9월 기록" --out assets/class_ref.js

- 입력 CSV 열: student, date(YYYY-MM-DD), bed_time 또는 bed, wake_time 또는 wake
- 학생별로 calc.js와 같은 지표를 계산한 뒤, 학급 분포를 분위수(10/25/50/75/90%)와 평균으로만 저장한다.
- "비슷한 패턴" 칸(수면 중간 시각 3등분 x 사회적 시차 1시간 미만/이상)은 인원만 저장하고,
  5명 미만인 칸은 null로 비운다(누가 어느 칸인지 짐작하기 어렵게).
- 유효 기록이 min_valid일 미만인 학생은 기준값 계산에서만 빼고, 뺀 인원을 excluded에 남긴다.
"""
import argparse
import csv
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import metrics_ref as M  # noqa: E402

MIN_VALID = 5                      # 흔들림(표준편차) 계산 최소 기록 수와 같게
KEYS = ["sleepMean", "bedResidSd", "wakeResidSd", "midMean18", "socialJetlag", "wakeGap"]


def quantile(values, p):
    """선형 보간 분위수 (numpy 기본값과 같은 방식)."""
    v = sorted(values)
    if not v:
        return None
    pos = (len(v) - 1) * p
    lo, hi = math.floor(pos), math.ceil(pos)
    return v[lo] + (v[hi] - v[lo]) * (pos - lo)


def read_records(path):
    by_student = {}
    with open(path, encoding="utf-8-sig", newline="") as fp:
        for row in csv.DictReader(fp):
            s = (row.get("student") or "").strip()
            if not s:
                continue
            by_student.setdefault(s, []).append(dict(
                date=(row.get("date") or "").strip(),
                bed=row.get("bed_time", row.get("bed")), wake=row.get("wake_time", row.get("wake"))))
    return by_student


def build(by_student, label, min_valid=MIN_VALID):
    metrics = [M.compute_metrics(recs) for recs in by_student.values()]
    n_all = len(metrics)
    metrics = [m for m in metrics if m["nValid"] >= min_valid]
    n = len(metrics)
    ref = dict(label=label, n=n, excluded=n_all - n, minValid=min_valid, quantiles={}, means={})
    for k in KEYS:
        v = [m[k] for m in metrics if M._finite(m[k])]
        ref["quantiles"][k] = {f"p{p}": quantile(v, p / 100) for p in M.QS} if len(v) >= 5 else None
        ref["means"][k] = sum(v) / len(v) if v else None
    mids = [m["midMean18"] for m in metrics if M._finite(m["midMean18"])]
    ref["midCuts"] = [quantile(mids, 1 / 3), quantile(mids, 2 / 3)]
    counts = {}
    for m in metrics:
        if M._finite(m["midMean18"]) and M._finite(m["socialJetlag"]):
            mb = 0 if m["midMean18"] <= ref["midCuts"][0] else 1 if m["midMean18"] <= ref["midCuts"][1] else 2
            sb = 0 if m["socialJetlag"] < M.RULES["sjCutMin"] else 1
            counts[f"{mb}-{sb}"] = counts.get(f"{mb}-{sb}", 0) + 1
    ref["cells"] = {f"{a}-{b}": (counts.get(f"{a}-{b}", 0) if counts.get(f"{a}-{b}", 0) >= M.RULES["minSimilarCount"]
                                 else None) for a in range(3) for b in range(2)}
    return ref


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True)
    ap.add_argument("--label", default="학급 기록")
    ap.add_argument("--out", default="assets/class_ref.js")
    a = ap.parse_args()
    ref = build(read_records(a.data), a.label)
    text = json.dumps(ref, ensure_ascii=False, indent=1)
    with open(a.out, "w", encoding="utf-8") as fp:
        # .js로 저장하면 공개 페이지가 fetch 없이 모듈로 불러온다 (공개 페이지는 네트워크 요청을 막아 둠)
        fp.write(f"// make_class_ref.py가 만든 학급 기준값. 개인 값 없음.\nexport default {text};\n" if a.out.endswith(".js") else text)
    print(f"{a.out}: {ref['n']}명 기준 ({a.label})")


if __name__ == "__main__":
    main()
