import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyToken } from '@/backend/utils/auth';

export async function GET(request: NextRequest) {
  console.log('=== GET PREDICTIVE INSIGHTS API REQUEST ===');

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

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId') || decoded.id;
    const quizId = searchParams.get('quizId');

    console.log('=== FETCHING PREDICTIVE INSIGHTS ===');
    console.log('Student ID:', studentId);
    console.log('Quiz ID:', quizId);
    console.log('User Role:', decoded.role);

    // Check permissions
    if (decoded.role === 'student' && studentId !== decoded.id) {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      );
    }

    let query = supabaseAdmin
      .from('predictive_insights')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (quizId) {
      query = query.eq('quiz_id', quizId);
    }

    const { data: insights, error } = await query.limit(20);

    console.log('Predictive insights query result:', {
      count: insights?.length,
      error: error?.message
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

    // If no insights exist and we have a specific quiz, generate predictions
    if ((!insights || insights.length === 0) && quizId) {
      console.log('No existing insights found, generating predictions...');

      try {
        const { data: predictions, error: predictError } = await supabaseAdmin
          .rpc('predict_quiz_score', {
            p_student_id: studentId,
            p_quiz_id: quizId
          });

        if (predictError) {
          console.error('Error generating predictions:', predictError);
        } else if (predictions && predictions.length > 0) {
          const prediction = predictions[0];

          // Create predictive insight record
          const newInsight = {
            student_id: studentId,
            quiz_id: quizId,
            prediction_type: 'quiz_score',
            predicted_value: {
              score: prediction.predicted_score,
              confidence_level: prediction.confidence_level
            },
            factors_considered: ['historical_performance', 'quiz_difficulty'],
            accuracy_score: null // Will be updated after actual quiz attempt
          };

          const { data: insertedInsight, error: insertError } = await supabaseAdmin
            .from('predictive_insights')
            .insert(newInsight)
            .select()
            .single();

          if (insertError) {
            console.error('Error inserting predictive insight:', insertError);
          } else {
            console.log('Generated predictive insight for quiz');
            return NextResponse.json({
              success: true,
              insights: [insertedInsight],
              generated: true,
              message: 'Predictive insights generated for this quiz'
            });
          }
        }
      } catch (genError) {
        console.error('Error generating predictive insights:', genError);
      }
    }

    return NextResponse.json({
      success: true,
      insights: insights || [],
      generated: false
    });

  } catch (error) {
    console.error('=== GET PREDICTIVE INSIGHTS API CATCH BLOCK ===');
    console.error('Get predictive insights API error:', error);
    console.error('Error type:', typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch predictive insights',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  console.log('=== CREATE PREDICTIVE INSIGHT API REQUEST ===');

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

    const body = await request.json();
    const { studentId, quizId, predictionType, predictedValue, factors = [] } = body;

    console.log('=== CREATING PREDICTIVE INSIGHT ===');
    console.log('Student ID:', studentId);
    console.log('Quiz ID:', quizId);
    console.log('Prediction Type:', predictionType);

    // Only admins can create predictive insights for others
    if (decoded.role === 'student' && studentId !== decoded.id) {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      );
    }

    // Validate required fields
    if (!studentId || !predictionType || !predictedValue) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: studentId, predictionType, predictedValue' },
        { status: 400 }
      );
    }

    const newInsight = {
      student_id: studentId,
      quiz_id: quizId || null,
      prediction_type: predictionType,
      predicted_value: predictedValue,
      factors_considered: factors,
      accuracy_score: null
    };

    const { data: insight, error } = await supabaseAdmin
      .from('predictive_insights')
      .insert(newInsight)
      .select()
      .single();

    console.log('Predictive insight creation result:', {
      success: !error,
      insightId: insight?.id,
      error: error?.message
    });

    if (error) {
      console.error('Supabase insert error:', {
        code: error.code,
        details: error.details,
        hint: error.hint,
        message: error.message
      });
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Predictive insight created successfully',
      insight
    });

  } catch (error) {
    console.error('=== CREATE PREDICTIVE INSIGHT API CATCH BLOCK ===');
    console.error('Create predictive insight API error:', error);
    console.error('Error type:', typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to create predictive insight',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}