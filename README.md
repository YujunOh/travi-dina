# TRAVI 웹사이트 시안

TRAVI(AI 협동조합 플랫폼) 소개 사이트의 화면 시안입니다. 빌드 없이 HTML, CSS, JS 파일만으로 돌아갑니다.

- 사이트: https://travi-dina.vercel.app

## 페이지

| 파일 | 내용 |
|---|---|
| `index.html` | 메인. 움직이는 도식, What we're looking at, 분산학습 방식, Partners |
| `domain.html` | 도메인 목록 (Security, Agriculture, Healthcare) |
| `domain-security.html` | Security 상세 (문서형, 피치덱 사례 기반) |
| `domain-agriculture.html`, `domain-healthcare.html` | 준비 중인 자리 |
| `whitepaper.html` | 논문과 글 목록 |
| `join.html` | 참여 신청 양식 (전송 기능 없음) |
| `coop.html` | 로그인 뒤: 코옵 둘러보기와 참여 신청 (Participant) |
| `coop-manage.html` | 로그인 뒤: 코옵 관리, 정산 기간과 분배 규칙 미리보기 (Co-op leader) |
| `mypage.html` | 로그인 뒤: 내 역할, 내 코옵, 기여, 정산과 지급 내역 (Participant) |
| `admin.html` | 로그인 뒤: 신청 승인, 사이트, 언러닝, 정산 감사, 감사 로그 (Admin) |
| `hero.html` | 첫 화면 후보 미리보기. 도식 후보를 실제 첫 화면 자리에 얹어 보고 테마, 글 배치, 팔레트를 바꿔 본다 |
| `diagram-lab.html` | 도식 실험실. 모든 도식 버전을 카드로 나란히 놓고 점수를 매긴다 |

`hero.html`과 `diagram-lab.html`은 검토용 페이지라 검색에 잡히지 않게 해 두었습니다. 도식 코드는 `lab/`(공통 `core.js`, 버전별 `v-*.js`), 도메인 아이콘은 `icons/`에 있습니다. `hero.html` 주소 뒤에 `?v=h1-constellation&theme=dark&layout=left`처럼 붙이면 그 상태로 열리고, `ui=0`은 조절 막대를, `text=0`은 글을 숨깁니다.

로그인 뒤 화면 4개는 모두 같은 예시 데이터(as of Dec 3, 2026)를 쓰고, 헤더의 "Viewing as"로 역할을 바꿔 가며 볼 수 있습니다. 각 화면 맨 아래 Review notes에 미결 사항과 가정을 출처와 함께 적었습니다.

공통 파일은 `style.css`(스타일), `viz.js`(움직이는 도식), `common.js`(스크롤할 때 나타나는 효과), `app.js`(로그인 뒤 화면의 헤더 메뉴)입니다.

## 로컬에서 보기

`index.html`을 더블클릭하면 됩니다. 로컬 서버로 보려면 이 폴더에서 `python -m http.server`를 실행하세요.

## 배포

`main` 브랜치에 push하면 Vercel이 자동으로 운영 사이트를 다시 배포합니다. 다른 브랜치에 push하면 미리보기 주소가 따로 생깁니다.

## 아직 임시인 것

- 바닥글의 Contact 이메일과 LinkedIn 주소 (화면에 "교체 필요" 표시)
- TRAVI 아이콘 (임시로 그린 것)
- Agriculture, Healthcare 상세 내용
