import { AuthGuard } from '@entities/session';
import { CheckoutPage } from '@pages/checkout';

export default function CheckoutScreen() {
  return (
    <AuthGuard>
      <CheckoutPage />
    </AuthGuard>
  );
}