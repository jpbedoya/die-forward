import { useState } from 'react';
import { View, Text, Pressable, Modal, ActivityIndicator } from 'react-native';
import { useGame } from '../lib/GameContext';

interface LinkWalletModalProps {
  visible: boolean;
  onClose: () => void;
}

export function LinkWalletModal({ visible, onClose }: LinkWalletModalProps) {
  const game = useGame();
  const [status, setStatus] = useState<'idle' | 'connecting' | 'linking' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [merged, setMerged] = useState(false);

  const handleConnect = async () => {
    setStatus('connecting');
    setErrorMessage('');
    try {
      await game.connect();
      setStatus('idle');
    } catch (err) {
      if (err instanceof Error && err.message === 'WALLET_CANCELLED') {
        setStatus('idle');
      } else {
        setStatus('error');
        setErrorMessage(err instanceof Error ? err.message : 'Failed to connect wallet');
      }
    }
  };

  const handleLink = async () => {
    if (!game.walletConnected) return;
    
    setStatus('linking');
    setErrorMessage('');
    try {
      const result = await game.linkWallet();
      setMerged(result.merged);
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Failed to link wallet');
    }
  };

  const handleClose = () => {
    setStatus('idle');
    setErrorMessage('');
    setMerged(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-black/85 justify-center items-center p-6">
        <View className="bg-crypt-bg border border-amber/30 w-full max-w-sm">
          {/* Header */}
          <View className="border-b border-amber/20 p-4">
            <Text className="text-amber text-lg font-mono font-bold text-center tracking-widest">
              {status === 'success' ? 'ACCOUNT LINKED' : 'SAVE YOUR PROGRESS'}
            </Text>
          </View>

          {/* Content */}
          <View className="p-5">
            {status === 'success' ? (
              <>
                <Text className="text-bone-muted text-sm font-mono text-center mb-4 leading-5">
                  {merged 
                    ? 'Your accounts have been merged! All your progress is now combined.'
                    : 'Your wallet is now linked! Your progress will be saved.'}
                </Text>
                <Pressable
                  className="py-4 items-center bg-amber active:bg-amber-dark"
                  onPress={handleClose}
                >
                  <Text className="text-crypt-bg font-mono font-bold tracking-widest">
                    CONTINUE
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text className="text-bone-muted text-sm font-mono text-center mb-6 leading-5">
                  Connect a wallet to save your progress permanently. 
                  Your deaths, victories, and nickname will be preserved.
                </Text>

                {errorMessage && (
                  <View className="bg-blood/20 border border-blood/40 p-3 mb-4">
                    <Text className="text-blood text-xs font-mono text-center">
                      {errorMessage}
                    </Text>
                  </View>
                )}

                {!game.walletConnected ? (
                  <Pressable
                    className={`py-4 items-center mb-3 ${status === 'connecting' ? 'bg-crypt-border' : 'bg-amber active:bg-amber-dark'}`}
                    onPress={handleConnect}
                    disabled={status === 'connecting'}
                  >
                    {status === 'connecting' ? (
                      <ActivityIndicator color="#0d0d0d" />
                    ) : (
                      <Text className="text-crypt-bg font-mono font-bold tracking-widest">
                        CONNECT WALLET
                      </Text>
                    )}
                  </Pressable>
                ) : (
                  <>
                    <View className="bg-crypt-surface border border-crypt-border p-3 mb-4">
                      <Text className="text-bone-dark text-xs font-mono text-center">
                        Connected: {game.walletAddress?.slice(0, 4)}...{game.walletAddress?.slice(-4)}
                      </Text>
                    </View>
                    <Pressable
                      className={`py-4 items-center mb-3 ${status === 'linking' ? 'bg-crypt-border' : 'bg-amber active:bg-amber-dark'}`}
                      onPress={handleLink}
                      disabled={status === 'linking'}
                    >
                      {status === 'linking' ? (
                        <ActivityIndicator color="#0d0d0d" />
                      ) : (
                        <Text className="text-crypt-bg font-mono font-bold tracking-widest">
                          LINK WALLET
                        </Text>
                      )}
                    </Pressable>
                  </>
                )}

                <Pressable
                  className="py-3 items-center"
                  onPress={handleClose}
                >
                  <Text className="text-bone-muted font-mono text-sm">Maybe later</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
