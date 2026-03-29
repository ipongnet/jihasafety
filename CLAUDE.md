# JihaSafety - 지하매설물 통합 안전 플랫폼

## 프로젝트 개요
시공업체가 도로굴착 시 해당 지역의 지하매설물 담당자에게 자동으로 알림 메일을 보내는 웹 플랫폼.
내부 시스템이 저촉여부를 판정하면 접수자에게 자동으로 회신 이메일을 발송한다.

## 기술 스택
- **프레임워크**: Next.js 15 (App Router) + TypeScript + Tailwind CSS
- **주소 검색**: Daum Postcode API (팝업)
- **지오코딩**: V-World API (서버사이드, Edge 런타임 서울 리전)
- **지도 표시**: Leaflet + V-World WMTS 타일 (클라이언트, 동적 import)
- **이메일**: Nodemailer (Gmail SMTP)
- **DB**: Prisma 6 + PostgreSQL (Neon)
- **인증**: 쿠키 기반 관리자 인증 (bcryptjs) + API Key 인증 (회신 API)
- **배포**: Vercel (GitHub 연동 자동 배포)

## 워크플로우
- 코드 수정 후 **자동으로 git commit + push** (Stop 훅 설정됨)
- Vercel이 GitHub push 감지 → 자동 빌드/배포

## 전체 업무 흐름
1. 시공업체가 메인 페이지에서 굴착 요청 접수
2. 시스템이 주소 기반으로 담당자 자동 매칭 → 담당자에게 이메일 발송
3. 접수번호 자동 생성 (예: `경기분당-2026-0001`)
4. 내부 시스템이 저촉여부 판정 후 API 호출 → 접수자에게 자동 회신 이메일 (PDF 첨부)
5. 관리자 페이지에서 접수 이력, 상태, 저촉유무 확인

## 프로젝트 구조

```
JihaSafety/
├── .env.local                            # 환경변수 (gitignore)
├── .agents/                              # 에이전트 간 통신 (gitignore)
│   ├── plan.md                           # 계획 에이전트 → 코딩 에이전트
│   ├── review.md                         # 리뷰 에이전트 → 코딩 에이전트
│   └── status.md                         # 현재 작업 상태
├── prisma/
│   ├── schema.prisma                     # PostgreSQL (Neon)
│   └── seed.ts                           # 테스트용 담당자 데이터
├── src/
│   ├── app/
│   │   ├── layout.tsx                    # 루트 레이아웃 (한국어 폰트)
│   │   ├── page.tsx                      # 메인 페이지 (SubmissionForm 포함)
│   │   ├── globals.css
│   │   ├── contacts/
│   │   │   ├── page.tsx                  # 담당자 현황 (서버 컴포넌트)
│   │   │   └── ContactsClient.tsx        # 주소 검색 + 트리 뷰 (클라이언트)
│   │   ├── request/
│   │   │   └── complete/page.tsx         # 제출 완료 (접수번호, 부서, 연락처 표시)
│   │   ├── sibum_bundang/                # 관리자 영역 (비공개 경로)
│   │   │   ├── page.tsx                  # 관리자 로그인
│   │   │   ├── layout.tsx                # 인증 가드
│   │   │   └── dashboard/page.tsx        # 담당자 CRUD + 요청 이력 (탭 2개)
│   │   └── api/
│   │       ├── geocode/route.ts          # V-World 지오코딩 프록시 (Edge, icn1)
│   │       ├── request/route.ts          # 굴착 요청 + 접수번호 생성 + 이메일 발송
│   │       ├── contacts/route.ts         # 담당자 목록/추가
│   │       ├── contacts/[id]/route.ts    # 담당자 수정/삭제
│   │       ├── departments/route.ts      # 부서 목록/추가
│   │       ├── departments/[id]/route.ts # 부서 삭제
│   │       ├── submissions/route.ts      # 요청 이력 조회
│   │       ├── submissions/[id]/respond/route.ts  # 저촉여부 회신 API
│   │       └── auth/route.ts             # 관리자 로그인/로그아웃
│   ├── components/
│   │   ├── Header.tsx                    # 접수하기 + 담당자 현황 링크
│   │   ├── Footer.tsx
│   │   ├── KakaoAddressSearch.tsx        # Daum Postcode 팝업
│   │   ├── SubmissionForm.tsx            # 굴착 요청 폼 (Leaflet 지도 포함)
│   │   ├── ContactTable.tsx              # 관리자 담당자 테이블 (L1/L2 부서)
│   │   ├── SubmissionTable.tsx           # 관리자 요청 이력 테이블 (저촉유무 컬럼 포함)
│   │   └── LogoutButton.tsx
│   ├── lib/
│   │   ├── db.ts                         # Prisma 클라이언트 싱글톤
│   │   ├── mailer.ts                     # Nodemailer + 첨부파일 처리
│   │   ├── email-template.ts             # 이메일 HTML 템플릿 (접수 + 회신)
│   │   ├── csv-generator.ts              # CSV 생성 (GeoJSON 포함)
│   │   ├── city-matcher.ts               # 시/도 정규화 + 담당자 매칭 (3단계)
│   │   ├── submission-number.ts          # 접수번호 생성 (부서코드-연도-순번)
│   │   └── auth.ts                       # 관리자 인증 (쿠키 기반)
│   └── types/index.ts
```

