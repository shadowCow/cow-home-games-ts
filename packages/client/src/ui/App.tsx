import { useState } from "react";
import { LoginPage } from "./LoginPage/LoginPage";
import { Home } from "./Home/Home";
import { AuthGateway } from "../services/auth/AuthGateway";
import { GameRegistry } from "../games/GameRegistry";
import { User } from "../services/auth/User";
import { GameServerProxyWs } from "../services/game/ProxyWithWebsocket";

function App(props: {
  authGateway: AuthGateway;
  gameServerProxy: GameServerProxyWs;
  gameRegistry: GameRegistry;
}) {
  const [user, setUser] = useState<User | null>(null);

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  const handleLogout = async () => {
    await props.authGateway.logout();
    setUser(null);
  };

  if (!user) {
    return (
      <LoginPage
        authGateway={props.authGateway}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  return (
    <Home
      gameServerProxy={props.gameServerProxy}
      gameRegistry={props.gameRegistry}
    />
  );
}

export default App;
