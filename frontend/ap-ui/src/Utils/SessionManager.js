import { supabase } from '../lib/supabaseClient';

class SessionManagerWithSync {
  constructor() {
    this.storageKey = 'learningDisabilitySessions';
    this.currentSessionKey = 'currentSession';
  }

  async saveSession(sessionData, userId = null) {
    try {
      const sessions = this.getAllSessions();

      const newSession = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        ...sessionData,
      };

      sessions.unshift(newSession);
      localStorage.setItem(this.storageKey, JSON.stringify(sessions));

      if (userId && supabase) {
        await supabase.from('user_sessions').insert({
          user_id: userId,
          disability_id: sessionData.disability_id || sessionData.disability || null,
          problem: sessionData.problem || sessionData.generatedProblem || null,
          approach: sessionData.approach || null,
          answer: sessionData.answer || null,
          session_data: sessionData,
        });
      }

      return newSession;
    } catch (error) {
      console.error('Error in SessionManager.saveSession:', error);
      throw error;
    }
  }

  getAllSessions() {
    const sessions = localStorage.getItem(this.storageKey);
    return sessions ? JSON.parse(sessions) : [];
  }

  getSessionsByDisability(disability) {
    const sessions = this.getAllSessions();
    return sessions.filter((session) => session.disability === disability);
  }

  getRecentSessions(count = 10) {
    const sessions = this.getAllSessions();
    return sessions.slice(0, count);
  }

  getSessionsByDateRange(startDate, endDate) {
    const sessions = this.getAllSessions();
    return sessions.filter((session) => {
      const sessionDate = new Date(session.timestamp);
      return sessionDate >= startDate && sessionDate <= endDate;
    });
  }

  calculatePerformanceMetrics(sessions = null) {
    const sessionData = sessions || this.getAllSessions();

    if (sessionData.length === 0) {
      return {
        totalSessions: 0,
        averageConsistency: 0,
        averageAccuracy: 0,
        improvementRate: 0,
        topPerformingDisability: 'No data',
        commonMistakes: [],
      };
    }

    const totalSessions = sessionData.length;
    const averageConsistency = sessionData.reduce((sum, s) => sum + (s.consistency_score || 0), 0) / totalSessions;
    const averageAccuracy = sessionData.reduce((sum, s) => sum + (s.is_correct ? 1 : 0), 0) / totalSessions;

    const recentSessions = sessionData.slice(0, Math.min(5, Math.floor(totalSessions / 2)));
    const olderSessions = sessionData.slice(Math.min(5, Math.floor(totalSessions / 2)));

    let improvementRate = 0;
    if (olderSessions.length > 0) {
      const recentAvg = recentSessions.reduce((sum, s) => sum + (s.consistency_score || 0), 0) / recentSessions.length;
      const olderAvg = olderSessions.reduce((sum, s) => sum + (s.consistency_score || 0), 0) / olderSessions.length;
      improvementRate = ((recentAvg - olderAvg) / olderAvg) * 100;
    }

    const disabilityStats = {};
    sessionData.forEach((session) => {
      if (!disabilityStats[session.disability]) {
        disabilityStats[session.disability] = { count: 0, totalScore: 0 };
      }
      disabilityStats[session.disability].count++;
      disabilityStats[session.disability].totalScore += session.consistency_score || 0;
    });

    let topDisability = 'No data';
    let topScore = 0;
    Object.entries(disabilityStats).forEach(([disability, stats]) => {
      const avgScore = stats.totalScore / stats.count;
      if (avgScore > topScore) {
        topScore = avgScore;
        topDisability = disability;
      }
    });

    const commonMistakes = this.analyzeCommonMistakes(sessionData);

    return {
      totalSessions,
      averageConsistency,
      averageAccuracy,
      improvementRate,
      topPerformingDisability: topDisability,
      commonMistakes,
    };
  }

  analyzeCommonMistakes(sessions) {
    const mistakeCounts = {};

    sessions.forEach((session) => {
      if (session.consistencyResults?.recommendations) {
        session.consistencyResults.recommendations.forEach((rec) => {
          mistakeCounts[rec] = (mistakeCounts[rec] || 0) + 1;
        });
      }
    });

    return Object.entries(mistakeCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([mistake]) => mistake);
  }

  clearAllSessions() {
    localStorage.removeItem(this.storageKey);
  }

  exportSessions() {
    const sessions = this.getAllSessions();
    const dataStr = JSON.stringify(sessions, null, 2);
    return new Blob([dataStr], { type: 'application/json' });
  }

  getCurrentSession() {
    const session = localStorage.getItem(this.currentSessionKey);
    return session ? JSON.parse(session) : null;
  }

  setCurrentSession(sessionData) {
    localStorage.setItem(this.currentSessionKey, JSON.stringify(sessionData));
  }

  clearCurrentSession() {
    localStorage.removeItem(this.currentSessionKey);
  }
}

const sessionManagerInstance = new SessionManagerWithSync();
export default sessionManagerInstance;
