import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "./hooks/use-auth";
import Logo from "./components/logo";
import AppRoutes from "./routes";
import { Spinner } from "./components/ui/spinner";
import { isAuthRoute } from "./routes/routes";
import { useSocket, type MentionNotification } from "./hooks/use-socket";
import { toast } from "sonner";

function App() {
  const { pathname } = useLocation();
  const { user, isAuthStatus, isAuthStatusLoading } = useAuth();
  const { socket } = useSocket();
  const isAuth = isAuthRoute(pathname);
  const [hasInitializedAuth, setHasInitializedAuth] = useState(isAuth);

  useEffect(() => {
    if (isAuth) {
      setHasInitializedAuth(true);
      return;
    }

    let mounted = true;
    isAuthStatus().finally(() => {
      if (mounted) setHasInitializedAuth(true);
    });
    return () => {
      mounted = false;
    };
  }, [isAuthStatus, isAuth]);

  useEffect(() => {
    if (!socket || !user) return;
    const handleMention = (payload: MentionNotification) => {
      toast.info(`${payload.senderName} đã tag bạn`, {
        description: payload.content,
      });
    };
    socket.on("mention:notification", handleMention);
    return () => {
      socket.off("mention:notification", handleMention);
    };
  }, [socket, user]);

  if (!hasInitializedAuth || (isAuthStatusLoading && !user)) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Logo imgClass="size-20" showText={false} />
        <Spinner className="w-6 h-6" />
      </div>
    );
  }

  return <AppRoutes />;
}

export default App;
