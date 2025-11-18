import { jest } from '@jest/globals';
import Transaction from '../../src/models/Transaction.js';
import User from '../../src/models/User.js';

describe('Transaction Model', () => {
  let testUser;

  beforeEach(async () => {
    testUser = await User.create({
      telegramId: 123456789,
      name: 'Test User'
    });
  });

  describe('Schema Validation', () => {
    it('should create a valid transaction', async () => {
      const txData = {
        userId: testUser._id,
        provider: 'mpesa',
        phone: '254712345678',
        amount: 100,
        currency: 'KES',
        status: 'pending'
      };

      const tx = await Transaction.create(txData);

      expect(tx._id).toBeDefined();
      expect(tx.provider).toBe('mpesa');
      expect(tx.status).toBe('pending');
      expect(tx.createdAt).toBeDefined();
    });

    it('should require userId', async () => {
      const tx = new Transaction({
        provider: 'mpesa',
        amount: 100
      });

      await expect(tx.save()).rejects.toThrow();
    });

    it('should validate provider enum', async () => {
      const tx = new Transaction({
        userId: testUser._id,
        provider: 'invalid',
        amount: 100
      });

      await expect(tx.save()).rejects.toThrow(/is not a valid enum value/);
    });

    it('should validate status enum', async () => {
      const tx = new Transaction({
        userId: testUser._id,
        provider: 'mpesa',
        amount: 100,
        status: 'invalid-status'
      });

      await expect(tx.save()).rejects.toThrow(/is not a valid enum value/);
    });

    it('should enforce unique reference', async () => {
      const txData = {
        userId: testUser._id,
        provider: 'mpesa',
        amount: 100,
        reference: 'REF123'
      };

      await Transaction.create(txData);

      await expect(Transaction.create(txData)).rejects.toThrow(/duplicate key/);
    });
  });

  describe('Queries', () => {
    beforeEach(async () => {
      await Transaction.create([
        {
          userId: testUser._id,
          provider: 'mpesa',
          amount: 100,
          status: 'pending'
        },
        {
          userId: testUser._id,
          provider: 'mpesa',
          amount: 200,
          status: 'completed'
        },
        {
          userId: testUser._id,
          provider: 'crypto',
          amount: 50,
          status: 'failed'
        }
      ]);
    });

    it('should find transactions by user', async () => {
      const transactions = await Transaction.find({ userId: testUser._id });

      expect(transactions).toHaveLength(3);
    });

    it('should find pending transactions', async () => {
      const pending = await Transaction.find({ status: 'pending' });

      expect(pending).toHaveLength(1);
      expect(pending[0].amount).toBe(100);
    });

    it('should find transactions by provider', async () => {
      const mpesaTx = await Transaction.find({ provider: 'mpesa' });

      expect(mpesaTx).toHaveLength(2);
    });

    it('should calculate total completed amount', async () => {
      const result = await Transaction.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      expect(result[0].total).toBe(200);
    });
  });

  describe('Updates', () => {
    it('should update transaction status', async () => {
      const tx = await Transaction.create({
        userId: testUser._id,
        provider: 'mpesa',
        amount: 100,
        status: 'pending',
        reference: 'REF123'
      });

      await Transaction.updateOne(
        { reference: 'REF123' },
        { 
          status: 'completed',
          completedAt: new Date()
        }
      );

      const updated = await Transaction.findById(tx._id);
      expect(updated.status).toBe('completed');
      expect(updated.completedAt).toBeDefined();
    });

    it('should add payment receipt details', async () => {
      const tx = await Transaction.create({
        userId: testUser._id,
        provider: 'mpesa',
        amount: 100,
        reference: 'REF123'
      });

      tx.mpesaReceiptNumber = 'ABC123XYZ';
      tx.payee = '254712345678';
      await tx.save();

      const updated = await Transaction.findById(tx._id);
      expect(updated.mpesaReceiptNumber).toBe('ABC123XYZ');
    });
  });
});
