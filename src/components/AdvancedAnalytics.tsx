'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  Target,
  Brain,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Users,
  BookOpen,
  Clock,
  Award,
  Zap
} from 'lucide-react';

interface LearningPattern {
  id: string;
  pattern_type: string;
  pattern_data: any;
  confidence_score: number;
  insights: string[];
  recommendations: string[];
  created_at: string;
}

interface PredictiveInsight {
  id: string;
  prediction_type: string;
  predicted_value: any;
  confidence_level: number;
  factors_considered: string[];
  created_at: string;
}

interface StudentAnalytics {
  total_quizzes_taken: number;
  average_score: number;
  best_score: number;
  consistency_rating: number;
  improvement_trend: string;
  strengths: string[];
  weaknesses: string[];
  recommended_topics: string[];
  study_streak_days: number;
}

interface RiskAnalysis {
  atRiskStudents: any[];
  totalAtRisk: number;
  riskLevels: {
    high: number;
    medium: number;
    low: number;
  };
}

interface AdvancedAnalyticsProps {
  quizzes: any[];
  attempts: any[];
}

export default function AdvancedAnalytics({ quizzes, attempts }: AdvancedAnalyticsProps) {
  const [learningPatterns, setLearningPatterns] = useState<LearningPattern[]>([]);
  const [predictiveInsights, setPredictiveInsights] = useState<PredictiveInsight[]>([]);
  const [studentAnalytics, setStudentAnalytics] = useState<StudentAnalytics | null>(null);
  const [riskAnalysis, setRiskAnalysis] = useState<RiskAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const router = useRouter();

  useEffect(() => {
    // Set basic stats from props immediately
    const basicStats = calculateBasicStats();
    setStudentAnalytics(basicStats);

    // Then fetch additional analytics data
    fetchAnalyticsData();
  }, [quizzes.length, attempts.length]); // Only recalculate when data changes

  // Calculate basic statistics from props
  const calculateBasicStats = () => {
    const totalQuizzes = quizzes.length;
    const totalAttempts = attempts.length;
    const averageScore = totalAttempts > 0
      ? Math.round(attempts.reduce((sum, a) => sum + (a.score || 0), 0) / totalAttempts)
      : 0;
    const bestScore = totalAttempts > 0
      ? Math.max(...attempts.map(a => a.score || 0))
      : 0;
    const consistencyRating = totalAttempts > 0
      ? Math.min(1, totalAttempts / 10) // Simple consistency calculation
      : 0;

    return {
      total_quizzes_taken: totalQuizzes,
      average_score: averageScore,
      best_score: bestScore,
      consistency_rating: consistencyRating,
      improvement_trend: 'stable',
      strengths: [],
      weaknesses: [],
      recommended_topics: [],
      study_streak_days: 0
    };
  };

  const fetchAnalyticsData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      // Fetch all analytics data in parallel
      const [
        patternsRes,
        insightsRes,
        analyticsRes,
        riskRes
      ] = await Promise.all([
        fetch('/api/analytics/learning-patterns', { headers }),
        fetch('/api/analytics/predictive-insights', { headers }),
        fetch('/api/analytics/students', { headers }),
        fetch('/api/analytics/students?riskAnalysis=true', { headers })
      ]);

      const [
        patternsData,
        insightsData,
        analyticsData,
        riskData
      ] = await Promise.all([
        patternsRes.json(),
        insightsRes.json(),
        analyticsRes.json(),
        riskRes.json()
      ]);

      if (patternsData.success) setLearningPatterns(patternsData.patterns);
      if (insightsData.success) setPredictiveInsights(insightsData.insights);
      // Don't override studentAnalytics with API data - we calculate it from props
      if (riskData.success) setRiskAnalysis(riskData.riskAnalysis);

    } catch (error) {
      console.error('Error fetching analytics data:', error);
      // Don't set error state here as we want to show empty states instead
    } finally {
      setLoading(false);
    }
  };

  const getPatternIcon = (type: string) => {
    switch (type) {
      case 'performance_trend': return <TrendingUp className="w-5 h-5" />;
      case 'topic_mastery': return <BookOpen className="w-5 h-5" />;
      case 'consistency': return <Target className="w-5 h-5" />;
      case 'time_management': return <Clock className="w-5 h-5" />;
      default: return <Brain className="w-5 h-5" />;
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 bg-green-100';
    if (score >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'declining': return <TrendingDown className="w-4 h-4 text-red-500" />;
      default: return <Target className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRiskBadgeColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <div className="text-gray-600">Analyzing learning patterns...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Advanced Analytics</h1>
          <p className="text-gray-600 mt-2">AI-powered insights into learning patterns and performance predictions</p>
        </div>
        <Button onClick={fetchAnalyticsData} variant="outline">
          <BarChart3 className="w-4 h-4 mr-2" />
          Refresh Analytics
        </Button>
      </div>

      {/* Overview Cards */}
      {studentAnalytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Total Quizzes</p>
                  <p className="text-2xl font-bold text-blue-900">{studentAnalytics.total_quizzes_taken ?? 0}</p>
                </div>
                <BookOpen className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Average Score</p>
                  <p className="text-2xl font-bold text-green-900">{(studentAnalytics.average_score ?? 0).toFixed(1)}%</p>
                </div>
                <Award className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">Consistency</p>
                  <p className="text-2xl font-bold text-purple-900">{Math.round((studentAnalytics.consistency_rating ?? 0) * 100)}%</p>
                </div>
                <Target className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600">Study Streak</p>
                  <p className="text-2xl font-bold text-orange-900">{studentAnalytics.study_streak_days ?? 0} days</p>
                </div>
                <Zap className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="patterns">Learning Patterns</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
          <TabsTrigger value="risks">Risk Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Performance Overview */}
          {studentAnalytics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    {getTrendIcon(studentAnalytics.improvement_trend)}
                    <span>Performance Trend</span>
                  </CardTitle>
                  <CardDescription>Your learning progress over time</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Trend</span>
                    <Badge variant="outline" className="capitalize">
                      {studentAnalytics.improvement_trend}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Best Score</span>
                      <span className="font-medium">{studentAnalytics.best_score ?? 0}%</span>
                    </div>
                    <Progress value={studentAnalytics.best_score ?? 0} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Average Score</span>
                      <span className="font-medium">{(studentAnalytics.average_score ?? 0).toFixed(1)}%</span>
                    </div>
                    <Progress value={studentAnalytics.average_score ?? 0} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Brain className="w-5 h-5" />
                    <span>Strengths & Weaknesses</span>
                  </CardTitle>
                  <CardDescription>Areas of excellence and improvement</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {studentAnalytics.strengths.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-green-700 mb-2">Strengths</h4>
                      <div className="flex flex-wrap gap-2">
                        {studentAnalytics.strengths.map((strength, index) => (
                          <Badge key={index} className="bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            {strength}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {studentAnalytics.weaknesses.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-red-700 mb-2">Areas for Improvement</h4>
                      <div className="flex flex-wrap gap-2">
                        {studentAnalytics.weaknesses.map((weakness, index) => (
                          <Badge key={index} className="bg-red-100 text-red-800">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            {weakness}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {studentAnalytics.recommended_topics.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-blue-700 mb-2">Recommended Focus</h4>
                      <div className="flex flex-wrap gap-2">
                        {studentAnalytics.recommended_topics.map((topic, index) => (
                          <Badge key={index} className="bg-blue-100 text-blue-800">
                            <BookOpen className="w-3 h-3 mr-1" />
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="patterns" className="space-y-6">
          <div className="grid gap-6">
            {learningPatterns.map((pattern) => (
              <Card key={pattern.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      {getPatternIcon(pattern.pattern_type)}
                      <span className="capitalize">{pattern.pattern_type.replace('_', ' ')}</span>
                    </CardTitle>
                    <Badge className={getConfidenceColor(pattern.confidence_score)}>
                      {Math.round(pattern.confidence_score * 100)}% confidence
                    </Badge>
                  </div>
                  <CardDescription>
                    Analysis generated on {new Date(pattern.created_at).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {pattern.insights.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Key Insights</h4>
                      <ul className="space-y-1">
                        {pattern.insights.map((insight, index) => (
                          <li key={index} className="text-sm text-gray-600 flex items-start space-x-2">
                            <span className="text-blue-500 mt-1">•</span>
                            <span>{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {pattern.recommendations.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Recommendations</h4>
                      <ul className="space-y-1">
                        {pattern.recommendations.map((rec, index) => (
                          <li key={index} className="text-sm text-gray-600 flex items-start space-x-2">
                            <span className="text-green-500 mt-1">→</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {learningPatterns.length === 0 && (
              <Card className="bg-gray-50 border-gray-200">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">No Learning Patterns Yet</h3>
                    <p className="text-gray-500">Complete more quizzes to generate personalized learning patterns and insights.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-6">
          <div className="grid gap-6">
            {predictiveInsights.map((insight) => (
              <Card key={insight.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      <Target className="w-5 h-5" />
                      <span className="capitalize">{insight.prediction_type.replace('_', ' ')}</span>
                    </CardTitle>
                    <Badge className={getConfidenceColor(insight.confidence_level)}>
                      {Math.round(insight.confidence_level * 100)}% confidence
                    </Badge>
                  </div>
                  <CardDescription>
                    Prediction generated on {new Date(insight.created_at).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-700 mb-2">Predicted Outcome</h4>
                    <div className="text-2xl font-bold text-blue-900">
                      {insight.prediction_type === 'quiz_score'
                        ? `${insight.predicted_value.score}%`
                        : JSON.stringify(insight.predicted_value)
                      }
                    </div>
                  </div>

                  {insight.factors_considered.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Factors Considered</h4>
                      <div className="flex flex-wrap gap-2">
                        {insight.factors_considered.map((factor, index) => (
                          <Badge key={index} variant="outline">
                            {factor.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {predictiveInsights.length === 0 && (
              <Card className="bg-gray-50 border-gray-200">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">No Predictions Yet</h3>
                    <p className="text-gray-500">Predictions will be generated as you complete more quizzes.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="risks" className="space-y-6">
          {riskAnalysis ? (
            <div className="space-y-6">
              {/* Risk Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-red-50 border-red-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-red-600">High Risk</p>
                        <p className="text-2xl font-bold text-red-900">{riskAnalysis.riskLevels.high}</p>
                      </div>
                      <AlertTriangle className="w-8 h-8 text-red-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-yellow-50 border-yellow-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-yellow-600">Medium Risk</p>
                        <p className="text-2xl font-bold text-yellow-900">{riskAnalysis.riskLevels.medium}</p>
                      </div>
                      <AlertTriangle className="w-8 h-8 text-yellow-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-600">Low Risk</p>
                        <p className="text-2xl font-bold text-blue-900">{riskAnalysis.riskLevels.low}</p>
                      </div>
                      <AlertTriangle className="w-8 h-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* At-Risk Students List */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="w-5 h-5" />
                    <span>Students Needing Attention</span>
                  </CardTitle>
                  <CardDescription>
                    Students identified as potentially at risk based on performance patterns
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {riskAnalysis.atRiskStudents.map((student) => (
                      <div key={student.student_id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <div>
                              <h4 className="font-medium text-gray-900">{student.student_name}</h4>
                              <p className="text-sm text-gray-600">Last score: {student.last_score}%</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 mt-2">
                            <Badge className={getRiskBadgeColor(student.risk_level)}>
                              {student.risk_level.toUpperCase()} RISK
                            </Badge>
                            <span className="text-sm text-gray-500">
                              {student.days_since_last_attempt} days inactive
                            </span>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </div>
                    ))}

                    {riskAnalysis.atRiskStudents.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                        <p>No students currently identified as at risk.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="bg-gray-50 border-gray-200">
              <CardContent className="pt-6">
                <div className="text-center">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">Risk Analysis Unavailable</h3>
                  <p className="text-gray-500">Risk analysis is only available to administrators.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}