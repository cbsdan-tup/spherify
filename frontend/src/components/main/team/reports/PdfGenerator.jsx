import React from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Button } from 'react-bootstrap';

const PdfGenerator = ({ teamDetails, contributionData }) => {
  const generatePDF = () => {
    // Create a new PDF document
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Add title with better formatting
    doc.setFontSize(24);
    doc.setTextColor(41, 128, 185); // Professional blue color
    doc.setFont("helvetica", "bold");
    doc.text(`${teamDetails?.name || 'Team'} Contribution Report`, pageWidth / 2, 20, { align: 'center' });
    
    // Add date with better formatting
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth / 2, 30, { align: 'center' });
    
    // Add decorative elements
    doc.setDrawColor(41, 128, 185); // Professional blue color
    doc.setLineWidth(0.5);
    doc.line(15, 35, pageWidth - 15, 35);
    
    // Add logo placeholder with better styling
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(pageWidth / 2 - 30, 45, 60, 30, 3, 3, 'F');
    doc.setFontSize(12);
    doc.setTextColor(70, 70, 70);
    doc.setFont("helvetica", "italic");
    doc.text('Team Analytics', pageWidth / 2, 60, { align: 'center' });
    doc.setFont("helvetica", "normal");
    doc.text('Dashboard', pageWidth / 2, 68, { align: 'center' });
    
    // Add analysis section with better styling
    doc.setFontSize(16);
    doc.setTextColor(44, 62, 80);
    doc.setFont("helvetica", "bold");
    doc.text('Team Analysis', 15, 90);
    
    // Divider
    doc.setDrawColor(41, 128, 185);
    doc.setLineWidth(0.5);
    doc.line(15, 95, pageWidth - 15, 95);
    
    // Prepare the analysis text
    const taskData = contributionData?.taskMetrics || { total: 0, completed: 0, inProgress: 0, notStarted: 0 };
    const completionRate = taskData.total > 0 ? ((taskData.completed / taskData.total) * 100).toFixed(1) : 0;
    const userContributions = contributionData?.userContributions || [];
    
    // Helper function to highlight text
    const highlightText = (text, isHighlight) => {
      if (isHighlight) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(41, 128, 185);
      } else {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(60, 60, 60);
      }
    };
    
    // Start adding content
    let yPos = 105;
    const lineHeight = 7;
    
    // Add introduction
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    doc.setFont("helvetica", "normal");
    
    const introText = `This report provides an overview of team collaboration and contribution metrics for ${teamDetails?.name || 'your team'}.`;
    doc.text(introText, 15, yPos);
    yPos += lineHeight * 2;
    
    // Add Task Statistics section with highlights
    doc.setFont("helvetica", "bold");
    doc.setTextColor(41, 128, 185);
    doc.text('Team Task Statistics:', 15, yPos);
    yPos += lineHeight;
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    doc.text('• Total Tasks: ', 20, yPos);
    
    // Highlight total tasks count
    const totalTasksWidth = doc.getTextWidth('• Total Tasks: ');
    highlightText(true);
    doc.text(`${taskData.total}`, 20 + totalTasksWidth, yPos);
    highlightText(false);
    yPos += lineHeight;
    
    doc.text('• Completion Rate: ', 20, yPos);
    const completionRateWidth = doc.getTextWidth('• Completion Rate: ');
    highlightText(true);
    doc.text(`${completionRate}%`, 20 + completionRateWidth, yPos);
    highlightText(false);
    yPos += lineHeight;
    
    doc.text('• Tasks Completed: ', 20, yPos);
    const tasksCompletedWidth = doc.getTextWidth('• Tasks Completed: ');
    highlightText(true);
    doc.text(`${taskData.completed}`, 20 + tasksCompletedWidth, yPos);
    highlightText(false);
    yPos += lineHeight;
    
    doc.text('• Tasks In Progress: ', 20, yPos);
    const inProgressWidth = doc.getTextWidth('• Tasks In Progress: ');
    highlightText(true);
    doc.text(`${taskData.inProgress}`, 20 + inProgressWidth, yPos);
    highlightText(false);
    yPos += lineHeight;
    
    doc.text('• Tasks Not Started: ', 20, yPos);
    const notStartedWidth = doc.getTextWidth('• Tasks Not Started: ');
    highlightText(true);
    doc.text(`${taskData.notStarted}`, 20 + notStartedWidth, yPos);
    highlightText(false);
    yPos += lineHeight * 2;
    
    // Highlight member contributions
    highlightText(true);
    doc.text(`${userContributions.length} active team members`, 15, yPos);
    highlightText(false);
    doc.text(' contributed to the team\'s activities.', 15 + doc.getTextWidth(`${userContributions.length} active team members`), yPos);
    yPos += lineHeight * 2;
    
    // Find most active member
    let mostActiveUser = null;
    let highestContribution = -1;
    
    userContributions.forEach(user => {
      const totalContributions = user.files.created + user.files.edited + user.tasks.assigned + user.messages;
      if (totalContributions > highestContribution) {
        highestContribution = totalContributions;
        mostActiveUser = user;
      }
    });
    
    // Find member with highest task completion rate
    let bestTaskCompleter = null;
    let bestCompletionRate = -1;
    
    userContributions.forEach(user => {
      if (user.tasks.assigned > 0) {
        const rate = (user.tasks.completed / user.tasks.assigned) * 100;
        if (rate > bestCompletionRate) {
          bestCompletionRate = rate;
          bestTaskCompleter = user;
        }
      }
    });
    
    // Add top performer section with highlighted names
    if (mostActiveUser) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(41, 128, 185);
      doc.text('Most Active Team Member:', 15, yPos);
      yPos += lineHeight;
      
      doc.setFontSize(13);
      doc.text(mostActiveUser.name, 20, yPos);
      yPos += lineHeight;
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      doc.text('• Files Created: ', 20, yPos);
      const createdWidth = doc.getTextWidth('• Files Created: ');
      highlightText(true);
      doc.text(`${mostActiveUser.files.created}`, 20 + createdWidth, yPos);
      highlightText(false);
      yPos += lineHeight;
      
      doc.text('• Files Edited: ', 20, yPos);
      const editedWidth = doc.getTextWidth('• Files Edited: ');
      highlightText(true);
      doc.text(`${mostActiveUser.files.edited}`, 20 + editedWidth, yPos);
      highlightText(false);
      yPos += lineHeight;
      
      doc.text('• Messages Sent: ', 20, yPos);
      const messagesWidth = doc.getTextWidth('• Messages Sent: ');
      highlightText(true);
      doc.text(`${mostActiveUser.messages}`, 20 + messagesWidth, yPos);
      highlightText(false);
      yPos += lineHeight;
      
      doc.text('• Tasks Assigned: ', 20, yPos);
      const assignedWidth = doc.getTextWidth('• Tasks Assigned: ');
      highlightText(true);
      doc.text(`${mostActiveUser.tasks.assigned}`, 20 + assignedWidth, yPos);
      highlightText(false);
      yPos += lineHeight * 2;
    }
    
    if (bestTaskCompleter) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(41, 128, 185);
      doc.text('Highest Task Completion Rate:', 15, yPos);
      yPos += lineHeight;
      
      doc.setFontSize(13);
      doc.text(`${bestTaskCompleter.name} (${parseFloat(bestTaskCompleter.completionRate).toFixed(1)}%)`, 20, yPos);
      doc.setFontSize(11);
      yPos += lineHeight * 2;
    }
    
    // Check if we need a new page before insights
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    // Add insights with highlighted titles
    doc.setFont("helvetica", "bold");
    doc.setTextColor(41, 128, 185);
    doc.text('Key Insights:', 15, yPos);
    yPos += lineHeight;
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    
    // Calculate average contributions
    const avgContributions = userContributions.reduce((acc, user) => {
      return acc + user.files.created + user.files.edited + user.messages + user.tasks.assigned;
    }, 0) / (userContributions.length || 1);
    
    // Calculate file activity
    const totalFiles = userContributions.reduce((acc, user) => acc + user.files.created, 0);
    const totalEdits = userContributions.reduce((acc, user) => acc + user.files.edited, 0);
    
    // Add insights based on metrics with highlighted values
    let insights = [];
    if (completionRate < 50) {
      insights.push(`• Task completion is below 50%. Consider reviewing task assignments and deadlines.`);
    } else if (completionRate > 75) {
      insights.push(`• Strong task completion rate at ${completionRate}%. The team shows excellent follow-through.`);
    }
    
    if (taskData.inProgress > taskData.completed && taskData.total > 0) {
      insights.push(`• Many tasks are in progress but not completed. Consider having focused sprints to close tasks.`);
    }
    
    if (totalEdits > totalFiles * 3) {
      insights.push(`• High number of file edits indicates collaborative work on documents.`);
    }
    
    // Add distribution analysis
    const contributionVariance = userContributions.reduce((acc, user) => {
      const userTotal = user.files.created + user.files.edited + user.messages + user.tasks.assigned;
      return acc + Math.pow(userTotal - avgContributions, 2);
    }, 0) / (userContributions.length || 1);
    
    if (contributionVariance > avgContributions * 2 && userContributions.length > 1) {
      insights.push(`• Work distribution appears uneven. Consider redistributing responsibilities across team members.`);
    } else if (userContributions.length > 1) {
      insights.push(`• Work is well-distributed among team members.`);
    }
    
    // Add each insight with highlighting for key metrics
    insights.forEach(insight => {
      // Split insight text for highlighting
      const parts = insight.split(/([\d.]+%)/g);
      let xPos = 15;
      
      parts.forEach(part => {
        const isMetric = /%$/.test(part) || /^\d+(\.\d+)?$/.test(part);
        
        if (isMetric) {
          highlightText(true);
          doc.text(part, xPos, yPos);
          xPos += doc.getTextWidth(part);
          highlightText(false);
        } else {
          doc.text(part, xPos, yPos);
          xPos += doc.getTextWidth(part);
        }
      });
      
      yPos += lineHeight;
    });
    
    yPos += lineHeight;
    
    // Add recommendations section
    doc.setFont("helvetica", "bold");
    doc.setTextColor(41, 128, 185);
    doc.text('Recommendations:', 15, yPos);
    yPos += lineHeight;
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    
    const recommendations = [
      '• Regular check-ins can help maintain consistent activity levels across the team.',
      '• Consider recognizing top contributors to encourage continued engagement.',
      '• Review task completion workflows to improve overall productivity.'
    ];
    
    recommendations.forEach(rec => {
      doc.text(rec, 15, yPos);
      yPos += lineHeight;
    });
    
    // Add a new page for contribution data
    doc.addPage();
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(41, 128, 185);
    doc.text('Member Contributions', 15, 20);
    
    // Add explanatory text
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 100, 100);
    doc.text('The table below shows detailed contribution metrics for each team member.', 15, 30);
    
    // Add member contribution table with improved styling
    const contributionTableData = userContributions.map(user => [
      user.name,
      user.role.charAt(0).toUpperCase() + user.role.slice(1),
      user.files.created,
      user.files.edited,
      `${user.tasks.completed}/${user.tasks.assigned}`,
      user.messages,
      user.files.created + user.files.edited + user.tasks.assigned + user.messages
    ]);
    
    // Use autoTable with improved styling
    autoTable(doc, {
      startY: 35,
      head: [['Name', 'Role', 'Files Created', 'Files Edited', 'Tasks', 'Messages', 'Total']],
      body: contributionTableData,
      theme: 'grid',
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontSize: 11,
        halign: 'center',
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250]
      },
      styles: {
        fontSize: 10,
        cellPadding: 4,
        lineColor: [200, 200, 200]
      },
      columnStyles: {
        0: { cellWidth: 40, fontStyle: 'bold' },
        1: { cellWidth: 25 },
        6: { fontStyle: 'bold', fillColor: [234, 242, 248] }
      }
    });
    
    // Add footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Page ${i} of ${pageCount} - ${teamDetails?.name || 'Team'} Report`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    }
    
    // Save the PDF
    doc.save(`${teamDetails?.name || 'Team'}_Contribution_Report.pdf`);
  };

  return (
    <Button 
      variant="outline-primary" 
      onClick={generatePDF} 
      className="mb-3"
    >
      <i className="fas fa-file-pdf me-2"></i>
      Download PDF Report
    </Button>
  );
};

export default PdfGenerator;
