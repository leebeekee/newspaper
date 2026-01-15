# 실제 데이터베이스(DB) 직접 연동 가이드

현재는 `editor.xml`이라는 파일을 사용하지만, 인터넷 어디서든 접속해서 저장되게 하려면 **클라우드 데이터베이스(Cloud DB)**를 사용해야 합니다. 가장 추천하는 서비스는 **Google Firebase**입니다.

## 1. 어디에 접근(가입) 해야 하나요?
**Google Firebase (파이어베이스)**
- **주소**: [https://console.firebase.google.com/](https://console.firebase.google.com/)
- **장점**: 
  - 무료 제공 (테스트 용도)
  - 서버를 직접 살 필요가 없음 (Serverless)
  - XML과 비슷한 구조(JSON)로 저장되어 이해하기 쉬움
  - 자바스크립트 코드만으로 바로 연동 가능

## 2. 연동 절차 (약 10분 소요)
1. 위 사이트 접속 후 구글 아이디로 로그인.
2. **[프로젝트 만들기]** 클릭 -> 프로젝트 이름 입력 (예: `newspaper-editorial`).
3. 메뉴에서 **[Build] (빌드)** -> **[Realtime Database]** 선택.
4. **[데이터베이스 만들기]** 클릭.
5. 보안 규칙에서 **"테스트 모드에서 시작"** 선택 (누구나 읽기/쓰기 가능).
6. 만들어지면 **[프로젝트 설정]** (톱니바퀴) -> **[일반]** 탭으로 이동.
7. **내 앱** 섹션에서 `</>` (웹) 아이콘 클릭.
8. 여기에 나오는 `firebaseConfig` (API 키 등) 코드를 복사합니다.

## 3. 코드 수정 위치
현재 프로젝트의 `admin.js`와 `script.js`에서 파일을 읽고(`fetch`) 쓰는 부분을 Firebase 코드로 교체해야 합니다.

### 예시 코드 (변경 전 vs 후)

**변경 전 (현재 로컬 파일 방식)**
```javascript
// 읽기
const response = await fetch('editor.xml');

// 저장
fetch('/save-xml', { body: xmlString ... });
```

**변경 후 (Firebase 방식)**
```javascript
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue } from "firebase/database";

const firebaseConfig = {
  // ... 아까 복사한 키 ...
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// 읽기 (데이터가 바뀔 때마다 자동 실행)
const starCountRef = ref(db, 'editorials');
onValue(starCountRef, (snapshot) => {
  const data = snapshot.val();
  // ... 화면 갱신 ...
});

// 저장
set(ref(db, 'editorials'), editorialData);
```

이 방식으로 변경하면 `node server.js`가 없어도, 깃허브 페이지에서도, 스마트폰에서도 데이터가 실시간으로 저장되고 공유됩니다.
