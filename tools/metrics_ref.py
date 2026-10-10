"""assets/calc.js 와 같은 계산을 파이썬으로 한다.

학급 기준값(make_class_ref.py)과 개인 결과 페이지 데이터(분석 저장소의 빌더)를 만들 때 쓰고,
tests/test_js_vs_py.py 가 이 결과와 calc.js 결과가 같은지 확인한다.
한쪽을 고치면 다른 쪽도 같이 고쳐야 한다.
"""
import datetime as _dt
import math
import re

RULES = dict(bedWindowMax18=12 * 60, sleepMin=180, sleepMax=840, minDaysSd=5, minWeekend=2,
             minWeekday=3, minPerWeekday=2, trendWindow=7, trendMinValues=4, minSimilarCount=5,
             sjCutMin=60)
TRAVEL = ["베이징", "방콕", "다카", "타슈켄트", "두바이", "모스크바"]
NAN = float("nan")
_EPOCH = _dt.date(1970, 1, 1)


def _finite(x):
    return x is not None and isinstance(x, (int, float)) and math.isfinite(x)


def hhmm_to_min(s):
    if s is None:
        return NAN
    m = re.match(r"^\s*(\d{1,2}):(\d{2})", str(s))
    if not m:
        return NAN
    h, mi = int(m[1]), int(m[2])
    if not (0 <= h < 24 and 0 <= mi < 60):
        return NAN
    return float(h * 60 + mi)


def day_number(iso):
    m = re.match(r"^(\d{4})-(\d{2})-(\d{2})$", str(iso).strip())
    if not m:
        return None
    try:
        d = _dt.date(int(m[1]), int(m[2]), int(m[3]))
    except ValueError:
        return None
    return (d - _EPOCH).days


def iso_of(dn):
    return (_EPOCH + _dt.timedelta(days=dn)).isoformat()


def weekday_of(dn):
    return (dn + 3) % 7                                  # 0=월 ... 6=일


def _mean(a):
    return sum(a) / len(a) if a else NAN


def clean_records(records):
    by_day = {}
    for r in records or []:
        dn = day_number(r.get("date", ""))
        if dn is None:
            continue
        by_day[dn] = r                                   # 같은 날짜는 마지막 것
    rows = []
    for dn in sorted(by_day):
        r = by_day[dn]
        bed_raw, wake = hhmm_to_min(r.get("bed")), hhmm_to_min(r.get("wake"))
        bed18 = (bed_raw - 1080 if bed_raw >= 1080 else bed_raw + 360) if _finite(bed_raw) else NAN
        if _finite(bed18) and bed18 > RULES["bedWindowMax18"]:
            bed18 = NAN
        sleep = wake + 360 - bed18
        if _finite(sleep) and (sleep < RULES["sleepMin"] or sleep > RULES["sleepMax"]):
            bed18 = wake = sleep = NAN
        wd = weekday_of(dn)
        rows.append(dict(dn=dn, date=iso_of(dn), wd=wd, weekend=wd >= 5, bed18=bed18, wake=wake, sleep=sleep))
    return rows


def resid_sd(rows, key):
    v = [r for r in rows if _finite(r[key])]
    if len(v) < RULES["minDaysSd"]:
        return NAN
    ss, ng = 0.0, 0
    for we in (False, True):
        g = [r[key] for r in v if r["weekend"] == we]
        if not g:
            continue
        ng += 1
        m = _mean(g)
        ss += sum((x - m) ** 2 for x in g)
    return math.sqrt(ss / (len(v) - ng))


def _weekend_split(rows, key):
    wd = [r[key] for r in rows if not r["weekend"] and _finite(r[key])]
    we = [r[key] for r in rows if r["weekend"] and _finite(r[key])]
    if len(we) < RULES["minWeekend"] or len(wd) < RULES["minWeekday"]:
        return None
    return _mean(wd), _mean(we)


