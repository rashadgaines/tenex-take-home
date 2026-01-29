/**
 * Email subject line generation utilities
 */

/**
 * Generate a subject line based on the email purpose
 */
export function generateSubjectLine(purpose: string): string {
  const lowerPurpose = purpose.toLowerCase();

  if (lowerPurpose.includes('meeting') || lowerPurpose.includes('schedule')) {
    return 'Meeting Request';
  }

  if (lowerPurpose.includes('follow up') || lowerPurpose.includes('followup')) {
    return 'Following Up';
  }

  if (lowerPurpose.includes('introduction') || lowerPurpose.includes('introduce')) {
    return 'Introduction';
  }

  if (lowerPurpose.includes('question') || lowerPurpose.includes('ask')) {
    return 'Quick Question';
  }

  if (lowerPurpose.includes('thank')) {
    return 'Thank You';
  }

  if (lowerPurpose.includes('update') || lowerPurpose.includes('project')) {
    return 'Project Update';
  }

  // Default: use a shortened version of the purpose
  const words = purpose.split(' ').slice(0, 5).join(' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Generate alternative subject lines for an email
 */
export function generateAlternativeSubjects(purpose: string): string[] {
  const lowerPurpose = purpose.toLowerCase();
  const alternatives: string[] = [];

  if (lowerPurpose.includes('meeting') || lowerPurpose.includes('schedule')) {
    alternatives.push(
      "Let's Connect",
      'Time to Chat?',
      'Scheduling a Meeting'
    );
  } else if (lowerPurpose.includes('follow up') || lowerPurpose.includes('followup')) {
    alternatives.push(
      'Checking In',
      'Quick Follow-up',
      'Circling Back'
    );
  } else if (lowerPurpose.includes('update') || lowerPurpose.includes('project')) {
    alternatives.push(
      'Status Update',
      'Progress Report',
      'Quick Update'
    );
  } else {
    alternatives.push(
      'Quick Note',
      'Reaching Out',
      'Brief Message'
    );
  }

  return alternatives;
}
