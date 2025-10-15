/**
 * Clara Email Reader - Amélioration de la lecture d'emails
 * 
 * Objectifs:
 * 1. Normaliser le formatage des emails (HTML, texte brut)
 * 2. Améliorer la prononciation des noms, adresses, références
 * 3. Épeler les informations critiques (emails, références)
 * 4. Structurer la lecture pour une meilleure compréhension
 */

interface EmailContent {
  from: string;
  fromName?: string;
  to: string;
  subject: string;
  body: string;
  date?: Date;
  attachments?: string[];
  isHtml?: boolean;
}

interface ReadableEmail {
  intro: string; // "Vous avez reçu un email de..."
  subject: string; // Sujet formaté
  body: string; // Corps nettoyé et structuré
  metadata: string; // Date, pièces jointes
  spelling: {
    emailAddresses: string[]; // Emails à épeler
    references: string[]; // Références à épeler
    importantTerms: string[]; // Termes importants
  };
  prosody: {
    [key: string]: 'slow' | 'normal' | 'fast';
  };
}

// ==========================================
// EXPRESSIONS RÉGULIÈRES
// ==========================================

const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
const URL_REGEX = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
const REFERENCE_REGEX = /\b(REF|MIS|INS|RPT|VEH|COV)[-_]?[0-9]{4,}\b/gi;
const PHONE_REGEX = /\b(?:\+33|0)[1-9](?:[\s.-]?\d{2}){4}\b/g;
const DATE_REGEX = /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g;

// ==========================================
// NETTOYAGE HTML
// ==========================================

/**
 * Convertit HTML en texte lisible
 */
export function htmlToReadableText(html: string): string {
  if (!html) return '';
  
  let text = html;
  
  // Remplacer les balises par des espaces/retours
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<\/div>/gi, '\n');
  text = text.replace(/<li>/gi, '\n• ');
  text = text.replace(/<\/li>/gi, '');
  text = text.replace(/<h[1-6]>/gi, '\n\n');
  text = text.replace(/<\/h[1-6]>/gi, '\n');
  
  // Supprimer toutes les balises HTML restantes
  text = text.replace(/<[^>]*>/g, '');
  
  // Décoder les entités HTML
  text = decodeHtmlEntities(text);
  
  // Nettoyer les espaces multiples
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.replace(/[ \t]+/g, ' ');
  
  return text.trim();
}

/**
 * Décode les entités HTML
 */
function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    '&nbsp;': ' ',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&eacute;': 'é',
    '&egrave;': 'è',
    '&ecirc;': 'ê',
    '&agrave;': 'à',
    '&ccedil;': 'ç',
    '&euro;': '€',
  };
  
  let decoded = text;
  Object.entries(entities).forEach(([entity, char]) => {
    decoded = decoded.replace(new RegExp(entity, 'g'), char);
  });
  
  // Entités numériques
  decoded = decoded.replace(/&#(\d+);/g, (_match, code) => 
    String.fromCharCode(parseInt(code, 10))
  );
  
  return decoded;
}

// ==========================================
// EXTRACTION D'INFORMATIONS
// ==========================================

/**
 * Extrait les adresses email du texte
 */
export function extractEmails(text: string): string[] {
  const matches = text.match(EMAIL_REGEX);
  return matches ? [...new Set(matches)] : [];
}

/**
 * Extrait les références de mission/inspection
 */
export function extractReferences(text: string): string[] {
  const matches = text.match(REFERENCE_REGEX);
  return matches ? [...new Set(matches)] : [];
}

/**
 * Extrait les numéros de téléphone
 */
export function extractPhoneNumbers(text: string): string[] {
  const matches = text.match(PHONE_REGEX);
  return matches ? [...new Set(matches)] : [];
}

/**
 * Extrait les URLs
 */
export function extractUrls(text: string): string[] {
  const matches = text.match(URL_REGEX);
  return matches ? [...new Set(matches)] : [];
}

/**
 * Extrait les dates
 */
export function extractDates(text: string): string[] {
  const matches = text.match(DATE_REGEX);
  return matches ? [...new Set(matches)] : [];
}

// ==========================================
// FORMATAGE POUR LA LECTURE
// ==========================================

/**
 * Formate une adresse email pour la prononciation
 * Exemple: "contact@finality.fr" -> "contact arobase finality point f r"
 */
