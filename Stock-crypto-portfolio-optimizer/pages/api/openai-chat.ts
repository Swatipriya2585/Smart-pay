import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      allowedMethods: ['POST']
    });
  }

  try {
    const { message, model = 'gpt-3.5-turbo', maxTokens = 150 } = req.body;

    // Validate input
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ 
        error: 'Message is required and must be a string' 
      });
    }

    // Check if API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key not configured');
      return res.status(500).json({ 
        error: 'OpenAI API key not configured. Please check your environment variables.' 
      });
    }

    console.log('🤖 OpenAI Chat Request:', {
      message: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
      model,
      maxTokens
    });

    // Make request to OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant for the CryptoChain cryptocurrency application. Provide clear, accurate, and helpful responses about cryptocurrency topics, wallet management, and blockchain technology.'
          },
          {
            role: 'user',
            content: message
          }
        ],
        max_tokens: Math.min(maxTokens, 1000), // Cap at 1000 tokens for safety
        temperature: 0.7,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('OpenAI API Error:', data);
      
      // Handle specific error cases
      if (response.status === 401) {
        return res.status(500).json({ 
          error: 'Invalid OpenAI API key. Please check your configuration.',
          details: data.error?.message 
        });
      }
      
      if (response.status === 429) {
        return res.status(429).json({ 
          error: 'Rate limit exceeded. Please try again later.',
          details: data.error?.message 
        });
      }
      
      if (data.error?.code === 'insufficient_quota') {
        return res.status(500).json({ 
          error: 'OpenAI quota exceeded. Please check your billing.',
          details: data.error?.message 
        });
      }
      
      return res.status(500).json({ 
        error: 'OpenAI API error',
        details: data.error?.message || 'Unknown error'
      });
    }

    const aiResponse = data.choices[0]?.message?.content;
    const usage = data.usage;

    console.log('✅ OpenAI Response:', {
      response: aiResponse?.substring(0, 100) + (aiResponse && aiResponse.length > 100 ? '...' : ''),
      tokens: usage?.total_tokens,
      model: data.model
    });

    // Return successful response
    res.status(200).json({
      success: true,
      response: aiResponse || 'No response generated',
      usage: {
        promptTokens: usage?.prompt_tokens,
        completionTokens: usage?.completion_tokens,
        totalTokens: usage?.total_tokens
      },
      model: data.model,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('OpenAI Chat API Error:', error);
    
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 