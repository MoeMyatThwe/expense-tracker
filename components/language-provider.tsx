"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

const LANGUAGE_KEY = "expense-tracker-language";

export const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "my", label: "မြန်မာ" },
] as const;

export type LanguageChoice = (typeof LANGUAGE_OPTIONS)[number]["value"];

const translations = {
  en: {
    home: "Home",
    category: "Category",
    analytics: "Analytics",
    settings: "Settings",
    ledger: "Ledger",
    ledgerSubtitle: "Track expenses, income, reimbursements, and money owed",
    refreshGmail: "Refresh Gmail",
    refreshing: "Refreshing...",
    addRecord: "Add Record",
    all: "All",
    expenses: "Expenses",
    income: "Income",
    liabilities: "Liabilities",
    reimburse: "Reimburse",
    recurring: "Recurring",
    records: "records",
    expenseLedger: "expense ledger",
    incomeLedger: "income ledger",
    liabilityLedger: "liability ledger",
    reimbursementLedger: "reimbursement ledger",
    recurringLedger: "recurring ledger",
    noRecordsFor: "No {type} for {date} yet",
    startLedger: "Start your {type} by adding your first record.",
    addFirstRecord: "Add Your First Record",
    loadingLedger: "Loading your ledger...",
    loadingRecords: "Loading records...",
    analyticsSubtitle: "Review monthly totals and category spending.",
    totalIn: "Total in {date}",
    expenseRecords: "Expense Records",
    categories: "Categories",
    fromLastMonth: "from last month",
    categorySpendingFor: "Category Spending for {date}",
    monthlySpendingIn: "Monthly Spending in {year}",
    noCategorySpendingTitle: "No category spending",
    noCategorySpendingDesc: "No category spending for this month.",
    loadingAnalytics: "Loading analytics...",
    goodSummary: "Great job!! You spent fewer in {date} than last month.",
    noSpendingSummary: "No spending recorded for {date} yet.",
    noPreviousSummary:
      "Oh... you spent ${amount} in {date}, with no spending last month.",
    badSummaryRatio:
      "Oh... you spent {ratio}x amount in {date} than last month.",
    badSummaryMore: "Oh... you spent ${amount} more in {date} than last month.",
    categoriesTitle: "Categories",
    categoriesSubtitle: "Create your own category names and choose icons.",
    categoryName: "Category name",
    icon: "Icon",
    add: "Add",
    update: "Update",
    edit: "Edit",
    delete: "Delete",
    cancel: "Cancel",
    saving: "Saving...",
    noCategoriesYet: "No categories yet",
    noCategoriesDesc:
      "Create your first category by choosing an icon and name.",
    loadingCategories: "Loading categories...",
    settingsSubtitle: "Personalize the app and manage your account.",
    appearance: "Appearance",
    theme: "Theme",
    themeDesc: "Choose Light or Dark. Light is the default.",
    textSize: "Text Size",
    textSizeDesc: "Adjust the app font size.",
    small: "Small",
    normal: "Normal",
    large: "Large",
    language: "Language",
    languageDesc: "Choose the app display language.",
    account: "Account",
    email: "Email",
    changePassword: "Change Password",
    changePasswordDesc: "Set a new password for this account.",
    newPassword: "New password",
    confirmPassword: "Confirm new password",
    updatePassword: "Update Password",
    updating: "Updating...",
    logout: "Logout",
    membership: "Membership",
    membershipDesc:
      "Subscribe to unlock premium receipt scanning and tracking features.",
    membershipActive: "Your membership is {status}.",
    subscribe: "Subscribe",
    renewalPreference: "Renewal preference",
    autoRenew: "Auto renew",
    manualRenew: "Manual renew",
    autoRenewDesc: "Renews every month until you cancel.",
    manualRenewDesc: "Pay for one month only; renew again later.",
    continuePayment: "Continue",
    renewManually: "Renew",
    cancelAutoRenew: "Cancel auto renewal",
    cancelAutoRenewConfirm:
      "Cancel auto renewal? You can keep using your membership until the current paid period ends.",
    autoRenewCancelled: "Auto renewal cancelled",
    autoRenewCancelScheduled:
      "Auto renewal is cancelled. You can keep using membership until the paid period ends.",
    membershipExpiresOn: "Expires on {date}",
    membershipRenewsOn: "Renews on {date}",
    membershipEndsOn: "Ends on {date}",
    paymentSuccessTitle: "Payment completed",
    paymentSuccessDesc:
      "You are back in the app. Your membership status and payment history are updated below.",
    paymentCancelledTitle: "Payment cancelled",
    paymentCancelledDesc:
      "No payment was made. You can choose a renewal option and try again anytime.",
    paymentHistory: "Payment history",
    paymentHistoryHidden:
      "Details are hidden here. Open the history to review payments.",
    paymentHistoryDesc: "Review your recent membership payments and invoices.",
    noPaymentHistory: "No payment history yet.",
    view: "View",
    manageBilling: "Manage Billing",
    membershipActivated: "Membership activated",
    paymentCancelled: "Payment cancelled",
    month: "month",
    gmailConnection: "PayNow Gmail Connection",
    gmailConnectionDesc: "Connect Gmail to import PayNow emails automatically.",
    connectGmail: "Connect PayNow Gmail",
    disconnectGmail: "Disconnect PayNow Gmail",
    gmailConnected: "Connected to {email}",
    gmailNotConnected: "Gmail is not connected.",
    connecting: "Connecting...",
    loadingSettings: "Loading settings...",
    addRecordDesc: "Fill in the details to add a ledger record.",
    updateRecordDesc: "Update the ledger record.",
    editExpense: "Edit Expense",
    recordType: "Record Type",
    expense: "Expense",
    liability: "Liability",
    reimbursement: "Reimbursement",
    title: "Title",
    amount: "Amount",
    selected: "Selected",
    selectCategory: "Select a category",
    personOrg: "Person or organization",
    whoInvolved: "Who is involved?",
    status: "Status",
    open: "Open",
    settled: "Settled",
    date: "Date",
    descriptionOptional: "Description (Optional)",
    notesRecord: "Add notes about this record",
    saveChanges: "Save Changes",
    scanReceipt: "Scan Receipt",
    scanning: "Scanning...",
    scanReceiptDesc:
      "Upload a shopping receipt, review the detected items, then import the ones you want.",
    uploadReceipt: "Upload or take a receipt photo",
    uploadReceiptHint:
      "Use a clear photo with the total and item names visible.",
    uploadedReceiptPreview: "Uploaded receipt preview",
    receiptScanned: "Receipt scanned",
    receiptImported: "Receipt items imported",
    receiptTotal: "Receipt total",
    selectedTotal: "Selected total",
    importSelected: "Import selected",
    importing: "Importing...",
    rescan: "Rescan",
    selectAtLeastOneItem: "Select at least one item",
    loading: "Loading...",
    manual: "Manual",
    voice: "Voice",
    categoryNotDefined: "Category not defined",
  },
  my: {
    home: "ပင်မ",
    category: "အမျိုးအစား",
    analytics: "ခွဲခြမ်းစိတ်ဖြာမှု",
    settings: "ဆက်တင်",
    ledger: "မှတ်တမ်း",
    ledgerSubtitle:
      "အသုံးစရိတ်၊ ဝင်ငွေ၊ ပြန်အမ်းငွေ နှင့် အကြွေးများကို မှတ်သားပါ",
    refreshGmail: "Gmail ပြန်စစ်ရန်",
    refreshing: "ပြန်စစ်နေသည်...",
    addRecord: "မှတ်တမ်းထည့်ရန်",
    all: "အားလုံး",
    expenses: "အသုံးစရိတ်",
    income: "ဝင်ငွေ",
    liabilities: "အကြွေးများ",
    reimburse: "ပြန်အမ်း",
    recurring: "ပုံမှန်ထပ်တလဲလဲ",
    records: "မှတ်တမ်းများ",
    expenseLedger: "အသုံးစရိတ်မှတ်တမ်း",
    incomeLedger: "ဝင်ငွေမှတ်တမ်း",
    liabilityLedger: "အကြွေးမှတ်တမ်း",
    reimbursementLedger: "ပြန်အမ်းငွေမှတ်တမ်း",
    recurringLedger: "ပုံမှန်မှတ်တမ်း",
    noRecordsFor: "{date} အတွက် {type} မရှိသေးပါ",
    startLedger: "ပထမဆုံးမှတ်တမ်းထည့်ပြီး {type} ကို စတင်ပါ။",
    addFirstRecord: "ပထမဆုံးမှတ်တမ်းထည့်ရန်",
    loadingLedger: "မှတ်တမ်းများ ဖွင့်နေသည်...",
    loadingRecords: "မှတ်တမ်းများ တင်နေသည်...",
    analyticsSubtitle:
      "လစဉ်စုစုပေါင်းနှင့် အမျိုးအစားလိုက်အသုံးစရိတ်ကို ကြည့်ပါ။",
    totalIn: "{date} စုစုပေါင်း",
    expenseRecords: "အသုံးစရိတ်မှတ်တမ်း",
    categories: "အမျိုးအစားများ",
    fromLastMonth: "ပြီးခဲ့သည့်လနှင့်နှိုင်းယှဉ်",
    categorySpendingFor: "{date} အမျိုးအစားလိုက်အသုံးစရိတ်",
    monthlySpendingIn: "{year} လစဉ်အသုံးစရိတ်",
    noCategorySpendingTitle: "အမျိုးအစားအသုံးစရိတ် မရှိသေးပါ",
    noCategorySpendingDesc: "ဒီလအတွက် အမျိုးအစားအသုံးစရိတ် မရှိသေးပါ။",
    loadingAnalytics: "ခွဲခြမ်းစိတ်ဖြာမှု တင်နေသည်...",
    goodSummary:
      "ကောင်းလိုက်တာ!! {date} မှာ ပြီးခဲ့သည့်လထက် ပိုနည်းသုံးထားပါတယ်။",
    noSpendingSummary: "{date} အတွက် အသုံးစရိတ် မမှတ်ထားသေးပါ။",
    noPreviousSummary:
      "အိုး... {date} မှာ ${amount} သုံးထားပြီး ပြီးခဲ့သည့်လမှာ အသုံးစရိတ်မရှိပါ။",
    badSummaryRatio:
      "အိုး... {date} မှာ ပြီးခဲ့သည့်လထက် {ratio} ဆ သုံးထားပါတယ်။",
    badSummaryMore:
      "အိုး... {date} မှာ ပြီးခဲ့သည့်လထက် ${amount} ပိုသုံးထားပါတယ်။",
    categoriesTitle: "အမျိုးအစားများ",
    categoriesSubtitle:
      "ကိုယ်ပိုင်အမျိုးအစားနာမည်နှင့် အိုင်ကွန်ကို ရွေးချယ်ဖန်တီးပါ။",
    categoryName: "အမျိုးအစားနာမည်",
    icon: "အိုင်ကွန်",
    add: "ထည့်ရန်",
    update: "ပြင်ဆင်ရန်",
    edit: "ပြင်ရန်",
    delete: "ဖျက်ရန်",
    cancel: "မလုပ်တော့ပါ",
    saving: "သိမ်းနေသည်...",
    noCategoriesYet: "အမျိုးအစား မရှိသေးပါ",
    noCategoriesDesc:
      "အိုင်ကွန်နှင့် နာမည်ရွေးပြီး ပထမဆုံးအမျိုးအစားကို ဖန်တီးပါ။",
    loadingCategories: "အမျိုးအစားများ တင်နေသည်...",
    settingsSubtitle: "အက်ပ်ကို ကိုယ်ပိုင်ပြင်ဆင်ပြီး အကောင့်ကို စီမံပါ။",
    appearance: "အသွင်အပြင်",
    theme: "သီမ်",
    themeDesc: "Light သို့မဟုတ် Dark mode ကို ရွေးပါ။ Light သည် default ဖြစ်သည်။",
    textSize: "စာလုံးအရွယ်အစား",
    textSizeDesc: "အက်ပ်စာလုံးအရွယ်အစားကို ပြင်ပါ။",
    small: "သေး",
    normal: "ပုံမှန်",
    large: "ကြီး",
    language: "ဘာသာစကား",
    languageDesc: "အက်ပ်ပြသဘာသာစကားကို ရွေးပါ။",
    account: "အကောင့်",
    email: "အီးမေးလ်",
    changePassword: "စကားဝှက်ပြောင်းရန်",
    changePasswordDesc: "ဒီအကောင့်အတွက် စကားဝှက်အသစ် သတ်မှတ်ပါ။",
    newPassword: "စကားဝှက်အသစ်",
    confirmPassword: "စကားဝှက်အသစ် အတည်ပြုရန်",
    updatePassword: "စကားဝှက်ပြောင်းရန်",
    updating: "ပြောင်းနေသည်...",
    logout: "ထွက်ရန်",
    membership: "အသင်းဝင်မှု",
    membershipDesc:
      "အဆင့်မြင့် ဘောင်ချာစကင်နှင့် မှတ်တမ်းလုပ်ဆောင်ချက်များအတွက် စာရင်းသွင်းပါ။",
    membershipActive: "သင့်အသင်းဝင်မှုသည် {status} ဖြစ်သည်။",
    subscribe: "စာရင်းသွင်းရန်",
    manageBilling: "ငွေပေးချေမှု စီမံရန်",
    membershipActivated: "အသင်းဝင်မှု ဖွင့်ပြီးပါပြီ",
    paymentCancelled: "ငွေပေးချေမှု ပယ်ဖျက်ခဲ့သည်",
    month: "လ",
    gmailConnection: "PayNow Gmail ချိတ်ဆက်မှု",
    gmailConnectionDesc:
      "PayNow အီးမေးလ်များကို အလိုအလျောက်ထည့်ရန် Gmail ကို ချိတ်ဆက်ပါ။",
    connectGmail: "PayNow Gmail ချိတ်ဆက်ရန်",
    disconnectGmail: "PayNow Gmail ဖြုတ်ရန်",
    gmailConnected: "{email} နှင့် ချိတ်ဆက်ထားသည်",
    gmailNotConnected: "Gmail မချိတ်ဆက်ရသေးပါ။",
    connecting: "ချိတ်ဆက်နေသည်...",
    loadingSettings: "ဆက်တင်များ ဖွင့်နေသည်...",
    addRecordDesc: "မှတ်တမ်းထည့်ရန် အချက်အလက်များ ဖြည့်ပါ။",
    updateRecordDesc: "မှတ်တမ်းကို ပြင်ဆင်ပါ။",
    editExpense: "အသုံးစရိတ်ပြင်ရန်",
    recordType: "မှတ်တမ်းအမျိုးအစား",
    expense: "အသုံးစရိတ်",
    liability: "အကြွေး",
    reimbursement: "ပြန်အမ်းငွေ",
    title: "ခေါင်းစဉ်",
    amount: "ငွေပမာဏ",
    selected: "ရွေးထားသည်",
    selectCategory: "အမျိုးအစားရွေးပါ",
    personOrg: "လူ / အဖွဲ့အစည်း",
    whoInvolved: "ဘယ်သူပါဝင်သလဲ?",
    status: "အခြေအနေ",
    open: "မပြီးသေး",
    settled: "ပြီးဆုံး",
    date: "ရက်စွဲ",
    descriptionOptional: "မှတ်ချက် (မဖြည့်လည်းရ)",
    notesRecord: "ဒီမှတ်တမ်းအတွက် မှတ်ချက်ရေးပါ",
    saveChanges: "ပြောင်းလဲမှု သိမ်းရန်",
    scanReceipt: "ဘောင်ချာစကင်",
    scanning: "စကင်ဖတ်နေသည်...",
    scanReceiptDesc:
      "စျေးဝယ်ဘောင်ချာကို တင်ပြီး တွေ့ရှိသောပစ္စည်းများကို စစ်ဆေးကာ လိုချင်သောအရာများကို ထည့်ပါ။",
    uploadReceipt: "ဘောင်ချာပုံ တင်ရန် သို့မဟုတ် ရိုက်ရန်",
    uploadReceiptHint:
      "စုစုပေါင်းငွေ နှင့် ပစ္စည်းနာမည်များ မြင်ရသော ရှင်းလင်းသောပုံကို သုံးပါ။",
    uploadedReceiptPreview: "တင်ထားသောဘောင်ချာပုံ",
    receiptScanned: "ဘောင်ချာစကင်ပြီးပါပြီ",
    receiptImported: "ဘောင်ချာပစ္စည်းများ ထည့်ပြီးပါပြီ",
    receiptTotal: "ဘောင်ချာစုစုပေါင်း",
    selectedTotal: "ရွေးထားသောစုစုပေါင်း",
    importSelected: "ရွေးထားသည်များ ထည့်ရန်",
    importing: "ထည့်နေသည်...",
    rescan: "ပြန်စကင်",
    selectAtLeastOneItem: "အနည်းဆုံး ပစ္စည်းတစ်ခု ရွေးပါ",
    loading: "တင်နေသည်...",
    manual: "ကိုယ်တိုင်",
    voice: "အသံ",
    categoryNotDefined: "အမျိုးအစား မသတ်မှတ်ရသေး",
  },
} as const;

