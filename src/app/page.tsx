import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SubmissionForm from "@/components/SubmissionForm";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              지하안전 민관공 통합 AI플랫폼
            </h1>
            <p className="text-gray-500 leading-relaxed">
              공사 정보를 입력하면 해당 지역 담당자에게 자동으로 알림이 발송됩니다.
              <br />
              영업일 기준 1~3일 이내에 입력하신 메일로 회신됩니다.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
            <SubmissionForm />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
