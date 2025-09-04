// Email service for sending notifications
// In a production environment, you would use a service like SendGrid, Nodemailer, or AWS SES

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailOptions): Promise<boolean> {
  try {
    // For development/demo purposes, we'll log the email content
    // In production, replace this with actual email service integration
    console.log('=== EMAIL NOTIFICATION ===');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Content:', html);
    console.log('========================');

    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // In production, implement actual email sending here:
    /*
    const response = await fetch('https://api.sendgrid.v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: process.env.FROM_EMAIL },
        subject,
        content: [{ type: 'text/html', value: html }]
      })
    });
    return response.ok;
    */

    return true; // Simulate successful sending
  } catch (error) {
    console.error('Email sending failed:', error);
    return false;
  }
}

export function generateAdminApprovalEmail(adminName: string, adminEmail: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Admin Access Approved</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Admin Access Approved!</h1>
        </div>
        <div class="content">
          <h2>Hello ${adminName},</h2>
          <p>Great news! Your request for admin access to the Quiz Management System has been approved by a super administrator.</p>
          
          <p><strong>Your admin account details:</strong></p>
          <ul>
            <li><strong>Email:</strong> ${adminEmail}</li>
            <li><strong>Role:</strong> Administrator</li>
            <li><strong>Status:</strong> Active</li>
          </ul>
          
          <p>You can now sign in to the admin portal using your existing credentials:</p>
          
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/login" class="button">
            Sign In to Admin Portal
          </a>
          
          <p><strong>What you can do as an admin:</strong></p>
          <ul>
            <li>Create and manage quizzes</li>
            <li>View student performance and analytics</li>
            <li>Monitor quiz attempts and results</li>
            <li>Generate reports</li>
          </ul>
          
          <p>If you have any questions or need assistance, please contact the system administrator.</p>
          
          <p>Welcome to the team!</p>
        </div>
        <div class="footer">
          <p>Quiz Management System<br>
          This is an automated message, please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
