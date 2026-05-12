import { paystackApi } from "../../utils/paystackApi";

export type Bank = {
  id: number;
  name: string;
  code: string;
  currency: string;
  country: string;
};

export type SubaccountData = {
  id: number;
  subaccount_code: string;
  business_name: string;
  description: string;
  settlement_bank: string;
  account_number: string;
  percentage_charge: number;
  active: boolean;
};

export type ResolvedAccount = {
  account_number: string;
  account_name: string;
  bank_id: number;
};

export class PaystackSubaccountService {
  async listBanks(currency = "NGN"): Promise<Bank[]> {
    const res = await paystackApi.get<Bank[]>(`/bank?currency=${currency}&perPage=100`);
    return res.data;
  }

  async resolveAccount(accountNumber: string, bankCode: string): Promise<ResolvedAccount> {
    const res = await paystackApi.get<ResolvedAccount>(
      `/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`
    );
    return res.data;
  }

  async createSubaccount(options: {
    businessName: string;
    settlementBank: string;
    accountNumber: string;
    percentageCharge: number;
    description?: string;
    primaryContactEmail?: string;
  }): Promise<SubaccountData> {
    const res = await paystackApi.post<SubaccountData>("/subaccount", {
      business_name: options.businessName,
      settlement_bank: options.settlementBank,
      account_number: options.accountNumber,
      percentage_charge: options.percentageCharge,
      description: options.description ?? `School fees collection for ${options.businessName}`,
      primary_contact_email: options.primaryContactEmail,
    });
    return res.data;
  }

  async updateSubaccount(
    subaccountCode: string,
    options: Partial<{
      businessName: string;
      settlementBank: string;
      accountNumber: string;
      percentageCharge: number;
      primaryContactEmail: string;
    }>
  ): Promise<SubaccountData> {
    const body: Record<string, unknown> = {};
    if (options.businessName) body.business_name = options.businessName;
    if (options.settlementBank) body.settlement_bank = options.settlementBank;
    if (options.accountNumber) body.account_number = options.accountNumber;
    if (options.percentageCharge !== undefined) body.percentage_charge = options.percentageCharge;
    if (options.primaryContactEmail) body.primary_contact_email = options.primaryContactEmail;

    const res = await paystackApi.put<SubaccountData>(`/subaccount/${subaccountCode}`, body);
    return res.data;
  }
}
