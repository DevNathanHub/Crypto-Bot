import Transaction from '../models/Transaction.js';
import { MOBILE_NUMBERS } from '../config.js';

export async function createTransactionForMpesa(userId, amount, phone) {
  const tx = new Transaction({
    userId,
    provider: 'mpesa',
    phone,
    payee: MOBILE_NUMBERS.mpesa_ke,
    amount,
    currency: 'KES',
    status: 'pending',
    createdAt: new Date()
  });
  await tx.save();
  return tx;
}

export default { createTransactionForMpesa };
