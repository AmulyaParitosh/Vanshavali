import type { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { name, email, message } = req.body;

  // Configure the email transport using Nodemailer.
  // You'll need to configure this with your own email service provider.
  // For Gmail, you may need to use an "App Password" if you have 2-Step Verification enabled.
  // IMPORTANT: Do not hard-code your credentials in your code.
  // Use environment variables for better security.
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'your-email@gmail.com', // TODO: Replace with your email
      pass: 'your-app-password',    // TODO: Replace with your email app password
    },
  });

  const mailOptions = {
    from: 'your-email@gmail.com', // TODO: Replace with your email
    to: 'admin-email@example.com', // TODO: Replace with the admin's email address
    subject: 'New Access Request for Vanshavali',
    html: `
      <p>A new user has requested access to the Vanshavali application.</p>
      <ul>
        <li><strong>Name:</strong> ${name}</li>
        <li><strong>Email:</strong> ${email}</li>
        <li><strong>Message:</strong> ${message}</li>
      </ul>
      <p>
        <a href="https://your-app-url.com">Go to the Admin Dashboard to approve or deny this request.</a>
      </p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error('There was an error sending the email:', error);
    res.status(500).json({ message: 'Error sending email' });
  }
};