def compute_metrics(records):
    rows = clean_records(records)
    for r in rows:
        r["mid"] = r["bed18"] + r["sleep"] / 2
    vals = lambda k: [r[k] for r in rows if _finite(r[k])]
    mid, wake = _weekend_split(rows, "mid"), _weekend_split(rows, "wake")
    sj = mid[1] - mid[0] if mid else NAN

    by_weekday = []
    for w in range(7):
        bed_night = [r["bed18"] for r in rows if _finite(r["bed18"]) and (r["wd"] + 6) % 7 == w]
        wake_day = [r["wake"] for r in rows if _finite(r["wake"]) and r["wd"] == w]
        by_weekday.append(dict(
            weekday=w,
            bed18=_mean(bed_night) if len(bed_night) >= RULES["minPerWeekday"] else NAN, bedN=len(bed_night),
            wake=_mean(wake_day) if len(wake_day) >= RULES["minPerWeekday"] else NAN, wakeN=len(wake_day)))

    trend = []
    if rows:
        bed_by_day = {r["dn"]: r["bed18"] for r in rows if _finite(r["bed18"])}
        for dn in range(rows[0]["dn"], rows[-1]["dn"] + 1):
            win = [bed_by_day[k] for k in range(dn - RULES["trendWindow"] + 1, dn + 1) if k in bed_by_day]
            trend.append(dict(date=iso_of(dn), bed18=bed_by_day.get(dn, NAN),
                              avg7=_mean(win) if len(win) >= RULES["trendMinValues"] else NAN))

    return dict(
        nRecords=len(rows), nValid=len(vals("sleep")),
        sleepMean=_mean(vals("sleep")), bedMean18=_mean(vals("bed18")), wakeMean=_mean(vals("wake")),
        bedResidSd=resid_sd(rows, "bed18"), wakeResidSd=resid_sd(rows, "wake"),
        midMean18=_mean(vals("mid")),
        midWeekday18=mid[0] if mid else NAN, midWeekend18=mid[1] if mid else NAN,
        socialJetlag=abs(sj) if _finite(sj) else NAN, socialJetlagSigned=sj,
        wakeGap=wake[1] - wake[0] if wake else NAN,
        byWeekday=by_weekday, trend=trend,
    )


QS = [10, 25, 50, 75, 90]


def percentile_of(value, q):
    if not _finite(value) or not q:
        return NAN
    xs = [q[f"p{p}"] for p in QS]
    if value < xs[0]:
        return 5.0
    if value > xs[4]:
        return 95.0
    for i in range(4):
        if value <= xs[i + 1]:
            span = xs[i + 1] - xs[i]
            if span <= 0:
                return float(QS[i])
            return QS[i] + (value - xs[i]) / span * (QS[i + 1] - QS[i])
    return 95.0


def travel_for(sj_min):
    if not _finite(sj_min):
        return None
    h = sj_min / 60
    if h < 0.5:
        return dict(hours=h, city=None)
    n = min(6, max(1, math.floor(h + 0.5)))
    return dict(hours=h, city=TRAVEL[n - 1], cityHours=n)


def pattern_cell(m, class_ref):
    if not class_ref or not _finite(m["midMean18"]) or not _finite(m["socialJetlag"]):
        return None
    c1, c2 = class_ref["midCuts"]
    mid_bin = 0 if m["midMean18"] <= c1 else 1 if m["midMean18"] <= c2 else 2
    sj_bin = 0 if m["socialJetlag"] < RULES["sjCutMin"] else 1
    key = f"{mid_bin}-{sj_bin}"
    return dict(key=key, midBin=mid_bin, sjBin=sj_bin, count=class_ref["cells"].get(key), n=class_ref["n"])


def compare_to_class(m, class_ref):
    if not class_ref:
        return None
    q = class_ref["quantiles"]
    return dict(
        sleepPct=percentile_of(m["sleepMean"], q["sleepMean"]),
        bedSdPct=percentile_of(m["bedResidSd"], q["bedResidSd"]),
        wakeSdPct=percentile_of(m["wakeResidSd"], q["wakeResidSd"]),
        midPct=percentile_of(m["midMean18"], q["midMean18"]),
        sjPct=percentile_of(m["socialJetlag"], q["socialJetlag"]),
        similar=pattern_cell(m, class_ref),
    )
