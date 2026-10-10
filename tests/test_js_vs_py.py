"""calc.js(브라우저 계산)와 tools/metrics_ref.py(파이썬 계산)가 같은 결과를 내는지 가상 데이터로 확인한다.

  python3 tests/test_js_vs_py.py

가상 데이터에는 일부러 틀린 시각, 중복 날짜, 빈칸, 말이 안 되는 수면시간, 18~06시 밖 취침을 섞는다.
"""
import json
import math
import os
import random
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))
import make_class_ref as R  # noqa: E402
import metrics_ref as M  # noqa: E402


def fmt(m):
    m = int(round(m)) % 1440
    return f"{m // 60:02d}:{m % 60:02d}"


def synth_student(rng, start_dn, days):
    bed0, wake0 = rng.uniform(1350, 1530), rng.uniform(370, 440)
    sd_b, sd_w = rng.uniform(10, 90), rng.uniform(10, 70)
    shift = rng.uniform(0, 180)
    recs = []
    for i in range(days):
        dn = start_dn + i
        if rng.random() < 0.12:
            continue
        we = M.weekday_of(dn) >= 5
        bed = bed0 + (shift * 0.6 if we else 0) + rng.gauss(0, sd_b)
        wake = wake0 + (shift if we else 0) + rng.gauss(0, sd_w)
        r = dict(date=M.iso_of(dn), bed=fmt(bed), wake=fmt(wake))
        u = rng.random()
        if u < 0.04:
            r["bed"] = "25:10"                     # 없는 시각
        elif u < 0.07:
            r["bed"], r["wake"] = "05:30", "06:00"   # 수면 30분
        elif u < 0.10:
            r["bed"] = "15:00"                     # 18~06시 밖
        elif u < 0.14:
            r["wake"] = ""                         # 빈칸
        recs.append(r)
        if rng.random() < 0.03:
            recs.append(dict(r, bed=fmt(bed + 20)))  # 같은 날 다시 낸 응답 (마지막 것이 남아야 함)
    if rng.random() < 0.3:
        recs.append(dict(date="2026-02-30", bed="23:00", wake="07:00"))  # 없는 날짜
    rng.shuffle(recs)                              # 순서가 섞여도 날짜순으로 정리되는지
    return recs


def to_jsonable(x):
    if isinstance(x, float) and not math.isfinite(x):
        return None
    if isinstance(x, dict):
        return {k: to_jsonable(v) for k, v in x.items()}
    if isinstance(x, list):
        return [to_jsonable(v) for v in x]
    return x


def compare(a, b, path, errs):
    if isinstance(a, dict) and isinstance(b, dict):
        if set(a) != set(b):
            errs.append(f"{path}: 키가 다름 {sorted(set(a) ^ set(b))}")
        for k in set(a) & set(b):
            compare(a[k], b[k], f"{path}.{k}", errs)
    elif isinstance(a, list) and isinstance(b, list):
        if len(a) != len(b):
            errs.append(f"{path}: 길이 {len(a)} vs {len(b)}")
        for i, (x, y) in enumerate(zip(a, b)):
            compare(x, y, f"{path}[{i}]", errs)
    elif isinstance(a, (int, float)) and isinstance(b, (int, float)) and not isinstance(a, bool):
        if abs(a - b) > 1e-9 * max(1.0, abs(a)):
            errs.append(f"{path}: {a} vs {b}")
    elif a != b:
        errs.append(f"{path}: {a!r} vs {b!r}")


def main(n_students=200, seed=20261010):
    rng = random.Random(seed)
    start = M.day_number("2026-09-14")
    cases = [synth_student(rng, start, rng.choice([3, 6, 8, 14, 21, 35])) for _ in range(n_students)]
    cases.append([])                                     # 기록 없음
    class_ref = R.build({f"s{i}": c for i, c in enumerate(cases[:24])}, "가상 학급")

    py = []
    for recs in cases:
        m = M.compute_metrics(recs)
        py.append(dict(metrics=m, compare=M.compare_to_class(m, class_ref), travel=M.travel_for(m["socialJetlag"])))
    py = to_jsonable(py)

    proc = subprocess.run(["node", os.path.join(ROOT, "tests", "run_calc.mjs")],
                          input=json.dumps(dict(cases=cases, classRef=class_ref)),
                          capture_output=True, text=True, check=True)
    js = json.loads(proc.stdout)

    errs = []
    compare(py, js, "결과", errs)
    checked = sum(1 for x in py if x["metrics"]["nValid"] > 0)
    print(f"가상 학생 {len(cases)}명 (기록 있는 학생 {checked}명), 학급 기준 {class_ref['n']}명")
    if errs:
        print(f"불일치 {len(errs)}건:")
        print("\n".join(errs[:30]))
        sys.exit(1)
    print("JS와 파이썬 결과가 모두 같습니다.")


if __name__ == "__main__":
    main()
