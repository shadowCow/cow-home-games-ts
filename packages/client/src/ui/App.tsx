import { useState } from "react";
import { LoginPage } from "./LoginPage/LoginPage";
import { Navigator } from "./Navigator/Navigator";
import { AuthGateway } from "../services/auth/AuthGateway";
import { GameService } from "../services/game/GameService";
import { GameRegistry } from "../games/GameRegistry";
import { User } from "../services/auth/User";

function App(props: {
  authGateway: AuthGateway;
  gameService: GameService;
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
      gameService={props.gameService}
      gameRegistry={props.gameRegistry}
    />
  );
}

export default App;
