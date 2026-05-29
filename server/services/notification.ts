import logger from './logger';
import axios from 'axios';

export interface NotificationPayload {
  to: string;
  subject?: string;
  message: string;
  type: 'sms' | 'email' | 'push';
}

export class NotificationService {
  /**
   * Send notification via simulated / configured real fintech gateway (such as Resend, Twilio, SMS providers)
   */
  static async send(payload: NotificationPayload): Promise<{ success: boolean; messageId: string }> {
    const { to, subject = "Apex SACCO Notification", message, type } = payload;
    const messageId = `msg-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    logger.info(`[Notification Gateway] Dispatching ${type} to [${to}] | Subject: ${subject} | Payload ID: ${messageId}`);

    // Sandbox execution simulations using standard winston pipelines:
    if (type === 'sms') {
      console.log(`\n--- [Fintech SMS GATEWAY] To: ${to} ---\nMessage: ${message}\n-------------------------------------\n`);
    } else if (type === 'email') {
      console.log(`\n--- [Fintech EMAIL SMTP] To: ${to} ---\nSubject: ${subject}\nBody: ${message}\n-------------------------------\n`);
      
      // -------------------------------------------------------------------
      // RESEND EMAIL API INTEGRATION (Fintech requirement #5)
      // -------------------------------------------------------------------
      const resendApiKey = process.env.RESEND_API_KEY;
      if (resendApiKey) {
        try {
          logger.info(`[Notification Gateway] Launching real SMTP mail dispatch via Resend API connected on ${to}`);
          await axios.post('https://api.resend.com/emails', {
            from: 'Apex SACCO Core <no-reply@sacco.co.ke>',
            to: [to],
            subject: subject,
            html: `
              <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e1e8ed; border-radius: 12px; color: #1c2024;">
                <div style="text-align: center; margin-bottom: 24px;">
                  <h2 style="color: #005fb8; font-weight: 600; font-size: 24px; margin: 0;">Apex Digital Co-operative</h2>
                </div>
                <div style="font-size: 16px; line-height: 1.6;">
                  ${message.replace(/\n/g, '<br/>')}
                </div>
                <hr style="border: 0; border-top: 1px dashed #e1e8ed; margin: 32px 0;" />
                <div style="font-size: 12px; color: #889096; text-align: center;">
                  This is an automated safety notice from the secure transaction ledger system. Apex SACCO values your security above all.
                </div>
              </div>
            `
          }, {
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json'
            }
          });
          logger.info(`[Notification Gateway] Resend email dispatch successfully acknowledged.`);
        } catch (resendError: any) {
          logger.error(`[Notification Gateway Error] Resend mailing failed to dispatch:`, resendError.response?.data || resendError.message);
        }
      }
    } else {
      console.log(`\n--- [FCM PUSH GATEWAY] Device: ${to} ---\nPayload: ${message}\n--------------------\n`);
    }

    return { success: true, messageId };
  }

  static async sendOTP(phoneOrEmail: string, otp: string): Promise<void> {
    const isEmail = phoneOrEmail.includes('@');
    await this.send({
      to: phoneOrEmail,
      subject: 'SACCO Secure authorization OTP verification code',
      message: `Your login verification OTP token is: ${otp}. Valid for exactly 5 minutes. Do not share this with anyone. Sacco Admin will never call to ask for your verification OTP.`,
      type: isEmail ? 'email' : 'sms'
    });
  }

  static async sendSecurityAlert(email: string, eventName: string): Promise<void> {
    await this.send({
      to: email,
      subject: 'SECURITY WARNING: Suspicious login details detected',
      message: `An account activity '${eventName}' was observed for your profile. If this was not you, please immediately trigger forgot password or notify a administrator to freeze your account.`,
      type: 'email'
    });
  }

  static async sendTransactionConf(email: string, actionType: string, amount: number, ref: string): Promise<void> {
    await this.send({
      to: email,
      subject: 'Apex SACCO Financial Transaction update notice',
      message: `Financial transaction processed. Code: ${ref}. Operation: ${actionType}. Amount: ${amount.toLocaleString()} KES. Your ledger balance was recalculated and updated correctly.`,
      type: 'email'
    });
  }
}
