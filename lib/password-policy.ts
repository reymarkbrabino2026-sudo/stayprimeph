const commonWeakPasswords = new Set([
  "1234567890",
  "admin123",
  "admin1234",
  "admin12345",
  "changeme123",
  "letmein123",
  "password",
  "password1",
  "password12",
  "password123",
  "password1234",
  "qwerty123",
  "stayprimeph123",
  "welcome123",
]);

export type PasswordIdentity = {
  email?: string;
  name?: string;
};

export type PasswordRuleResult = {
  minLength: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  special: boolean;
  notCommon: boolean;
  noPersonalInfo: boolean;
};

function normalizePassword(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function identityTokens(identity?: PasswordIdentity) {
  const tokens = new Set<string>();
  const email = identity?.email?.trim().toLowerCase();
  const name = identity?.name?.trim().toLowerCase();

  if (email) {
    tokens.add(email);
    const [localPart] = email.split("@");
    if (localPart && localPart.length >= 3) tokens.add(localPart);
  }

  if (name) {
    const compactName = normalizePassword(name);
    if (compactName.length >= 3) tokens.add(compactName);
    for (const part of name.split(/[^a-z0-9]+/i)) {
      const normalized = normalizePassword(part);
      if (normalized.length >= 3) tokens.add(normalized);
    }
  }

  return [...tokens];
}

export function evaluatePasswordRules(password: string, identity?: PasswordIdentity): PasswordRuleResult {
  const normalized = normalizePassword(password);
  const identifiers = identityTokens(identity);

  return {
    minLength: password.length >= 12,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
    notCommon: !commonWeakPasswords.has(normalized),
    noPersonalInfo: identifiers.every((token) => !password.toLowerCase().includes(token) && !normalized.includes(normalizePassword(token))),
  };
}

export function passwordRulesPass(rules: PasswordRuleResult) {
  return Object.values(rules).every(Boolean);
}

export function passwordPolicyMessage(password: string, identity?: PasswordIdentity) {
  const rules = evaluatePasswordRules(password, identity);
  if (passwordRulesPass(rules)) return null;
  return "Use a stronger password that meets all requirements.";
}
