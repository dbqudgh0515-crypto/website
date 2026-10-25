// 결과 페이지 "세계와 비교" 카드의 자료. 출처 원문을 직접 열어 확인한 숫자만 넣는다(2026-10-25 확인).
// 계산 엔진(calc.js)과 학급 참고값은 건드리지 않는다. 이 숫자들은 화면에 보여 주기만 한다.

export const WORLD_SOURCES = {
  oecd: { name: "OECD 시간 사용 자료(2021년판, 엑셀)", lang: "영어",
    url: "https://www.oecd.org/content/dam/oecd/en/topics/policy-issues/gender-equality/oecd_1564_tusupdateportal.xlsx" },
  kdca: { name: "질병관리청 청소년건강행태조사 2025", lang: "한국어",
    url: "https://www.kdca.go.kr/bbs/kdca/42/215505/artclView.do" },
};

// OECD Gender Data Portal 2021 "Time use across the world", Total 시트의 "3.1 sleeping" 줄.
// 하루 평균 수면(분), 평일·주말을 합친 값. 나이는 대부분 15~64세(호주 15세 이상, 중국 15~74세, 리투아니아 20~64세).
// 조사 연도는 나라마다 다르다(1998~2019년, 한국 2014년). 긴 순서. year의 "2010/11"(노르웨이)은 원자료 표기 "2010/211"의 오타를 고친 것.
export const OECD_SLEEP = [
  { name: "남아프리카공화국", min: 553.1, year: "2010", age: "15-64" },   // South Africa
  { name: "중국", min: 541.6, year: "2008", age: "15-74" },   // China
  { name: "미국", min: 531.0, year: "2019", age: "15-64" },   // USA
  { name: "에스토니아", min: 530.0, year: "2009/10", age: "15-64" },   // Estonia
  { name: "인도", min: 528.1, year: "1998/99", age: "15-64" },   // India
  { name: "뉴질랜드", min: 526.0, year: "2009/10", age: "15-64" },   // New Zealand
  { name: "캐나다", min: 520.0, year: "2015", age: "15-64" },   // Canada
  { name: "룩셈부르크", min: 518.2, year: "2013", age: "15-64" },   // Luxembourg
  { name: "스페인", min: 515.7, year: "2009/10", age: "15-64" },   // Spain
  { name: "튀르키예", min: 514.6, year: "2014/15", age: "15-64" },   // Turkey
  { name: "이탈리아", min: 513.3, year: "2013/2014", age: "15-64" },   // Italy
  { name: "프랑스", min: 513.0, year: "2009/10", age: "15-64" },   // France
  { name: "벨기에", min: 512.9, year: "2013", age: "15-64" },   // Belgium
  { name: "호주", min: 512.4, year: "2006", age: "15 and more" },   // Australia
  { name: "라트비아", min: 512.3, year: "2003", age: "15-64" },   // Latvia
  { name: "폴란드", min: 508.9, year: "2013", age: "15-64" },   // Poland
  { name: "핀란드", min: 508.3, year: "2009/10", age: "15-64" },   // Finland
  { name: "영국", min: 508.1, year: "2014/2015", age: "15-64" },   // UK
  { name: "헝가리", min: 505.9, year: "2010", age: "15-64" },   // Hungary
  { name: "포르투갈", min: 505.5, year: "1999", age: "15-64" },   // Portugal
  { name: "리투아니아", min: 503.1, year: "2003", age: "20-64" },   // Lithuania
  { name: "네덜란드", min: 502.8, year: "2016", age: "15-64" },   // Netherlands
  { name: "슬로베니아", min: 501.3, year: "2000/01", age: "15-64" },   // Slovenia
  { name: "그리스", min: 500.0, year: "2013", age: "15-64" },   // Greece
  { name: "멕시코", min: 498.7, year: "2014", age: "15-64" },   // Mexico
  { name: "독일", min: 498.4, year: "2012/13", age: "15-64" },   // Germany
  { name: "오스트리아", min: 498.3, year: "2008/09", age: "15-64" },   // Austria
  { name: "노르웨이", min: 492.1, year: "2010/11", age: "15-64" },   // Norway
  { name: "아일랜드", min: 491.3, year: "2005", age: "15-64" },   // Ireland
  { name: "덴마크", min: 488.6, year: "2001", age: "15-64" },   // Denmark
  { name: "스웨덴", min: 482.7, year: "2010", age: "15-64" },   // Sweden
  { name: "한국", min: 471.4, year: "2014", age: "15-64" },   // Korea
  { name: "일본", min: 444.1, year: "2016", age: "15-64" },   // Japan
];

// 질병관리청 「청소년건강행태조사 2025년 주요결과」 보도자료(2025-12-05) 본문:
// "주중 평균 수면시간은 남학생(6.6시간), 여학생(5.9시간)". 중·고등학생 전체, 주중 = 학교 가는 날.
export const KR_TEEN_WEEKDAY = { year: 2025, boys: 6.6, girls: 5.9 };
