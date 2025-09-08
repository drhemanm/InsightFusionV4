```typescript
import { Contact } from '../../types/contacts';
import { logger } from '../../utils/monitoring/logger';

interface DuplicateMatch {
  type: 'exact' | 'fuzzy';
  field: string;
  confidence: number;
  original: Contact;
  duplicate: Contact;
}

class DuplicateDetectionService {
  private static instance: DuplicateDetectionService;
  private readonly SIMILARITY_THRESHOLD = 0.85;
  private readonly EMAIL_DOMAINS_ALIASES = new Map([
    ['gmail.com', ['googlemail.com']],
    ['outlook.com', ['hotmail.com', 'live.com']]
  ]);

  private constructor() {}

  static getInstance(): DuplicateDetectionService {
    if (!DuplicateDetectionService.instance) {
      DuplicateDetectionService.instance = new DuplicateDetectionService();
    }
    return DuplicateDetectionService.instance;
  }

  async findDuplicates(contact: Contact, existingContacts: Contact[]): Promise<DuplicateMatch[]> {
    try {
      const matches: DuplicateMatch[] = [];

      // Check exact matches first
      const exactMatches = this.findExactMatches(contact, existingContacts);
      matches.push(...exactMatches);

      // Only proceed with fuzzy matching if no exact matches found
      if (exactMatches.length === 0) {
        const fuzzyMatches = this.findFuzzyMatches(contact, existingContacts);
        matches.push(...fuzzyMatches);
      }

      return matches;
    } catch (error) {
      logger.error('Duplicate detection failed', { error, contactId: contact.id });
      return [];
    }
  }

  private findExactMatches(contact: Contact, existingContacts: Contact[]): DuplicateMatch[] {
    const matches: DuplicateMatch[] = [];
    const normalizedEmail = this.normalizeEmail(contact.email);
    const normalizedPhone = this.normalizePhone(contact.phone);

    existingContacts.forEach(existing => {
      // Check email match (including domain aliases)
      if (this.areEmailsMatching(normalizedEmail, this.normalizeEmail(existing.email))) {
        matches.push({
          type: 'exact',
          field: 'email',
          confidence: 1,
          original: existing,
          duplicate: contact
        });
      }

      // Check phone match
      if (normalizedPhone && 
          this.normalizePhone(existing.phone) === normalizedPhone) {
        matches.push({
          type: 'exact',
          field: 'phone',
          confidence: 1,
          original: existing,
          duplicate: contact
        });
      }
    });

    return matches;
  }

  private findFuzzyMatches(contact: Contact, existingContacts: Contact[]): DuplicateMatch[] {
    const matches: DuplicateMatch[] = [];
    const normalizedNewName = `${contact.firstName} ${contact.lastName}`.toLowerCase();

    existingContacts.forEach(existing => {
      const normalizedExistingName = `${existing.firstName} ${existing.lastName}`.toLowerCase();
      const similarity = this.calculateNameSimilarity(
        normalizedNewName,
        normalizedExistingName
      );

      if (similarity >= this.SIMILARITY_THRESHOLD) {
        matches.push({
          type: 'fuzzy',
          field: 'name',
          confidence: similarity,
          original: existing,
          duplicate: contact
        });
      }
    });

    return matches;
  }

  private normalizeEmail(email: string): string {
    if (!email) return '';
    const [localPart, domain] = email.toLowerCase().split('@');
    
    // Remove dots and everything after + in local part
    const normalizedLocal = localPart.replace(/\./g, '').split('+')[0];
    
    // Check for domain aliases
    let normalizedDomain = domain;
    for (const [primaryDomain, aliases] of this.EMAIL_DOMAINS_ALIASES) {
      if (aliases.includes(domain)) {
        normalizedDomain = primaryDomain;
        break;
      }
    }

    return `${normalizedLocal}@${normalizedDomain}`;
  }

  private normalizePhone(phone?: string): string {
    if (!phone) return '';
    // Remove all non-numeric characters
    return phone.replace(/\D/g, '');
  }

  private calculateNameSimilarity(str1: string, str2: string): number {
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 1.0;
    
    const distance = this.calculateLevenshteinDistance(str1, str2);
    return 1 - (distance / maxLength);
  }

  private calculateLevenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str1.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str2.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str1.length; i++) {
      for (let j = 1; j <= str2.length; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    return matrix[str1.length][str2.length];
  }
}

export const duplicateDetectionService = DuplicateDetectionService.getInstance();
```