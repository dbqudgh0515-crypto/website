// 목표 도우미 (사전등록 5장 ②~④): 목표마다 "만약 ~하면 ~한다" 예시 한 줄과 팁 2~3개(출처 링크).
// 목표 문장과 순서는 calc.js의 GOALS, 목표 제출 구글폼의 선택지와 똑같아야 한다.

// 실천 계획 예시. 학생은 폼에서 자기 상황에 맞게 직접 쓴다.
export const PLAN_EXAMPLES = {
  "bed-window": "만약 평일 밤 취침 30분 전 알람이 울리면, 하던 일을 저장하고 씻으러 간다.",
  "weekend-wake": "만약 주말 아침 알람이 울리면, 다시 눕지 않고 커튼부터 연다.",
  "wind-down": "만약 잠자리에 들기 30분 전 알람이 울리면, 휴대폰을 책상 위 충전기에 꽂아 둔다.",
};

// 팁 출처. 학생이 알아볼 수 있게 한국어 이름을 쓰고, 원문 언어를 함께 보여준다. 링크는 새 탭으로 연다.
export const SOURCES = {
  aasm: { name: "미국수면의학회(AASM)", lang: "영어", url: "https://sleepeducation.org/healthy-sleep/healthy-sleep-habits/" },
  nhs: { name: "영국 국민보건서비스(NHS)", lang: "영어", url: "https://www.nhs.uk/every-mind-matters/mental-wellbeing-tips/how-to-fall-asleep-faster-and-sleep-better/" },
  aap: { name: "미국소아과학회(AAP)", lang: "영어", url: "https://www.healthychildren.org/English/healthy-living/sleep/Pages/healthy-sleep-habits-how-many-hours-does-your-child-need.aspx" },
};

// 팁: { text: 화면 문장, src: SOURCES 키, quote: 출처 페이지에서 확인한 원문 }
// 연구자가 출처 페이지를 직접 열어 확인한 것만 넣는다(2026-10-19 확인). 약·질환·진단 내용은 넣지 않는다.
// 휴대폰 목표는 사전등록대로 30분이다. 1시간을 권하는 출처 문장은 쓰지 않는다.
export const TIPS = {
  "bed-window": [
    { text: "매일 비슷한 시각에 자고 일어나면, 몸이 잘 시간을 알아차리는 데 도움이 돼요.", src: "nhs",
      quote: "going to bed and getting up at similar times each day helps your body know when it's time to sleep." },
    { text: "자기 전에 긴장을 푸는 나만의 순서(루틴)를 정해 매일 해 보세요.", src: "aasm",
      quote: "Establish a relaxing bedtime routine." },
  ],
  "weekend-wake": [
    { text: "주말이나 방학에도 매일 같은 시각에 일어나는 것이 좋은 수면 습관이에요.", src: "aasm",
      quote: "Get up at the same time every day, even on weekends or during vacations." },
    { text: "학교에 가지 않는 날에도 평소 생활 순서를 되도록 똑같이 지켜 보세요.", src: "nhs",
      quote: "Try to keep your routine the same when you can, even on days when you're not working." },
    { text: "일어날 시간에 밝은 빛을 쬐면 잠을 깨는 데 도움이 돼요.", src: "aap",
      quote: "Expose children to bright light when it's time to get up to help stimulate wakefulness." },
  ],
  "wind-down": [
    { text: "잠들기 최소 30분 전에는 전자기기를 꺼 두세요.", src: "aasm",
      quote: "Turn off electronic devices at least 30 minutes before bedtime." },
    { text: "휴대폰 대신 좋아하는 책 읽기, 잔잔한 음악 듣기처럼 마음을 가라앉히는 일을 해 보세요.", src: "nhs",
      quote: "reading something you enjoy / listening to calming music" },
    { text: "휴대폰은 무음으로 하고 화면이 아래로 가게 엎어 두면 방해와 빛을 줄일 수 있어요.", src: "nhs",
      quote: "putting your phone on silent to avoid interruptions / placing your phone face down to reduce light" },
  ],
};

// 목표 제출 폼 미리 채우기 주소. form은 암호문에 든 { base, codeEntry, goalEntry }와 확인 코드(code).
// 형식이 하나라도 어긋나면 null을 돌려줘서 버튼을 만들지 않는다.
const FORM_BASE = /^https:\/\/docs\.google\.com\/forms\/d\/e\/[A-Za-z0-9_-]+\/viewform$/;
const ENTRY = /^entry\.\d+$/;
export function prefillUrl(form, code, goalText) {
  if (!form || !FORM_BASE.test(form.base || "") || !ENTRY.test(form.codeEntry || "") || !ENTRY.test(form.goalEntry || "")) return null;
  if (!/^[0-9a-f]{8}$/.test(code || "") || !goalText) return null;
  const q = new URLSearchParams({ usp: "pp_url" });
  q.set(form.codeEntry, code);
  q.set(form.goalEntry, goalText);
  return `${form.base}?${q}`;
}
