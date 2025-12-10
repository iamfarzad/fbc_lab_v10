export const LIVE_FUNCTION_DECLARATIONS = [
  {
    name: 'search_web',
    description: 'Search the web for current information and return grounded, cited findings. Use for weather, news, stock prices, sports scores, or any real-time information.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query to submit. For weather, include location (e.g., "weather in Oslo, Norway").' },
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
    name: 'get_weather',
    description: 'Get current weather for a location. Always use this when asked about weather, temperature, or forecasts. IMPORTANT: Always report temperature in Celsius (°C), never Fahrenheit.',
    parameters: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'City name or location (e.g., "Oslo, Norway", "New York"). Always return temperature in Celsius.' },
      },
      required: ['location'],
    },
  },
  {
    name: 'search_companies_by_location',
    description: 'Search for companies and businesses in a specific location. Use this to find local businesses, competitors, or industry presence in an area.',
    parameters: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'City, region, or country to search for companies (e.g., "Oslo, Norway", "San Francisco Bay Area").' },
        industry: { type: 'string', description: 'Optional industry filter (e.g., "technology", "healthcare", "consulting").' },
        companyType: { type: 'string', description: 'Optional company type filter (e.g., "startups", "enterprises", "agencies").' },
      },
      required: ['location'],
    },
  },
  {
    name: 'capture_screen_snapshot',
    description: 'Retrieve the latest analyzed screen-share context for this session. If focus_prompt is provided, performs fresh targeted analysis instead of returning cached results.',
    parameters: {
      type: 'object',
      properties: {
        focus_prompt: {
          type: 'string',
          description: 'Specific question about what to look for on the screen. E.g., "What is the error message?" or "Read the numbers in the Q3 column".',
        },
        summaryOnly: {
          type: 'boolean',
          description: 'Omit raw image data when true.',
        },
      },
    },
  },
  {
    name: 'capture_webcam_snapshot',
    description: 'Retrieve the latest analyzed webcam context for this session. If focus_prompt is provided, performs fresh targeted analysis instead of returning cached results.',
    parameters: {
      type: 'object',
      properties: {
        focus_prompt: {
          type: 'string',
          description: 'Specific question about user\'s environment or emotion. E.g., "What object are they holding?" or "Are they smiling?".',
        },
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
  {
    name: 'get_booking_link',
    description: 'Get the Cal.com booking link to share with the user. IMPORTANT: This provides a LINK for the user to click - you CANNOT book on their behalf or send calendar invites. The user must click the link themselves.',
    parameters: {
      type: 'object',
      properties: {
        meetingType: {
          type: 'string',
          enum: ['consultation', 'workshop', 'strategy-call'],
          description: 'Type of meeting (all redirect to same Cal.com link)'
        }
      }
    }
  },
  {
    name: 'get_location',
    description: 'Get the user\'s current location (latitude, longitude, city, country). Use this when the user asks about their location or when location context is needed for queries.',
    parameters: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'get_stock_price',
    description: 'Get the current stock price for a given stock symbol. Use this when the user asks about stock prices, market data, or specific company stock values.',
    parameters: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Stock ticker symbol (e.g., "TSLA" for Tesla, "AAPL" for Apple)'
        }
      },
      required: ['symbol']
    }
  },
  {
    name: 'analyze_website_tech_stack',
    description: 'Analyze a website\'s technology stack to identify what technologies they\'re using and where AI could fit. Use this to establish immediate technical authority when a client shares their website URL.',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The prospective client\'s website URL to analyze'
        },
        focus: {
          type: 'string',
          enum: ['ai_opportunities', 'marketing_stack'],
          description: 'Optional focus area: AI integration opportunities or marketing tech stack'
        }
      },
      required: ['url']
    }
  },
  {
    name: 'generate_architecture_diagram',
    description: 'Generate a visual architecture diagram (flowchart, sequence, Gantt, or mindmap) to help visualize complex workflows and solutions. The diagram will be rendered as Mermaid.js code.',
    parameters: {
      type: 'object',
      properties: {
        diagram_type: {
          type: 'string',
          enum: ['flowchart', 'sequence', 'gantt', 'mindmap'],
          description: 'Type of diagram to generate'
        },
        content_description: {
          type: 'string',
          description: 'Description of what to draw, e.g., "Workflow for video automation pipeline" or "Customer journey from discovery to purchase"'
        }
      },
      required: ['diagram_type', 'content_description']
    }
  },
  {
    name: 'search_internal_case_studies',
    description: 'Search internal case studies and past project wins to provide social proof. Use this when a client is skeptical or needs specific examples of similar solutions.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query for use case or industry (e.g., "customer support", "video generation", "data entry", "media production")'
        },
        industry: {
          type: 'string',
          description: 'Optional industry filter to narrow results'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'generate_custom_syllabus',
    description: 'Generate a custom workshop syllabus tailored to the client\'s team, pain points, and tech stack. Use this instead of giving away solutions for free - show them that their questions are covered in specific workshop modules. This demonstrates your expertise while driving them to book.',
    parameters: {
      type: 'object',
      properties: {
        team_roles: {
          type: 'string',
          description: 'Who is in the workshop? e.g. "3 devs, 1 PM", "5 engineers, 2 managers"'
        },
        pain_points: {
          type: 'array',
          items: { type: 'string' },
          description: 'What problems do they want to solve? List their specific pain points mentioned in conversation'
        },
        tech_stack: {
          type: 'string',
          description: 'Their current technology stack (e.g., "React/Node.js", "WordPress", "Salesforce")'
        }
      },
      required: ['team_roles', 'pain_points', 'tech_stack']
    }
  },
  {
    name: 'analyze_competitor_gap',
    description: 'Analyze what competitors in the client\'s industry are doing with AI to show them the competitive gap. Use this to create urgency (FOMO) by demonstrating they are falling behind market leaders. Perfect for C-level/VP discussions.',
    parameters: {
      type: 'object',
      properties: {
        industry: {
          type: 'string',
          description: 'Industry to analyze (e.g., "media production", "e-commerce", "financial services")'
        },
        client_current_state: {
          type: 'string',
          description: 'What the user told us they are currently doing (e.g., "exploring AI", "manual processes", "no AI implementation yet")'
        }
      },
      required: ['industry', 'client_current_state']
    }
  },
  {
    name: 'simulate_cost_of_inaction',
    description: 'Calculate how much money the client is losing every month by not solving their inefficiency problem. This tool turns your workshop/consulting fee from a "cost" into a "savings" by showing they\'re already paying that amount in wasted time. Perfect for finance/procurement discussions.',
    parameters: {
      type: 'object',
      properties: {
        inefficient_process: {
          type: 'string',
          description: 'The manual task or inefficient process they complained about (e.g., "manual data entry", "manual report generation", "manual customer support ticket routing")'
        },
        hours_wasted_per_week: {
          type: 'number',
          description: 'Hours wasted per week on this inefficient process'
        },
        team_size: {
          type: 'number',
          description: 'Number of people affected by this inefficiency'
        }
      },
      required: ['inefficient_process', 'hours_wasted_per_week', 'team_size']
    }
  },
  {
    name: 'generate_executive_memo',
    description: 'Generate a 1-page executive memo for CFO/CEO/CTO explaining why the proposed solution will save money and overcome their specific objections. This helps the champion (person you\'re chatting with) sell to the decision maker (their boss). Use when budget, timing, or security concerns are raised.',
    parameters: {
      type: 'object',
      properties: {
        target_audience: {
          type: 'string',
          enum: ['CFO', 'CEO', 'CTO'],
          description: 'Who are we trying to convince? CFO focuses on financial metrics, CEO on competitive advantage, CTO on technical architecture.'
        },
        key_blocker: {
          type: 'string',
          enum: ['budget', 'timing', 'security'],
          description: 'What is the main objection we expect? Budget = cost concerns, timing = urgency/readiness, security = compliance/risk.'
        },
        proposed_solution: {
          type: 'string',
          description: 'The solution being proposed, e.g. "2-Day In-House Workshop" or "AI Consulting Engagement"'
        }
      },
      required: ['target_audience', 'key_blocker', 'proposed_solution']
    }
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
