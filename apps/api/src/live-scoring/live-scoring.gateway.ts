import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { PrismaService } from '../database/prisma.service';

type JoinGamePayload = { gameId: string; lastKnownVersion?: number };

@WebSocketGateway({
  namespace: '/live',
  path: '/live/socket.io',
  cors: false,
  transports: ['websocket'],
})
export class LiveScoringGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(LiveScoringGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly prisma: PrismaService) {}

  handleConnection(client: Socket): void {
    this.logger.debug({ message: 'Realtime client connected', socketId: client.id });
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug({ message: 'Realtime client disconnected', socketId: client.id });
  }

  @SubscribeMessage('game.join')
  async joinGame(client: Socket, payload: JoinGamePayload | undefined) {
    if (!payload || typeof payload.gameId !== 'string')
      return { ok: false, code: 'INVALID_REQUEST' };
    const game = await this.prisma.game.findFirst({
      where: { id: payload.gameId, published: true, deletedAt: null },
      include: {
        homeTeam: { select: { id: true, name: true, shortName: true } },
        awayTeam: { select: { id: true, name: true, shortName: true } },
        periods: { orderBy: { periodNumber: 'asc' } },
      },
    });
    if (!game) return { ok: false, code: 'GAME_NOT_FOUND' };
    await client.join(`game:${game.id}`);
    return {
      ok: true,
      resynchronized: payload.lastKnownVersion !== game.version,
      game: {
        id: game.id,
        scheduledAt: game.scheduledAt,
        status: game.status,
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        homeScore: game.homeScore,
        awayScore: game.awayScore,
        currentPeriod: game.currentPeriod,
        version: game.version,
        lastEventSequence: game.lastEventSequence,
        periods: game.periods,
      },
    };
  }

  broadcastCommittedGame(gameId: string, payload: object): void {
    this.server.to(`game:${gameId}`).emit('game.updated', payload);
  }
}
