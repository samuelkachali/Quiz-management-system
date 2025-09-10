'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface IntegrityViolation {
  id: string;
  type: 'tab_switch' | 'copy_paste' | 'time_anomaly' | 'suspicious_activity';
  description: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high';
  quizId: string;
  studentId: string;
}

interface QuizSession {
  id: string;
  quizId: string;
  studentId: string;
  startTime: Date;
  endTime?: Date;
  violations: IntegrityViolation[];
  status: 'active' | 'completed' | 'flagged';
  riskLevel: 'low' | 'medium' | 'high';
}

interface AcademicIntegrityMonitorProps {
  quizId: string;
  studentId: string;
  onViolation?: (violation: IntegrityViolation) => void;
  onSessionEnd?: (session: QuizSession) => void;
}

export default function AcademicIntegrityMonitor({
  quizId,
  studentId,
  onViolation,
  onSessionEnd
}: AcademicIntegrityMonitorProps) {
  const [session, setSession] = useState<QuizSession | null>(null);
  const [violations, setViolations] = useState<IntegrityViolation[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [tabSwitches, setTabSwitches] = useState(0);
  const [copyAttempts, setCopyAttempts] = useState(0);
  const [pasteAttempts, setPasteAttempts] = useState(0);
  const [timeSpent, setTimeSpent] = useState(0);

  const sessionRef = useRef<QuizSession | null>(null);
  const startTimeRef = useRef<Date | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const visibilityRef = useRef<boolean>(true);

  useEffect(() => {
    // Initialize monitoring session
    const newSession: QuizSession = {
      id: `session_${Date.now()}`,
      quizId,
      studentId,
      startTime: new Date(),
      violations: [],
      status: 'active',
      riskLevel: 'low'
    };

    setSession(newSession);
    sessionRef.current = newSession;
    startTimeRef.current = new Date();

    // Start monitoring
    startMonitoring();

    return () => {
      stopMonitoring();
    };
  }, [quizId, studentId]);

  const startMonitoring = () => {
    setIsMonitoring(true);

    // Tab visibility monitoring
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      visibilityRef.current = isVisible;

      if (!isVisible) {
        // Tab was switched away
        const violation: IntegrityViolation = {
          id: `violation_${Date.now()}`,
          type: 'tab_switch',
          description: 'Student switched away from quiz tab',
          timestamp: new Date(),
          severity: 'medium',
          quizId,
          studentId
        };

        recordViolation(violation);
        setTabSwitches(prev => prev + 1);

        // Show warning after multiple switches
        if (tabSwitches >= 2) {
          setWarningMessage('Multiple tab switches detected. This may affect your quiz score.');
          setShowWarning(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Copy/Paste prevention
    const handleCopy = (e: ClipboardEvent) => {
      const violation: IntegrityViolation = {
        id: `violation_${Date.now()}`,
        type: 'copy_paste',
        description: 'Attempted to copy content during quiz',
        timestamp: new Date(),
        severity: 'high',
        quizId,
        studentId
      };

      recordViolation(violation);
      setCopyAttempts(prev => prev + 1);

      // Prevent copy
      e.preventDefault();
      setWarningMessage('Copying is not allowed during the quiz.');
      setShowWarning(true);
    };

    const handlePaste = (e: ClipboardEvent) => {
      const violation: IntegrityViolation = {
        id: `violation_${Date.now()}`,
        type: 'copy_paste',
        description: 'Attempted to paste content during quiz',
        timestamp: new Date(),
        severity: 'high',
        quizId,
        studentId
      };

      recordViolation(violation);
      setPasteAttempts(prev => prev + 1);

      // Prevent paste
      e.preventDefault();
      setWarningMessage('Pasting is not allowed during the quiz.');
      setShowWarning(true);
    };

    const handleCut = (e: ClipboardEvent) => {
      const violation: IntegrityViolation = {
        id: `violation_${Date.now()}`,
        type: 'copy_paste',
        description: 'Attempted to cut content during quiz',
        timestamp: new Date(),
        severity: 'high',
        quizId,
        studentId
      };

      recordViolation(violation);
      setCopyAttempts(prev => prev + 1);

      // Prevent cut
      e.preventDefault();
      setWarningMessage('Cutting is not allowed during the quiz.');
      setShowWarning(true);
    };

    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('cut', handleCut);

    // Context menu prevention
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      const violation: IntegrityViolation = {
        id: `violation_${Date.now()}`,
        type: 'suspicious_activity',
        description: 'Right-click context menu accessed',
        timestamp: new Date(),
        severity: 'low',
        quizId,
        studentId
      };

      recordViolation(violation);
    };

    document.addEventListener('contextmenu', handleContextMenu);

    // Keyboard shortcuts prevention
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent Ctrl+C, Ctrl+V, Ctrl+X, F12, etc.
      if (
        (e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'x')) ||
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        (e.ctrlKey && e.shiftKey && e.key === 'J') ||
        (e.ctrlKey && e.shiftKey && e.key === 'C')
      ) {
        e.preventDefault();
        const violation: IntegrityViolation = {
          id: `violation_${Date.now()}`,
          type: 'suspicious_activity',
          description: `Attempted to use keyboard shortcut: ${e.key}`,
          timestamp: new Date(),
          severity: 'medium',
          quizId,
          studentId
        };

        recordViolation(violation);
        setWarningMessage('This action is not allowed during the quiz.');
        setShowWarning(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Timer for session tracking
    timerRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const elapsed = Math.floor((Date.now() - startTimeRef.current.getTime()) / 1000);
        setTimeSpent(elapsed);

        // Check for suspicious time patterns
        if (elapsed > 3600) { // More than 1 hour
          const violation: IntegrityViolation = {
            id: `violation_${Date.now()}`,
            type: 'time_anomaly',
            description: 'Unusually long quiz session detected',
            timestamp: new Date(),
            severity: 'low',
            quizId,
            studentId
          };

          recordViolation(violation);
        }
      }
    }, 1000);

    // Cleanup function
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  };

  const stopMonitoring = () => {
    setIsMonitoring(false);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // End session
    if (sessionRef.current) {
      const endedSession: QuizSession = {
        ...sessionRef.current,
        endTime: new Date(),
        status: 'completed',
        violations: violations
      };

      setSession(endedSession);
      onSessionEnd?.(endedSession);
    }
  };

  const recordViolation = (violation: IntegrityViolation) => {
    setViolations(prev => [...prev, violation]);

    // Update session risk level
    if (sessionRef.current) {
      let newRiskLevel = sessionRef.current.riskLevel;

      if (violation.severity === 'high' || violations.filter(v => v.severity === 'high').length >= 2) {
        newRiskLevel = 'high';
      } else if (violation.severity === 'medium' || violations.filter(v => v.severity === 'medium').length >= 3) {
        newRiskLevel = 'medium';
      }

      sessionRef.current = {
        ...sessionRef.current,
        violations: [...sessionRef.current.violations, violation],
        riskLevel: newRiskLevel
      };

      setSession(sessionRef.current);
    }

    onViolation?.(violation);
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-green-600 bg-green-100';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-700 bg-red-100';
      case 'medium': return 'text-yellow-700 bg-yellow-100';
      default: return 'text-blue-700 bg-blue-100';
    }
  };

  return (
    <div className="space-y-4">
      {/* Integrity Monitor Status */}
      <Card className="bg-white/70 backdrop-blur-sm shadow-lg border border-white/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg text-gray-900 flex items-center">
                <span className="mr-2">🛡️</span>
                Academic Integrity Monitor
              </CardTitle>
              <CardDescription>
                Monitoring quiz session for academic integrity
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className={`${getRiskColor(session?.riskLevel || 'low')} border-0`}>
                Risk: {session?.riskLevel?.toUpperCase() || 'LOW'}
              </Badge>
              <div className={`w-3 h-3 rounded-full ${isMonitoring ? 'bg-green-500' : 'bg-red-500'}`}></div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{formatTime(timeSpent)}</div>
              <div className="text-sm text-gray-600">Time Elapsed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{tabSwitches}</div>
              <div className="text-sm text-gray-600">Tab Switches</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{copyAttempts}</div>
              <div className="text-sm text-gray-600">Copy Attempts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{violations.length}</div>
              <div className="text-sm text-gray-600">Total Violations</div>
            </div>
          </div>

          {violations.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-gray-800 mb-2">Recent Violations:</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {violations.slice(-3).map((violation) => (
                  <div key={violation.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="text-sm text-gray-800">{violation.description}</div>
                      <div className="text-xs text-gray-500">
                        {violation.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                    <Badge className={`${getSeverityColor(violation.severity)} border-0 text-xs`}>
                      {violation.severity.toUpperCase()}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Warning Dialog */}
      <Dialog open={showWarning} onOpenChange={setShowWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center text-yellow-600">
              <span className="mr-2">⚠️</span>
              Academic Integrity Warning
            </DialogTitle>
            <DialogDescription>
              {warningMessage}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={() => setShowWarning(false)}>
              I Understand
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Integrity Guidelines */}
      <Card className="bg-blue-50/50 border-blue-200">
        <CardContent className="pt-6">
          <h4 className="text-sm font-semibold text-blue-800 mb-2">Academic Integrity Guidelines:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Keep this tab active during the quiz</li>
            <li>• Do not copy, paste, or cut content</li>
            <li>• Avoid using browser shortcuts or developer tools</li>
            <li>• Complete the quiz within a reasonable time frame</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}