import { useEffect, useState } from "react";

type Props = {
  message: string | null;
};

export function AdminTransferNotification({ message }: Props) {
  const [visible, setVisible] = useState(!!message);

  useEffect(() => {
    if (!message) return;
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(timer);
  }, [message]);

  if (!visible || !message) return null;

  return (
    <div data-testid="admin-transfer-notification" role="status">
      {message}
    </div>
  );
}