export function formatEmailForSpeech(email: string): string {
  if (!email) return '';
  
  let formatted = email.toLowerCase();
  
  // Séparer nom et domaine
  const [localPart, domain] = formatted.split('@');
  
  if (!domain) return email;
  
  // Formater la partie locale
  let localFormatted = localPart
    .replace(/\./g, ' point ')
    .replace(/_/g, ' underscore ')
    .replace(/-/g, ' tiret ');
  
  // Formater le domaine
  const [domainName, tld] = domain.split('.');
  let domainFormatted = domainName;
  
  // TLD épelé
  const tldSpelled = tld ? tld.split('').join(' ') : '';
  
  return `${localFormatted}, arobase, ${domainFormatted}, point, ${tldSpelled}`;
}

/**
 * Formate une référence pour la prononciation
 * Exemple: "MIS-2024001" -> "M I S, tiret, 2 0 2 4 0 0 1"
 */
export function formatReferenceForSpeech(reference: string): string {
  if (!reference) return '';
  
  let formatted = reference.toUpperCase();
  
  // Séparer lettres et chiffres
  const parts = formatted.split(/[-_]/);
  
  const formattedParts = parts.map(part => {
    if (/^\d+$/.test(part)) {
      // Nombres: épeler chaque chiffre
      return part.split('').join(' ');
    } else if (/^[A-Z]+$/.test(part)) {
      // Lettres: épeler
      return part.split('').join(' ');
    }
    return part;
  });
  
  return formattedParts.join(', tiret, ');
}

/**
 * Formate un numéro de téléphone pour la prononciation
 * Exemple: "0612345678" -> "zéro 6, 12, 34, 56, 78"
 */
export function formatPhoneForSpeech(phone: string): string {
  if (!phone) return '';
  
  // Nettoyer le numéro
  const cleaned = phone.replace(/[\s.-]/g, '');
  
  // Format français: 06 12 34 56 78
  if (cleaned.length === 10 && cleaned.startsWith('0')) {
    const pairs = cleaned.match(/.{1,2}/g) || [];
    return pairs.join(', ');
  }
  
  // Format international: +33 6 12 34 56 78
  if (cleaned.startsWith('+33')) {
    const withoutPrefix = cleaned.substring(3);
    const pairs = withoutPrefix.match(/.{1,2}/g) || [];
    return `+33, ${pairs.join(', ')}`;
  }
  
  // Par défaut: épeler chaque chiffre
  return cleaned.split('').join(' ');
}

/**
 * Formate une URL pour la prononciation
 * Exemple: "https://finality.fr/missions" -> "h t t p s, finality point f r, slash missions"
 */
