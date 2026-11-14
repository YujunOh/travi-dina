# TRAVI 웹사이트 시안

TRAVI(AI 협동조합 플랫폼) 소개 사이트의 화면 시안입니다. 빌드 없이 HTML, CSS, JS 파일만으로 돌아갑니다.

- 사이트: https://travi-dina.vercel.app

## 페이지

| 파일 | 내용 |
|---|---|
| `index.html` | 메인. 움직이는 도식, 도메인 타일과 대표 Coop, Context, 분산학습 방식, How a Coop works, Partners |
| `coop.html` | Cooperatives 목록(도메인과 상태 필터, 정렬). `?coop=soc`처럼 열면 그 Coop 상세 |
| `request.html` | Request to join (참여 요청, 별도 페이지) |
| `verify.html` | Verify your organization (요청 뒤 기관 확인) |
| `login.html` | Log in (Google 우선, 이메일 로그인은 나중) |
| `join.html` | Join TRAVI (가입) |
| `dashboard.html` | 로그인 뒤: 학습 지표, 빈 상태, Leave Coop 팝업 |
| `coop-manage.html` | 로그인 뒤: Manage Coop (Coop leader, Start training) |
| `wallet.html` | 포인트 잔액과 내역. 게스트는 안내 화면 |
| `settings.html` | 로그인 뒤: 계정 설정 |
| `whitepaper.html` | 논문과 글 목록 |
| `domain-security.html` | 보안 사례 문서 (Whitepaper 아래) |
| `admin.html` | 운영 화면 시안. 우선순위 낮음, 메뉴에 연결하지 않음 |
| `domain.html`, `domain-agriculture.html`, `domain-healthcare.html`, `mypage.html` | 옛 주소. 옮겨 간 곳을 알려 주는 안내만 남김 |
| `hero.html` | 첫 화면 후보 미리보기. 도식 후보를 실제 첫 화면 자리에 얹어 보고 테마, 글 배치, 팔레트를 바꿔 본다 |
| `diagram-lab.html` | 도식 실험실. 모든 도식 버전을 카드로 나란히 놓고 점수를 매긴다 |

`hero.html`과 `diagram-lab.html`은 검토용 페이지라 검색에 잡히지 않게 해 두었습니다. 도식 코드는 `lab/`(공통 `core.js`, 버전별 `v-*.js`), 도메인 아이콘은 `icons/`에 있습니다. `hero.html` 주소 뒤에 `?v=h1-constellation&theme=dark&layout=left`처럼 붙이면 그 상태로 열리고, `ui=0`은 조절 막대를, `text=0`은 글을 숨깁니다.

모든 화면은 같은 예시 데이터(기준일 Nov 20, 2026)를 씁니다. 오른쪽 아래 "Viewing as" 막대로 Guest, Member, Leader 보기를 바꿉니다. 주소에 `?as=guest`처럼 붙여도 되고, `?demo=0`을 붙이면 막대가 숨습니다(시연용). `dashboard.html`과 `wallet.html`은 `?empty=1`로 빈 상태를 봅니다. 각 화면 맨 아래 Review notes에 미결 사항과 가정을 적었습니다.

공통 파일은 `style.css`(스타일), `viz.js`(움직이는 도식), `common.js`(스크롤할 때 나타나는 효과), `app.js`(공통 헤더와 푸터, 보기 상태, 팝업, 알림, 토스트)입니다.

## 로컬에서 보기

`index.html`을 더블클릭하면 됩니다. 로컬 서버로 보려면 이 폴더에서 `python -m http.server --bind 127.0.0.1`을 실행하세요.

## 배포

`main` 브랜치에 push하면 Vercel이 자동으로 운영 사이트를 다시 배포합니다. 다른 브랜치에 push하면 미리보기 주소가 따로 생깁니다.

## 아직 임시인 것

- 바닥글의 Contact 이메일과 LinkedIn 주소 (화면에 "교체 필요" 표시)
- TRAVI 아이콘 (임시로 그린 것)
- Agriculture, Healthcare 상세 내용
