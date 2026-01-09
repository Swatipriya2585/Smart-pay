import twilio from 'twilio';

// Check if Twilio credentials are available
const hasTwilioCredentials = () => {
  return process.env.TWILIO_ACCOUNT_SID && 
         process.env.TWILIO_AUTH_TOKEN && 
         process.env.TWILIO_PHONE_NUMBER;
};

// Initialize Twilio client only if credentials are available
const getTwilioClient = () => {
  if (!hasTwilioCredentials()) {
    console.warn('⚠️ Twilio credentials not found. SMS will be simulated.');
    return null;
  }
  
  try {
    return twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    );
  } catch (error) {
    console.error('❌ Failed to initialize Twilio client:', error);
    return null;
  }
};

// Mock SMS service for development/testing
class MockSMSService {
  async sendSMS(to: string, message: string) {
    console.log('📱 [MOCK SMS] To:', to);
    console.log('📱 [MOCK SMS] Message:', message);
    console.log('📱 [MOCK SMS] Status: Sent successfully (simulated)');
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      success: true,
      messageId: `mock_${Date.now()}`,
      status: 'delivered'
    };
  }
}

// Real SMS service using Twilio
class TwilioSMSService {
  private client: any;
  
  constructor() {
    this.client = getTwilioClient();
  }
  
  async sendSMS(to: string, message: string) {
    if (!this.client) {
      throw new Error('Twilio client not initialized. Check your credentials.');
    }
    
    try {
      const result = await this.client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: to
      });
      
      console.log('📱 [TWILIO SMS] Sent successfully:', result.sid);
      
      return {
        success: true,
        messageId: result.sid,
        status: result.status
      };
    } catch (error) {
      console.error('❌ [TWILIO SMS] Failed to send:', error);
      throw error;
    }
  }
}

// Export the appropriate service
export const SMSProvider = hasTwilioCredentials() 
  ? new TwilioSMSService() 
  : new MockSMSService();

// Utility functions
export const formatPhoneNumber = (phone: string): string => {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Add country code if not present
  if (cleaned.length === 10) {
    return `+1${cleaned}`; // US/Canada
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  } else if (cleaned.startsWith('+')) {
    return cleaned;
  }
  
  return `+${cleaned}`;
};

export const validatePhoneNumber = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 15;
};

// SMS message templates
export const SMS_TEMPLATES = {
  RESET_CODE: (code: string) => `Your CryptoChain reset code is: ${code}. Valid for 10 minutes.`,
  WELCOME: (name: string) => `Welcome to CryptoChain, ${name}! Your account has been created successfully.`,
  TRANSACTION: (amount: string, type: string) => `CryptoChain: ${type} transaction of ${amount} completed successfully.`,
  SECURITY_ALERT: (action: string) => `CryptoChain Security Alert: ${action} detected on your account.`
};

// Main SMS sending function
export const sendSMS = async (to: string, message: string) => {
  try {
    const formattedPhone = formatPhoneNumber(to);
    
    if (!validatePhoneNumber(formattedPhone)) {
      throw new Error('Invalid phone number format');
    }
    
    const result = await SMSProvider.sendSMS(formattedPhone, message);
    return result;
  } catch (error) {
    console.error('❌ SMS sending failed:', error);
    throw error;
  }
};

// Convenience functions
export const sendResetCode = async (phone: string, code: string) => {
  const message = SMS_TEMPLATES.RESET_CODE(code);
  return sendSMS(phone, message);
};

export const sendWelcomeMessage = async (phone: string, name: string) => {
  const message = SMS_TEMPLATES.WELCOME(name);
  return sendSMS(phone, message);
};

export const sendTransactionNotification = async (phone: string, amount: string, type: string) => {
  const message = SMS_TEMPLATES.TRANSACTION(amount, type);
  return sendSMS(phone, message);
};

export const sendSecurityAlert = async (phone: string, action: string) => {
  const message = SMS_TEMPLATES.SECURITY_ALERT(action);
  return sendSMS(phone, message);
}; 