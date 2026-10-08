import { prisma } from "@/lib/db";
import { AccountType, EntryState } from "@prisma/client";

export interface TrialBalanceRow {
  code: string;
  name: string;
  type: AccountType;
  debit: number;
  credit: number;
  netDebit: number;
  netCredit: number;
}

export interface TrialBalanceReport {
  rows: TrialBalanceRow[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  delta: number;
  asOfDate: string;
}

export interface PnLSectionItem {
  code: string;
  name: string;
  amount: number;
}

export interface ProfitAndLossReport {
  operatingRevenue: PnLSectionItem[];
  totalRevenue: number;
  costOfGoodsSold: PnLSectionItem[];
  totalCogs: number;
  grossProfit: number;
  operatingExpenses: PnLSectionItem[];
  totalExpenses: number;
  netOperatingIncome: number;
  netMarginPercentage: number;
  period: { startDate?: string; endDate?: string };
}

export interface BalanceSheetSectionItem {
  code: string;
  name: string;
  amount: number;
}

export interface BalanceSheetReport {
  currentAssets: BalanceSheetSectionItem[];
  nonCurrentAssets: BalanceSheetSectionItem[];
  totalAssets: number;
  currentLiabilities: BalanceSheetSectionItem[];
  nonCurrentLiabilities: BalanceSheetSectionItem[];
  totalLiabilities: number;
  equityAccounts: BalanceSheetSectionItem[];
  currentPeriodNetEarnings: number;
  totalEquity: number;
  totalLiabilitiesAndEquity: number;
  isBalanced: boolean;
  variance: number;
  asOfDate: string;
}

export class FinancialReportsEngine {
  /**
   * 1. Real-Time Trial Balance (ميزان المراجعة)
   * Mathematical verification: Sum(Debits) == Sum(Credits) across all posted entries
   */
  static async getTrialBalance(params: {
    tenantId: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<TrialBalanceReport> {
    const { tenantId, startDate, endDate } = params;

    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (startDate) dateFilter.gte = startDate;
    if (endDate) dateFilter.lte = endDate;

    // Fetch accounts with posted items
    const accounts = await prisma.account.findMany({
      where: { tenantId, isActive: true },
      include: {
        journalItems: {
          where: {
            entry: {
              state: EntryState.POSTED,
              ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
            },
          },
        },
      },
      orderBy: { code: "asc" },
    });

    let totalDebit = 0;
    let totalCredit = 0;

    const rows: TrialBalanceRow[] = accounts.map((acc) => {
      let accDebit = 0;
      let accCredit = 0;

      for (const item of acc.journalItems) {
        accDebit += Number(item.debit);
        accCredit += Number(item.credit);
      }

      totalDebit += accDebit;
      totalCredit += accCredit;

      const net = accDebit - accCredit;
      const isDebitNormal =
        acc.type === AccountType.ASSET_CURRENT ||
        acc.type === AccountType.ASSET_NON_CURRENT ||
        acc.type === AccountType.EXPENSE ||
        acc.type === AccountType.COST_OF_REVENUE;

      return {
        code: acc.code,
        name: acc.name,
        type: acc.type,
        debit: accDebit,
        credit: accCredit,
        netDebit: isDebitNormal ? (net > 0 ? net : 0) : 0,
        netCredit: !isDebitNormal ? (net < 0 ? Math.abs(net) : 0) : 0,
      };
    });

    const delta = Math.abs(totalDebit - totalCredit);
    const isBalanced = delta < 0.001;

    return {
      rows,
      totalDebit: Math.round(totalDebit * 100) / 100,
      totalCredit: Math.round(totalCredit * 100) / 100,
      isBalanced,
      delta: Math.round(delta * 10000) / 10000,
      asOfDate: new Date().toISOString(),
    };
  }

  /**
   * 2. Profit & Loss / Income Statement (قائمة الدخل)
   * Formula: Net Income = Revenue - COGS - Operational Expenses
   */
  static async getProfitAndLoss(params: {
    tenantId: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<ProfitAndLossReport> {
    const { tenantId, startDate, endDate } = params;

    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (startDate) dateFilter.gte = startDate;
    if (endDate) dateFilter.lte = endDate;

    const accounts = await prisma.account.findMany({
      where: {
        tenantId,
        type: {
          in: [AccountType.INCOME, AccountType.COST_OF_REVENUE, AccountType.EXPENSE],
        },
      },
      include: {
        journalItems: {
          where: {
            entry: {
              state: EntryState.POSTED,
              ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
            },
          },
        },
      },
      orderBy: { code: "asc" },
    });

    const operatingRevenue: PnLSectionItem[] = [];
    const costOfGoodsSold: PnLSectionItem[] = [];
    const operatingExpenses: PnLSectionItem[] = [];

    let totalRevenue = 0;
    let totalCogs = 0;
    let totalExpenses = 0;

    for (const acc of accounts) {
      const net = acc.journalItems.reduce(
        (sum, item) => sum + (Number(item.credit) - Number(item.debit)),
        0
      );

      if (acc.type === AccountType.INCOME) {
        const amount = Math.max(0, net);
        operatingRevenue.push({ code: acc.code, name: acc.name, amount });
        totalRevenue += amount;
      } else if (acc.type === AccountType.COST_OF_REVENUE) {
        // Cost normal balance is Debit
        const costAmount = acc.journalItems.reduce(
          (sum, item) => sum + (Number(item.debit) - Number(item.credit)),
          0
        );
        costOfGoodsSold.push({ code: acc.code, name: acc.name, amount: costAmount });
        totalCogs += costAmount;
      } else if (acc.type === AccountType.EXPENSE) {
        const expAmount = acc.journalItems.reduce(
          (sum, item) => sum + (Number(item.debit) - Number(item.credit)),
          0
        );
        operatingExpenses.push({ code: acc.code, name: acc.name, amount: expAmount });
        totalExpenses += expAmount;
      }
    }

    const grossProfit = totalRevenue - totalCogs;
    const netOperatingIncome = grossProfit - totalExpenses;
    const netMarginPercentage = totalRevenue > 0 ? (netOperatingIncome / totalRevenue) * 100 : 0;

    return {
      operatingRevenue,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      costOfGoodsSold,
      totalCogs: Math.round(totalCogs * 100) / 100,
      grossProfit: Math.round(grossProfit * 100) / 100,
      operatingExpenses,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      netOperatingIncome: Math.round(netOperatingIncome * 100) / 100,
      netMarginPercentage: Math.round(netMarginPercentage * 100) / 100,
      period: {
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
      },
    };
  }

  /**
   * 3. Balance Sheet (الميزانية العمومية)
   * Formula: Assets = Liabilities + Equity
   */
  static async getBalanceSheet(params: {
    tenantId: string;
    asOfDate?: Date;
  }): Promise<BalanceSheetReport> {
    const { tenantId, asOfDate } = params;

    const dateFilter: { lte?: Date } = {};
    if (asOfDate) dateFilter.lte = asOfDate;

    // Fetch balance sheet accounts
    const accounts = await prisma.account.findMany({
      where: {
        tenantId,
        type: {
          in: [
            AccountType.ASSET_CURRENT,
            AccountType.ASSET_NON_CURRENT,
            AccountType.LIABILITY_CURRENT,
            AccountType.LIABILITY_NON_CURRENT,
            AccountType.EQUITY,
          ],
        },
      },
      include: {
        journalItems: {
          where: {
            entry: {
              state: EntryState.POSTED,
              ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
            },
          },
        },
      },
      orderBy: { code: "asc" },
    });

    const currentAssets: BalanceSheetSectionItem[] = [];
    const nonCurrentAssets: BalanceSheetSectionItem[] = [];
    const currentLiabilities: BalanceSheetSectionItem[] = [];
    const nonCurrentLiabilities: BalanceSheetSectionItem[] = [];
    const equityAccounts: BalanceSheetSectionItem[] = [];

    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquityAccounts = 0;

    for (const acc of accounts) {
      const debitSum = acc.journalItems.reduce((s, i) => s + Number(i.debit), 0);
      const creditSum = acc.journalItems.reduce((s, i) => s + Number(i.credit), 0);

      if (acc.type === AccountType.ASSET_CURRENT) {
        const amt = debitSum - creditSum;
        currentAssets.push({ code: acc.code, name: acc.name, amount: amt });
        totalAssets += amt;
      } else if (acc.type === AccountType.ASSET_NON_CURRENT) {
        const amt = debitSum - creditSum;
        nonCurrentAssets.push({ code: acc.code, name: acc.name, amount: amt });
        totalAssets += amt;
      } else if (acc.type === AccountType.LIABILITY_CURRENT) {
        const amt = creditSum - debitSum;
        currentLiabilities.push({ code: acc.code, name: acc.name, amount: amt });
        totalLiabilities += amt;
      } else if (acc.type === AccountType.LIABILITY_NON_CURRENT) {
        const amt = creditSum - debitSum;
        nonCurrentLiabilities.push({ code: acc.code, name: acc.name, amount: amt });
        totalLiabilities += amt;
      } else if (acc.type === AccountType.EQUITY) {
        const amt = creditSum - debitSum;
        equityAccounts.push({ code: acc.code, name: acc.name, amount: amt });
        totalEquityAccounts += amt;
      }
    }

    // Compute Net Income to date for retained earnings
    const pnl = await this.getProfitAndLoss({ tenantId, endDate: asOfDate });
    const currentPeriodNetEarnings = pnl.netOperatingIncome;

    const totalEquity = totalEquityAccounts + currentPeriodNetEarnings;
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
    const variance = Math.abs(totalAssets - totalLiabilitiesAndEquity);
    const isBalanced = variance < 0.01;

    return {
      currentAssets,
      nonCurrentAssets,
      totalAssets: Math.round(totalAssets * 100) / 100,
      currentLiabilities,
      nonCurrentLiabilities,
      totalLiabilities: Math.round(totalLiabilities * 100) / 100,
      equityAccounts,
      currentPeriodNetEarnings: Math.round(currentPeriodNetEarnings * 100) / 100,
      totalEquity: Math.round(totalEquity * 100) / 100,
      totalLiabilitiesAndEquity: Math.round(totalLiabilitiesAndEquity * 100) / 100,
      isBalanced,
      variance: Math.round(variance * 10000) / 10000,
      asOfDate: (asOfDate || new Date()).toISOString(),
    };
  }

  /**
   * 4. CSV Exporters for Executive Auditing
   */
  static exportTrialBalanceCSV(report: TrialBalanceReport): string {
    const header = "Account Code,Account Name,Type,Debit ($),Credit ($),Net Debit ($),Net Credit ($)\n";
    const rows = report.rows
      .map(
        (r) =>
          `"${r.code}","${r.name}","${r.type}",${r.debit.toFixed(2)},${r.credit.toFixed(2)},${r.netDebit.toFixed(2)},${r.netCredit.toFixed(2)}`
      )
      .join("\n");
    const summary = `\n"TOTAL","Grand Balance",,${report.totalDebit.toFixed(2)},${report.totalCredit.toFixed(2)},Delta: $${report.delta.toFixed(2)},Balanced: ${report.isBalanced}\n`;
    return header + rows + summary;
  }

  static exportPnLCSV(report: ProfitAndLossReport): string {
    let csv = `Profit & Loss Statement\n`;
    csv += `Period: ${report.period.startDate || "Beginning"} to ${report.period.endDate || "Present"}\n\n`;

    csv += `Operating Revenue\nAccount Code,Account Name,Amount ($)\n`;
    csv += report.operatingRevenue.map(r => `"${r.code}","${r.name}",${r.amount.toFixed(2)}`).join("\n");
    csv += `\n"","Total Operating Revenue",${report.totalRevenue.toFixed(2)}\n\n`;

    csv += `Cost of Goods Sold (COGS)\nAccount Code,Account Name,Amount ($)\n`;
    csv += report.costOfGoodsSold.map(r => `"${r.code}","${r.name}",${r.amount.toFixed(2)}`).join("\n");
    csv += `\n"","Total COGS",${report.totalCogs.toFixed(2)}\n\n`;

    csv += `"","GROSS PROFIT",${report.grossProfit.toFixed(2)}\n\n`;

    csv += `Operating Expenses\nAccount Code,Account Name,Amount ($)\n`;
    csv += report.operatingExpenses.map(r => `"${r.code}","${r.name}",${r.amount.toFixed(2)}`).join("\n");
    csv += `\n"","Total Operating Expenses",${report.totalExpenses.toFixed(2)}\n\n`;

    csv += `"","NET OPERATING INCOME",${report.netOperatingIncome.toFixed(2)}\n`;
    csv += `"","Net Margin (%)",${report.netMarginPercentage.toFixed(2)}%\n`;

    return csv;
  }

  static exportBalanceSheetCSV(report: BalanceSheetReport): string {
    let csv = `Balance Sheet Statement\n`;
    csv += `As of Date: ${report.asOfDate}\n\n`;

    csv += `Current Assets\nAccount Code,Account Name,Amount ($)\n`;
    csv += report.currentAssets.map(r => `"${r.code}","${r.name}",${r.amount.toFixed(2)}`).join("\n");

    csv += `\nNon-Current Assets\nAccount Code,Account Name,Amount ($)\n`;
    csv += report.nonCurrentAssets.map(r => `"${r.code}","${r.name}",${r.amount.toFixed(2)}`).join("\n");
    csv += `\n"","TOTAL ASSETS",${report.totalAssets.toFixed(2)}\n\n`;

    csv += `Current Liabilities\nAccount Code,Account Name,Amount ($)\n`;
    csv += report.currentLiabilities.map(r => `"${r.code}","${r.name}",${r.amount.toFixed(2)}`).join("\n");

    csv += `\nNon-Current Liabilities\nAccount Code,Account Name,Amount ($)\n`;
    csv += report.nonCurrentLiabilities.map(r => `"${r.code}","${r.name}",${r.amount.toFixed(2)}`).join("\n");
    csv += `\n"","TOTAL LIABILITIES",${report.totalLiabilities.toFixed(2)}\n\n`;

    csv += `Equity\nAccount Code,Account Name,Amount ($)\n`;
    csv += report.equityAccounts.map(r => `"${r.code}","${r.name}",${r.amount.toFixed(2)}`).join("\n");
    csv += `\n"","Retained / Current Period Earnings",${report.currentPeriodNetEarnings.toFixed(2)}\n`;
    csv += `"","TOTAL EQUITY",${report.totalEquity.toFixed(2)}\n\n`;

    csv += `"","TOTAL LIABILITIES & EQUITY",${report.totalLiabilitiesAndEquity.toFixed(2)}\n`;
    csv += `"","Balanced",${report.isBalanced}\n`;
    csv += `"","Variance",${report.variance.toFixed(2)}\n`;

    return csv;
  }
}

