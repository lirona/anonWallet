export type TransactionType = 'sent' | 'received';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  timestamp: string;
}