export function formatUrlForSpeech(url: string): string {
  if (!url) return '';
  
  // Extraire protocole, domaine, chemin
  const match = url.match(/^(https?):\/\/([^/]+)(\/.*)?$/);
  
  if (!match) return url;
  
  const [, protocol, domain, path] = match;
  
  // Protocole épelé
  const protocolSpelled = protocol.split('').join(' ').toUpperCase();
  
  // Domaine formaté comme email
  const domainFormatted = domain.replace(/\./g, ' point ');
  
  // Chemin
  const pathFormatted = path 
    ? path.replace(/\//g, ', slash, ').replace(/-/g, ' tiret ') 
    : '';
  
  return `${protocolSpelled}, ${domainFormatted}${pathFormatted}`;
}

// ==========================================
// AMÉLIORATION DU CORPS DU MESSAGE
// ==========================================

/**
 * Remplace les informations critiques par leur version prononcée
 */
export function enhanceBodyForSpeech(body: string): {
  enhanced: string;
  replacements: { original: string; spoken: string; type: string }[];
} {
  const replacements: { original: string; spoken: string; type: string }[] = [];
  let enhanced = body;
  
  // 1. Emails
  const emails = extractEmails(body);
  emails.forEach(email => {
    const spoken = `<break time="300ms"/> adresse email: ${formatEmailForSpeech(email)} <break time="300ms"/>`;
    enhanced = enhanced.replace(email, spoken);
    replacements.push({ original: email, spoken, type: 'email' });
  });
  
  // 2. Références
  const references = extractReferences(body);
  references.forEach(ref => {
    const spoken = `<break time="200ms"/> référence: ${formatReferenceForSpeech(ref)} <break time="200ms"/>`;
    enhanced = enhanced.replace(ref, spoken);
    replacements.push({ original: ref, spoken, type: 'reference' });
  });
  
  // 3. Téléphones
  const phones = extractPhoneNumbers(body);
  phones.forEach(phone => {
    const spoken = `<break time="200ms"/> téléphone: ${formatPhoneForSpeech(phone)} <break time="200ms"/>`;
    enhanced = enhanced.replace(phone, spoken);
    replacements.push({ original: phone, spoken, type: 'phone' });
  });
  
  // 4. URLs (raccourcies)
  const urls = extractUrls(body);
  urls.forEach(url => {
    const spoken = `<break time="200ms"/> lien internet disponible <break time="200ms"/>`;
    enhanced = enhanced.replace(url, spoken);
    replacements.push({ original: url, spoken, type: 'url' });
  });
  
  return { enhanced, replacements };
}

/**
 * Ajoute des pauses naturelles dans le texte
 */
export function addNaturalPauses(text: string): string {
  let withPauses = text;
  
  // Pause après points
  withPauses = withPauses.replace(/\.\s+/g, '. <break time="500ms"/> ');
  
  // Pause après virgules
  withPauses = withPauses.replace(/,\s+/g, ', <break time="200ms"/> ');
  
  // Pause après deux points
  withPauses = withPauses.replace(/:\s+/g, ': <break time="300ms"/> ');
  
  // Pause entre paragraphes
  withPauses = withPauses.replace(/\n\n/g, ' <break time="800ms"/> ');
  
  return withPauses;
}

// ==========================================
// FONCTION PRINCIPALE
// ==========================================

/**
 * Convertit un email en version lisible par Clara
 */
export function prepareEmailForReading(email: EmailContent): ReadableEmail {
  // 1. Nettoyer le corps
  const cleanBody = email.isHtml 
    ? htmlToReadableText(email.body)
    : email.body;
  
  // 2. Améliorer le corps pour la prononciation
  const { enhanced: enhancedBody, replacements } = enhanceBodyForSpeech(cleanBody);
  
  // 3. Ajouter des pauses naturelles
  const bodyWithPauses = addNaturalPauses(enhancedBody);
  
  // 4. Formater l'intro
  const fromName = email.fromName || email.from;
  const intro = `Vous avez reçu un email de ${fromName}`;
  
  // 5. Formater le sujet
  const subject = `Sujet: ${email.subject}`;
  
  // 6. Métadonnées
  const metadata = [];
  
  if (email.date) {
    const dateFormatted = new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'full',
      timeStyle: 'short',
    }).format(email.date);
    metadata.push(`Reçu le ${dateFormatted}`);
  }
  
  if (email.attachments && email.attachments.length > 0) {
    metadata.push(`${email.attachments.length} pièce${email.attachments.length > 1 ? 's' : ''} jointe${email.attachments.length > 1 ? 's' : ''}`);
  }
  
  // 7. Épellation
  const spelling = {
    emailAddresses: extractEmails(cleanBody),
    references: extractReferences(cleanBody),
    importantTerms: replacements.map(r => r.original),
  };
  
  // 8. Prosodie (vitesse de lecture)
  const prosody: Record<string, 'slow' | 'normal' | 'fast'> = {
    intro: 'normal',
    subject: 'normal',
    body: 'normal',
    metadata: 'fast',
  };
  
  // Si beaucoup de références, ralentir
  if (spelling.references.length > 2) {
    prosody.body = 'slow';
  }
  
  return {
    intro,
    subject,
    body: bodyWithPauses,
    metadata: metadata.join('. '),
    spelling,
    prosody,
  };
}

/**
 * Génère le texte SSML (Speech Synthesis Markup Language) complet
 */
export function generateSSML(readable: ReadableEmail): string {
  const ssml = `
<speak>
  <prosody rate="${readable.prosody.intro}">
    ${readable.intro}
  </prosody>
  
  <break time="500ms"/>
  
  <prosody rate="${readable.prosody.subject}">
    ${readable.subject}
  </prosody>
  
  <break time="800ms"/>
  
  <prosody rate="${readable.prosody.body}">
    ${readable.body}
  </prosody>
  
  <break time="800ms"/>
  
  <prosody rate="${readable.prosody.metadata}">
    ${readable.metadata}
  </prosody>
</speak>
  `.trim();
  
  return ssml;
}

/**
 * Génère une version texte simple (sans SSML)
 */
export function generatePlainText(readable: ReadableEmail): string {
  const parts = [
    readable.intro,
    readable.subject,
    readable.body,
    readable.metadata,
  ].filter(Boolean);
  
  return parts.join('. ');
}

/**
 * Exemple d'utilisation:
 * 
 * const email = {
 *   from: 'contact@finality.fr',
 *   fromName: 'Service Finality',
 *   to: 'user@example.com',
 *   subject: 'Nouvelle mission MIS-2024001',
 *   body: '<p>Bonjour,<br/>Nouvelle mission disponible. Ref: MIS-2024001.<br/>Contact: 0612345678</p>',
 *   date: new Date(),
 *   isHtml: true,
 * };
 * 
 * const readable = prepareEmailForReading(email);
 * const ssml = generateSSML(readable);
 * const plainText = generatePlainText(readable);
 */
