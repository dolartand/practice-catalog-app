import { AuthGuard } from '@entities/session';
import { OrderHistoryPage } from '@pages/order-history';

export default function OrderHistoryScreen() {
  return (
    <AuthGuard>
      <OrderHistoryPage />
    </AuthGuard>
  );
}