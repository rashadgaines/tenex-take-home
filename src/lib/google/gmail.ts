import { google } from 'googleapis';
import { getGoogleTokens, updateGoogleTokens } from '../auth';

// Create OAuth2 client with token refresh handling
async function getGmailClient(userId: string) {
  const tokens = await getGoogleTokens(userId);
  
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
  });

  // Handle token refresh
  oauth2Client.on('tokens', async (newTokens) => {
    if (newTokens.access_token && newTokens.expiry_date) {
      await updateGoogleTokens(
        userId,
        newTokens.access_token,
        Math.floor(newTokens.expiry_date / 1000)
      );
    }
  });

  return google.gmail({ version: 'v1', auth: oauth2Client });
}

// Encode email to base64url format for Gmail API
function encodeEmail(to: string, subject: string, body: string, from?: string): string {
  const emailLines = [
    'To: ' + to,
    'Subject: ' + subject,
    'Content-Type: text/plain; charset=utf-8',
    'MIME-Version: 1.0',
  ];

  if (from) {
    emailLines.unshift('From: ' + from);
  }

  emailLines.push('', body);

  const email = emailLines.join('\r\n');
  
  // Convert to base64url
  return Buffer.from(email)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Send an email
export async function sendEmail(
  userId: string,
  to: string,
  subject: string,
  body: string
): Promise<{ id: string; threadId: string }> {
  const gmail = await getGmailClient(userId);

  const raw = encodeEmail(to, subject, body);

  const response = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw,
    },
  });

  return {
    id: response.data.id || '',
    threadId: response.data.threadId || '',
  };
}

// Send an email with HTML body
export async function sendHtmlEmail(
  userId: string,
  to: string,
  subject: string,
  htmlBody: string,
  textBody?: string
): Promise<{ id: string; threadId: string }> {
  const gmail = await getGmailClient(userId);

  const boundary = 'boundary_' + Date.now().toString();
  
  const emailParts = [
    'To: ' + to,
    'Subject: ' + subject,
    'MIME-Version: 1.0',
    'Content-Type: multipart/alternative; boundary="' + boundary + '"',
    '',
    '--' + boundary,
    'Content-Type: text/plain; charset=utf-8',
    '',
    textBody || htmlBody.replace(/<[^>]*>/g, ''),
    '',
    '--' + boundary,
    'Content-Type: text/html; charset=utf-8',
    '',
    htmlBody,
    '',
    '--' + boundary + '--',
  ];

  const raw = Buffer.from(emailParts.join('\r\n'))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const response = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw,
    },
  });

  return {
    id: response.data.id || '',
    threadId: response.data.threadId || '',
  };
}

// Get user's email address
export async function getUserEmail(userId: string): Promise<string> {
  const gmail = await getGmailClient(userId);
  
  const response = await gmail.users.getProfile({
    userId: 'me',
  });

  return response.data.emailAddress || '';
}
