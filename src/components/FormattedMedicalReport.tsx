import React from "react";

interface FormattedMedicalReportProps {
  reportText: string;
}

export function FormattedMedicalReport({ reportText }: FormattedMedicalReportProps) {
  if (!reportText) {
    return <div className="text-center p-12">No report available.</div>;
  }

  // Parse the report into sections
  const sections = parseReportSections(reportText);
  
  // Ensure all required sections exist and are in the correct order
  const formattedSections = ensureRequiredSections(sections);

  return (
    <div className="bg-gray-50 p-6 rounded-md">
      {formattedSections.map((section) => (
        <div key={section.title} className="mb-6">
          <h3 className="text-lg font-bold mb-2 text-blue-700">{section.title}</h3>
          <div 
            className={`pl-2 border-l-2 ${section.title === "ICD-10 Codes" ? "border-blue-400 bg-blue-50 p-2 rounded-r-md" : "border-blue-200"}`}
            dangerouslySetInnerHTML={{ __html: formatSectionContent(section.content, section.title) }}
          />
        </div>
      ))}
    </div>
  );
}

interface ReportSection {
  title: string;
  content: string;
}

// Define required SOAP note sections
const requiredSections = [
  "Subjective",
  "Objective", 
  "Assessment", 
  "Plan", 
  "ICD-10 Codes"
];

// Ensure all required sections exist and are in the correct order
function ensureRequiredSections(sections: ReportSection[]): ReportSection[] {
  const sectionMap: Record<string, string> = {};
  
  // Add existing sections to map
  sections.forEach(section => {
    sectionMap[section.title] = section.content;
  });
  
  // Create an ordered array with all required sections
  return requiredSections.map(title => ({
    title,
    content: sectionMap[title] || "[Not provided]"
  }));
}

function parseReportSections(reportText: string): ReportSection[] {
  const sections: ReportSection[] = [];
  
  // Match Markdown section headers: **Section Title**
  const sectionRegex = /\*\*(.*?)\*\*\s*\n([\s\S]*?)(?=\n\*\*|$)/g;
  
  let match;
  while ((match = sectionRegex.exec(reportText)) !== null) {
    sections.push({
      title: match[1].trim(),
      content: match[2].trim(),
    });
  }
  
  return sections;
}

function formatSectionContent(content: string, sectionTitle?: string): string {
  // Don't format "[Not provided]"
  if (content === "[Not provided]") {
    return content;
  }
  
  // Format bullet points
  let formattedContent = content.replace(/^\s*-\s*(.*)/gm, '<li class="mb-1">$1</li>');
  formattedContent = formattedContent.replace(/<li.*?<\/li>(?:\s*<li.*?<\/li>)*/gs, '<ul class="list-disc pl-5 my-2">$&</ul>');
  
  // Format numbered lists
  formattedContent = formattedContent.replace(/^\s*(\d+)\.\s*(.*)/gm, '<li class="mb-1">$2</li>');
  formattedContent = formattedContent.replace(/<li.*?<\/li>(?:\s*<li.*?<\/li>)*/gs, '<ol class="list-decimal pl-5 my-2">$&</ol>');
  
  // Special formatting for ICD-10 codes
  if (sectionTitle === "ICD-10 Codes") {
    // Format ICD-10 codes with distinctive styling
    formattedContent = formattedContent.replace(/([A-Z]\d{2}(?:\.\d+)?)/g, 
      '<span class="bg-blue-200 text-blue-800 px-2 py-0.5 rounded font-mono">$1</span>');
    
    // Enhance bullet points for ICD-10 codes
    formattedContent = formattedContent.replace(/<ul class="list-disc pl-5 my-2">/g, 
      '<ul class="space-y-2 list-none pl-2 my-2">');
    
    // Add a subtle grid effect for each item
    formattedContent = formattedContent.replace(/<li class="mb-1">(.*?)<\/li>/g, 
      '<li class="p-2 hover:bg-blue-100 rounded transition-colors flex justify-between"><div>$1</div></li>');
  }
  
  // Replace newlines with line breaks
  formattedContent = formattedContent.replace(/\n/g, '<br />');
  
  // Bold text
  formattedContent = formattedContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Italicize text
  formattedContent = formattedContent.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  return formattedContent;
}