## DB 스키마

### CityContact (시/군/구 담당자)
- `id`, `sido` (정식명칭), `sigungu` (시 단위 등록 가능)
- `personName`, `email`, `phone`, `department`
- `@@unique([sido, sigungu])`

### Department (부서 — L1/L2 계층)
- `id`, `name` (unique), `parentId` (자기참조 FK)
- L1: 최상위 (예: 경기지역본부), L2: 하위 (예: 분당지사)

### Submission (굴착 요청 이력)
- `projectName`, `companyName`, `submitterEmail`
- `fullAddress`, `sido`, `sigungu`, `latitude`, `longitude`
- `constructionStartDate`, `constructionEndDate`
- `emailSentTo`, `status` (`sent`/`failed`/`no_contact`/`replied`), `consentGiven`
- `submissionNumber` (unique, 예: `경기분당-2026-0001`)
- `conflictStatus` (`저촉`/`비저촉`/null)
- `responseMessage` (담당자 멘트)
- `respondedAt` (회신 시각)
- `cityContactId` (FK → CityContact)

## 접수번호 체계
- **형식**: `{부서코드}-{연도}-{순번4자리}` (예: `경기분당-2026-0001`)
- **부서코드**: 부서명에서 접미사 자동 제거 → L1코드 + L2코드
  - "경기지역본부" → "경기", "분당지사" → "분당" → "경기분당"
  - 제거 접미사: 지역본부, 본부, 지부, 센터, 지사, 관리처, 사업소, 지점
- **우선순위**: L1+L2 → L1만 → "미지정"
- **순번**: 동일 부서코드+연도 내 순차 증가, 연도별 리셋

## 환경변수 (.env.local)
```
POSTGRES_PRISMA_URL="..."
POSTGRES_URL_NON_POOLING="..."
GMAIL_USER="..."
GMAIL_APP_PASSWORD="..."
VWORLD_API_KEY="..."                     # 서버사이드 지오코딩
NEXT_PUBLIC_VWORLD_API_KEY="..."         # 클라이언트 V-World WMTS 타일 (Leaflet)
ADMIN_PASSWORD_HASH="\$2b\$10\$..."      # $ → \$ 이스케이프 필요
SESSION_SECRET="..."
RESPOND_API_KEY="..."                    # 회신 API 인증 키
```

> **주의**: `.env.local`에서 bcrypt 해시의 `$`는 `\$`로 이스케이프 (dotenv-expand 방지). Vercel 대시보드에서는 원본 그대로 입력.

## V-World API
- **지오코딩**: `/api/geocode?address=주소` → `{ lat, lng }` (Edge 런타임, 서울 리전 icn1)
- **지도 표시**: Leaflet + V-World WMTS 타일 (`NEXT_PUBLIC_VWORLD_API_KEY` 사용)
  - 타일 URL: `https://api.vworld.kr/req/wmts/1.0.0/{apiKey}/Base/{z}/{y}/{x}.png`
  - Leaflet은 `useEffect` 내부에서 동적 `import('leaflet')` (SSR 안전)
  - API Key 없으면 OpenStreetMap 타일로 폴백
