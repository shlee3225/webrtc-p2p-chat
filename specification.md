P2P 익명 채팅 애플리케이션 기술 명세서 (specification.md)
1. 개요

본 문서는 'P2P 익명 채팅 애플리케이션 PRD'를 기반으로, 실제 개발을 위한 기술 스택, 아키텍처, 핵심 로직 및 데이터 모델을 정의하는 기술 명세서입니다. 프로젝트의 목표는 Vanilla JS와 WebRTC를 중심으로 경량화되고, 보안성이 높으며, 현대적인 개발 경험(Vibe Coding)을 제공하는 것입니다. Gemini CLI와 같은 AI 기반 개발 도구를 효율적으로 활용할 수 있도록 명확하고 모듈화된 구조를 지향합니다.

2. 시스템 아키텍처

본 애플리케이션은 중앙 서버 없이 클라이언트(브라우저) 간 직접 통신하는 P2P(Peer-to-Peer) 서버리스 아키텍처를 따릅니다.
클라이언트 (Client): 사용자의 브라우저에서 실행되는 웹 애플리케이션. UI, 상태 관리, WebRTC 연결 등 모든 핵심 로직을 포함합니다.
시그널링 (Signaling): P2P 연결 설정을 위해 필요한 메타데이터(SDP, ICE Candidates)를 교환하는 과정입니다. PRD의 요구사항에 따라, 별도의 시그널링 서버 없이 사용자가 직접 '연결 코드'를 복사하여 교환하는 수동 방식을 채택합니다.

NAT 트래버설 (NAT Traversal): 클라이언트가 사설 네트워크(공유기 등) 환경에 있을 때 외부에서 접속할 수 있도록 경로를 찾아주는 기술입니다.
STUN (Session Traversal Utilities for NAT): 클라이언트의 공인 IP 주소와 포트를 확인하는 데 사용됩니다. 무료 공개 STUN 서버를 활용하여 비용을 최소화합니다.
TURN (Traversal Using Relays around NAT): STUN으로도 직접 연결이 불가능한 대칭형(Symmetric) NAT 환경을 위한 중계 서버입니다. MVP 단계에서는 제외하고, 연결 성공률 KPI(85%) 달성 여부에 따라 Phase 2에서 도입을 고려합니다.

3. 기술 스택 (Technology Stack)
구분	기술	사유
코어	Vanilla JavaScript (ES6+)	PRD 요구사항 준수. 외부 프레임워크 의존성 최소화로 가볍고 빠른 애플리케이션 구현.
코어	WebRTC (RTCPeerConnection, RTCDataChannel)	P2P 데이터 통신 및 종단간 암호화(DTLS)를 위한 핵심 기술. 플러그인 없이 브라우저 네이티브 API 사용.
마크업/스타일링	HTML5, CSS3	시맨틱 마크업과 모던 CSS를 활용한 반응형 UI 구현. CSS Variables를 이용한 테마(다크/라이트) 기능 구현.
개발/빌드 도구	Vite	빠른 개발 서버 구동(HMR) 및 최적화된 프로덕션 빌드를 지원하여 개발 생산성 극대화.
코드 품질	ESLint, Prettier	일관된 코드 스타일을 유지하고 잠재적 오류를 방지하여 협업 및 유지보수 효율 증대.
배포	Vercel / Netlify / GitHub Pages	정적 웹사이트 호스팅 서비스. HTTPS 자동 지원 및 손쉬운 배포 파이프라인 구축.
STUN 서버	stun:stun.l.google.com:19302 <br> stun:stun1.l.google.com:19302	안정성이 검증된 Google의 공개 STUN 서버를 활용.
4. 프로젝트 구조 (Project Structure)

명확한 역할 분리를 통해 코드의 가독성과 유지보수성을 높이는 모듈화된 구조를 채택합니다.

code
Code
download
content_copy
expand_less

/
├── public/                  # 정적 파일 (HTML, 파비콘 등)
│   └── index.html
├── src/
│   ├── js/
│   │   ├── main.js          # 애플리케이션 진입점 (초기화 로직)
│   │   ├── ui.js            # DOM 조작 및 사용자 이벤트 처리 담당
│   │   └── webrtc.js        # WebRTC 연결 생성, 데이터 채널 관리 등 핵심 로직
│   └── css/
│       └── style.css        # 전역 스타일 및 반응형 쿼리
├── .eslintrc.cjs            # ESLint 설정
├── .prettierrc              # Prettier 설정
├── package.json
└── vite.config.js           # Vite 설정```

---

### 5. 핵심 모듈 및 로직 흐름

#### 5.1 WebRTC 연결 설정 흐름 (수동 시그널링)

