# vendored 브라우저 라이브러리
무빌드 PWA라 npm 모듈을 브라우저가 직접 못 읽는다. 아래를 node_modules에서 복사한다:
- pdf-lib.esm.min.js  ← node_modules/pdf-lib/dist/pdf-lib.esm.min.js
- fontkit.esm.min.js  ← node_modules/@pdf-lib/fontkit/dist/fontkit.es.min.js (minified ESM 산출물; `fontkit.es.js`는 비압축 버전)
재설치 시 갱신. vitest는 node_modules에서 직접 해석하므로 이 파일들은 브라우저 전용.
