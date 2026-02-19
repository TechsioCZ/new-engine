import { Button } from "@techsio/ui-kit/atoms/button";

type StorefrontAuthDebugPanelProps = {
  isVisible: boolean;
  isBusy: boolean;
  isAuthenticated: boolean;
  hasCart: boolean;
  isLogoutPending: boolean;
  isTransferPending: boolean;
  onLogout: () => void;
  onTransferCart: () => void;
};

export const StorefrontAuthDebugPanel = ({
  isVisible,
  isBusy,
  isAuthenticated,
  hasCart,
  isLogoutPending,
  isTransferPending,
  onLogout,
  onTransferCart,
}: StorefrontAuthDebugPanelProps) => {
  if (!isVisible) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-200 border-t border-border-secondary pt-300">
      <Button
        disabled={isBusy || !isAuthenticated}
        isLoading={isLogoutPending}
        onClick={onLogout}
        type="button"
        variant="danger"
      >
        Odhlásiť
      </Button>
      <Button
        disabled={isBusy || !hasCart || !isAuthenticated}
        isLoading={isTransferPending}
        onClick={onTransferCart}
        theme="outlined"
        type="button"
        variant="secondary"
      >
        Spustiť transfer cart ručne
      </Button>
    </div>
  );
};