사용자 A(연결 생성자)와 사용자 B(연결 참가자) 간의 연결 과정입니다.

1.  **[A] 세션 생성**:
    - `ui.js`: A가 닉네임을 입력하고 '채팅 시작' 버튼을 클릭.
    - `webrtc.js`: `createPeerConnection()`을 호출하여 `RTCPeerConnection` 객체 생성 및 STUN 서버 설정.
    - `webrtc.js`: `createDataChannel()`을 호출하여 메시지 전송용 데이터 채널 생성.
    - `webrtc.js`: `createOffer()`를 호출하여 SDP Offer 생성 후 `setLocalDescription()`으로 등록.
    - **ICE Candidate 수집 대기**: `onicecandidate` 이벤트 리스너는 수집된 후보들을 로컬에 저장. `onicegatheringstatechange`가 'complete'가 되면 수집 완료.
    - `webrtc.js`: 수집이 완료된 SDP Offer 객체를 Base64로 인코딩한 **'연결 코드'** 생성.
    - `ui.js`: 생성된 '연결 코드'를 화면에 표시.

2.  **[B] 세션 참가**:
    - `ui.js`: B가 닉네임을 입력하고 A로부터 전달받은 '연결 코드'를 붙여넣은 후 '연결' 버튼 클릭.
    - `webrtc.js`: A와 동일하게 `RTCPeerConnection` 객체 생성 및 데이터 채널 이벤트 리스너(`ondatachannel`) 등록.
    - `webrtc.js`: 전달받은 '연결 코드'를 디코딩하여 `setRemoteDescription()`으로 A의 Offer 등록.
    - `webrtc.js`: `createAnswer()`를 호출하여 SDP Answer 생성 후 `setLocalDescription()`으로 등록.
    - **ICE Candidate 수집 대기**: A와 동일한 방식으로 ICE Candidate 수집.
    - `webrtc.js`: 수집이 완료된 SDP Answer를 Base64로 인코딩한 **'응답 코드'** 생성.
    - `ui.js`: 생성된 '응답 코드'를 화면에 표시.

3.  **[A] 연결 완료**:
    - `ui.js`: A가 B로부터 전달받은 '응답 코드'를 붙여넣고 '확인' 버튼 클릭.
    - `webrtc.js`: '응답 코드'를 디코딩하여 `setRemoteDescription()`으로 B의 Answer 등록.
    - **연결 성공**: 양측의 SDP와 ICE 정보 교환이 완료되면 WebRTC가 P2P 연결을 시도하고, 성공 시 `ondatachannel` 또는 데이터 채널의 `onopen` 이벤트가 트리거됨.
    - `ui.js`: 채팅 UI를 활성화.

#### 5.2 데이터 모델

WebRTC 데이터 채널을 통해 교환되는 메시지는 일관된 형식을 위해 JSON 객체로 직렬화하여 전송합니다.

```json
{
  "type": "MESSAGE", // 또는 "SYSTEM_INFO", "FILE_META"
  "payload": {
    "nickname": "사용자 닉네임",
    "content": "안녕하세요!",
    "timestamp": 1718886400000
  }
}

type: 메시지의 종류 (일반 채팅, 시스템 알림 등)

payload: 실제 데이터 객체

nickname: 발신자 닉네임

content: 메시지 내용 (XSS 방지를 위해 렌더링 시 반드시 이스케이프 처리)

timestamp: 메시지 발송 시간 (UTC milliseconds)

6. 빌드 및 배포

개발 실행: npm install && npm run dev

프로덕션 빌드: npm run build

Vite가 dist 디렉터리에 최적화된 정적 파일을 생성합니다.

배포: 생성된 dist 디렉터리를 Vercel, Netlify 등 정적 호스팅 서비스에 배포합니다.

필수조건: WebRTC는 보안 정책상 반드시 HTTPS 프로토콜이 적용된 환경에서만 동작하므로, 배포 시 HTTPS 설정이 필수입니다.

7. 보안 강화 방안

입력 값 새니타이즈(Sanitize): 사용자가 입력하는 모든 값(닉네임, 메시지)은 DOM에 삽입되기 전에 반드시 텍스트로 처리(element.textContent)하여 Cross-Site Scripting(XSS) 공격을 원천 차단합니다.

데이터 휘발성: PRD 요구사항에 따라 localStorage나 sessionStorage를 사용하지 않으며, 모든 대화 내용은 메모리에만 존재하고 페이지 종료 시 소멸됩니다.

통신 암호화: WebRTC의 데이터 채널은 DTLS(Datagram Transport Layer Security)를 통해 기본적으로 종단간 암호화되므로, 제3자가 메시지를 가로챌 수 없습니다.