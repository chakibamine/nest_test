import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/user/user.service';
import { Socket } from 'socket.io';

@Injectable()
export class WsAuthGuard implements CanActivate {
    constructor(
        private jwtService: JwtService,
        private userService: UserService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        try {
            const client: Socket = context.switchToWs().getClient();

            // Try to get token from auth object (newer Postman) or query params (older Postman)
            const token = client.handshake?.auth?.token || client.handshake?.query?.token;

            if (!token) {
                throw new WsException('Unauthorized: No token provided');
            }

            // Validate JWT token
            const payload = await this.jwtService.verifyAsync(token as string, {
                secret: 'secretKey',
            });

            // Fetch full user data from database
            const user = await this.userService.findOnebyemail(payload.email);

            if (!user) {
                throw new WsException('Unauthorized: User not found');
            }

            // Attach user to socket for use in gateway
            client.data.user = {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            };

            return true;
        } catch (error) {
            throw new WsException(error.message || 'Unauthorized: Invalid or expired token');
        }
    }
}