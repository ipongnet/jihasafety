/**
 * 신청자에게 결과 이메일 발송.
 * respond/route.ts 와 inbox-worker/route.ts 양쪽에서 공유.
 */
import { buildResponseEmailSubject, buildResponseEmailHTML } from "@/lib/email-template";
import { sendMail } from "@/lib/mailer";

export interface ResponseEmailParams {
  to: string;
  submissionNumber: string;
  projectName: string;
  companyName: string;
  fullAddress: string;
  constructionStartDate: string;
  constructionEndDate: string;
  conflictStatus: string;
  responseMessage: string;
  pdfBuffer: Buffer;
  pdfFilename: string;
}

export async function sendResponseEmail(params: ResponseEmailParams): Promise<void> {
  const emailData = {
    submissionNumber: params.submissionNumber,
    projectName: params.projectName,
    companyName: params.companyName,
    fullAddress: params.fullAddress,
    constructionStartDate: params.constructionStartDate,
    constructionEndDate: params.constructionEndDate,
    conflictStatus: params.conflictStatus,
    responseMessage: params.responseMessage,
  };

  await sendMail({
    to: params.to,
    subject: buildResponseEmailSubject(emailData),
    html: buildResponseEmailHTML(emailData),
    attachments: [
      {
        filename: params.pdfFilename,
        content: params.pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });
}
