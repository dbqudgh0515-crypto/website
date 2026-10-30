# 생활리듬 자가진단 웹페이지

취침·기상 기록으로 수면 패턴을 정리해 보여주는 **서버 없는 정적 사이트**예요. 계산은 모두 브라우저 안에서 해요.

- `index.html` **공개 자가진단**: 누구나 기록을 넣으면 결과를 보여줘요. 입력값은 어디로도 보내지 않아요.
  보안 정책(CSP `connect-src 'none'`)으로 페이지가 네트워크 요청을 아예 못 하게 막아 두었어요.
- `r/` **개인 결과 페이지**: 연구 참여자에게 개인 링크로 전달해요. 결과는 암호화된 파일(`d/*.bin`)로만 올라가고,
  여는 열쇠는 링크의 `#` 뒷부분에만 있어요. 브라우저는 `#` 뒷부분을 서버로 보내지 않아요.
  페이지는 열쇠를 읽은 뒤 주소창에서 지워요.

## 보여주는 항목
한눈에(평균 수면, 취침·기상 시각 편차, 학급 참고 비교) · 수면 중간 시각의 학급 내 위치 · 사회적 시차와 주말 시차 여행 비유 ·
요일별 평균(요일당 2일 미만이면 숨김) · 나와 비슷한 패턴의 학급 인원(5명 미만이면 숨김) · 내 생각(시작 설문)과 기록 비교 ·
취침 시각 7일 평균 추세 · 설명 문장과 목표 하나 고르기(개인 결과 페이지는 "11월 20일까지", 공개 자가진단은 "이번 주")(고르면 실천 계획 예시와 팁이 보이고, 개인 결과 페이지에서는
이 페이지 안에서 목표와 실천 계획 한 줄을 제출해요(Netlify Forms, 확인 코드 자동). 공개 자가진단에서는 이 기기에만 저장)

유형 이름은 붙이지 않고 학급 참고 막대 위의 위치로만 보여줘요. 진단·단정 표현은 쓰지 않아요.

## 파일
| 파일 | 내용 |
|---|---|
| `assets/calc.js` | 계산 엔진 (브라우저·Node 공용) |
| `assets/render.js` | 결과 화면 |
| `assets/tokens.css` | **디자인 토큰**: 색, 글꼴, 크기, 여백, 모서리, 움직임 값. 다크 모드도 같은 이름에 값만 바꿈. 모든 화면은 이 값만 써요 |
| `start/index.html`, `assets/start.js` | 시작 설문(이름, 참여 동의, 규칙성 1~5, 주말 기상 지연 예상). Netlify Forms `start-survey` |
| `review/index.html`, `assets/review.js` | 사용 후기(사전등록 9장 문항, 이름 포함). Netlify Forms `review-survey`. 14일차(11/13) 배포부터 올리고 11/21에 안내 |
| `assets/netlify-form.js` | 세 폼의 제출: 같은 사이트로 fetch POST(CSP connect-src 'self'), 스팸 방지 숨은 칸 |
| `assets/goals.js` | 목표 도우미: 목표별 실천 계획 예시, 팁(출처 확인한 것만) |
| `assets/world.js` | "세계와 비교" 카드 자료: OECD 시간 사용 자료(2021년판) 33개 나라 하루 평균 수면, 질병관리청 청소년건강행태조사 2025 중고등학생 주중 평균 수면. 출처 원문을 열어 확인한 숫자만 |
| `assets/style.css`, `assets/motion.js` | 화면 모양과 등장 움직임(움직임 줄이기 설정이면 움직이지 않음) |
| `assets/fonts/pretendard/` | Pretendard 글꼴(1.3.9, 가변 글꼴 나눔 파일). CSP 때문에 외부 CDN 대신 직접 넣음. SIL OFL 1.1, `LICENSE.txt` 함께 둠 |
| `assets/selfcheck.js`, `assets/personal.js` | 공개 / 개인 페이지 동작 |
| `assets/crypto.js`, `tools/seal.py` | 개인 결과 암호화(AES-256-GCM)와 풀기 |
| `assets/class_ref.js` | 학급 참고값: 분위수와 묶음별 인원만, 개인 값 없음. `tools/make_class_ref.py`로 만듦 |
| `tools/metrics_ref.py` | `calc.js`와 같은 계산의 파이썬 판 |

`assets/class_ref.js`는 지금 **가상 학급 예시**예요. 실제 학급 참고값으로 바꾸는 건 연구자가 결정한 뒤에 해요.

## 디자인 지침
`.claude/skills/frontend-design/`: Anthropic 공식 스킬 저장소(github.com/anthropics/skills, 커밋 `dbd4588`)의 frontend-design 스킬. 마크다운 지침과 라이선스(Apache 2.0)만 있고 실행 스크립트는 없어요. 디자인 기준은 `assets/tokens.css`가 우선이에요.

## 테스트
```bash
python3 tests/test_js_vs_py.py   # 가상 학생 200명: JS 계산 = 파이썬 계산인지
python3 tests/test_crypto.py     # 파이썬으로 잠근 결과를 브라우저 암호화 API로 풀 수 있는지, 틀린 열쇠·변조는 거부하는지
```

## 배포
- 공개 자가진단: **본조사(2026-10-31 ~ 11-20)가 끝날 때까지 배포하지 않아요.** 아직 결과를 받지 않은 참여자가
  같은 계산을 미리 볼 수 있기 때문이에요. 끝난 뒤 이 저장소를 GitHub Pages로 배포해요(학급 참고값도 그때 정함).
- 개인 결과: 연구자의 비공개 분석 저장소(`make_web_feedback.py`)가 암호문과 개인 결과 페이지 파일만 묶어 **Netlify**에 올려요.
  이 공개 저장소에는 `d/*.bin`을 커밋하지 않아요(.gitignore).
