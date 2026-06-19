"use client";

import { useState } from "react";
import { Button } from "@/components/shared/Button";
import { Input } from "@/components/shared/Input";
import { Modal } from "@/components/shared/Modal";
import { MIN_PASSWORD_LENGTH } from "@/lib/constants";

interface CreateRoomDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (password: string, roomName: string) => void;
  defaultName?: string;
  title?: string;
}

export function CreateRoomDialog({
  open,
  onClose,
  onConfirm,
  defaultName = "",
  title = "Создать комнату",
}: CreateRoomDialogProps) {
  const [password, setPassword] = useState("");
  const [roomName, setRoomName] = useState(defaultName);
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Минимум ${MIN_PASSWORD_LENGTH} символов`);
      return;
    }
    onConfirm(password, roomName || defaultName);
    setPassword("");
    setError("");
  };

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-5">
        <h3 className="text-xl font-bold">{title}</h3>
        <p className="text-sm text-zinc-400">
          Пароль используется для входа друзей и генерации E2E-ключа. Сервер его не хранит.
        </p>
        <Input
          label="Название комнаты"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          placeholder="Попкорн-пати..."
        />
        <Input
          label={`Пароль (мин. ${MIN_PASSWORD_LENGTH} символов)`}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
        {error && <p className="text-rose-400 text-sm">{error}</p>}
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Отмена
          </Button>
          <Button className="flex-1" onClick={handleSubmit}>
            Создать
          </Button>
        </div>
      </div>
    </Modal>
  );
}

interface JoinRoomDialogProps {
  open: boolean;
  onClose: () => void;
  roomId: string;
  onConfirm: (password: string) => void;
}

export function JoinRoomDialog({ open, onClose, roomId, onConfirm }: JoinRoomDialogProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Минимум ${MIN_PASSWORD_LENGTH} символов`);
      return;
    }
    onConfirm(password);
    setPassword("");
    setError("");
  };

  return (
    <Modal open={open} onClose={onClose} title="Войти в комнату">
      <div className="space-y-5">
        <h3 className="text-xl font-bold">Войти в комнату</h3>
        <p className="text-sm text-zinc-400 font-mono">ID: {roomId}</p>
        <Input
          label="Пароль комнаты"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
        {error && <p className="text-rose-400 text-sm">{error}</p>}
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Отмена
          </Button>
          <Button className="flex-1" onClick={handleSubmit}>
            Войти
          </Button>
        </div>
      </div>
    </Modal>
  );
}
