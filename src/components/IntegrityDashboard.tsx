'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface IntegrityViolation {
  id: string;
  session_id: string;
  quiz_id: string;
  student_id: string;
  violation_type: string;
  description: string;
  severity: string;
  metadata: any;
  created_at: string;
  student?: {
    id: string;
    name: string;
    email: string;
  };
  quiz?: {
    id: string;
    title: string;
  };
}

interface QuizSession {
  id: string;
  quiz_id: string;
  student_id: string;
  start_time: string;
  end_time?: string;
  duration_seconds?: number;
  flagged_for_review: boolean;
  risk_level: string;
  violation_count: number;
  status: string;
  created_at: string;
  updated_at: string;
}

interface IntegritySummary {
  total: number;
  high: number;
  medium: number;
  low: number;
}

export default function IntegrityDashboard() {
  const [violations, setViolations] = useState<IntegrityViolation[]>([]);
  const [sessions, setSessions] = useState<QuizSession[]>([]);
  const [summary, setSummary] = useState<IntegritySummary>({ total: 0, high: 0, medium: 0, low: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<QuizSession | null>(null);
  const [sessionViolations, setSessionViolations] = useState<IntegrityViolation[]>([]);

  useEffect(() => {
    fetchIntegrityData();
  }, []);

  const fetchIntegrityData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required');
        return;
      }

      // Fetch integrity violations
      const violationsResponse = await fetch('/api/quiz/integrity', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (violationsResponse.ok) {
        const violationsData = await violationsResponse.json();
        setViolations(violationsData.violations || []);
        setSummary(violationsData.summary || { total: 0, high: 0, medium: 0, low: 0 });
      } else {
        const errorData = await violationsResponse.json();
        setError(errorData.message || 'Failed to load integrity data');
      }

      // Fetch flagged sessions
      const sessionsResponse = await fetch('/api/admin/sessions?flagged=true', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (sessionsResponse.ok) {
        const sessionsData = await sessionsResponse.json();
        setSessions(sessionsData.sessions || []);
      }

    } catch (error) {
      console.error('Error fetching integrity data:', error);
      setError('Failed to load integrity data');
    } finally {
      setLoading(false);
    }
  };

  const viewSessionDetails = async (session: QuizSession) => {
    setSelectedSession(session);

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/quiz/integrity?sessionId=${session.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSessionViolations(data.violations || []);
      }
    } catch (error) {
      console.error('Error fetching session violations:', error);
    }
  };

  const formatTime = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-700 bg-red-100';
      case 'medium': return 'text-yellow-700 bg-yellow-100';
      default: return 'text-blue-700 bg-blue-100';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-green-600 bg-green-100';
    }
  };

  const getViolationTypeIcon = (type: string) => {
    switch (type) {
      case 'tab_switch': return '🔄';
      case 'copy_paste': return '📋';
      case 'time_anomaly': return '⏰';
      case 'suspicious_activity': return '⚠️';
      default: return '❓';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <div className="text-xl text-gray-700">Loading integrity data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 text-5xl mb-4">⚠️</div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Error Loading Integrity Data</h2>
        <p className="text-gray-600 mb-6">{error}</p>
        <Button onClick={fetchIntegrityData}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Academic Integrity Dashboard</h2>
          <p className="text-gray-600">Monitor quiz sessions and integrity violations</p>
        </div>
        <Button onClick={fetchIntegrityData} variant="outline">
          🔄 Refresh Data
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-white/70 backdrop-blur-sm shadow-lg border border-white/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Violations</p>
                <p className="text-3xl font-bold text-gray-900">{summary.total}</p>
              </div>
              <div className="text-3xl">📊</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-50/70 backdrop-blur-sm shadow-lg border border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">High Severity</p>
                <p className="text-3xl font-bold text-red-700">{summary.high}</p>
              </div>
              <div className="text-3xl">🚨</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-yellow-50/70 backdrop-blur-sm shadow-lg border border-yellow-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600">Medium Severity</p>
                <p className="text-3xl font-bold text-yellow-700">{summary.medium}</p>
              </div>
              <div className="text-3xl">⚠️</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50/70 backdrop-blur-sm shadow-lg border border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Flagged Sessions</p>
                <p className="text-3xl font-bold text-blue-700">{sessions.length}</p>
              </div>
              <div className="text-3xl">🚩</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="violations" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="violations">Recent Violations</TabsTrigger>
          <TabsTrigger value="sessions">Flagged Sessions</TabsTrigger>
        </TabsList>

        <TabsContent value="violations" className="space-y-6">
          {violations.length === 0 ? (
            <Card className="bg-green-50/50 border-green-200">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-4xl mb-4">✅</div>
                  <h3 className="text-lg font-semibold text-green-800 mb-2">No Integrity Violations</h3>
                  <p className="text-green-700">All quiz sessions are running smoothly with no integrity concerns.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {violations.slice(0, 20).map((violation) => (
                <Card key={violation.id} className="bg-white/70 backdrop-blur-sm shadow-lg border border-white/20">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className="text-2xl">{getViolationTypeIcon(violation.violation_type)}</span>
                          <div>
                            <h4 className="font-semibold text-gray-900">{violation.description}</h4>
                            <p className="text-sm text-gray-600">
                              {violation.student?.name} ({violation.student?.email}) • {violation.quiz?.title}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>{new Date(violation.created_at).toLocaleString()}</span>
                          <Badge className={`${getSeverityColor(violation.severity)} border-0`}>
                            {violation.severity.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sessions" className="space-y-6">
          {sessions.length === 0 ? (
            <Card className="bg-green-50/50 border-green-200">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-4xl mb-4">🎉</div>
                  <h3 className="text-lg font-semibold text-green-800 mb-2">No Flagged Sessions</h3>
                  <p className="text-green-700">All quiz sessions are proceeding without integrity concerns.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => (
                <Card key={session.id} className="bg-white/70 backdrop-blur-sm shadow-lg border border-white/20">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className="text-2xl">🚩</span>
                          <div>
                            <h4 className="font-semibold text-gray-900">Session {session.id.slice(-8)}</h4>
                            <p className="text-sm text-gray-600">
                              Quiz ID: {session.quiz_id.slice(-8)} • Started: {new Date(session.start_time).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4 text-sm">
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-500">Duration:</span>
                            <span className="font-medium">{formatTime(session.duration_seconds)}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-500">Violations:</span>
                            <span className="font-medium text-red-600">{session.violation_count}</span>
                          </div>
                          <Badge className={`${getRiskColor(session.risk_level)} border-0`}>
                            Risk: {session.risk_level.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" onClick={() => viewSessionDetails(session)}>
                            View Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Session Details - {session.id.slice(-8)}</DialogTitle>
                            <DialogDescription>
                              Detailed integrity monitoring for this quiz session
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <h4 className="font-semibold text-gray-900 mb-2">Session Info</h4>
                                <div className="space-y-2 text-sm">
                                  <p><span className="font-medium">Start Time:</span> {new Date(session.start_time).toLocaleString()}</p>
                                  <p><span className="font-medium">Duration:</span> {formatTime(session.duration_seconds)}</p>
                                  <p><span className="font-medium">Status:</span> {session.status}</p>
                                  <p><span className="font-medium">Risk Level:</span> {session.risk_level}</p>
                                </div>
                              </div>
                              <div>
                                <h4 className="font-semibold text-gray-900 mb-2">Violation Summary</h4>
                                <div className="space-y-2 text-sm">
                                  <p><span className="font-medium">Total Violations:</span> {session.violation_count}</p>
                                  <p><span className="font-medium">Flagged for Review:</span> {session.flagged_for_review ? 'Yes' : 'No'}</p>
                                </div>
                              </div>
                            </div>

                            {sessionViolations.length > 0 && (
                              <div>
                                <h4 className="font-semibold text-gray-900 mb-4">Violation Timeline</h4>
                                <div className="space-y-3 max-h-96 overflow-y-auto">
                                  {sessionViolations.map((violation) => (
                                    <div key={violation.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                                      <span className="text-xl">{getViolationTypeIcon(violation.violation_type)}</span>
                                      <div className="flex-1">
                                        <p className="font-medium text-gray-900">{violation.description}</p>
                                        <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                                          <span>{new Date(violation.created_at).toLocaleString()}</span>
                                          <Badge className={`${getSeverityColor(violation.severity)} border-0 text-xs`}>
                                            {violation.severity}
                                          </Badge>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}