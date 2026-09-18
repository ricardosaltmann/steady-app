export interface ClinicalRule {
  id: string;
  version: string;
  name: string;
  description: string;
  source: string;              // ex: "Endocrine Society Clinical Guidelines", "Brazilian Society of Endocrinology"
  referenceUrl?: string;
  applicablePopulation: 'male' | 'female' | 'all';
  category: 'hormones' | 'metabolic' | 'lipids' | 'safety';
  enabled: boolean;
  logic: {
    evaluate: (data: any) => {
      passed: boolean;
      status: 'optimal' | 'warning' | 'critical' | 'neutral';
      message: string;
      value?: number | string;
    };
  };
}
