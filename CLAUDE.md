# JihaSafety - 지하매설물 통합 안전 플랫폼

## 프로젝트 개요
시공업체가 도로굴착 시 해당 지역의 지하매설물 담당자에게 자동으로 알림 메일을 보내는 웹 플랫폼.

## 기술 스택
- **프레임워크**: Next.js (App Router) + TypeScript + Tailwind CSS
- **지도**: Kakao Map API + Kakao 주소검색(Postcode) API
- **이메일**: Nodemailer (Gmail SMTP)
- **DB**: Prisma + SQLite
- **인증**: 쿠키 기반 관리자 인증 (bcryptjs)
- **추가 의존성**: `nodemailer`, `bcryptjs`, `@types/nodemailer`, `@types/bcryptjs`, `ts-node`

## 프로젝트 구조

```
JihaSafety/
├── .env.local                          # 환경변수 (gitignore)
├── prisma/
│   ├── schema.prisma
│   └── seed.ts                         # 테스트용 담당자 5~10명
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # 루트 레이아웃 (한국어 폰트)
│   │   ├── page.tsx                    # 메인 랜딩 페이지
│   │   ├── globals.css
│   │   ├── request/
│   │   │   ├── page.tsx                # 굴착 요청 페이지 (주소검색 + 지도 + 폼)
│   │   │   └── complete/page.tsx       # 제출 완료 페이지
│   │   ├── admin/
│   │   │   ├── page.tsx                # 관리자 로그인
│   │   │   ├── layout.tsx              # 인증 가드
│   │   │   └── dashboard/page.tsx      # 담당자 CRUD + 요청 이력 (탭 2개)
│   │   └── api/
│   │       ├── request/route.ts        # 굴착 요청 처리 + 이메일 발송 (multipart/form-data)
│   │       ├── contacts/route.ts       # 담당자 목록/추가
│   │       ├── contacts/[id]/route.ts  # 담당자 수정/삭제
│   │       ├── submissions/route.ts    # 요청 이력 조회
│   │       └── auth/route.ts           # 관리자 로그인/로그아웃
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── HeroSection.tsx
│   │   ├── KakaoAddressSearch.tsx      # daum.Postcode 팝업 → sido/sigungu/address/zonecode 추출
│   │   ├── KakaoMap.tsx               # kakao.maps.Map + Marker + Geocoder (주소→좌표)
│   │   ├── RequestForm.tsx            # 업체 정보 입력 폼 + 파일 첨부 UI
│   │   ├── ContactTable.tsx           # 관리자 담당자 테이블 (인라인 편집)
│   │   └── SubmissionTable.tsx        # 관리자 요청 이력 테이블 (상태별 필터)
│   ├── lib/
│   │   ├── db.ts                      # Prisma 클라이언트 싱글톤
│   │   ├── mailer.ts                  # Nodemailer 설정 + 첨부파일 처리
│   │   ├── email-template.ts          # 이메일 HTML 템플릿
│   │   ├── csv-generator.ts           # 주소 정보 CSV 생성 (이메일 첨부용)
│   │   ├── city-matcher.ts            # 시/도 이름 정규화 + 담당자 매칭
│   │   └── auth.ts                    # 관리자 인증 (쿠키 기반)
│   └── types/index.ts
```

## DB 스키마

### CityContact (시/군/구 담당자)
- `id`: Int (PK)
- `sido`: String - 시/도 (서울특별시, 경기도 등 **정식명칭**)
- `sigungu`: String - 시/군/구
- `personName`: String - 담당자 이름
- `email`: String - 담당자 이메일
- `phone`: String - 전화번호
- `department`: String? - 담당 부서
- `@@unique([sido, sigungu])` - 시/군/구당 1명

### Submission (굴착 요청 이력)
- `id`: Int (PK)
- `companyName`, `contactPerson`, `contactPhone`, `contactEmail`: String
- `fullAddress`, `sido`, `sigungu`: String
- `latitude`, `longitude`: Float?
- `emailSentTo`: String? - 발송 대상 이메일
- `status`: String - `sent` / `failed` / `no_contact`
- `cityContactId`: Int? (FK → CityContact)

## 환경변수 (.env.local)
```
DATABASE_URL="file:./dev.db"
GMAIL_USER="your-email@gmail.com"
GMAIL_APP_PASSWORD="your-app-password"
NEXT_PUBLIC_KAKAO_APP_KEY="your-kakao-js-key"
ADMIN_PASSWORD_HASH="bcrypt-hashed-password"
SESSION_SECRET="random-secret-string"
```

## 파일 첨부 기능 (시공업체 → 담당자)
- 허용 형식: 이미지(jpg, png), PDF, 문서(hwp, doc, docx, xlsx)
- 최대 파일 크기: 파일당 10MB, 총 50MB
- API에서 `multipart/form-data`로 수신 → 메모리 버퍼로 처리 (파일 시스템 저장 없음)
- 이메일 attachments 구성:
  1. 주소 정보 CSV (`굴착요청_주소정보_YYYYMMDD.csv`) — 자동 생성
  2. 시공업체 첨부 파일들 — 원본 그대로 전달

### csv-generator.ts 상세
- CSV 컬럼: `제출일시`, `전체주소`, `시/도`, `시/군/구`, `위도`, `경도`
- UTF-8 BOM(`\uFEFF`) 추가로 한글 엑셀 깨짐 방지
- 필드 내 쉼표/줄바꿈/큰따옴표는 큰따옴표로 감싸서 이스케이프
- 외부 라이브러리 없이 순수 TypeScript로 구현

## 시/도 이름 정규화 (city-matcher.ts)
카카오 API는 축약형 반환 → DB 정식명칭으로 변환. 매칭 순서: (1) sido + sigungu 정확 매칭 → (2) sigungu만으로 매칭

```
서울 → 서울특별시    부산 → 부산광역시    대구 → 대구광역시    인천 → 인천광역시
광주 → 광주광역시    대전 → 대전광역시    울산 → 울산광역시    세종 → 세종특별자치시
경기 → 경기도        강원 → 강원특별자치도  충북 → 충청북도    충남 → 충청남도
전북 → 전북특별자치도  전남 → 전라남도    경북 → 경상북도    경남 → 경상남도
제주 → 제주특별자치도
```

## 보안 요구사항
- **입력값 검증**: 모든 API에서 서버 사이드 검증 (길이, 형식)
- **XSS 방지**: 이메일 템플릿 포함 HTML 이스케이프
- **SQL Injection 방지**: Prisma ORM만 사용, raw query 금지
- **인증**: bcryptjs 해싱, HttpOnly+Secure+SameSite=Strict 쿠키
- **세션**: `crypto.randomUUID()` 토큰, 2시간 만료
- **에러 처리**: 내부 스택 트레이스 노출 금지
- **보안 헤더** (next.config.js): `X-Content-Type-Options`, `X-Frame-Options: DENY`, `X-XSS-Protection`, `Referrer-Policy`, `Content-Security-Policy` (카카오 도메인 허용)

## 사용자 플로우
1. 메인 페이지 → "굴착 요청하기" 클릭
2. 주소 검색 (카카오 Postcode API) → 지도에서 위치 확인
3. 업체 정보 입력 + 파일 첨부 (선택)
4. 제출 → 해당 시/군/구 담당자에게 이메일 자동 발송 (CSV + 첨부파일 포함)
5. 완료 페이지 표시

## 개발 명령어
```bash
npm run dev          # 개발 서버
npx prisma db push   # DB 스키마 적용
npx prisma db seed   # 시드 데이터 삽입 (package.json에 prisma.seed 설정 필요)
npx prisma studio    # DB GUI
```
