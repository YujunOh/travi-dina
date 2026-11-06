# TRAVI 웹사이트 시안

TRAVI(AI 협동조합 플랫폼) 소개 사이트의 화면 시안입니다. 빌드 없이 HTML, CSS, JS 파일만으로 돌아갑니다.

- 사이트: https://travi-dina.vercel.app
- Figma 와이어프레임(lo-fi): https://www.figma.com/design/cgEcLDSVfSsRuBk1V4Jjot/TRAVI

## 페이지

| 파일 | 내용 |
|---|---|
| `index.html` | 메인. 움직이는 도식, What we're looking at, 분산학습 방식, Partners |
| `domain.html` | 도메인 목록 (Security, Agriculture, Healthcare) |
| `domain-security.html` | Security 상세 (문서형, 피치덱 사례 기반) |
| `domain-agriculture.html`, `domain-healthcare.html` | 준비 중인 자리 |
| `whitepaper.html` | 논문과 글 목록 |
| `join.html` | 참여 신청 양식 (전송 기능 없음) |

공통 파일은 `style.css`(스타일), `viz.js`(움직이는 도식), `common.js`(스크롤할 때 나타나는 효과)입니다.

## 로컬에서 보기

`index.html`을 더블클릭하면 됩니다. 로컬 서버로 보려면 이 폴더에서 `python -m http.server`를 실행하세요.

## 배포

`main` 브랜치에 push하면 Vercel이 자동으로 운영 사이트를 다시 배포합니다. 다른 브랜치에 push하면 미리보기 주소가 따로 생깁니다.

## 아직 임시인 것

- 바닥글의 Contact 이메일과 LinkedIn 주소 (화면에 "교체 필요" 표시)
- TRAVI 아이콘 (임시로 그린 것)
- Agriculture, Healthcare 상세 내용
