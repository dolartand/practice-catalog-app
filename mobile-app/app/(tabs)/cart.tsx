import { useRouter } from 'expo-router';
import { AuthPlaceholder } from '@shared/ui';
import { ROUTES } from '@shared/lib';
import { useSessionStore } from '@stores/sessionStore';
import { CartPage } from '@pages/cart';

export default function CartTabScreen() {
    const router = useRouter();
    const isAuthenticated = useSessionStore((s) => s.status === 'authenticated');

    if (!isAuthenticated) {
        return <AuthPlaceholder onLogin={() => router.push(ROUTES.auth.login)} />;
    }
    return <CartPage />;
}