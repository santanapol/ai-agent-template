export function formatTelephoneToE164(tel: string): string {
  if (!tel) return '';
  const clean = tel.replace(/[- ]/g, '');
  if (clean.startsWith('+')) {
    return clean;
  }
  if (clean.startsWith('0')) {
    return '+66' + clean.slice(1);
  }
  if (clean.startsWith('66')) {
    return '+' + clean;
  }
  return '+66' + clean;
}

export const telephoneRules = [
  { required: true, message: 'Please enter telephone number' },
  {
    validator(_: unknown, value: string) {
      if (!value) return Promise.resolve();
      const clean = value.replace(/[- ]/g, '');
      if (/^\+?\d{9,15}$/.test(clean)) {
        return Promise.resolve();
      }
      return Promise.reject(
        new Error('Invalid telephone format. e.g. 0812345678 or +66812345678')
      );
    },
  },
];
