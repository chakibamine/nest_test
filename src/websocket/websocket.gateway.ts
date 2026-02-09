import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    ConnectedSocket,
    MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WsAuthGuard } from './ws-auth.guard';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/user/user.service';

@WebSocketGateway({
    cors: {
        origin: '*', // Configure appropriately for production
    },
    namespace: '/ws', // Optional: add namespace
})
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private logger = new Logger('WebsocketGateway');
    private connectedClients = new Map<string, Socket>();
    private connectedUsers = new Map<number, Socket>(); // Track users by user ID

    constructor(
        private jwtService: JwtService,
        private userService: UserService,
    ) { }

    @UseGuards(WsAuthGuard)
    async handleConnection(client: Socket) {
        // Fallback: Guards don't always execute reliably for WebSocket connections
        // So we manually validate if user data is missing
        if (!client.data.user) {
            try {
                const token = client.handshake?.auth?.token || client.handshake?.query?.token;

                if (!token) {
                    this.logger.error(`Connection rejected: No token provided`);
                    client.disconnect();
                    return;
                }

                // Validate JWT token
                const payload = await this.jwtService.verifyAsync(token as string, {
                    secret: 'secretKey', // Use your actual JWT secret
                });

                // Fetch full user data from database
                const user = await this.userService.findOnebyemail(payload.email);

                if (!user) {
                    this.logger.error(`Connection rejected: User not found for email ${payload.email}`);
                    client.disconnect();
                    return;
                }

                // Attach user to socket
                client.data.user = {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                };
            } catch (error) {
                this.logger.error(`Connection rejected: ${error.message}`);
                client.disconnect();
                return;
            }
        }

        // At this point, user data is guaranteed to be attached
        const user = client.data.user;

        this.logger.log(`Client connected: ${client.id}`);
        this.logger.log(`User: ${user.email} (ID: ${user.id}) - Role: ${user.role}`);

        this.connectedClients.set(client.id, client);
        this.connectedUsers.set(user.id, client);
    }


    handleDisconnect(client: Socket) {
        const user = client.data.user;
        this.logger.log(`Client disconnected: ${client.id}`);
        if (user) {
            this.logger.log(`User disconnected: ${user.email} (ID: ${user.id})`);
            this.connectedUsers.delete(user.id);
        }
        this.connectedClients.delete(client.id);
    }

    // Emit to all clients
    broadcastToAll(event: string, data: any) {
        this.server.emit(event, data);
    }

    // Emit to specific client by socket ID
    emitToClient(clientId: string, event: string, data: any) {
        const client = this.connectedClients.get(clientId);
        if (client) {
            client.emit(event, data);
        }
    }

    // Emit to specific user by user ID
    emitToUser(userId: number, event: string, data: any) {
        const client = this.connectedUsers.get(userId);
        if (client) {
            client.emit(event, data);
            this.logger.log(`Emitted '${event}' to user ID: ${userId}`);
        } else {
            this.logger.warn(`User ID ${userId} not connected`);
        }
    }

    // Emit to specific room
    emitToRoom(room: string, event: string, data: any) {
        this.server.to(room).emit(event, data);
    }

    @OnEvent('user.created')
    handleUserCreated(payload: any) {
        this.broadcastToAll('user:created', payload);
    }

    @OnEvent('order.updated')
    handleOrderUpdated(payload: any) {
        this.emitToRoom(`order:${payload.orderId}`, 'order:updated', payload);
    }
}