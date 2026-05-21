import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("pages/HomePage.tsx"),
  route("/create", "pages/CreatePage.tsx"),
  route("/join/:gameId", "pages/JoinPage.tsx"),
  route("/wait/:gameId", "pages/WaitingRoomPage.tsx"),
  route("/play/:gameId", "pages/GamePage.tsx"),
  route("/between/:gameId", "pages/BetweenRoundsPage.tsx"),
  route("/end/:gameId", "pages/EndGamePage.tsx"),
] satisfies RouteConfig;
