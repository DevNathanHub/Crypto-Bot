import { jest } from '@jest/globals';
import { getMobileContact } from '../../src/utils/paymentContacts.js';

describe('Payment Contacts Utility', () => {
  describe('getMobileContact', () => {
    it('should return M-Pesa contact for Kenya', () => {
      const contact = getMobileContact('KE');

      expect(contact.provider).toBe('M-Pesa');
      expect(contact.label).toContain('Kenya');
      expect(contact.number).toMatch(/^254\d{9}$/);
    });

    it('should return Airtel contact for Uganda', () => {
      const contact = getMobileContact('UG');

      expect(contact.provider).toBe('Airtel Money');
      expect(contact.label).toContain('Uganda');
      expect(contact.number).toMatch(/^256\d{9}$/);
    });

    it('should return Airtel contact for Malawi', () => {
      const contact = getMobileContact('MW');

      expect(contact.provider).toBe('Airtel Money');
      expect(contact.label).toContain('Malawi');
      expect(contact.number).toMatch(/^265\d{9}$/);
    });

    it('should be case-insensitive', () => {
      const upper = getMobileContact('KE');
      const lower = getMobileContact('ke');

      expect(upper.provider).toBe(lower.provider);
      expect(upper.number).toBe(lower.number);
    });

    it('should use default country for unknown code', () => {
      const contact = getMobileContact('US');

      expect(contact).toBeDefined();
      expect(contact.provider).toMatch(/M-Pesa|Airtel Money/);
      expect(contact.number).toMatch(/^(254|256|265)\d{9}$/);
    });

    it('should normalize E.164 format', () => {
      const contact = getMobileContact('KE');

      // Should not contain formatting characters
      expect(contact.number).not.toContain('+');
      expect(contact.number).not.toContain(' ');
      expect(contact.number).not.toContain('-');
      expect(contact.number).not.toContain('(');
      expect(contact.number).not.toContain(')');
    });

    it('should return contact for all supported countries', () => {
      const countries = ['KE', 'UG', 'MW'];

      countries.forEach(country => {
        const contact = getMobileContact(country);
        
        expect(contact).toBeDefined();
        expect(contact.provider).toBeDefined();
        expect(contact.number).toBeDefined();
        expect(contact.label).toBeDefined();
      });
    });
  });
});
