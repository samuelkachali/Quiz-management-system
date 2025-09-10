import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyToken } from '@/backend/utils/auth';

export async function GET(request: NextRequest) {
  console.log('=== GET LEARNING PATTERNS API REQUEST ===');

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
    const patternType = searchParams.get('patternType');

    console.log('=== FETCHING LEARNING PATTERNS ===');
    console.log('Student ID:', studentId);
    console.log('Pattern Type:', patternType);
    console.log('User Role:', decoded.role);

    // Check permissions - students can only view their own patterns, admins can view all
    if (decoded.role === 'student' && studentId !== decoded.id) {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      );
    }

    let query = supabaseAdmin
      .from('learning_patterns')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (patternType) {
      query = query.eq('pattern_type', patternType);
    }

    const { data: patterns, error } = await query.limit(50);

    console.log('Learning patterns query result:', {
      count: patterns?.length,
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

    // If no patterns exist, generate them from historical data
    if (!patterns || patterns.length === 0) {
      console.log('No existing patterns found, generating from historical data...');

      try {
        // Generate performance metrics
        const { data: metrics, error: metricsError } = await supabaseAdmin
          .rpc('calculate_student_performance_metrics', { p_student_id: studentId });

        if (metricsError) {
          console.error('Error calculating performance metrics:', metricsError);
        }

        // Generate topic performance analysis
        const { data, error: topicsError } = await supabaseAdmin
          .rpc('analyze_topic_performance', { p_student_id: studentId });
        const topics = data as { mastery_level: string; topic: string }[] | null;

        if (topicsError) {
          console.error('Error analyzing topic performance:', topicsError);
        }

        // Create learning patterns from the data
        const newPatterns = [];

        if (metrics && metrics.length > 0) {
          const metric = metrics[0];

          // Performance trend pattern
          newPatterns.push({
            student_id: studentId,
            pattern_type: 'performance_trend',
            pattern_data: {
              total_quizzes: metric.total_quizzes,
              average_score: metric.average_score,
              improvement_trend: metric.improvement_trend,
              consistency_rating: metric.consistency_rating
            },
            confidence_score: 0.85,
            insights: [
              `Completed ${metric.total_quizzes} quizzes with an average score of ${metric.average_score}%`,
              `Performance trend: ${metric.improvement_trend}`,
              `Consistency rating: ${Math.round(metric.consistency_rating * 100)}%`
            ],
            recommendations: generateRecommendations(metric, 'performance_trend')
          });

          // Consistency pattern
          newPatterns.push({
            student_id: studentId,
            pattern_type: 'consistency',
            pattern_data: {
              consistency_rating: metric.consistency_rating,
              total_quizzes: metric.total_quizzes
            },
            confidence_score: 0.90,
            insights: [
              `Consistency rating: ${Math.round(metric.consistency_rating * 100)}%`,
              `Based on ${metric.total_quizzes} quiz attempts`
            ],
            recommendations: generateRecommendations(metric, 'consistency')
          });
        }

        if (topics && topics.length > 0) {
          // Topic mastery pattern
          const strengths = topics.filter(t => t.mastery_level === 'mastered' || t.mastery_level === 'proficient');
          const weaknesses = topics.filter(t => t.mastery_level === 'needs_improvement');

          newPatterns.push({
            student_id: studentId,
            pattern_type: 'topic_mastery',
            pattern_data: {
              topics: topics,
              strengths: strengths.map(s => s.topic),
              weaknesses: weaknesses.map(w => w.topic)
            },
            confidence_score: 0.80,
            insights: [
              `Strong in ${strengths.length} topics: ${strengths.map(s => s.topic).join(', ')}`,
              `Needs improvement in ${weaknesses.length} topics: ${weaknesses.map(w => w.topic).join(', ')}`
            ],
            recommendations: generateRecommendations({ strengths, weaknesses }, 'topic_mastery')
          });
        }

        // Insert new patterns
        if (newPatterns.length > 0) {
          const { data: insertedPatterns, error: insertError } = await supabaseAdmin
            .from('learning_patterns')
            .insert(newPatterns)
            .select();

          if (insertError) {
            console.error('Error inserting learning patterns:', insertError);
          } else {
            console.log(`Generated ${insertedPatterns?.length} learning patterns`);
            return NextResponse.json({
              success: true,
              patterns: insertedPatterns || [],
              generated: true,
              message: 'Learning patterns generated from historical data'
            });
          }
        }

      } catch (genError) {
        console.error('Error generating learning patterns:', genError);
      }
    }

    return NextResponse.json({
      success: true,
      patterns: patterns || [],
      generated: false
    });

  } catch (error) {
    console.error('=== GET LEARNING PATTERNS API CATCH BLOCK ===');
    console.error('Get learning patterns API error:', error);
    console.error('Error type:', typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch learning patterns',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

function generateRecommendations(data: any, patternType: string): string[] {
  const recommendations = [];

  switch (patternType) {
    case 'performance_trend':
      if (data.improvement_trend === 'declining') {
        recommendations.push('Consider reviewing study materials and seeking additional help');
        recommendations.push('Focus on understanding core concepts before attempting quizzes');
      } else if (data.improvement_trend === 'improving') {
        recommendations.push('Great progress! Keep up the current study habits');
        recommendations.push('Consider challenging yourself with more difficult topics');
      }

      if (data.consistency_rating < 0.7) {
        recommendations.push('Work on consistent study schedule to improve performance stability');
      }
      break;

    case 'consistency':
      if (data.consistency_rating < 0.6) {
        recommendations.push('Establish a regular study routine');
        recommendations.push('Review mistakes consistently after each quiz');
      }
      break;

    case 'topic_mastery':
      if (data.weaknesses && data.weaknesses.length > 0) {
        recommendations.push(`Focus on improving: ${data.weaknesses.slice(0, 3).join(', ')}`);
        recommendations.push('Consider additional resources for weak topics');
      }
      if (data.strengths && data.strengths.length > 0) {
        recommendations.push(`Leverage strengths in: ${data.strengths.slice(0, 2).join(', ')}`);
      }
      break;
  }

  return recommendations.length > 0 ? recommendations : ['Continue current study approach'];
}