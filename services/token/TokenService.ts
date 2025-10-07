import {
  createPublicClient,
  http,
  type Address,
  type Hex,
  formatUnits,
  parseAbiItem,
  toHex,
} from 'viem';
import { sepolia } from 'viem/chains';

import COIL_ABI from './COIL.abi.json';
import config from '@/utils/config';

export interface TokenTransfer {
  from: Address;
  to: Address;
  value: Hex;
  blockNumber: Hex;
  transactionHash: Hex;
  timestamp?: number;
}

/**
 * Token Service
 * Handles all COIL token operations including balance queries and transfer events
 */
class TokenService {
  private publicClient;
  private tokenAddress: Address;

  constructor() {
    // Initialize blockchain client
    this.publicClient = createPublicClient({
      chain: sepolia,
      transport: http(config.rpcUrl),
    });

    this.tokenAddress = config.tokenAddress as Address;
  }

  /**
   * Get COIL token balance for an address
   * @param address - The wallet address to check
   * @returns Balance as a formatted string (e.g., "101.0")
   */
  async getBalance(address: Address): Promise<string> {
    try {
      const balance = await this.publicClient.readContract({
        address: this.tokenAddress,
        abi: COIL_ABI,
        functionName: 'balanceOf',
        args: [address],
      });

      // Format from wei to tokens (18 decimals)
      return formatUnits(balance as bigint, 18);
    } catch (error) {
      console.error('Error fetching token balance:', error);
      throw error;
    }
  }

  /**
   * Get COIL token balance as hex string
   * @param address - The wallet address to check
   * @returns Balance as hex string
   */
  async getBalanceRaw(address: Address): Promise<Hex> {
    try {
      const balance = await this.publicClient.readContract({
        address: this.tokenAddress,
        abi: COIL_ABI,
        functionName: 'balanceOf',
        args: [address],
      });

      return toHex(balance as bigint);
    } catch (error) {
      console.error('Error fetching token balance:', error);
      throw error;
    }
  }

  /**
   * Fetch token transfer events for a specific address
   * @param address - The wallet address to fetch transfers for
   * @param options - Pagination options
   * @returns Array of transfer events
   */
  async getTransfers(
    address: Address,
    options: {
      fromBlock?: bigint;
      toBlock?: bigint | 'latest';
      limit?: number;
    } = {}
  ): Promise<TokenTransfer[]> {
    try {
      const { fromBlock, toBlock = 'latest', limit = 10 } = options;

      // Get the latest block if toBlock is 'latest'
      const latestBlock =
        toBlock === 'latest' ? await this.publicClient.getBlockNumber() : toBlock;

      // Calculate fromBlock if not provided (get last 1000 blocks)
      const calculatedFromBlock = fromBlock ?? latestBlock - 1000n;

      // Fetch Transfer events where address is sender or receiver
      const [sentLogs, receivedLogs] = await Promise.all([
        // Transfers FROM this address
        this.publicClient.getLogs({
          address: this.tokenAddress,
          event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)'),
          args: {
            from: address,
          },
          fromBlock: calculatedFromBlock,
          toBlock: latestBlock,
        }),
        // Transfers TO this address
        this.publicClient.getLogs({
          address: this.tokenAddress,
          event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)'),
          args: {
            to: address,
          },
          fromBlock: calculatedFromBlock,
          toBlock: latestBlock,
        }),
      ]);

      // Combine and deduplicate logs
      const allLogs = [...sentLogs, ...receivedLogs];
      const uniqueLogs = Array.from(
        new Map(allLogs.map((log) => [log.transactionHash, log])).values()
      );

      // Sort by block number (descending - most recent first)
      uniqueLogs.sort((a, b) => Number(b.blockNumber - a.blockNumber));

      // Limit results
      const limitedLogs = limit > 0 ? uniqueLogs.slice(0, limit) : uniqueLogs;

      // Format the transfers and convert bigint to hex
      const transfers: TokenTransfer[] = limitedLogs.map((log) => ({
        from: log.args.from as Address,
        to: log.args.to as Address,
        value: toHex(log.args.value as bigint),
        blockNumber: toHex(log.blockNumber),
        transactionHash: log.transactionHash!,
      }));

      // Optionally fetch timestamps for each transfer (batched)
      const transfersWithTimestamps = await this.addTimestamps(transfers);

      return transfersWithTimestamps;
    } catch (error) {
      console.error('Error fetching token transfers:', error);
      throw error;
    }
  }

  /**
   * Add timestamps to transfer events by fetching block data
   * @param transfers - Array of transfers without timestamps
   * @returns Array of transfers with timestamps
   */
  private async addTimestamps(transfers: TokenTransfer[]): Promise<TokenTransfer[]> {
    try {
      // Get unique block numbers (as hex strings)
      const uniqueBlocks = Array.from(new Set(transfers.map((t) => t.blockNumber)));

      // Fetch block data in parallel (viem accepts hex strings for blockNumber)
      const blockPromises = uniqueBlocks.map((blockNumber) =>
        this.publicClient.getBlock({ blockNumber: BigInt(blockNumber) })
      );
      const blocks = await Promise.all(blockPromises);

      // Create a map of block number (hex) to timestamp
      const blockTimestamps = new Map(
        blocks.map((block) => [toHex(block.number), Number(block.timestamp)])
      );

      // Add timestamps to transfers
      return transfers.map((transfer) => ({
        ...transfer,
        timestamp: blockTimestamps.get(transfer.blockNumber),
      }));
    } catch (error) {
      console.error('Error adding timestamps:', error);
      // Return transfers without timestamps if fetching fails
      return transfers;
    }
  }

  /**
   * Get token metadata
   */
  async getTokenInfo() {
    try {
      const [name, symbol, decimals, totalSupply] = await Promise.all([
        this.publicClient.readContract({
          address: this.tokenAddress,
          abi: COIL_ABI,
          functionName: 'name',
        }),
        this.publicClient.readContract({
          address: this.tokenAddress,
          abi: COIL_ABI,
          functionName: 'symbol',
        }),
        this.publicClient.readContract({
          address: this.tokenAddress,
          abi: COIL_ABI,
          functionName: 'decimals',
        }),
        this.publicClient.readContract({
          address: this.tokenAddress,
          abi: COIL_ABI,
          functionName: 'totalSupply',
        }),
      ]);

      return {
        name: name as string,
        symbol: symbol as string,
        decimals: decimals as number,
        totalSupply: formatUnits(totalSupply as bigint, 18),
      };
    } catch (error) {
      console.error('Error fetching token info:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const tokenService = new TokenService();
export default tokenService;
