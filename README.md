# TRAVI 웹사이트 시안

TRAVI(AI 협동조합 플랫폼) 소개 사이트의 화면 시안입니다. 빌드 없이 HTML, CSS, JS 파일만으로 돌아갑니다.

- 사이트: https://travi-dina.vercel.app

## 페이지

| 파일 | 내용 |
|---|---|
| `index.html` | 메인. 동심원 도식(lab/v-h2.js), Explore AI Cooperatives, Why Build AI Together?, How Travi Works?, Growing Our Ecosystem |
| `coop.html` | AI Cooperatives 목록(도메인과 상태 필터, 정렬). `?coop=soc`처럼 열면 그 Coop 상세 |
| `create.html` | Create a Coop 양식 (Figma MF 10의 Goal and introduction 단계) |
| `request.html` | Join (참여 양식, 별도 페이지) |
| `verify.html` | Verify your organization (요청 뒤 기관 확인) |
| `login.html` | Log in (Google 우선, 이메일 로그인은 나중) |
| `join.html` | Join TRAVI (가입) |
| `dashboard.html` | 로그인 뒤: 기여자 기준 지표, 빈 상태, Leave Coop 팝업 |
| `wallet.html` | 포인트 잔액과 내역. 게스트는 안내 화면 |
| `settings.html` | 로그인 뒤: 계정 설정 |
| `whitepaper.html` | 논문과 글 목록 |
| `domain-security.html` | 보안 사례 문서 (Whitepaper 아래) |
| `domain.html`, `domain-agriculture.html`, `domain-healthcare.html`, `mypage.html` | 옛 주소. 옮겨 간 곳을 알려 주는 안내만 남김 |
| `hero.html` | 첫 화면 후보 미리보기. 도식 후보를 실제 첫 화면 자리에 얹어 보고 테마, 글 배치, 팔레트를 바꿔 본다 |
| `diagram-lab.html` | 도식 실험실. 모든 도식 버전을 카드로 나란히 놓고 점수를 매긴다 |

`hero.html`과 `diagram-lab.html`은 검토용 페이지라 검색에 잡히지 않게 해 두었습니다. 도식 코드는 `lab/`(공통 `core.js`, 버전별 `v-*.js`), 도메인 아이콘은 `icons/`에 있습니다. `hero.html` 주소 뒤에 `?v=h1-constellation&theme=dark&layout=left`처럼 붙이면 그 상태로 열리고, `ui=0`은 조절 막대를, `text=0`은 글을 숨깁니다.

모든 화면은 같은 예시 데이터(기준일 Nov 20, 2026)를 씁니다. 보기 상태는 member로 고정이고 Coop은 SOC Threat Detection 하나입니다. 주소에 `?as=guest`를 붙이면 로그아웃 상태를 봅니다. `dashboard.html`과 `wallet.html`은 `?empty=1`로 빈 상태를 봅니다.

공통 파일은 `style.css`(스타일), `viz.js`(움직이는 도식), `common.js`(스크롤할 때 나타나는 효과), `app.js`(공통 헤더와 푸터, 보기 상태, 팝업, 알림, 토스트)입니다.

## 로컬에서 보기

`index.html`을 더블클릭하면 됩니다. 로컬 서버로 보려면 이 폴더에서 `python -m http.server --bind 127.0.0.1`을 실행하세요.

## 배포

`main` 브랜치에 push하면 Vercel이 자동으로 운영 사이트를 다시 배포합니다. 다른 브랜치에 push하면 미리보기 주소가 따로 생깁니다.

## 아직 임시인 것

- 바닥글의 Contact 이메일, FAQ, Terms of Service, Privacy Policy, LinkedIn, GitHub 주소
- TRAVI 아이콘 (임시로 그린 것)
- Agriculture, Healthcare 상세 내용
