
import { TranscriptItem, ResearchResult } from '../types';

interface PDFOptions {
    transcript: TranscriptItem[];
    userProfile?: { name: string; email: string } | null;
    researchContext?: ResearchResult | null;
}

export const generatePDF = ({ transcript, userProfile, researchContext }: PDFOptions): string | undefined => {
    // @ts-expect-error - jsPDF is loaded dynamically and may not be in window type
    if (!window.jspdf) {
        console.error("jsPDF library not loaded");
        alert("PDF Generator is initializing. Please try again in a moment.");
        return undefined;
    }

    // @ts-expect-error - jsPDF is loaded dynamically and may not be in window type
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
        compress: true
    });

    // --- CONFIG ---
    const margin = 20;
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const contentWidth = pageWidth - (margin * 2);

    const colors = {
        accent: [249, 115, 22], // Orange 500
        text: [33, 37, 41],     // Gray 900
        secondary: [108, 117, 125], // Gray 500
        light: [248, 249, 250],  // Gray 50
        blue: [37, 99, 235]      // Blue 600
    };

    let y = margin;

    // --- HELPER: PAGE MANAGEMENT ---
    const addFooter = (pageNumber: number) => {
        doc.setFontSize(8);
        doc.setTextColor(...colors.secondary);

        // GDPR Notice (from spec)
        const notice = "GDPR NOTICE: Voice transcripts & visual captures are deleted after 7 days.";
        doc.text(notice, margin, pageHeight - 10);

        // Branding & Page
        doc.text(`F.B/c AI Consultation`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        doc.text(`Page ${pageNumber}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
    };

    let pageCount = 1;

    const checkPageBreak = (heightNeeded: number) => {
        if (y + heightNeeded > pageHeight - 20) { // 20mm bottom margin
            addFooter(pageCount);
            doc.addPage();
            pageCount++;
            y = margin;
            return true;
        }
        return false;
    };

    // --- PAGE 1: EXECUTIVE SUMMARY & CONTEXT ---

    // 1. Branding Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(...colors.text);
    doc.text("F.B/c", margin, y);

    doc.setFontSize(10);
    doc.setTextColor(...colors.accent);
    doc.text("CONSULTATION REPORT", margin + 30, y - 1);

    doc.setDrawColor(...colors.accent);
    doc.setLineWidth(0.5);
    doc.line(margin, y + 5, pageWidth - margin, y + 5);

    y += 25;

    // 2. Session Metadata
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...colors.secondary);
    const dateStr = new Date().toLocaleString();
    doc.text(`Generated: ${dateStr}`, margin, y);
    doc.text(`Session ID: ${Date.now().toString().slice(-8)}`, pageWidth - margin, y, { align: 'right' });
    y += 15;

    // 3. Intelligence Card (Styled Box)
    doc.setFillColor(250, 250, 250); // Very light gray
    doc.setDrawColor(230, 230, 230);
    doc.rect(margin, y, contentWidth, 60, 'FD');

    let boxY = y + 12;
    const leftColX = margin + 8;
    const rightColX = pageWidth / 2 + 5;

    // Client Column
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...colors.text);
    doc.text("CLIENT PROFILE", leftColX, boxY);
    boxY += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...colors.secondary);
    doc.text(userProfile?.name || 'Guest User', leftColX, boxY);
    boxY += 5;
    doc.text(userProfile?.email || 'No email provided', leftColX, boxY);

    // Intelligence Column (if available)
    boxY = y + 12; // Reset Y for right column

    if (researchContext) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(...colors.text);
        doc.text("STRATEGIC CONTEXT", rightColX, boxY);
        boxY += 8;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...colors.secondary);

        const role = researchContext.role || 'Role Unknown';
        const company = researchContext.company.name || 'Company Unknown';
        const industry = researchContext.company.industry || 'Industry Unknown';

        doc.text(`${role}`, rightColX, boxY);
        boxY += 5;
        doc.text(`${company}`, rightColX, boxY);
        boxY += 5;
        doc.text(`${industry}`, rightColX, boxY);
    } else {
        doc.setFont("helvetica", "italic");
        doc.setTextColor(...colors.secondary);
        doc.text("No background research available.", rightColX, boxY + 10);
    }

    y += 75;

    // 4. Transcript Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...colors.text);
    doc.text("CONSULTATION TRANSCRIPT", margin, y);
    y += 10;

    // --- TRANSCRIPT ENGINE ---

    for (const item of transcript) {
        if (item.text.startsWith('[System:') || (!item.text.trim() && !item.attachment)) continue;

        // Filter garbage/noise (e.g. single chars, "Um", "Ah")
        const cleanTextRaw = item.text.trim();
        if (cleanTextRaw.length < 3 && !['no', 'ok', 'hi'].includes(cleanTextRaw.toLowerCase())) continue;
        if (cleanTextRaw.match(/^[A-Z]\s[a-z]\s/)) continue; // Filter spaced out garbage like "G @ - 2"

        const isUser = item.role === 'user';

        // --- ROLE HEADER ---
        checkPageBreak(15);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);

        if (isUser) {
            doc.setTextColor(...colors.blue);
            doc.text("USER", margin, y);
        } else {
            doc.setTextColor(...colors.accent);
            doc.text("F.B/c CONSULTANT", margin, y);
        }

        // Timestamp
        doc.setFont("helvetica", "normal");
        doc.setTextColor(150, 150, 150);
        const timeStr = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        doc.text(timeStr, margin + 35, y);

        y += 5;

        // --- TEXT CONTENT ---
        if (item.text) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.setTextColor(...colors.text);

            // Strip markdown for PDF
            const cleanText = item.text
                .replace(/\*\*/g, '')
                .replace(/\*/g, '')
                .replace(/`/g, '')
                .replace(/#/g, '');

            const lines = doc.splitTextToSize(cleanText, contentWidth);
            const textHeight = lines.length * 5; // 5mm line height

            if (checkPageBreak(textHeight)) {
                // If we broke page, the header is on prev page, which is fine. 
                // Just continue text flow.
            }

            doc.text(lines, margin, y);
            y += textHeight + 4;
        }

        // --- VISUAL ATTACHMENTS ---
        if (item.attachment && item.attachment.type === 'image' && item.attachment.url) {
            const imgWidth = 80;
            const imgHeight = 60; // Placeholder, we ideally want aspect ratio but 4:3 is safe

            if (checkPageBreak(imgHeight + 10)) {
                // Page break handled
            }

            try {
                doc.addImage(item.attachment.url, 'JPEG', margin, y, imgWidth, imgHeight, undefined, 'FAST');

                // Caption
                doc.setFontSize(7);
                doc.setTextColor(...colors.secondary);
                doc.text(`[Visual Analysis: ${item.attachment.name || 'Capture'}]`, margin, y + imgHeight + 4);

                y += imgHeight + 12;
            } catch (e) {
                console.warn("PDF Image Error:", e);
            }
        }

        y += 4; // Spacing between messages
    }

    // --- PROPOSED OFFER / QUOTATION SECTION ---
    checkPageBreak(80); // Ensure space for offer section
    
    y += 10;
    
    // Section Header
    doc.setFillColor(249, 115, 22); // Orange accent
    doc.rect(margin, y, contentWidth, 8, 'F');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text("PROPOSED OFFER", margin + 3, y + 5.5);
    y += 15;

    // Offer Details Box
    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(230, 230, 230);
    doc.rect(margin, y, contentWidth, 55, 'FD');

    doc.setFontSize(9);
    doc.setTextColor(...colors.text);
    doc.setFont("helvetica", "normal");

    const offerY = y + 8;
    
    // Service Type
    doc.setFont("helvetica", "bold");
    doc.text("Service:", margin + 5, offerY);
    doc.setFont("helvetica", "normal");
    doc.text("AI Consulting & Strategy Workshop", margin + 30, offerY);
    
    // Pricing (placeholder)
    doc.setFont("helvetica", "bold");
    doc.text("Investment:", margin + 5, offerY + 10);
    doc.setFont("helvetica", "normal");
    doc.text("Custom pricing based on scope - Schedule a call to discuss", margin + 30, offerY + 10);
    
    // Timeline
    doc.setFont("helvetica", "bold");
    doc.text("Timeline:", margin + 5, offerY + 20);
    doc.setFont("helvetica", "normal");
    doc.text("Typically 2-4 weeks for initial engagement", margin + 30, offerY + 20);
    
    // Next Steps
    doc.setFont("helvetica", "bold");
    doc.text("Next Steps:", margin + 5, offerY + 30);
    doc.setFont("helvetica", "normal");
    const nextStepsText = "1. Review this summary  2. Schedule follow-up call  3. Receive detailed proposal";
    doc.text(nextStepsText, margin + 30, offerY + 30);
    
    // CTA
    doc.setFontSize(8);
    doc.setTextColor(...colors.accent);
    doc.setFont("helvetica", "bold");
    doc.text("Book your follow-up: https://cal.com/farzad-bayat/30min", margin + 5, offerY + 42);

    y += 65;

    // Final Footer
    addFooter(pageCount);

    // Save and/or return data URL
    const filename = `FBC-Consultation-${userProfile?.name?.replace(/\s+/g, '_') || 'Session'}-${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(filename);
    
    // Return base64 data URL for email functionality
    return doc.output('dataurlstring') as string;
};
