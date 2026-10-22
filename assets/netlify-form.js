// Netlify Forms로 응답 보내기. 같은 사이트 주소("/")로 fetch POST만 한다(CSP connect-src 'self').
// 폼 이름과 칸 이름은 HTML의 정적 폼 정의(data-netlify)와 같아야 Netlify가 받는다.
// "bot-field"는 스팸 방지용 숨은 칸이다. 사람은 비워 두고, 채워져 오면 Netlify가 스팸으로 분류한다.
// 화면의 숨은 칸 값을 그대로 넘긴다(fields["bot-field"]).
export async function submitNetlifyForm(formName, fields) {
  const body = new URLSearchParams({ "form-name": formName, "bot-field": "", ...fields });
  try {
    const res = await fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      referrerPolicy: "no-referrer",
      cache: "no-store",
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}
