import { NextApiRequest, NextApiResponse } from 'next';
import { sendResetCode, validatePhoneNumber } from '@/services/sms';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { phoneNumber, resetCode } = req.body;

    // Validate input
    if (!phoneNumber || !resetCode) {
      return res.status(400).json({ 
        error: 'Phone number and reset code are required' 
      });
    }

    // Validate phone number format
    if (!validatePhoneNumber(phoneNumber)) {
      return res.status(400).json({ 
        error: 'Invalid phone number format' 
      });
    }

    // Validate reset code format (6 digits)
    if (!/^\d{6}$/.test(resetCode)) {
      return res.status(400).json({ 
        error: 'Reset code must be 6 digits' 
      });
    }

    console.log('📱 Sending reset code to:', phoneNumber);

    // Send SMS
    const result = await sendResetCode(phoneNumber, resetCode);

    if (result.success) {
      console.log('✅ SMS sent successfully:', result.messageId);
      return res.status(200).json({
        success: true,
        messageId: result.messageId,
        message: 'Reset code sent successfully'
      });
    } else {
      console.error('❌ SMS sending failed');
      return res.status(500).json({
        error: 'Failed to send SMS'
      });
    }

  } catch (error) {
    console.error('❌ SMS API error:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('Invalid phone number')) {
        return res.status(400).json({
          error: 'Invalid phone number format'
        });
      }
      
      if (error.message.includes('authentication')) {
        return res.status(500).json({
          error: 'SMS service authentication failed'
        });
      }
      
      if (error.message.includes('not configured')) {
        return res.status(500).json({
          error: 'SMS service not configured'
        });
      }
    }
    
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
} 