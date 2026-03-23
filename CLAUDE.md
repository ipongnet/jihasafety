# JihaSafety - 지하매설물 통합 안전 플랫폼

## 프로젝트 개요
시공업체가 도로굴착 시 해당 지역의 지하매설물 담당자에게 자동으로 알림 메일을 보내는 웹 플랫폼.

## 기술 스택
- **프레임워크**: Next.js 15 (App Router) + TypeScript + Tailwind CSS
- **주소 검색**: Daum Postcode API (팝업)
- **지오코딩**: V-World API (서버사이드, Edge 런타임 서울 리전)
- **지도 표시**: V-World 2D JS SDK (클라이언트)
- **이메일**: Nodemailer (Gmail SMTP)
- **DB**: Prisma 6 + PostgreSQL (Neon)
- **인증**: 쿠키 기반 관리자 인증 (bcryptjs)
- **배포**: Vercel (GitHub 연동 자동 배포)

## 워크플로우
- 코드 수정 후 **자동으로 git commit + push** (Stop 훅 설정됨)
- Vercel이 GitHub push 감지 → 자동 빌드/배포

## 프로젝트 구조

```
JihaSafety/
├── .env.local                            # 환경변수 (gitignore)
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
│   │   │   └── complete/page.tsx         # 제출 완료 (부서 L1>L2, 연락처 표시)
│   │   ├── sibum_bundang/                # 관리자 영역 (비공개 경로)
│   │   │   ├── page.tsx                  # 관리자 로그인
│   │   │   ├── layout.tsx                # 인증 가드
│   │   │   └── dashboard/page.tsx        # 담당자 CRUD + 요청 이력 (탭 2개)
│   │   └── api/
│   │       ├── geocode/route.ts          # V-World 지오코딩 프록시 (Edge, icn1)
│   │       ├── request/route.ts          # 굴착 요청 + 이메일 발송 (multipart/form-data)
│   │       ├── contacts/route.ts         # 담당자 목록/추가
│   │       ├── contacts/[id]/route.ts    # 담당자 수정/삭제
│   │       ├── departments/route.ts      # 부서 목록/추가
│   │       ├── departments/[id]/route.ts # 부서 삭제
│   │       ├── submissions/route.ts      # 요청 이력 조회
│   │       └── auth/route.ts             # 관리자 로그인/로그아웃
│   ├── components/
│   │   ├── Header.tsx                    # 접수하기 + 담당자 현황 링크
│   │   ├── Footer.tsx
│   │   ├── KakaoAddressSearch.tsx        # Daum Postcode 팝업
│   │   ├── SubmissionForm.tsx            # 굴착 요청 폼 (V-World 지도 포함)
│   │   ├── ContactTable.tsx              # 관리자 담당자 테이블 (L1/L2 부서)
│   │   ├── SubmissionTable.tsx           # 관리자 요청 이력 테이블
│   │   └── LogoutButton.tsx
│   ├── lib/
│   │   ├── db.ts                         # Prisma 클라이언트 싱글톤
│   │   ├── mailer.ts                     # Nodemailer + 첨부파일 처리
│   │   ├── email-template.ts             # 이메일 HTML 템플릿
│   │   ├── csv-generator.ts              # CSV 생성 (GeoJSON 포함)
│   │   ├── city-matcher.ts               # 시/도 정규화 + 담당자 매칭 (3단계)
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
- `emailSentTo`, `status` (`sent`/`failed`/`no_contact`), `consentGiven`
- `cityContactId` (FK → CityContact)

## 환경변수 (.env.local)
```
POSTGRES_PRISMA_URL="..."
POSTGRES_URL_NON_POOLING="..."
GMAIL_USER="..."
GMAIL_APP_PASSWORD="..."
VWORLD_API_KEY="..."                     # 서버사이드 지오코딩
NEXT_PUBLIC_VWORLD_API_KEY="..."         # 클라이언트 V-World 2D 지도
ADMIN_PASSWORD_HASH="\$2b\$10\$..."      # $ → \$ 이스케이프 필요
SESSION_SECRET="..."
```

> **주의**: `.env.local`에서 bcrypt 해시의 `$`는 `\$`로 이스케이프 (dotenv-expand 방지). Vercel 대시보드에서는 원본 그대로 입력.

## V-World API
- **지오코딩**: `/api/geocode?address=주소` → `{ lat, lng }` (Edge 런타임, 서울 리전 icn1)
- **지도 표시**: V-World 2D JS SDK (`NEXT_PUBLIC_VWORLD_API_KEY` 사용)
- V-World API는 **해외 IP 차단** → geocode 라우트는 반드시 Edge + `preferredRegion = "icn1"`
- Daum Postcode는 축약형 시/도 반환 ("경기") → `normalizeAddress()`로 정식명칭 변환 ("경기도")

## 이메일 발송
- 제목: `[지하시설물 유관기관 협의서 요청] 공사명_시군구`
- 첨부: CSV (GeoJSON 포함) + 시공업체 첨부 파일
- CSV 컬럼: 제출일시, 업체명, 신청자 이메일, 전체주소, 시/도, 시/군/구, 위도, 경도, GeoJSON, 회신주소

## 담당자 매칭 (city-matcher.ts)
1. **sido + sigungu 정확 매칭** (경기도 + 수원시 영통구)
2. **sigungu만 정확 매칭** (sido 무관)
3. **시 단위 prefix 매칭**: `수원시 영통구` → `수원시` 등록 담당자

## 보안
- 입력값 서버 사이드 검증, HTML 이스케이프 (XSS), Prisma ORM (SQL Injection 방지)
- bcryptjs + HttpOnly/Secure/SameSite=Lax 쿠키, HMAC-SHA256 세션 (2시간)
- 관리자 경로: `/sibum_bundang` (비공개)
- CSP: Daum/Kakao + V-World 도메인 허용, `'unsafe-eval'` (V-World SDK 요구)

## 개발 명령어
```bash
npm run dev              # 개발 서버
npx prisma db push       # DB 스키마 적용
npx prisma db seed       # 시드 데이터
npx prisma studio        # DB GUI
vercel env pull          # Vercel 환경변수 가져오기
```
