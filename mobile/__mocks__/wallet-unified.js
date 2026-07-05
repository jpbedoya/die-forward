module.exports = {
  useUnifiedWallet: () => ({
    connected: false,
    address: null,
    balance: null,
    signMessage: jest.fn(),
  }),
  UnifiedWalletProvider: () => null,
};
