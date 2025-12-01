export const LIVE_FUNCTION_DECLARATIONS = [
  {
    name: 'search_web',
    description: 'Search the web for current information and return grounded, cited findings.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query to submit.' },
        urls: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional URLs to prioritize.',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'capture_screen_snapshot',
    description: 'Retrieve the latest analyzed screen-share context for this session.',
    parameters: {
      type: 'object',
      properties: {
        summaryOnly: {
          type: 'boolean',
          description: 'Omit raw image data when true.',
        },
      },
    },
  },
  {
    name: 'capture_webcam_snapshot',
    description: 'Retrieve the latest analyzed webcam context for this session.',
    parameters: {
      type: 'object',
      properties: {
        summaryOnly: {
          type: 'boolean',
          description: 'Omit raw image data when true.',
        },
      },
    },
  },
  {
    name: 'extract_action_items',
    description: 'Extract key outcomes, recommendations, and next steps from the conversation so far.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'generate_summary_preview',
    description: 'Generate a preview of the conversation summary that will be included in the final PDF.',
    parameters: {
      type: 'object',
      properties: {
        includeRecommendations: {
          type: 'boolean',
          description: 'Include recommendations section in preview.',
        },
        includeNextSteps: {
          type: 'boolean',
          description: 'Include next steps section in preview.',
        },
      },
    },
  },
  {
    name: 'calculate_roi',
    description: 'Calculate ROI based on discussed investment and savings. Use when discussing costs, savings, or ROI during the conversation.',
    parameters: {
      type: 'object',
      properties: {
        currentCost: {
          type: 'number',
          description: 'Current annual cost (optional, for simplified calculation).',
        },
        timeSavings: {
          type: 'number',
          description: 'Hours saved per year (optional, for simplified calculation).',
        },
        employeeCostPerHour: {
          type: 'number',
          description: 'Average employee cost per hour (optional, for simplified calculation).',
        },
        implementationCost: {
          type: 'number',
          description: 'One-time implementation cost (optional, for simplified calculation).',
        },
        timeline: {
          type: 'number',
          description: 'Timeline in months (optional).',
        },
        initialInvestment: {
          type: 'number',
          description: 'Initial investment amount (optional, for detailed calculation).',
        },
        annualCost: {
          type: 'number',
          description: 'Annual recurring cost (optional, for detailed calculation).',
        },
        staffReductionSavings: {
          type: 'number',
          description: 'Savings from staff reduction (optional, for detailed calculation).',
        },
        efficiencySavings: {
          type: 'number',
          description: 'Savings from efficiency gains (optional, for detailed calculation).',
        },
        retentionSavings: {
          type: 'number',
          description: 'Savings from retention improvement (optional, for detailed calculation).',
        },
      },
    },
  },
  {
    name: 'draft_follow_up_email',
    description: 'Draft a follow-up email summarizing the conversation or next steps. Can be sent to the client, their team, or Farzad.',
    parameters: {
      type: 'object',
      properties: {
        recipient: {
          type: 'string',
          enum: ['client', 'team', 'farzad'],
          description: 'Who the email is for.',
        },
        tone: {
          type: 'string',
          enum: ['professional', 'casual', 'technical'],
          description: 'Tone of the email.',
        },
        includeSummary: {
          type: 'boolean',
          description: 'Include conversation summary in the email.',
        },
      },
      required: ['recipient', 'tone'],
    },
  },
  {
    name: 'generate_proposal_draft',
    description: 'Generate a proposal based on the conversation. Returns markdown proposal text that can be displayed or saved.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
] as const;

export const ADMIN_LIVE_FUNCTION_DECLARATIONS = [
  {
    name: 'get_dashboard_stats',
    description: 'Get the latest dashboard statistics including total leads, conversion rate, average lead score, engagement rate, and other key metrics. Use this when asked about dashboard stats, latest numbers, or current metrics.',
    parameters: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          description: 'Time period for stats: "1d", "7d", "30d", or "90d". Defaults to "7d".',
          enum: ['1d', '7d', '30d', '90d'],
        },
      },
    },
  },
] as const;

export type LiveFunctionDeclaration = (typeof LIVE_FUNCTION_DECLARATIONS)[number];
export type AdminLiveFunctionDeclaration = (typeof ADMIN_LIVE_FUNCTION_DECLARATIONS)[number];
