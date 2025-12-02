/**
 * Extract conversation insights (recommendations, next steps, decisions, important points)
 */
export function extractConversationInsights(conversationPairs: Array<{ user: { content: string }, assistant?: { content: string } }>) {
  const insights = {
    recommendations: [] as string[],
    nextSteps: [] as string[],
    keyDecisions: [] as string[],
    importantPoints: [] as string[]
  }

  for (const pair of conversationPairs) {
    const userText = pair.user.content.toLowerCase()
    const assistantText = pair.assistant?.content || ''
    
    // Extract recommendations (statements with "should", "recommend", "suggest", "consider")
    const recommendationPatterns = [
      /(?:you should|I recommend|I suggest|we should|I'd recommend|consider|I recommend you|we recommend)/gi,
      /(?:best practice|best approach|optimal solution|ideal strategy)/gi
    ]
    
    if (assistantText && recommendationPatterns.some(pattern => pattern.test(assistantText))) {
      // Extract sentences that contain recommendations
      const sentences = assistantText.split(/[.!?]+/).filter(s => {
        const lower = s.toLowerCase().trim()
        return recommendationPatterns.some(pattern => pattern.test(lower)) && 
               lower.length > 20 && 
               lower.length < 200
      })
      insights.recommendations.push(...sentences.slice(0, 2))
    }

    // Extract next steps (statements with "next", "will", "can do", "action", "steps")
    const nextStepPatterns = [
      /(?:next step|we can|you can|I can|I'll|we'll|action item|steps to|next,? we)/gi,
      /(?:let's|we should|follow-up|after this|moving forward)/gi
    ]
    
    if (assistantText && nextStepPatterns.some(pattern => pattern.test(assistantText))) {
      const sentences = assistantText.split(/[.!?]+/).filter(s => {
        const lower = s.toLowerCase().trim()
        return nextStepPatterns.some(pattern => pattern.test(lower)) && 
               lower.length > 20 && 
               lower.length < 200
      })
      insights.nextSteps.push(...sentences.slice(0, 2))
    }

    // Extract decisions (statements with "decided", "choose", "select", "go with", "going to")
    const decisionPatterns = [
      /(?:we decided|you decided|I decided|choose|selected|going with|will use|will implement)/gi
    ]
    
    if (userText && decisionPatterns.some(pattern => pattern.test(userText))) {
      const sentences = pair.user.content.split(/[.!?]+/).filter(s => {
        const lower = s.toLowerCase().trim()
        return decisionPatterns.some(pattern => pattern.test(lower)) && 
               lower.length > 15 && 
               lower.length < 200
      })
      insights.keyDecisions.push(...sentences.slice(0, 2))
    }

    // Extract important points (questions that got answered with substantial content)
    if (userText.includes('?') && assistantText.length > 100 && pair.user) {
      const question = pair.user.content?.split('?')[0]?.trim()
      if (question && question.length > 10 && question.length < 150) {
        insights.importantPoints.push(question)
      }
    }
  }

  // Clean and deduplicate
  const clean = (arr: string[]) => {
    return [...new Set(arr.map(s => s.trim()).filter(s => s.length > 10))].slice(0, 5)
  }

  return {
    recommendations: clean(insights.recommendations),
    nextSteps: clean(insights.nextSteps),
    keyDecisions: clean(insights.keyDecisions),
    importantPoints: clean(insights.importantPoints)
  }
}

