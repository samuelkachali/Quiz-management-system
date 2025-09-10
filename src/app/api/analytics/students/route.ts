import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyToken } from '@/backend/utils/auth';

export async function GET(request: NextRequest) {
  console.log('=== GET STUDENT ANALYTICS API REQUEST ===');

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
    const includeRiskAnalysis = searchParams.get('riskAnalysis') === 'true';

    console.log('=== FETCHING STUDENT ANALYTICS ===');
    console.log('Student ID:', studentId);
    console.log('Include Risk Analysis:', includeRiskAnalysis);
    console.log('User Role:', decoded.role);

    // Check permissions
    if (decoded.role === 'student' && studentId !== decoded.id) {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      );
    }

    // Get existing analytics or generate new ones
    let { data: analytics, error } = await supabaseAdmin
      .from('student_analytics')
      .select('*')
      .eq('student_id', studentId)
      .single();

    console.log('Student analytics query result:', {
      found: !!analytics,
      error: error?.message
    });

    let generated = false;

    if (error && error.code === 'PGRST116') { // No rows returned
      console.log('No existing analytics found, generating from historical data...');

      try {
        // Generate comprehensive analytics from historical data
        const analyticsData = await generateStudentAnalytics(studentId);
        generated = true;

        // Insert the generated analytics
        const { data: insertedAnalytics, error: insertError } = await supabaseAdmin
          .from('student_analytics')
          .insert(analyticsData)
          .select()
          .single();

        if (insertError) {
          console.error('Error inserting student analytics:', insertError);
        } else {
          analytics = insertedAnalytics;
        }

      } catch (genError) {
        console.error('Error generating student analytics:', genError);
      }
    } else if (error) {
      console.error('Supabase query error:', {
        code: error.code,
        details: error.details,
        hint: error.hint,
        message: error.message
      });
      throw error;
    }

    // Get additional data for comprehensive response
    const additionalData = await getAdditionalAnalyticsData(studentId);

    // Get risk analysis if requested
    let riskAnalysis = null;
    if (includeRiskAnalysis && decoded.role !== 'student') {
      riskAnalysis = await getRiskAnalysis();
    }

    return NextResponse.json({
      success: true,
      analytics: analytics,
      additionalData,
      riskAnalysis,
      generated,
      message: generated ? 'Analytics generated from historical data' : 'Analytics retrieved successfully'
    });

  } catch (error) {
    console.error('=== GET STUDENT ANALYTICS API CATCH BLOCK ===');
    console.error('Get student analytics API error:', error);
    console.error('Error type:', typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch student analytics',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

async function generateStudentAnalytics(studentId: string) {
  // Get performance metrics
  const { data: metrics } = await supabaseAdmin
    .rpc('calculate_student_performance_metrics', { p_student_id: studentId });

  // Get topic performance
  const { data: topics } = await supabaseAdmin
    .rpc('analyze_topic_performance', { p_student_id: studentId }) as { data: { mastery_level: string; topic: string }[] | null; error: any };

  // Get quiz attempts data
  const { data: attempts } = await supabaseAdmin
    .from('quiz_attempts')
    .select(`
      score,
      completed_at,
      quizzes (
        title,
        description
      )
    `)
    .eq('student_id', studentId)
    .order('completed_at', { ascending: false });

  const performanceData = metrics?.[0] || {
    total_quizzes: 0,
    average_score: 0,
    best_score: 0,
    consistency_rating: 0,
    improvement_trend: 'stable'
  };

  // Calculate additional metrics
  const scores = attempts?.map(a => a.score) || [];
  const worstScore = scores.length > 0 ? Math.min(...scores) : 0;
  const studyStreak = calculateStudyStreak(attempts || []);
  const lastActivity = attempts?.[0]?.completed_at || null;

  // Identify strengths and weaknesses
  const strengths = topics?.filter(t => t.mastery_level === 'mastered' || t.mastery_level === 'proficient')
    .map(t => t.topic) || [];
  const weaknesses = topics?.filter(t => t.mastery_level === 'needs_improvement' || t.mastery_level === 'developing')
    .map(t => t.topic) || [];

  // Generate recommendations
  const recommendedTopics = weaknesses.slice(0, 3);

  return {
    student_id: studentId,
    total_quizzes_taken: performanceData.total_quizzes,
    average_score: performanceData.average_score,
    best_score: performanceData.best_score,
    worst_score: worstScore,
    consistency_rating: performanceData.consistency_rating,
    improvement_trend: performanceData.improvement_trend,
    strengths,
    weaknesses,
    recommended_topics: recommendedTopics,
    study_streak_days: studyStreak,
    last_activity_date: lastActivity
  };
}

async function getAdditionalAnalyticsData(studentId: string) {
  // Get recent quiz attempts with details
  const { data: recentAttempts } = await supabaseAdmin
    .from('quiz_attempts')
    .select(`
      id,
      score,
      completed_at,
      quizzes (
        id,
        title,
        description,
        passing_score
      )
    `)
    .eq('student_id', studentId)
    .order('completed_at', { ascending: false })
    .limit(10);

  // Get performance by topic
  const { data: topicPerformance } = await supabaseAdmin
    .rpc('analyze_topic_performance', { p_student_id: studentId });

  // Get quiz attempt distribution
  const { data: scoreDistribution } = await supabaseAdmin
    .from('quiz_attempts')
    .select('score')
    .eq('student_id', studentId);

  // Calculate score ranges
  const distribution = {
    excellent: scoreDistribution?.filter(s => s.score >= 90).length || 0,
    good: scoreDistribution?.filter(s => s.score >= 80 && s.score < 90).length || 0,
    average: scoreDistribution?.filter(s => s.score >= 70 && s.score < 80).length || 0,
    needs_improvement: scoreDistribution?.filter(s => s.score >= 60 && s.score < 70).length || 0,
    poor: scoreDistribution?.filter(s => s.score < 60).length || 0
  };

  return {
    recentAttempts: recentAttempts || [],
    topicPerformance: topicPerformance || [],
    scoreDistribution: distribution,
    totalAttempts: scoreDistribution?.length || 0
  };
}

async function getRiskAnalysis() {
  const { data: atRiskStudents } = await supabaseAdmin
    .rpc('identify_at_risk_students') as { data: { risk_level: string }[] | null; error: any };

  return {
    atRiskStudents: atRiskStudents || [],
    totalAtRisk: atRiskStudents?.length || 0,
    riskLevels: {
      high: atRiskStudents?.filter(s => s.risk_level === 'high').length || 0,
      medium: atRiskStudents?.filter(s => s.risk_level === 'medium').length || 0,
      low: atRiskStudents?.filter(s => s.risk_level === 'low').length || 0
    }
  };
}

function calculateStudyStreak(attempts: any[]): number {
  if (!attempts || attempts.length === 0) return 0;

  // Sort by date descending
  const sortedAttempts = attempts.sort((a, b) =>
    new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
  );

  let streak = 0;
  let currentDate = new Date();

  // Check if there's activity today or yesterday
  const lastAttemptDate = new Date(sortedAttempts[0].completed_at);
  const daysDiff = Math.floor((currentDate.getTime() - lastAttemptDate.getTime()) / (1000 * 60 * 60 * 24));

  if (daysDiff <= 1) {
    streak = 1;

    // Count consecutive days
    for (let i = 1; i < sortedAttempts.length; i++) {
      const current = new Date(sortedAttempts[i - 1].completed_at);
      const previous = new Date(sortedAttempts[i].completed_at);
      const dayDiff = Math.floor((current.getTime() - previous.getTime()) / (1000 * 60 * 60 * 24));

      if (dayDiff === 1) {
        streak++;
      } else {
        break;
      }
    }
  }

  return streak;
}