- V-World SDK(`vworldMapInit.js.do`)는 **사용 금지** — `document.write()` 사용으로 Next.js/React 호환 불가
- V-World API는 **해외 IP 차단** → geocode 라우트는 반드시 Edge + `preferredRegion = "icn1"`
- Daum Postcode는 축약형 시/도 반환 ("경기") → `normalizeAddress()`로 정식명칭 변환 ("경기도")

## 이메일 발송

### 접수 알림 (→ 담당자)
- 제목: `[지하시설물 유관기관 협의서 요청] 공사명_시군구`
- 첨부: CSV (GeoJSON 포함) + 시공업체 첨부 파일

### 저촉여부 회신 (→ 접수자)
- 제목: `[지하시설물 저촉여부 회신] 접수번호_공사명`
- 첨부: 내부 시스템에서 생성한 PDF
- 헤더 색상: 저촉(빨간) / 비저촉(초록)

## 회신 API
- **엔드포인트**: `POST /api/submissions/{id}/respond`
- **인증**: `Authorization: Bearer {RESPOND_API_KEY}`
- **Body** (multipart/form-data):
  - `conflictStatus`: "저촉" | "비저촉"
  - `responseMessage`: 담당자 멘트
  - `pdfFile`: PDF 파일 (최대 10MB)
- **동작**: 이메일 자동 발송 → status를 `replied`로 변경
- **테스트**:
```bash
curl -X POST https://jihasafety.vercel.app/api/submissions/{ID}/respond \
  -H "Authorization: Bearer {RESPOND_API_KEY}" \
  -F "conflictStatus=비저촉" \
  -F "responseMessage=배관없음" \
  -F "pdfFile=@/path/to/result.pdf"
```

## 담당자 매칭 (city-matcher.ts)
1. **sido + sigungu 정확 매칭** (경기도 + 수원시 영통구)
2. **sigungu만 정확 매칭** (sido 무관)
3. **시 단위 prefix 매칭**: `수원시 영통구` → `수원시` 등록 담당자

## 보안
- 입력값 서버 사이드 검증, HTML 이스케이프 (XSS), Prisma ORM (SQL Injection 방지)
- bcryptjs + HttpOnly/Secure/SameSite=Lax 쿠키, HMAC-SHA256 세션 (  2시간)
- 관리자 경로: `/sibum_bundang` (비공개)
- 회신 API: Bearer 토큰 인증 (`RESPOND_API_KEY`)
- CSP: Daum/Kakao + V-World + unpkg.com(Leaflet 마커) 도메인 허용, `'unsafe-eval'`

## 관리자 페이지 (dashboard)
- **접수 이력 탭**: 접수번호, 접수일시, 담당부서, 담당자, 공사명, 공사위치, 상태, 저촉유무
  - 상태: 발송완료 / 발송실패 / 담당자없음 / **회신완료**
  - 저촉유무: 저촉(빨간) / 비저촉(초록) / - (미회신)
  - 상세 모달: 전체 정보 + 회신 멘트/일시
- **통계**: 총 접수, 발송완료, 발송실패, 담당자없음, 회신완료
- **담당자 관리 탭**: 지역별 담당자 CRUD

## 개발 명령어
```bash
npm run dev              # 개발 서버
npx prisma db push       # DB 스키마 적용
npx prisma db seed       # 시드 데이터
npx prisma studio        # DB GUI
vercel env pull          # Vercel 환경변수 가져오기
```

## 에이전트 체계
3개 터미널에서 각각 Claude Code 인스턴스 운영:
- **계획 에이전트**: 작업 분석, `plan.md` 지시서 작성
- **코딩 에이전트**: `plan.md` 읽고 구현 → 타입 체크 → 커밋/푸시
- **리뷰 에이전트**: 변경 코드 검토 → `review.md`에 피드백
- 통신: `.agents/` 디렉토리 공유 파일 (gitignore)
