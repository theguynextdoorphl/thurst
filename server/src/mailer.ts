import nodemailer from 'nodemailer';
import { config } from './config.js';

const transport = config.smtp ? nodemailer.createTransport(config.smtp) : null;

/** Returns false when no email service is set up and the code was only logged. */
export async function sendVerificationCode(email: string, code: string): Promise<boolean> {
  if (!transport) {
    console.log(`[mail] verification code for ${email}: ${code}`);
    return false;
  }
  await transport.sendMail({
    from: config.mailFrom,
    to: email,
    subject: 'Your Thurst code',
    text: `Your Thurst verification code is ${code}. It expires in 10 minutes.`,
  });
  return true;
}
