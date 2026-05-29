import axios from 'axios';
import { loadDatabase, saveDatabase, appendAuditLog } from '../db';
import { Transaction, Member, Loan } from '../../src/types';

// Read Safaricom Credentials
const CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY || "";
const CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET || "";
const DARAJA_ENV = "sandbox"; // sandbox or production
const SHORTCODE = process.env.MPESA_SHORTCODE || "174379";
const PASSKEY = process.env.MPESA_PASSKEY || "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919";
const APP_URL = process.env.APP_URL || "http://localhost:3000";

const DARAJA_API_URLS = {
  sandbox: "https://sandbox.safaricom.co.ke",
  production: "https://api.safaricom.co.ke"
};

const BASE_URL = DARAJA_API_URLS[DARAJA_ENV] || DARAJA_API_URLS.sandbox;

// Generate OAuth Token
export async function getMpesaAccessToken(): Promise<string> {
  if (!CONSUMER_KEY || !CONSUMER_SECRET) {
    throw new Error("[M-Pesa] API credentials are not configured in system environment variables (.env).");
  }

  const credentials = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
  try {
    const res = await axios.get(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: {
        Authorization: `Basic ${credentials}`
      }
    });
    return res.data.access_token;
  } catch (error: any) {
    console.error("[M-Pesa] Failed to fetch access token from Safaricom:", error.response?.data || error.message);
    throw new Error("[M-Pesa auth exception] Could not resolve identity verification with Safaricom Daraja platform.");
  }
}

