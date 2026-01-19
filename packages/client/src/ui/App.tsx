import { useState } from "react";
import { LoginPage } from "./LoginPage/LoginPage";
import { Navigator } from "./Navigator/Navigator";
import { AuthGateway } from "../services/auth/AuthGateway";
import { GameRegistry } from "../games/GameRegistry";
import { User } from "../services/auth/User";
import { GameServerProxy } from "@cow-sunday/protocol";

function App(props: {
  authGateway: AuthGateway;
  gameServerProxy: GameServerProxy;
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
    <Navigator
      gameServerProxy={props.gameServerProxy}
      gameRegistry={props.gameRegistry}
    />
  );
}

export default App;
