export function explorerTx(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
}

export function explorerAccount(address: string): string {
  return `https://explorer.solana.com/address/${address}?cluster=devnet`;
}
