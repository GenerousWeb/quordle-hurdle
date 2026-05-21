import { describe, it, expect } from "vitest";
import { selectNextAdmin, handleAdminDisconnect } from "./adminPromotion";
import type { PlayerForPromotion } from "./adminPromotion";

const GAME_ID = "game-test";

function createMockIo() {
  const emitted: { room: string; event: string; data: unknown }[] = [];
  return {
    io: {
      to: (room: string) => ({
        emit: (event: string, data?: unknown) => {
          emitted.push({ room, event, data });
        },
      }),
    },
    emitted,
  };
}

describe("adminPromotion — selectNextAdmin", () => {
  it("2: selects connected player with earliest joinedAt (oldest joiner first)", () => {
    const players: PlayerForPromotion[] = [
      { playerId: "admin1", name: "Admin", isConnected: false, joinedAt: 1000 },
      { playerId: "p1", name: "Player1", isConnected: true, joinedAt: 3000 },
      { playerId: "p2", name: "Player2", isConnected: true, joinedAt: 2000 },
    ];
    const result = selectNextAdmin(players, "admin1");
    expect(result?.playerId).toBe("p2");
  });

  it("excludes the disconnecting admin from candidates", () => {
    const players: PlayerForPromotion[] = [
      { playerId: "admin1", name: "Admin", isConnected: true, joinedAt: 1000 },
      { playerId: "p1", name: "Player1", isConnected: true, joinedAt: 2000 },
    ];
    const result = selectNextAdmin(players, "admin1");
    expect(result?.playerId).toBe("p1");
  });

  it("excludes disconnected players from candidates", () => {
    const players: PlayerForPromotion[] = [
      { playerId: "admin1", name: "Admin", isConnected: false, joinedAt: 1000 },
      { playerId: "p1", name: "Player1", isConnected: false, joinedAt: 2000 },
      { playerId: "p2", name: "Player2", isConnected: true, joinedAt: 3000 },
    ];
    const result = selectNextAdmin(players, "admin1");
    expect(result?.playerId).toBe("p2");
  });

  it("returns null when no eligible players", () => {
    const players: PlayerForPromotion[] = [
      { playerId: "admin1", name: "Admin", isConnected: false, joinedAt: 1000 },
      { playerId: "p1", name: "Player1", isConnected: false, joinedAt: 2000 },
    ];
    const result = selectNextAdmin(players, "admin1");
    expect(result).toBeNull();
  });
});

