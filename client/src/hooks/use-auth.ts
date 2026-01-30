import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface AuthStatus {
  authEnabled: boolean;
  authenticated: boolean;
  isReplit: boolean;
}

export function useAuth() {
  const { data: status, isLoading } = useQuery<AuthStatus>({
    queryKey: ["/api/auth/status"],
    staleTime: 1000 * 60,
  });

  const loginMutation = useMutation({
    mutationFn: async (password: string) => {
      const response = await apiRequest("POST", "/api/auth/login", { password });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/status"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/logout");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/status"] });
    },
  });

  return {
    isLoading,
    authEnabled: status?.authEnabled ?? false,
    authenticated: status?.authenticated ?? false,
    isReplit: status?.isReplit ?? false,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error,
  };
}
