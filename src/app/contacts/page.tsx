import { prisma } from "@/lib/db";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ContactsClient from "./ContactsClient";

export const revalidate = 60;

export default async function ContactsPage() {
  const [contacts, departments] = await Promise.all([
    prisma.cityContact.findMany({ orderBy: [{ sido: "asc" }, { sigungu: "asc" }] }),
    prisma.department.findMany({ orderBy: { id: "asc" } }),
  ]);

  const serialized = contacts.map((c) => ({
    id: c.id,
    sido: c.sido,
    sigungu: c.sigungu,
    personName: c.personName,
    department: c.department,
    phone: c.phone,
  }));

  const serializedDepts = departments.map((d) => ({
    id: d.id,
    name: d.name,
    parentId: d.parentId,
  }));

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">담당자 현황</h1>
            <p className="text-sm text-gray-500">지역별 지하매설물 안전 담당자 등록 현황입니다.</p>
          </div>
          <ContactsClient contacts={serialized} departments={serializedDepts} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