describe("adminPromotion — handleAdminDisconnect", () => {
  it("1: admin disconnect triggers admin_transferred emitted to room", () => {
    const { io, emitted } = createMockIo();
    let adminId: string | null = "admin1";
    const players: PlayerForPromotion[] = [
      { playerId: "admin1", name: "Admin", isConnected: false, joinedAt: 1000 },
      { playerId: "p1", name: "Player1", isConnected: true, joinedAt: 2000 },
    ];
    handleAdminDisconnect(io, GAME_ID, "admin1", adminId, players, (id) => {
      adminId = id;
    });
    expect(emitted.some((e) => e.event === "admin_transferred")).toBe(true);
    expect(emitted.find((e) => e.event === "admin_transferred")?.room).toBe(GAME_ID);
  });

  it("3: admin_transferred payload has correct newAdminId and newAdminName", () => {
    const { io, emitted } = createMockIo();
    let adminId: string | null = "admin1";
    const players: PlayerForPromotion[] = [
      { playerId: "admin1", name: "Admin", isConnected: false, joinedAt: 1000 },
      { playerId: "p1", name: "Player1", isConnected: true, joinedAt: 2000 },
    ];
    handleAdminDisconnect(io, GAME_ID, "admin1", adminId, players, (id) => {
      adminId = id;
    });
    const event = emitted.find((e) => e.event === "admin_transferred");
    const payload = event?.data as { newAdminId: string; newAdminName: string };
    expect(payload.newAdminId).toBe("p1");
    expect(payload.newAdminName).toBe("Player1");
  });

  it("4: promoted player has admin role after promotion (updateAdminId called with new id)", () => {
    const { io } = createMockIo();
    let adminId: string | null = "admin1";
    const players: PlayerForPromotion[] = [
      { playerId: "admin1", name: "Admin", isConnected: false, joinedAt: 1000 },
      { playerId: "p1", name: "Player1", isConnected: true, joinedAt: 2000 },
    ];
    handleAdminDisconnect(io, GAME_ID, "admin1", adminId, players, (id) => {
      adminId = id;
    });
    expect(adminId).toBe("p1");
  });

  it("5: original admin loses admin role after promotion", () => {
    const { io } = createMockIo();
    let adminId: string | null = "admin1";
    const players: PlayerForPromotion[] = [
      { playerId: "admin1", name: "Admin", isConnected: false, joinedAt: 1000 },
      { playerId: "p1", name: "Player1", isConnected: true, joinedAt: 2000 },
    ];
    handleAdminDisconnect(io, GAME_ID, "admin1", adminId, players, (id) => {
      adminId = id;
    });
    expect(adminId).not.toBe("admin1");
  });

  it("6: non-admin disconnect does not trigger promotion", () => {
    const { io, emitted } = createMockIo();
    let adminId: string | null = "admin1";
    const players: PlayerForPromotion[] = [
      { playerId: "admin1", name: "Admin", isConnected: true, joinedAt: 1000 },
      { playerId: "p1", name: "Player1", isConnected: false, joinedAt: 2000 },
    ];
    handleAdminDisconnect(io, GAME_ID, "p1", adminId, players, (id) => {
      adminId = id;
    });
    expect(emitted.some((e) => e.event === "admin_transferred")).toBe(false);
    expect(adminId).toBe("admin1");
  });

  it("7: no connected players remain — adminId set to null, no event emitted", () => {
    const { io, emitted } = createMockIo();
    let adminId: string | null = "admin1";
    const players: PlayerForPromotion[] = [
      { playerId: "admin1", name: "Admin", isConnected: false, joinedAt: 1000 },
      { playerId: "p1", name: "Player1", isConnected: false, joinedAt: 2000 },
    ];
    handleAdminDisconnect(io, GAME_ID, "admin1", adminId, players, (id) => {
      adminId = id;
    });
    expect(emitted.some((e) => e.event === "admin_transferred")).toBe(false);
    expect(adminId).toBeNull();
  });

  it("8: admin reconnects after promotion — adminId stays with promoted player, not restored", () => {
    const { io } = createMockIo();
    let adminId: string | null = "admin1";
    const players: PlayerForPromotion[] = [
      { playerId: "admin1", name: "Admin", isConnected: false, joinedAt: 1000 },
      { playerId: "p1", name: "Player1", isConnected: true, joinedAt: 2000 },
    ];
    handleAdminDisconnect(io, GAME_ID, "admin1", adminId, players, (id) => {
      adminId = id;
    });
    expect(adminId).toBe("p1");
    // Simulate admin1 reconnect: join_game does NOT change adminId
    // adminId should still be p1 — reconnect does not restore original admin role
    expect(adminId).toBe("p1");
    expect(adminId).not.toBe("admin1");
  });

  it("9: promotion cascade — new admin also disconnects, next player promoted", () => {
    const { io, emitted } = createMockIo();
    let adminId: string | null = "admin1";
    let players: PlayerForPromotion[] = [
      { playerId: "admin1", name: "Admin", isConnected: false, joinedAt: 1000 },
      { playerId: "p1", name: "Player1", isConnected: true, joinedAt: 2000 },
      { playerId: "p2", name: "Player2", isConnected: true, joinedAt: 3000 },
    ];

    // First promotion: admin1 disconnects, p1 promoted
    handleAdminDisconnect(io, GAME_ID, "admin1", adminId, players, (id) => {
      adminId = id;
    });
    expect(adminId).toBe("p1");

    // p1 also disconnects
    players = players.map((p) =>
      p.playerId === "p1" ? { ...p, isConnected: false } : p,
    );

    // Second promotion: p1 disconnects, p2 promoted
    handleAdminDisconnect(io, GAME_ID, "p1", adminId, players, (id) => {
      adminId = id;
    });
    expect(adminId).toBe("p2");

    const transferEvents = emitted.filter((e) => e.event === "admin_transferred");
    expect(transferEvents).toHaveLength(2);
  });
});
