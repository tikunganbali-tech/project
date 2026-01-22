'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock, CheckCircle, XCircle, PlayCircle, Info, TrendingUp, FlaskConical, AlertTriangle, FileText, FileCheck, Zap, Shield, Brain, Lightbulb } from 'lucide-react';

interface ActionDetailClientProps {
  action: any;
}

interface ActionSimulationResult {
  affectedEntities: number;
  estimatedImpact: {
    metric: string;
    before: number;
    after: number;
    delta: number;
  }[];
  risks: string[];
  notes: string;
}

interface ExecutionSummary {
  actionType: string;
  action: string;
  target: {
    id: string | null;
    type: string;
  };
  why: Array<{
    insightKey: string;
    metricKey: string;
    metricValue: number;
    explanation: string;
  }>;
  simulation: ActionSimulationResult | null;
  risks: string[];
  canExecute: boolean;
  reasons: string[];
}

export default function ActionDetailClient({
  action: initialAction,
}: ActionDetailClientProps) {
  const [action, setAction] = useState(initialAction);
  const [traces, setTraces] = useState(initialAction.traces || []);
  const [loading, setLoading] = useState(false);
  const [simulation, setSimulation] = useState<ActionSimulationResult | null>(null);
  const [simulationLoading, setSimulationLoading] = useState(false);
  const [simulationError, setSimulationError] = useState<string | null>(null);
  const [executionSummary, setExecutionSummary] = useState<ExecutionSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [safeMode, setSafeMode] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [executionNote, setExecutionNote] = useState('');
  const [executing, setExecuting] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<{
    summary: string;
    considerations: string[];
    confidence: 'LOW' | 'MEDIUM' | 'HIGH';
    disclaimers: string[];
  } | null>(null);
  const [adviceLoading, setAdviceLoading] = useState(false);
  const [adviceError, setAdviceError] = useState<string | null>(null);

  const fetchTraces = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/actions/${action.id}/trace`);
      if (response.ok) {
        const data = await response.json();
        setTraces(data.traces || []);
      }
    } catch (error) {
      console.error('Error fetching traces:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (traces.length === 0) {
      fetchTraces();
    }
  }, []);

  const fetchSimulation = async () => {
    // Only fetch simulation for APPROVED actions
    if (action.status !== 'APPROVED') {
      return;
    }

    setSimulationLoading(true);
    setSimulationError(null);
    try {
      const response = await fetch(`/api/admin/actions/${action.id}/simulate`);
      if (response.ok) {
        const data = await response.json();
        setSimulation(data.simulation);
      } else {
        const errorData = await response.json();
        setSimulationError(errorData.error || 'Failed to load simulation');
      }
    } catch (error: any) {
      console.error('Error fetching simulation:', error);
      setSimulationError(error.message || 'Failed to load simulation');
    } finally {
      setSimulationLoading(false);
    }
  };

  useEffect(() => {
    // Auto-fetch simulation for APPROVED actions
    if (action.status === 'APPROVED') {
      fetchSimulation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action.id, action.status]);

  // Fetch admin config (SAFE_MODE, user role)
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/admin/config');
        if (response.ok) {
          const data = await response.json();
          setSafeMode(data.safeMode);
          setIsSuperAdmin(data.isSuperAdmin);
        }
      } catch (error) {
        console.error('Error fetching config:', error);
      }
    };
    fetchConfig();
  }, []);

  // Fetch execution summary for APPROVED actions
  const fetchExecutionSummary = async () => {
    if (action.status !== 'APPROVED') {
      return;
    }

    setSummaryLoading(true);
    try {
      const response = await fetch(`/api/admin/actions/${action.id}/summary`);
      if (response.ok) {
        const data = await response.json();
        setExecutionSummary(data.summary);
      }
    } catch (error) {
      console.error('Error fetching execution summary:', error);
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    if (action.status === 'APPROVED') {
      fetchExecutionSummary();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action.id, action.status]);

  // Handle execute
  const handleExecute = async () => {
    if (!confirmed) {
      alert('Please confirm that you understand the impact of this action');
      return;
    }

    if (!isSuperAdmin) {
      alert('Only super_admin can execute actions');
      return;
    }

    if (safeMode) {
      alert('SAFE_MODE is active. Execution is blocked.');
      return;
    }

    if (action.status !== 'APPROVED') {
      alert('Only APPROVED actions can be executed');
      return;
    }

    if (action.executedAt) {
      alert('This action has already been executed');
      return;
    }

    if (!window.confirm('Are you sure you want to execute this action? This cannot be undone.')) {
      return;
    }

    setExecuting(true);
    try {
      const response = await fetch(`/api/admin/actions/${action.id}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          note: executionNote || undefined,
        }),
      });

      if (response.ok) {
        alert('Action executed successfully!');
        // Reload page to show updated status
        window.location.reload();
      } else {
        const errorData = await response.json();
        alert(`Execution failed: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Error executing action:', error);
      alert(`Error executing action: ${error.message || 'Unknown error'}`);
    } finally {
      setExecuting(false);
    }
  };

  // Check if execute button should be shown
  const canShowExecuteButton = 
    isSuperAdmin && 
    action.status === 'APPROVED' && 
    !safeMode && 
    !action.executedAt;

  // Fetch AI advice
  const fetchAIAdvice = async () => {
    if (action.status !== 'APPROVED') {
      return;
    }

    setAdviceLoading(true);
    setAdviceError(null);
    try {
      const response = await fetch(`/api/admin/actions/${action.id}/advise`, {
        method: 'POST',
      });
      if (response.ok) {
        const data = await response.json();
        setAiAdvice(data.advice);
      } else {
        const errorData = await response.json();
        setAdviceError(errorData.error || 'Failed to load AI advice');
      }
    } catch (error: any) {
      console.error('Error fetching AI advice:', error);
      setAdviceError(error.message || 'Failed to load AI advice');
    } finally {
      setAdviceLoading(false);
    }
  };

  useEffect(() => {
    // Auto-fetch AI advice for APPROVED actions
    if (action.status === 'APPROVED') {
      fetchAIAdvice();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action.id, action.status]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'REJECTED':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'EXECUTED':
        return <PlayCircle className="h-5 w-5 text-blue-600" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'REJECTED':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'EXECUTED':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/actions"
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Action Details</h1>
        </div>
      </div>

      {/* Action Info */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium text-gray-500">Action ID</label>
            <p className="mt-1 text-sm text-gray-900">{action.actionId}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Action Type</label>
            <p className="mt-1 text-sm text-gray-900">{action.actionType}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Action</label>
            <p className="mt-1 text-sm text-gray-900">{action.action}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Priority</label>
            <p className="mt-1">
              <span className={`px-2 py-1 text-xs rounded-full ${
                action.priority === 'high' ? 'bg-red-100 text-red-800' :
                action.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {action.priority}
              </span>
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Status</label>
            <p className="mt-1">
              <span className={`px-3 py-1 text-sm rounded-full border flex items-center gap-2 w-fit ${getStatusColor(action.status)}`}>
                {getStatusIcon(action.status)}
                {action.status}
              </span>
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Requested By</label>
            <p className="mt-1 text-sm text-gray-900">{action.requestedBy}</p>
          </div>
          {action.approvedBy && (
            <div>
              <label className="text-sm font-medium text-gray-500">Approved By</label>
              <p className="mt-1 text-sm text-gray-900">{action.approvedBy}</p>
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-gray-500">Created At</label>
            <p className="mt-1 text-sm text-gray-900">
              {new Date(action.createdAt).toLocaleString('id-ID', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
          {action.approvedAt && (
            <div>
              <label className="text-sm font-medium text-gray-500">Approved At</label>
              <p className="mt-1 text-sm text-gray-900">
                {new Date(action.approvedAt).toLocaleString('id-ID', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          )}
          {action.executedAt && (
            <div>
              <label className="text-sm font-medium text-gray-500">Executed At</label>
              <p className="mt-1 text-sm text-gray-900">
                {new Date(action.executedAt).toLocaleString('id-ID', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* WHY THIS ACTION - Trace Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-6">
          <Info className="h-5 w-5 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">Why This Action?</h2>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading traces...</div>
        ) : traces.length > 0 ? (
          <div className="space-y-4">
            {traces.map((trace: any) => (
              <div
                key={trace.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Insight</label>
                    <p className="mt-1 text-sm font-semibold text-gray-900">{trace.insightKey}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Metric</label>
                    <div className="mt-1 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <p className="text-sm font-semibold text-gray-900">
                        {trace.metricKey}: <span className="text-green-600">{trace.metricValue}</span>
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Timestamp</label>
                    <p className="mt-1 text-xs text-gray-500">
                      {new Date(trace.createdAt).toLocaleString('id-ID', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <label className="text-xs font-medium text-gray-500 uppercase">Explanation</label>
                  <p className="mt-1 text-sm text-gray-700">{trace.explanation}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 border border-gray-200 rounded-lg">
            <Info className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p>No trace data available for this action.</p>
            <p className="text-xs mt-1">Trace data is created when recommendations are generated.</p>
          </div>
        )}
      </div>

      {/* 🧪 SIMULATION PREVIEW - Only for APPROVED actions */}
      {action.status === 'APPROVED' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-6">
            <FlaskConical className="h-5 w-5 text-purple-600" />
            <h2 className="text-xl font-bold text-gray-900">🧪 Simulation Preview</h2>
          </div>

          {simulationLoading ? (
            <div className="text-center py-8 text-gray-500">Loading simulation...</div>
          ) : simulationError ? (
            <div className="text-center py-8 text-red-500 border border-red-200 rounded-lg bg-red-50">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-red-400" />
              <p className="font-medium">Simulation Error</p>
              <p className="text-sm mt-1">{simulationError}</p>
            </div>
          ) : simulation ? (
            <div className="space-y-6">
              {/* Affected Entities */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Affected Entities
                </label>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-2xl font-bold text-gray-900">{simulation.affectedEntities}</p>
                  <p className="text-sm text-gray-500 mt-1">entities will be affected by this action</p>
                </div>
              </div>

              {/* Estimated Impact */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-3 block">
                  Estimated Impact
                </label>
                <div className="space-y-3">
                  {simulation.estimatedImpact.map((impact, idx) => (
                    <div
                      key={idx}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-900">{impact.metric}</span>
                        <span className={`text-sm font-bold ${
                          impact.delta > 0 ? 'text-green-600' : 
                          impact.delta < 0 ? 'text-red-600' : 
                          'text-gray-600'
                        }`}>
                          {impact.delta > 0 ? '+' : ''}{impact.delta}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex-1">
                          <span className="text-gray-500">Before: </span>
                          <span className="font-medium text-gray-700">{impact.before}</span>
                        </div>
                        <div className="text-gray-400">→</div>
                        <div className="flex-1">
                          <span className="text-gray-500">After: </span>
                          <span className="font-medium text-gray-900">{impact.after}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Risks */}
              {simulation.risks.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-3 block flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    Risks
                  </label>
                  <div className="space-y-2">
                    {simulation.risks.map((risk, idx) => (
                      <div
                        key={idx}
                        className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2"
                      >
                        <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-yellow-800">{risk}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {simulation.notes && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-3 block flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    Notes
                  </label>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <pre className="text-sm text-blue-900 whitespace-pre-wrap font-sans">
                      {simulation.notes}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 border border-gray-200 rounded-lg">
              <FlaskConical className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>No simulation data available.</p>
            </div>
          )}
        </div>
      )}

      {/* 🧾 FINAL CONFIRMATION PANEL - Only for APPROVED actions */}
      {action.status === 'APPROVED' && canShowExecuteButton && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-lg border-2 border-blue-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <FileCheck className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">🧾 Execution Summary & Final Confirmation</h2>
          </div>

          <div className="bg-white rounded-lg p-6 mb-6 space-y-6">
            {summaryLoading ? (
              <div className="text-center py-8 text-gray-500">Loading execution summary...</div>
            ) : executionSummary ? (
              <>
                {/* Action Info */}
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block flex items-center gap-2">
                    <Zap className="h-4 w-4 text-blue-600" />
                    Action
                  </label>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-xs text-gray-500">Type:</span>
                        <p className="font-medium text-gray-900">{executionSummary.actionType}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Action:</span>
                        <p className="font-medium text-gray-900">{executionSummary.action}</p>
                      </div>
                      {executionSummary.target.id && (
                        <div className="col-span-2">
                          <span className="text-xs text-gray-500">Target ID:</span>
                          <p className="font-medium text-gray-900">{executionSummary.target.id}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Why This Action (Ringkas) */}
                {executionSummary.why.length > 0 && (
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-2 block flex items-center gap-2">
                      <Info className="h-4 w-4 text-blue-600" />
                      Why This Action (Summary)
                    </label>
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 space-y-2">
                      {executionSummary.why.slice(0, 3).map((reason, idx) => (
                        <div key={idx} className="text-sm text-gray-700">
                          <span className="font-medium">{reason.insightKey}:</span>{' '}
                          {reason.explanation.substring(0, 150)}
                          {reason.explanation.length > 150 ? '...' : ''}
                        </div>
                      ))}
                      {executionSummary.why.length > 3 && (
                        <p className="text-xs text-gray-500 mt-2">
                          +{executionSummary.why.length - 3} more reasons
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* What Will Happen */}
                {executionSummary.simulation && (
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-2 block flex items-center gap-2">
                      <FlaskConical className="h-4 w-4 text-purple-600" />
                      What Will Happen
                    </label>
                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                      <p className="text-sm text-gray-700 mb-3">
                        <span className="font-medium">{executionSummary.simulation.affectedEntities}</span> entity(ies) will be affected
                      </p>
                      {executionSummary.simulation.estimatedImpact.length > 0 && (
                        <div className="space-y-2">
                          {executionSummary.simulation.estimatedImpact.slice(0, 3).map((impact, idx) => (
                            <div key={idx} className="text-sm">
                              <span className="font-medium">{impact.metric}:</span>{' '}
                              <span className="text-gray-600">{impact.before}</span>
                              <span className="text-gray-400 mx-2">→</span>
                              <span className="font-semibold text-gray-900">{impact.after}</span>
                              {impact.delta !== 0 && (
                                <span className={`ml-2 font-bold ${
                                  impact.delta > 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  ({impact.delta > 0 ? '+' : ''}{impact.delta})
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Risks */}
                {executionSummary.risks.length > 0 && (
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-2 block flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      Risks
                    </label>
                    <div className="space-y-2">
                      {executionSummary.risks.map((risk, idx) => (
                        <div
                          key={idx}
                          className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2"
                        >
                          <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-yellow-800">{risk}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileCheck className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p>Execution summary not available</p>
              </div>
            )}
          </div>

          {/* Confirmation Section */}
          <div className="bg-white rounded-lg p-6 border-2 border-blue-300">
            <div className="space-y-4">
              {/* Checkbox Confirmation */}
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="confirm-execution"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-1 h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="confirm-execution" className="text-sm font-medium text-gray-900 cursor-pointer">
                  Saya memahami dampak aksi ini dan setuju untuk mengeksekusinya
                </label>
              </div>

              {/* Optional Note */}
              <div>
                <label htmlFor="execution-note" className="text-sm font-medium text-gray-700 mb-2 block">
                  Optional Note (for audit trail):
                </label>
                <textarea
                  id="execution-note"
                  value={executionNote}
                  onChange={(e) => setExecutionNote(e.target.value)}
                  placeholder="Add a note about why you're executing this action..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  rows={3}
                />
              </div>

              {/* Execute Button */}
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={handleExecute}
                  disabled={!confirmed || executing}
                  className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-all flex items-center justify-center gap-2 ${
                    confirmed && !executing
                      ? 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl'
                      : 'bg-gray-400 cursor-not-allowed'
                  }`}
                >
                  {executing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Executing...
                    </>
                  ) : (
                    <>
                      <Zap className="h-5 w-5" />
                      EXECUTE ACTION
                    </>
                  )}
                </button>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  This action cannot be undone. Please review the summary above carefully.
                </p>
              </div>
            </div>
          </div>

          {/* Safety Notice */}
          {safeMode && (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Shield className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">SAFE_MODE Active</p>
                  <p className="text-xs text-yellow-700 mt-1">
                    Execution is currently blocked by SAFE_MODE. Disable SAFE_MODE to enable execution.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 🤖 AI ADVISOR PANEL - Only for APPROVED actions */}
      {action.status === 'APPROVED' && (
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg shadow-lg border-2 border-purple-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Brain className="h-6 w-6 text-purple-600" />
            <h2 className="text-2xl font-bold text-gray-900">🤖 AI Advisor</h2>
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
              Read-only Analysis
            </span>
          </div>

          {adviceLoading ? (
            <div className="text-center py-8 text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
              <p>Analyzing action data...</p>
            </div>
          ) : adviceError ? (
            <div className="text-center py-8 text-red-500 border border-red-200 rounded-lg bg-red-50">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-red-400" />
              <p className="font-medium">Advisor Error</p>
              <p className="text-sm mt-1">{adviceError}</p>
            </div>
          ) : aiAdvice ? (
            <div className="bg-white rounded-lg p-6 space-y-6">
              {/* Summary */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-purple-600" />
                  Summary
                </label>
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <p className="text-sm text-gray-800 leading-relaxed">{aiAdvice.summary}</p>
                </div>
              </div>

              {/* Confidence Level */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Confidence Level
                </label>
                <div className={`rounded-lg p-4 border-2 ${
                  aiAdvice.confidence === 'HIGH' 
                    ? 'bg-green-50 border-green-300' 
                    : aiAdvice.confidence === 'MEDIUM'
                    ? 'bg-yellow-50 border-yellow-300'
                    : 'bg-red-50 border-red-300'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center font-bold text-white ${
                      aiAdvice.confidence === 'HIGH'
                        ? 'bg-green-600'
                        : aiAdvice.confidence === 'MEDIUM'
                        ? 'bg-yellow-600'
                        : 'bg-red-600'
                    }`}>
                      {aiAdvice.confidence === 'HIGH' ? 'H' : aiAdvice.confidence === 'MEDIUM' ? 'M' : 'L'}
                    </div>
                    <div>
                      <p className={`font-bold text-lg ${
                        aiAdvice.confidence === 'HIGH'
                          ? 'text-green-800'
                          : aiAdvice.confidence === 'MEDIUM'
                          ? 'text-yellow-800'
                          : 'text-red-800'
                      }`}>
                        {aiAdvice.confidence}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {aiAdvice.confidence === 'HIGH' 
                          ? 'High confidence - action appears well-justified'
                          : aiAdvice.confidence === 'MEDIUM'
                          ? 'Medium confidence - review recommended'
                          : 'Low confidence - proceed with caution'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Considerations */}
              {aiAdvice.considerations.length > 0 && (
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-3 block flex items-center gap-2">
                    <Info className="h-4 w-4 text-blue-600" />
                    Considerations
                  </label>
                  <div className="space-y-2">
                    {aiAdvice.considerations.map((consideration, idx) => (
                      <div
                        key={idx}
                        className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2"
                      >
                        <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-blue-900">{consideration}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Disclaimers */}
              {aiAdvice.disclaimers.length > 0 && (
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-3 block flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    Disclaimers
                  </label>
                  <div className="space-y-2">
                    {aiAdvice.disclaimers.map((disclaimer, idx) => (
                      <div
                        key={idx}
                        className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2"
                      >
                        <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-yellow-800">{disclaimer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 border border-gray-200 rounded-lg bg-white">
              <Brain className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>AI advice not available.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

