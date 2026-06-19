"use client";

import { useCallback, useEffect, useState } from "react";
import type { Socket } from "socket.io-client";
import { hashPassword } from "@/lib/crypto/aesGcm";
import { MIN_PASSWORD_LENGTH } from "@/lib/constants";
import type { PublicRoom, RoomMeta } from "@/lib/types";

interface UseRoomOptions {
  socket: Socket | null;
  onJoinOk?: (data: { roomId: string; meta: RoomMeta; isHost: boolean }) => void;
  onJoinDenied?: (message: string) => void;
}

export function useRoom({ socket, onJoinOk, onJoinDenied }: UseRoomOptions) {
  const [activeRooms, setActiveRooms] = useState<PublicRoom[]>([]);
  const [roomUsers, setRoomUsers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!socket) return;

    socket.on("init_data", ({ rooms }: { rooms: PublicRoom[] }) => {
      setActiveRooms(rooms);
    });

    socket.on("rooms_list_update", (rooms: PublicRoom[]) => {
      setActiveRooms(rooms);
    });

    socket.on("room_users", (users: string[]) => {
      setRoomUsers(users);
    });

    socket.on("join_ok", (data: { roomId: string; meta: RoomMeta; isHost: boolean }) => {
      setError(null);
      onJoinOk?.(data);
    });

    socket.on("join_denied", ({ message }: { message: string }) => {
      setError(message);
      onJoinDenied?.(message);
    });

    socket.on("room_error", ({ message }: { message: string }) => {
      setError(message);
    });

    return () => {
      socket.off("init_data");
      socket.off("rooms_list_update");
      socket.off("room_users");
      socket.off("join_ok");
      socket.off("join_denied");
      socket.off("room_error");
    };
  }, [socket, onJoinOk, onJoinDenied]);

  const validatePassword = (password: string) => password.length >= MIN_PASSWORD_LENGTH;

  const createRoom = useCallback(
    async (params: {
      roomId: string;
      password: string;
      roomName: string;
      hostUserId: string;
      nickname: string;
      meta: RoomMeta;
    }) => {
      if (!socket) return;
      if (!validatePassword(params.password)) {
        setError(`Пароль должен быть не менее ${MIN_PASSWORD_LENGTH} символов`);
        return;
      }
      const passwordHash = await hashPassword(params.password, params.roomId);
      socket.emit("create_room", {
        roomId: params.roomId,
        passwordHash,
        roomName: params.roomName,
        hostUserId: params.hostUserId,
        nickname: params.nickname,
        meta: params.meta,
      });
    },
    [socket]
  );

  const joinRoom = useCallback(
    async (params: {
      roomId: string;
      password: string;
      nickname: string;
      userId: string;
    }) => {
      if (!socket) return;
      if (!validatePassword(params.password)) {
        setError(`Пароль должен быть не менее ${MIN_PASSWORD_LENGTH} символов`);
        return;
      }
      const passwordHash = await hashPassword(params.password, params.roomId);
      socket.emit("join_room", {
        roomId: params.roomId,
        passwordHash,
        nickname: params.nickname,
        userId: params.userId,
      });
    },
    [socket]
  );

  const leaveRoom = useCallback(
    (roomId: string) => {
      socket?.emit("leave_room", { roomId });
      setRoomUsers([]);
    },
    [socket]
  );

  return {
    activeRooms,
    roomUsers,
    error,
    createRoom,
    joinRoom,
    leaveRoom,
    validatePassword,
  };
}
