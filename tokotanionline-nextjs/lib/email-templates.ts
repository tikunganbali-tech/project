/**
 * Email Templates for Tokotani Online
 * Production-grade email templates with professional design
 */

export interface PasswordResetEmailData {
  adminName: string;
  resetLink: string;
  expiryMinutes: number;
}

export function generatePasswordResetEmail(data: PasswordResetEmailData) {
  const { adminName, resetLink, expiryMinutes } = data;

  const subject = 'Reset Password Admin Tokotani Online';

  const html = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border-collapse: collapse;">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background-color: #16a34a; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">TOKO TANI ONLINE</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 20px; font-weight: 600;">Reset Password Admin</h2>
              
              <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Halo ${adminName || 'Admin'},
              </p>
              
              <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Kami menerima permintaan untuk mereset password akun admin Anda. Klik tombol di bawah ini untuk melanjutkan:
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; margin: 30px 0;">
                <tr>
                  <td style="text-align: center;">
                    <a href="${resetLink}" style="display: inline-block; padding: 14px 32px; background-color: #16a34a; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Reset Password</a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0; color: #4b5563; font-size: 14px; line-height: 1.6;">
                Atau salin dan tempel link berikut ke browser Anda:<br>
                <a href="${resetLink}" style="color: #16a34a; word-break: break-all;">${resetLink}</a>
              </p>
              
              <!-- Warning -->
              <div style="margin: 30px 0; padding: 16px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                  <strong>⚠️ Penting:</strong> Link ini hanya berlaku selama <strong>${expiryMinutes} menit</strong> dan hanya dapat digunakan <strong>sekali</strong>. Jika Anda tidak meminta reset password, abaikan email ini.
                </p>
              </div>
              
              <p style="margin: 30px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Jika tombol tidak berfungsi, salin link di atas dan buka di browser Anda.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 12px; text-align: center; line-height: 1.6;">
                Email ini dikirim secara otomatis. Jangan balas email ini.<br>
                © ${new Date().getFullYear()} Tokotani Online. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
TOKO TANI ONLINE
Reset Password Admin

Halo ${adminName || 'Admin'},

Kami menerima permintaan untuk mereset password akun admin Anda.

Link Reset Password:
${resetLink}

PENTING:
- Link ini hanya berlaku selama ${expiryMinutes} menit
- Link hanya dapat digunakan sekali
- Jika Anda tidak meminta reset password, abaikan email ini

Email ini dikirim secara otomatis. Jangan balas email ini.
© ${new Date().getFullYear()} Tokotani Online. All rights reserved.
  `.trim();

  return { subject, html, text };
}
