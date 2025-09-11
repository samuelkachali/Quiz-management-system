import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyToken } from '@/backend/utils/auth';
import { generateGeminiResponse } from '@/lib/gemini';

export async function GET(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  console.log('=== GET STUDY GROUP MESSAGES API REQUEST ===');

  try {
    const authHeader = request.headers.get('authorization');
    console.log('Auth header present:', !!authHeader);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('No or invalid authorization header');
      return NextResponse.json(
        { success: false, message: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    console.log('Token received (first 10 chars):', token.substring(0, 10) + '...');

    let decoded;
    try {
      decoded = verifyToken(token);
      console.log('Token decoded successfully:', {
        id: decoded?.id,
        email: decoded?.email,
        role: decoded?.role
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Token verification failed:', errorMessage);
      return NextResponse.json(
        { success: false, message: 'Invalid token', error: errorMessage },
        { status: 401 }
      );
    }

    if (!decoded) {
      console.error('No decoded user data');
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    const groupId = params.groupId;
    console.log('=== FETCHING STUDY GROUP MESSAGES ===');
    console.log('Group ID:', groupId, 'User:', decoded.email);

    // Check if user is a member of the study group
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('user_study_groups')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', decoded.id)
      .single();

    if (membershipError || !membership) {
      console.error('User is not a member of this study group');
      return NextResponse.json(
        { success: false, message: 'You are not a member of this study group' },
        { status: 403 }
      );
    }

    // Get messages directly from the table
    console.log('=== EXECUTING MESSAGES QUERY ===');
    console.log('Query details:', {
      table: 'study_group_messages',
      groupId,
      select: `
        *,
        user:user_id(id, name, email),
        reactions:study_group_message_reactions(
          id,
          emoji,
          user_id,
          created_at,
          user:user_id(id, name, email)
        )
      `
    });

    const { data: messages, error } = await supabaseAdmin
      .from('study_group_messages')
      .select(`
        *,
        user:user_id(id, name, email),
        reactions:study_group_message_reactions(
          id,
          emoji,
          user_id,
          created_at,
          user:user_id(id, name, email)
        )
      `)
      .eq('group_id', groupId)
      .order('created_at', { ascending: true })
      .limit(50);

    // Process messages to handle bot messages properly
    const processedMessages = (messages || []).map((message: any) => {
      if (message.message_type === 'system' && message.user_id === '00000000-0000-0000-0000-000000000001') {
        return {
          ...message,
          user: null,
          user_name: 'StudyBot',
          user_email: null,
          user_role: 'bot'
        };
      }
      return message;
    });

    console.log('Messages query result:', {
      count: messages?.length,
      error: error?.message,
      errorCode: error?.code,
      errorDetails: error?.details,
      errorHint: error?.hint,
      firstMessage: messages?.[0] ? {
        id: messages[0].id,
        user_name: messages[0].user?.name,
        content: messages[0].content?.substring(0, 50)
      } : null
    });

    if (error) {
      console.error('Supabase query error:', {
        code: error.code,
        details: error.details,
        hint: error.hint,
        message: error.message
      });
      throw error;
    }

    return NextResponse.json({
      success: true,
      messages: processedMessages || [],
      userRole: membership.role
    });

  } catch (error) {
    console.error('=== GET STUDY GROUP MESSAGES API CATCH BLOCK ===');
    console.error('Get study group messages API error:', error);
    console.error('Error type:', typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch study group messages',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  console.log('=== POST STUDY GROUP MESSAGE API REQUEST ===');

  try {
    const authHeader = request.headers.get('authorization');
    console.log('Auth header present:', !!authHeader);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('No or invalid authorization header');
      return NextResponse.json(
        { success: false, message: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    console.log('Token received (first 10 chars):', token.substring(0, 10) + '...');

    let decoded;
    try {
      decoded = verifyToken(token);
      console.log('Token decoded successfully:', {
        id: decoded?.id,
        email: decoded?.email,
        role: decoded?.role
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Token verification failed:', errorMessage);
      return NextResponse.json(
        { success: false, message: 'Invalid token', error: errorMessage },
        { status: 401 }
      );
    }

    if (!decoded) {
      console.error('No decoded user data');
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    const groupId = params.groupId;
    const body = await request.json();
    const { content, messageType = 'text', replyToId, fileUrl, fileName, fileSize, fileType } = body;

    console.log(`Creating message in group ${groupId} from user ${decoded.email}`);

    // Check if user is a member of the study group
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('user_study_groups')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', decoded.id)
      .single();

    if (membershipError || !membership) {
      console.error('User is not a member of this study group');
      return NextResponse.json(
        { success: false, message: 'You are not a member of this study group' },
        { status: 403 }
      );
    }

    // Validate message content
    if (messageType === 'text' && (!content || !content.trim())) {
      return NextResponse.json(
        { success: false, message: 'Message content is required' },
        { status: 400 }
      );
    }

    if (messageType === 'file' && !fileUrl) {
      return NextResponse.json(
        { success: false, message: 'File URL is required for file messages' },
        { status: 400 }
      );
    }

    // Create the message
    const { data: newMessage, error } = await supabaseAdmin
      .from('study_group_messages')
      .insert({
        group_id: groupId,
        user_id: decoded.id,
        message_type: messageType,
        content: messageType === 'text' ? content.trim() : null,
        file_url: fileUrl,
        file_name: fileName,
        file_size: fileSize,
        file_type: fileType,
        parent_message_id: replyToId || null
      })
      .select(`
        *,
        user:user_id(id, name, email)
      `)
      .single();

    if (error) {
      console.error('Database insert error:', error.message);
    } else {
      console.log(`Message created with ID: ${newMessage?.id}`);
    }

    if (error) {
      console.error('Supabase insert error:', {
        code: error.code,
        details: error.details,
        hint: error.hint,
        message: error.message
      });
      throw error;
    }

    // Check if this is a chatbot message (starts with @bot or @chatbot)
    let botResponse = null;
    if (messageType === 'text' && content && (content.startsWith('@bot ') || content.startsWith('@chatbot '))) {
      try {
        console.log('Detected chatbot message, generating response...');

        // Extract the actual message content (remove @bot/@chatbot prefix)
        const cleanMessage = content.replace(/^(@bot|@chatbot)\s+/, '');

        // Get recent conversation history for context (last 10 messages from this group)
        const { data: recentMessages, error: historyError } = await supabaseAdmin
          .from('study_group_messages')
          .select('content, message_type, user:user_id(name)')
          .eq('group_id', groupId)
          .eq('message_type', 'text')
          .order('created_at', { ascending: false })
          .limit(10);

        if (historyError) {
          console.error('Error fetching conversation history:', historyError);
        }

        // Prepare conversation history for Gemini (reverse to chronological order)
        const conversationHistory = (recentMessages || [])
          .reverse()
          .filter((msg: any) => msg.content && msg.message_type === 'text')
          .map((msg: any) => ({
            role: msg.user?.name === 'StudyBot' ? 'assistant' : 'user',
            content: msg.content
          }));

        // Generate response using Gemini with retry logic
        const geminiResult = await generateGeminiResponse(cleanMessage, conversationHistory, {
          temperature: 0.7,
          maxTokens: 500,
          model: 'gemini-1.5-flash',
          maxRetries: 3
        });

        if (geminiResult.success) {
          // Create bot response message using service role
          // First, ensure the bot user exists in the users table
          const botUserId = '00000000-0000-0000-0000-000000000001';

          // Try to create or update the bot user with an allowed role
          const { error: upsertError } = await supabaseAdmin
            .from('users')
            .upsert({
              id: botUserId,
              name: 'StudyBot',
              email: 'bot@studyhub.com',
              role: 'student', // Use 'student' role which should be allowed
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'id'
            });

          if (upsertError) {
            console.error('Error creating/updating bot user:', upsertError);
            // Continue anyway - the user might already exist
          }

          const { data: botMessage, error: botError } = await supabaseAdmin
            .from('study_group_messages')
            .insert({
              group_id: groupId,
              user_id: botUserId, // System bot user ID
              message_type: 'system', // Use 'system' type which is already allowed
              content: geminiResult.text,
              parent_message_id: newMessage.id
            })
            .select()
            .single();

          if (botError) {
            console.error('Error creating bot response:', botError);
          } else {
            console.log('Bot response created successfully');
            botResponse = {
              ...botMessage,
              user: null,
              user_name: 'StudyBot',
              user_email: null,
              user_role: 'bot'
            };
          }
        } else {
          console.error('Gemini API error:', geminiResult.error);
        }
      } catch (botError) {
        console.error('Error generating bot response:', botError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Message sent successfully',
      messageData: {
        ...newMessage,
        // Ensure user info is included
        user: newMessage.user || null,
        user_name: newMessage.user?.name || null,
        user_email: newMessage.user?.email || null,
        user_role: membership.role || 'member'
      },
      botResponse
    });

  } catch (error) {
    console.error('=== POST STUDY GROUP MESSAGE API CATCH BLOCK ===');
    console.error('Post study group message API error:', error);
    console.error('Error type:', typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to send message',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}