type TranslationKey = keyof typeof translations.en;

type LanguageContextValue = {
  language: LanguageChoice;
  setLanguage: (choice: LanguageChoice) => void;
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function applyLanguage(choice: LanguageChoice) {
  document.documentElement.lang = choice === "my" ? "my" : "en";
  document.documentElement.dataset.language = choice;
  window.localStorage.setItem(LANGUAGE_KEY, choice);
}

export function getSavedLanguage(): LanguageChoice {
  if (typeof window === "undefined") return "en";

  const saved = window.localStorage.getItem(LANGUAGE_KEY);
  if (saved === "my" || saved === "en") {
    return saved;
  }

  return "en";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<LanguageChoice>("en");

  useEffect(() => {
    const savedLanguage = getSavedLanguage();
    setLanguageState(savedLanguage);
    applyLanguage(savedLanguage);
  }, []);

  const value = useMemo<LanguageContextValue>(() => {
    const setLanguage = (choice: LanguageChoice) => {
      setLanguageState(choice);
      applyLanguage(choice);
    };

    const t = (
      key: TranslationKey,
      values: Record<string, string | number> = {},
    ) => {
      const dictionary = translations[language] as Partial<
        Record<TranslationKey, string>
      >;
      const template = String(dictionary[key] || translations.en[key]);
      return Object.entries(values).reduce(
        (text, [name, replacement]) =>
          text.replaceAll(`{${name}}`, String(replacement)),
        template,
      );
    };

    return { language, setLanguage, t };
  }, [language]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }

  return context;
}
