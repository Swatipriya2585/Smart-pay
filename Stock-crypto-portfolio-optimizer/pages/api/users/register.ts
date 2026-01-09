import type { NextApiRequest, NextApiResponse } from 'next';
import { databaseService } from '@/services/database';
import bcrypt from 'bcryptjs';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { email, phone, pin } = req.body;

    // Validate input
    if (!email || !pin) {
      return res.status(400).json({ message: 'Email and PIN are required' });
    }

    // Check if user already exists
    const existingUser = await databaseService.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }

    // Hash the PIN
    const hashedPin = await bcrypt.hash(pin, 12);

    // Create user
    const user = await databaseService.createUser({
      email,
      phone,
      pin: hashedPin
    });

    // Remove sensitive data from response
    const { pin: _, ...userWithoutPin } = user;

    res.status(201).json({
      message: 'User created successfully',
      user: userWithoutPin
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
} 