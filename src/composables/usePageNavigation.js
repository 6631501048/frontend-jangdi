import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { navigateBack } from '../services/navigation';
export function usePageNavigation() {
  const route = useRoute(), router = useRouter(), auth = useAuthStore();
  return { goBack: (fallback, preferFallback = false) => navigateBack(router, route, auth.user, fallback, preferFallback) };
}
