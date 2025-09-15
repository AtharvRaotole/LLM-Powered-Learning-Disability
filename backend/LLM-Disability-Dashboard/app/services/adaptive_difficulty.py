import json
from typing import Dict, List, Any, Tuple
from fastapi import HTTPException, Response

class AdaptiveDifficultyManager:
    def __init__(self):
        self.difficulty_levels = ["easy", "medium", "hard"]
        self.performance_thresholds = {
            "easy": {"min_consistency": 0.8, "min_accuracy": 0.9},
            "medium": {"min_consistency": 0.6, "min_accuracy": 0.7},
            "hard": {"min_consistency": 0.4, "min_accuracy": 0.5}
        }
    
    def calculate_next_difficulty(self, student_history: List[Dict], current_difficulty: str) -> Dict[str, Any]:
        """
        Calculate the next difficulty level based on student performance history.
        
        Args:
            student_history: List of session results with consistency scores and accuracy
            current_difficulty: Current difficulty level
            
        Returns:
            Dictionary with recommended difficulty and reasoning
        """
        
        if not student_history:
            return {
                "recommended_difficulty": "medium",
                "reasoning": "No history available, starting with medium difficulty",
                "confidence": 0.5
            }
        
        # Calculate recent performance metrics
        recent_sessions = student_history[-5:]  # Last 5 sessions
        avg_consistency = sum(s.get('consistency_score', 0) for s in recent_sessions) / len(recent_sessions)
        
        # Calculate accuracy using multiple methods for better assessment
        avg_accuracy = self._calculate_accuracy(recent_sessions)
        
        # Analyze performance trends
        trend_analysis = self._analyze_performance_trend(student_history)
        
        # Determine difficulty adjustment
        adjustment = self._determine_difficulty_adjustment(
            current_difficulty, avg_consistency, avg_accuracy, trend_analysis
        )
        
        # Calculate confidence based on data quality
        confidence = self._calculate_confidence(student_history, recent_sessions)
        
        return {
            "recommended_difficulty": adjustment["new_difficulty"],
            "reasoning": adjustment["reasoning"],
            "confidence": confidence,
            "current_performance": {
                "consistency_score": avg_consistency,
                "accuracy_rate": avg_accuracy,
                "trend": trend_analysis["trend"]
            },
            "recommendations": self._generate_recommendations(avg_consistency, avg_accuracy, trend_analysis)
        }
    
    def _analyze_performance_trend(self, history: List[Dict]) -> Dict[str, Any]:
        """Analyze if performance is improving, declining, or stable."""
        
        if len(history) < 3:
            return {"trend": "insufficient_data", "slope": 0}
        
        # Calculate trend using linear regression on consistency scores
        scores = [s.get('consistency_score', 0) for s in history[-10:]]  # Last 10 sessions
        n = len(scores)
        
        if n < 2:
            return {"trend": "insufficient_data", "slope": 0}
        
        # Simple linear regression
        x = list(range(n))
        y = scores
        
        x_mean = sum(x) / n
        y_mean = sum(y) / n
        
        numerator = sum((x[i] - x_mean) * (y[i] - y_mean) for i in range(n))
        denominator = sum((x[i] - x_mean) ** 2 for i in range(n))
        
        if denominator == 0:
            slope = 0
        else:
            slope = numerator / denominator
        
        # Determine trend
        if slope > 0.05:
            trend = "improving"
        elif slope < -0.05:
            trend = "declining"
        else:
            trend = "stable"
        
        return {"trend": trend, "slope": slope}
    
    def _determine_difficulty_adjustment(self, current_difficulty: str, consistency: float, 
                                       accuracy: float, trend: Dict) -> Dict[str, Any]:
        """Determine the appropriate difficulty adjustment."""
        
        current_index = self.difficulty_levels.index(current_difficulty)
        thresholds = self.performance_thresholds[current_difficulty]
        
        # Check if student is performing well above threshold
        if consistency >= thresholds["min_consistency"] + 0.2 and accuracy >= thresholds["min_accuracy"] + 0.2:
            if current_index < len(self.difficulty_levels) - 1:
                return {
                    "new_difficulty": self.difficulty_levels[current_index + 1],
                    "reasoning": f"Excellent performance (consistency: {consistency:.2f}, accuracy: {accuracy:.2f}). Ready for harder problems."
                }
        
        # Check if student is struggling significantly
        elif consistency < thresholds["min_consistency"] - 0.2 or accuracy < thresholds["min_accuracy"] - 0.2:
            if current_index > 0:
                return {
                    "new_difficulty": self.difficulty_levels[current_index - 1],
                    "reasoning": f"Struggling with current level (consistency: {consistency:.2f}, accuracy: {accuracy:.2f}). Moving to easier problems."
                }
        
        # Check trend-based adjustments
        if trend["trend"] == "declining" and consistency < thresholds["min_consistency"]:
            if current_index > 0:
                return {
                    "new_difficulty": self.difficulty_levels[current_index - 1],
                    "reasoning": f"Performance declining (trend: {trend['slope']:.3f}). Reducing difficulty to maintain engagement."
                }
        
        elif trend["trend"] == "improving" and consistency >= thresholds["min_consistency"]:
            if current_index < len(self.difficulty_levels) - 1:
                return {
                    "new_difficulty": self.difficulty_levels[current_index + 1],
                    "reasoning": f"Performance improving (trend: {trend['slope']:.3f}). Increasing difficulty to maintain challenge."
                }
        
        # No change needed
        return {
            "new_difficulty": current_difficulty,
            "reasoning": f"Performance appropriate for current level (consistency: {consistency:.2f}, accuracy: {accuracy:.2f})."
        }
    
    def _calculate_confidence(self, full_history: List[Dict], recent_sessions: List[Dict]) -> float:
        """Calculate confidence in the recommendation based on data quality."""
        
        if len(full_history) < 3:
            return 0.3  # Low confidence with little data
        
        if len(recent_sessions) < 3:
            return 0.5  # Medium confidence with some recent data
        
        # Higher confidence with more data and consistent patterns
        data_quality = min(1.0, len(full_history) / 10)  # More data = higher confidence
        recency_bonus = min(0.3, len(recent_sessions) / 10)  # Recent data bonus
        
        return min(1.0, 0.4 + data_quality + recency_bonus)
    
    def _generate_recommendations(self, consistency: float, accuracy: float, trend: Dict) -> List[str]:
        """Generate specific recommendations for the student."""
        
        recommendations = []
        
        if consistency < 0.5:
            recommendations.append("Focus on step-by-step problem solving to improve consistency")
        
        if accuracy < 0.6:
            recommendations.append("Practice basic mathematical operations to improve accuracy")
        
        if trend["trend"] == "declining":
            recommendations.append("Consider taking breaks between sessions to maintain focus")
        
        if consistency > 0.8 and accuracy > 0.8:
            recommendations.append("Excellent progress! Ready for more challenging problems")
        
        if not recommendations:
            recommendations.append("Continue with current approach - performance is on track")
        
        return recommendations
    
    def _calculate_accuracy(self, sessions: List[Dict]) -> float:
        """
        Calculate accuracy using multiple methods for better assessment.
        
        Args:
            sessions: List of session data
            
        Returns:
            Accuracy score between 0.0 and 1.0
        """
        if not sessions:
            return 0.0
        
        # Method 1: Use explicit is_correct field if available and reliable
        explicit_correct = [s.get('is_correct', False) for s in sessions if 'is_correct' in s]
        
        # Method 2: Use consistency score as a proxy for accuracy
        # High consistency (>= 0.7) suggests good performance
        consistency_based = []
        for s in sessions:
            consistency = s.get('consistency_score', 0)
            # Convert consistency to accuracy: 0.7+ consistency = 1.0 accuracy, 0.5-0.7 = 0.5, <0.5 = 0.0
            if consistency >= 0.7:
                consistency_based.append(1.0)
            elif consistency >= 0.5:
                consistency_based.append(0.5)
            else:
                consistency_based.append(0.0)
        
        # Method 3: Check for major errors in consistency results
        error_based = []
        for s in sessions:
            consistency_results = s.get('consistency_results', {})
            major_errors = consistency_results.get('major_inconsistencies', [])
            # No major errors = good performance
            error_based.append(1.0 if len(major_errors) == 0 else 0.0)
        
        # Combine methods with weights
        # If we have explicit is_correct data, use it as primary (70% weight)
        # Otherwise, use consistency and error analysis (50% each)
        if explicit_correct and any(explicit_correct):
            # Use explicit data as primary, but also consider consistency
            explicit_accuracy = sum(explicit_correct) / len(explicit_correct)
            consistency_accuracy = sum(consistency_based) / len(consistency_based)
            return 0.7 * explicit_accuracy + 0.3 * consistency_accuracy
        else:
            # Use consistency and error analysis
            consistency_accuracy = sum(consistency_based) / len(consistency_based)
            error_accuracy = sum(error_based) / len(error_based)
            return 0.6 * consistency_accuracy + 0.4 * error_accuracy

# Global instance
adaptive_manager = AdaptiveDifficultyManager()

async def get_adaptive_difficulty(student_history: str, current_difficulty: str):
    """API endpoint for adaptive difficulty calculation."""
    
    try:
        # Parse student history
        if isinstance(student_history, str):
            history = json.loads(student_history)
        else:
            history = student_history
        
        # Calculate next difficulty
        result = adaptive_manager.calculate_next_difficulty(history, current_difficulty)
        
        return Response(content=json.dumps(result), media_type="application/json")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating adaptive difficulty: {str(e)}")
