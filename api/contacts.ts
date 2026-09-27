export interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
}

export interface ContactResolution {
  resolved: boolean;
  contact?: Contact;
  ambiguous?: boolean;
  matches?: Contact[];
  query: string;
}

export const APPROVED_CONTACTS: Contact[] = [
  { id: 'cnt-1', name: 'Ahmed Raza', email: 'ahmed.raza@example.com', phone: '+923001234567', company: 'Nexus Tech' },
  { id: 'cnt-2', name: 'Ahmed Khan', email: 'ahmed.khan@example.com', phone: '+923219876543', company: 'Alpha Solutions' },
  { id: 'cnt-3', name: 'Ali Hassan', email: 'ali.hassan@example.com', phone: '+923335551234', company: 'DevStudio' },
  { id: 'cnt-4', name: 'Sarah Miller', email: 'sarah@example.com', phone: '+14155552671', company: 'CloudCorp' }
];

export function formatCleanPhone(rawPhone: string): string {
  const digits = rawPhone.replace(/[^0-9]/g, '');
  if (digits.startsWith('03') && digits.length === 11) {
    return '92' + digits.slice(1);
  }
  return digits;
}

export function resolveContact(query: string): ContactResolution {
  const clean = query.trim().toLowerCase();

  // 1. Check direct phone number (e.g. +923001234567 or 03001234567)
  const phoneDigits = query.replace(/[^0-9+]/g, '');
  if (phoneDigits.length >= 7) {
    const cleanPhone = formatCleanPhone(phoneDigits);
    return {
      resolved: true,
      contact: {
        id: `cnt-${Date.now().toString(36)}`,
        name: query.trim(),
        email: null,
        phone: '+' + cleanPhone,
        company: 'Direct Phone'
      },
      query
    };
  }

  // 2. Exact name match
  const exact = APPROVED_CONTACTS.find(c => c.name.toLowerCase() === clean);
  if (exact) {
    return { resolved: true, contact: exact, query };
  }

  // 3. Partial / contains match
  const partials = APPROVED_CONTACTS.filter(c => c.name.toLowerCase().includes(clean));

  if (partials.length === 1) {
    return { resolved: true, contact: partials[0], query };
  }

  if (partials.length > 1) {
    return {
      resolved: false,
      ambiguous: true,
      matches: partials,
      query
    };
  }

  return {
    resolved: false,
    ambiguous: false,
    matches: [],
    query
  };
}
