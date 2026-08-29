import { useRouter } from 'expo-router';
import { AuthPlaceholder } from '@shared/ui';
import { ROUTES } from '@shared/lib';
import { useSessionStore } from '@stores/sessionStore';
import { FavoritesPage } from '@pages/favorites';

export default function FavoritesTabScreen() {
    const router = useRouter();
    const isAuthenticated = useSessionStore((s) => s.isAuthenticated);

    if (!isAuthenticated) {
        return <AuthPlaceholder onLogin={() => router.push(ROUTES.auth.login)} />;
    }
    return <FavoritesPage />;
}