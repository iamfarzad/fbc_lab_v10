/**
 * Google Grounding Provider - Stub
 * TODO: Implement Google Grounding integration
 */
export class GoogleGroundingProvider {
  constructor() {
    // Stub implementation
  }

  async search(_query: string): Promise<Array<{ text: string; url?: string }>> {
    // Stub: Return empty results
    console.warn('GoogleGroundingProvider.search() called but not implemented')
    return []
  }

  async comprehensiveResearch(
    _query: string,
    _options?: { email?: string; company?: string }
  ): Promise<{ combinedAnswer: string; urlContext: Array<{ text: string; url?: string }>; allCitations?: Array<{ uri: string; title?: string; description?: string }> }> {
    // Stub: Return empty research
    console.warn('GoogleGroundingProvider.comprehensiveResearch() called but not implemented')
    return {
      combinedAnswer: '',
      urlContext: [],
      allCitations: []
    }
  }
}

