export type FormFieldMetadata = {
  autoComplete?: string;
  maxLength?: number;
  enterKeyHint?: "next" | "done";
};

const FIELD_METADATA: Record<string, FormFieldMetadata> = {
  customerName: { autoComplete: "name", maxLength: 120, enterKeyHint: "next" },
  customerPhone: { autoComplete: "tel", maxLength: 32, enterKeyHint: "next" },
  address: { autoComplete: "street-address", maxLength: 500, enterKeyHint: "next" },
  issue: { maxLength: 1500, enterKeyHint: "next" },
  quotedAmount: { maxLength: 16, enterKeyHint: "next" },
  adminNotes: { maxLength: 3000, enterKeyHint: "done" },
  workDoneNotes: { maxLength: 3000, enterKeyHint: "next" },
  extraCharges: { maxLength: 16, enterKeyHint: "next" },
  paymentAmount: { maxLength: 16, enterKeyHint: "next" },
  remarks: { maxLength: 3000, enterKeyHint: "done" },
};

export function fieldMetadataFor(name: string): FormFieldMetadata | undefined {
  return FIELD_METADATA[name];
}
