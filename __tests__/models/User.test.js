import { jest } from '@jest/globals';
import User from '../../src/models/User.js';

describe('User Model', () => {
  describe('Schema Validation', () => {
    it('should create a valid user', async () => {
      const userData = {
        telegramId: 123456789,
        name: 'John Doe',
        plan: 'free'
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser._id).toBeDefined();
      expect(savedUser.telegramId).toBe(userData.telegramId);
      expect(savedUser.plan).toBe('free');
      expect(savedUser.createdAt).toBeDefined();
    });

    it('should require telegramId', async () => {
      const user = new User({ name: 'John' });
      
      await expect(user.save()).rejects.toThrow();
    });

    it('should enforce unique telegramId', async () => {
      const userData = { telegramId: 123456789, name: 'John' };
      
      await User.create(userData);
      
      await expect(User.create(userData)).rejects.toThrow(/duplicate key/i);
    });

    it('should default plan to free', async () => {
      const user = await User.create({
        telegramId: 123456789,
        name: 'John'
      });

      expect(user.plan).toBe('free');
    });

    it('should validate plan enum values', async () => {
      const user = new User({
        telegramId: 123456789,
        name: 'John',
        plan: 'invalid-plan'
      });

      await expect(user.save()).rejects.toThrow(/is not a valid enum value/);
    });
  });

  describe('Queries', () => {
    beforeEach(async () => {
      await User.create([
        { telegramId: 111, name: 'Free User 1', plan: 'free' },
        { telegramId: 222, name: 'Free User 2', plan: 'free' },
        { telegramId: 333, name: 'Premium User', plan: 'premium' },
        { telegramId: 444, name: 'Pro User', plan: 'pro' }
      ]);
    });

    it('should find user by telegramId', async () => {
      const user = await User.findOne({ telegramId: 333 });
      
      expect(user).toBeDefined();
      expect(user.name).toBe('Premium User');
    });

    it('should count users by plan', async () => {
      const freeCount = await User.countDocuments({ plan: 'free' });
      const premiumCount = await User.countDocuments({ plan: 'premium' });
      
      expect(freeCount).toBe(2);
      expect(premiumCount).toBe(1);
    });

    it('should find all premium users', async () => {
      const premiumUsers = await User.find({
        plan: { $in: ['premium', 'pro'] }
      });
      
      expect(premiumUsers).toHaveLength(2);
    });
  });

  describe('Updates', () => {
    it('should update user plan', async () => {
      const user = await User.create({
        telegramId: 123456789,
        name: 'John',
        plan: 'free'
      });

      user.plan = 'premium';
      await user.save();

      const updated = await User.findById(user._id);
      expect(updated.plan).toBe('premium');
    });

    it('should update watchlist', async () => {
      const user = await User.create({
        telegramId: 123456789,
        name: 'John'
      });

      user.watchlist = ['bitcoin', 'ethereum'];
      await user.save();

      const updated = await User.findById(user._id);
      expect(updated.watchlist).toEqual(['bitcoin', 'ethereum']);
    });
  });
});
