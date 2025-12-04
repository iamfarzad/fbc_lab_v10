import { getSupabaseService } from '../../src/lib/supabase.js'
import { logger } from '../../src/lib/logger.js'
import { EmailService } from '../../src/core/email-service.js'

interface SendPdfRequest {
  sessionId?: string
  toEmail?: string
  email?: string // Alternative field name
  leadName?: string
  name?: string // Alternative field name
  pdfData?: string // Base64 PDF data URL from client-side generation
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as SendPdfRequest
    const { sessionId, pdfData, leadName, name } = body
    const toEmail = body.toEmail || body.email

    if (!toEmail) {
      return new Response(JSON.stringify({ error: 'Missing email address' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const recipientName = leadName || name || 'there'

    // If PDF data is provided directly (from client-side generation), use that
    if (pdfData) {
      logger.info('Sending client-generated PDF via email', { toEmail })
      
      // Extract base64 data from data URL
      const base64Match = pdfData.match(/^data:application\/pdf;base64,(.+)$/)
      const pdfBase64 = base64Match ? base64Match[1] : pdfData
      
      // Send email with PDF attachment
      const emailOptions = {
        to: toEmail,
        subject: 'Your F.B/c AI Consultation Report',
        html: `
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <h2>Your F.B/c AI Consultation Report</h2>
              <p>Hi ${recipientName},</p>
              <p>Thank you for your consultation with F.B/c AI. Please find your consultation report attached to this email.</p>
              <p>The report includes:</p>
              <ul>
                <li>Executive summary of your consultation</li>
                <li>Full conversation transcript</li>
                <li>Key insights and recommendations</li>
              </ul>
              <p>If you have any questions or would like to schedule a follow-up, please don't hesitate to reach out.</p>
              <p>Best regards,<br/>F.B/c Team</p>
            </body>
          </html>
        `,
        text: `Hi ${recipientName},\n\nThank you for your consultation with F.B/c AI. Please find your consultation report attached to this email.\n\nBest regards,\nF.B/c Team`,
        attachments: pdfBase64 ? [{
          filename: `FBC-Consultation-${recipientName.replace(/\s+/g, '_')}-${new Date().toISOString().slice(0, 10)}.pdf`,
          content: Buffer.from(pdfBase64, 'base64'),
          contentType: 'application/pdf'
        }] : []
      }
      const result = await EmailService.sendEmail(emailOptions)

      return new Response(JSON.stringify({ success: true, messageId: result.emailId }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Fallback: Fetch from database if no PDF data provided
    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'Missing sessionId or pdfData' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const supabase = getSupabaseService()
    if (!supabase) {
      return new Response(JSON.stringify({ error: 'Supabase not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Fetch lead info
    const { data: leadData, error: leadError } = await supabase
      .from('lead_summaries')
      .select('*')
      .eq('session_id', sessionId)
      .single()

    if (leadError) {
      logger.error('Failed to fetch lead summary', leadError instanceof Error ? leadError : undefined, { sessionId })
      throw leadError
    }

    // Fetch conversation history
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select('*')
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: true })

    if (activitiesError) {
      logger.error('Failed to fetch activities', activitiesError instanceof Error ? activitiesError : undefined, { sessionId })
      throw activitiesError
    }

    // Map activities to conversationHistory format
    const conversationHistory = (activities || []).map((activity: unknown) => {
      const act = activity && typeof activity === 'object' && 'type' in activity ? activity : { type: 'assistant_message' }
      const type = 'type' in act && typeof act.type === 'string' ? act.type : 'assistant_message'
      const description = 'description' in act && typeof act.description === 'string' ? act.description : ''
      const title = 'title' in act && typeof act.title === 'string' ? act.title : ''
      const created_at = 'created_at' in act && typeof act.created_at === 'string' ? act.created_at : new Date().toISOString()
      return {
        role: type === 'user_message' ? 'user' as const : 'assistant' as const,
        content: description || title || '',
        timestamp: created_at
      }
    })

    // Build simple HTML email body
    const emailBody = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2>Your F.B/c AI Consultation Summary</h2>
          <p>Hi ${leadData?.company_name || recipientName},</p>
          <p>Thank you for your consultation. Below is a summary of our conversation:</p>
          
          <div style="margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 5px;">
            ${conversationHistory.map((msg: { role: string; content: string; timestamp?: string | number | Date }) => `
              <div style="margin-bottom: 10px;">
                <strong>${msg.role === 'user' ? 'You' : 'F.B/c Consultant'}:</strong><br/>
                <span>${msg.content}</span>
                <small style="color: #666; display: block; margin-top: 5px;">
                  ${msg.timestamp ? new Date(msg.timestamp).toLocaleString() : ''}
                </small>
              </div>
            `).join('')}
          </div>
          
          <p>If you have any questions, please don't hesitate to reach out.</p>
          <p>Best regards,<br/>F.B/c Team</p>
        </body>
      </html>
    `

    // Send email via EmailService
    const result = await EmailService.sendEmail({
      to: toEmail,
      subject: 'Your F.B/c AI Consultation Summary',
      html: emailBody,
      text: `Hi ${leadData?.company_name || recipientName},\n\nThank you for your consultation. This is a summary of our conversation.\n\nBest regards,\nF.B/c Team`
    })

    return new Response(JSON.stringify({ success: true, messageId: result.emailId }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    logger.error('Send PDF summary failed', error instanceof Error ? error : undefined)
    return new Response(JSON.stringify({ error: 'Failed to send summary', message: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