// 1. STK Push (Lipa Na M-Pesa Online prompt)
export async function initiateStkPush(params: {
  phone: string;
  amount: number;
  reference: string;
  description: string;
}): Promise<{ success: boolean; checkoutRequestId?: string; description?: string; isDemo: boolean }> {
  const { phone, amount, reference, description } = params;

  // Clean phone number format -> 2547XXXXXXXX
  let cleanPhone = phone.trim().replace(/[\s\+\-]/g, "");
  if (cleanPhone.startsWith("0")) {
    cleanPhone = "254" + cleanPhone.substring(1);
  } else if (cleanPhone.startsWith("7")) {
    cleanPhone = "254" + cleanPhone;
  } else if (cleanPhone.startsWith("+254")) {
    cleanPhone = cleanPhone.substring(1);
  }

  // If credentials are not present, trigger the high-fidelity demo sandbox callback simulation!
  if (!CONSUMER_KEY || !CONSUMER_SECRET) {
    console.warn(`[M-Pesa Simulation] Credentials missing. Activating High-Fidelity SACCO M-Pesa prompt simulation for amount ${amount} KES to ${cleanPhone}.`);
    
    const checkoutRequestId = `ws_CO_${Date.now()}_sim_${Math.floor(1000 + Math.random() * 9000)}`;

    // Programmatically queue callback execution after 3 seconds to let client see realistic pending transition!
    setTimeout(() => {
      simulateStkSuccessCallback({
        checkoutRequestId,
        amount,
        phone: cleanPhone,
        reference,
        description
      });
    }, 3000);

    return {
      success: true,
      checkoutRequestId,
      description: "[Simulated Prompt] A simulated M-Pesa PIN code overlay prompt has been sent to the target device. Please wait.",
      isDemo: true
    };
  }

  const timestamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
  const password = Buffer.from(`${SHORTCODE}${PASSKEY}${timestamp}`).toString('base64');

  try {
    const token = await getMpesaAccessToken();
    const payload = {
      BusinessShortCode: SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.round(amount),
      PartyA: cleanPhone,
      PartyB: SHORTCODE,
      PhoneNumber: cleanPhone,
      CallBackURL: `${APP_URL}/api/mpesa/callback`,
      AccountReference: reference.slice(0, 12),
      TransactionDesc: description.slice(0, 20)
    };

    console.log("[M-Pesa Hook] Triggering STK Push to safaricom gateway:", payload);

    const res = await axios.post(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    return {
      success: true,
      checkoutRequestId: res.data.CheckoutRequestID,
      description: res.data.ResponseDescription,
      isDemo: false
    };
  } catch (error: any) {
    console.error("[M-Pesa] STK Push execution crashed:", error.response?.data || error.message);
    throw new Error(error.response?.data?.errorMessage || "Safaricom Daraja API rejected the checkout push request.");
  }
}

// 2. B2C (Business to Customer) disbursement for Savings Withdrawal & Loan Disbursement
export async function executeB2CDisbursement(params: {
  phone: string;
  amount: number;
  reference: string;
  description: string;
}): Promise<{ success: boolean; conversationId?: string; isDemo: boolean }> {
  const { phone, amount, reference, description } = params;

  let cleanPhone = phone.trim().replace(/[\s\+\-]/g, "");
  if (cleanPhone.startsWith("0")) {
    cleanPhone = "254" + cleanPhone.substring(1);
  }

  if (!CONSUMER_KEY || !CONSUMER_SECRET) {
    console.warn(`[M-Pesa Simulation] B2C Credentials missing. Simulating instant cash disbursement transfer on references: ${reference}`);
    
    // Simulate safe webhook completion
    setTimeout(() => {
      simulateB2CSuccessCallback({
        reference,
        amount,
        phone: cleanPhone,
        description
      });
    }, 2000);

    return {
      success: true,
      conversationId: `B2C_conv_${Date.now()}_sim`,
      isDemo: true
    };
  }

  try {
    const token = await getMpesaAccessToken();
    const payload = {
      InitiatorName: "ApexSaccoAdmin",
      SecurityCredential: "encrypted_initiator_password", // configured in real portals
      CommandID: "PromotionPayment", // BusinessPayment or PromotionPayment or SalaryPayment
      SenderIdentifierType: "4", // Shortcode identifier
      RecieverIdentifierType: "1", // Phone identifier
      Amount: Math.round(amount),
      PartyA: SHORTCODE,
      PartyB: cleanPhone,
      Remarks: description.slice(0, 15),
      QueueTimeOutURL: `${APP_URL}/api/mpesa/b2c/timeout`,
      ResultURL: `${APP_URL}/api/mpesa/b2c/result`,
      Occasion: "SACCODisbursement"
    };

    console.log("[M-Pesa Disbursement] Triggering disbursement to safaricom gateway:", payload);

    const res = await axios.post(`${BASE_URL}/mpesa/b2c/v1/paymentrequest`, payload, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    return {
      success: true,
      conversationId: res.data.ConversationID,
      isDemo: false
    };
  } catch (error: any) {
    console.error("[M-Pesa] B2C Disbursement crashed:", error.response?.data || error.message);
    throw new Error(error.response?.data?.errorMessage || "Safaricom B2C API gateway rejected the payout query.");
  }
}

// -------------------------------------------------------------
// HIGH-FIDELITY DEMONSTRATION WORKFLOWS (SIMULATORS)
// -------------------------------------------------------------
function simulateStkSuccessCallback(params: {
  checkoutRequestId: string;
  amount: number;
  phone: string;
  reference: string;
  description: string;
}) {
  const { checkoutRequestId, amount, phone, reference, description } = params;
  const receiptNum = "MPE" + Math.floor(100000 + Math.random() * 900000).toString() + "S21";

  // Synthesize standard Webhook JSON payload from Safaricom Daraja API
  const simulatedBody = {
    Body: {
      stkCallback: {
        MerchantRequestID: `MR_${Date.now()}`,
        CheckoutRequestID: checkoutRequestId,
        ResultCode: 0,
        ResultDesc: "The service request has been processed successfully.",
        CallbackMetadata: {
          Item: [
            { Name: "Amount", Value: amount },
            { Name: "MpesaReceiptNumber", Value: receiptNum },
            { Name: "TransactionDate", Value: parseInt(new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14)) },
            { Name: "PhoneNumber", Value: parseInt(phone) }
          ]
        }
      }
    }
  };

  try {
    // Send simulated webhook call internally
    reconcileMpesaTransaction(simulatedBody);
  } catch (err) {
    console.error("[M-Pesa Simulator Webhook Error]", err);
  }
}

function simulateB2CSuccessCallback(params: {
  reference: string;
  amount: number;
  phone: string;
  description: string;
}) {
  const receiptNum = "WTH" + Math.floor(100000 + Math.random() * 900000).toString() + "D99";
  // Simulated success trigger for payouts
  try {
    const db = loadDatabase();
    // Locate transaction if already logged as pending, or create it
    const existing = db.transactions.find(t => t.reference === params.reference);
    if (existing) {
      existing.status = "Completed";
      existing.description = `${existing.description}. Safaricom receipt: ${receiptNum}. [Simulator Verified]`;
      saveDatabase(db);
      
      appendAuditLog(
        "M-Pesa Disbursement Discharged",
        "system-daraja@mpesa.or.ke",
        "Member",
        `B2C payout disbursed verified on Safe wallet transfer. Receipt: ${receiptNum}. Amount: ${params.amount} KES`
      );
    }
  } catch (err) {
    console.error("[M-Pesa B2C Simulator webhook processing failed]", err);
  }
}

// -------------------------------------------------------------
// DARAJA WEBHOOK CALLBACK INTERPRETER & LEDGER RECONCILER
// -------------------------------------------------------------
export function reconcileMpesaTransaction(safaricomPayload: any): { success: boolean; message: string } {
  const stkCallback = safaricomPayload?.Body?.stkCallback;
  if (!stkCallback) {
    return { success: false, message: "Invalid payload layout. Safaricom body not matching STK Push callbacks." };
  }

  const checkoutRequestId = stkCallback.CheckoutRequestID;
  const resultCode = stkCallback.ResultCode;
  const resultDesc = stkCallback.ResultDesc;

  const db = loadDatabase();

  // -------------------------------------------------------------
  // DARAJA DOUBLE SPEND & REPLAY PROTECTION (Fintech requirement #2)
  // -------------------------------------------------------------
  const duplicateIdCheck = db.transactions.find(t => 
    (t.description.includes(checkoutRequestId) || t.reference === checkoutRequestId) && 
    t.status === 'Completed'
  );
  if (duplicateIdCheck) {
    return { success: false, message: `Duplicate checkout reconciliation blocked. ID: ${checkoutRequestId} already reconciled.` };
  }

  // Find transaction logged under this Checkout CheckoutRequestID
  // In our app, we map CheckoutRequestID inside the description or separate file. Let's find it!
  const txn = db.transactions.find(t => t.description.includes(checkoutRequestId));

  if (!txn) {
    console.warn(`[Reconciliation Warning] Received payment callback, but transaction with checkoutId ${checkoutRequestId} was not indexed. Creating custom Deposit transaction.`);
    // Not found, let's parse from metadata and post new deposit!
    if (resultCode === 0) {
      const items = stkCallback.CallbackMetadata?.Item || [];
      const amountItem = items.find((i: any) => i.Name === "Amount");
      const receiptItem = items.find((i: any) => i.Name === "MpesaReceiptNumber");
      
      const parsedAmount = amountItem ? parseFloat(amountItem.Value) : 1000.00;
      const parsedReceipt = receiptItem ? receiptItem.Value : `REF_${Date.now()}`;

      // Insert fresh transaction
      const defaultTxn: Transaction = {
        id: `tx-reconciled-${Date.now()}`,
        reference: parsedReceipt,
        memberId: "SACCO-1021", // default demo active member
        memberName: "Joshua Mwangi",
        type: "Deposit",
        amount: parsedAmount,
        paymentMethod: "M-Pesa",
        fee: 0,
        timestamp: new Date().toISOString(),
        status: "Completed",
        description: `Direct M-Pesa STK push contribution. Reconciled automatically. Callback Desc: ${resultDesc}`
      };

      // update balance of member
      const member = db.members.find(m => m.memberId === defaultTxn.memberId);
      if (member) member.savingsBalance += defaultTxn.amount;

      db.transactions.push(defaultTxn);
      saveDatabase(db);
      appendAuditLog("Reconcile M-Pesa Deposit", defaultTxn.memberName, "Member", `M-Pesa STK Callback auto-reconciled on generic user. Receipt: ${parsedReceipt}. Amount: ${parsedAmount} KES`);
      return { success: true, message: "Added transaction on verification fallback successfully." };
    }
    return { success: false, message: "Failed transaction callback received, no local pending txn to invalidate." };
  }

  if (resultCode !== 0) {
    // Payment cancelled or rejected
    txn.status = "Failed";
    txn.description = `${txn.description}. Safaricom Reason: ${resultDesc}`;
    saveDatabase(db);
    appendAuditLog("Payment Cancelled", txn.memberName, "Member", `M-Pesa transaction reference failed. Callback code ${resultCode}: ${resultDesc}`);
    return { success: false, message: `Payment failed logged: ${resultDesc}` };
  }

  // Payment was SUCCESSFUL! Parse receipt Metadata
  const items = stkCallback.CallbackMetadata?.Item || [];
  const amountItem = items.find((i: any) => i.Name === "Amount");
  const receiptItem = items.find((i: any) => i.Name === "MpesaReceiptNumber");
  
  if (receiptItem?.Value) {
    const doubleReceiptCheck = db.transactions.find(t => t.reference === receiptItem.Value && t.status === 'Completed');
    if (doubleReceiptCheck) {
      return { success: false, message: `Duplicate payment warning. Transaction with Safaricom receipt ID ${receiptItem.Value} was already reconciled.` };
    }
  }

  const actualAmount = amountItem ? parseFloat(amountItem.Value) : txn.amount;
  const mpesaReceipt = receiptItem ? receiptItem.Value : `MPE${Math.floor(100000 + Math.random()*900000)}`;

  // Update original transaction
  txn.reference = mpesaReceipt;
  txn.status = "Completed";
  txn.description = `${txn.description.split(" [Checkout ID:")[0]}. Safaricom receipt: ${mpesaReceipt}. Verification: Completed.`;

  // Find member and credit balance or modify loan records
  const member = db.members.find(m => m.memberId === txn.memberId);
  if (!member) {
    return { success: false, message: "Transaction completed but target member could not be retrieved." };
  }

  if (txn.type === 'Deposit') {
    member.savingsBalance += actualAmount;
    appendAuditLog(
      "M-Pesa Savings Credited",
      member.email,
      "Member",
      `Credited ${actualAmount} KES savings to Member ID ${txn.memberId}. Receipt Number: ${mpesaReceipt}`
    );
  } else if (txn.type === 'Repayment') {
    // Find outstanding loan
    // In repayments actions, the description of txn carries: "Repayment installment for active loan LN-XXXX"
    const loanReg = /LN-\d+/;
    const match = txn.description.match(loanReg);
    const matchedLoanId = match ? match[0] : null;

    const loan = db.loans.find(l => l.loanId === matchedLoanId || (l.memberId === member.memberId && l.status !== 'Fully Paid'));
    if (loan) {
      const excess = actualAmount - loan.outstandingBalance;
      const appliedAmount = excess > 0 ? loan.outstandingBalance : actualAmount;
      loan.outstandingBalance -= appliedAmount;

      if (loan.outstandingBalance <= 0) {
        loan.status = 'Fully Paid';
        loan.outstandingBalance = 0;
        member.activeLoansCount = Math.max(0, member.activeLoansCount - 1);
      }

      // Record schedule payment mapping
      let remainingMoney = appliedAmount;
      for (const installment of loan.repaymentSchedule) {
        if (remainingMoney <= 0) break;
        const dueVal = installment.amountDue - installment.amountPaid;
        if (dueVal > 0) {
          if (remainingMoney >= dueVal) {
            installment.amountPaid += dueVal;
            installment.status = 'Paid';
            remainingMoney -= dueVal;
          } else {
            installment.amountPaid += remainingMoney;
            remainingMoney = 0;
          }
        }
      }

      member.totalRepaid += appliedAmount;
      txn.description = `${txn.description}. Credited to loan portfolio ${loan.loanId}.`;

      appendAuditLog(
        "M-Pesa Loan Repayment Reconciled",
        member.email,
        "Member",
        `Liquidated ${appliedAmount} KES of Loan ${loan.loanId}. Receipt: ${mpesaReceipt}`
      );
    }
  }

  saveDatabase(db);
  return { success: true, message: `Successfully verified and reconciled transaction under Receipt ${mpesaReceipt}.` };
}
