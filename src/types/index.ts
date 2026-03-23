export interface AddressData {
  fullAddress: string;
  sido: string;
  sigungu: string;
  zonecode: string;
  latitude?: number;
  longitude?: number;
}

export interface SubmissionFormData {
  projectName: string;
  companyName: string;
  constructionStartDate: string;
  constructionEndDate: string;
  address: AddressData;
  files: File[];
  consentGiven: boolean;
}

export interface SubmissionResponse {
  success: boolean;
  message: string;
  submissionId?: number;
}

export interface FormErrors {
  projectName?: string;
  companyName?: string;
  submitterEmail?: string;
  constructionStartDate?: string;
  constructionEndDate?: string;
  address?: string;
  locationConfirmed?: string;
  files?: string;
  consentGiven?: string;
}
