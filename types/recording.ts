export interface Recording {
  id: string;
  uri: string;
  duration: number;
  type: 'cough' | 'breath';
  createdAt: string;
  fileSize: number;
  analyzed?: boolean;
  analysisResult?: AnalysisResult;
}

export interface AnalysisResult {
  condition: string;
  confidence: number;
  respiratoryRate?: number;
  irregularities?: boolean;
  interpretation?: string;
  recommendations?: string;
}