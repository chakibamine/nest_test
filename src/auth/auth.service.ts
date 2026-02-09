import { Body, Injectable } from '@nestjs/common';
import { User } from 'src/user/entities/user.entity';
import { UserService } from 'src/user/user.service';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { CustomLoggerService } from 'src/common/logger/custom-logger.service';
import * as bcrypt from 'bcrypt';


@Injectable()
export class AuthService {
    constructor(private readonly userService: UserService,
        private readonly jwtService: JwtService,
        private readonly logger: CustomLoggerService) {
        this.logger.setContext('AuthService');
    }

    async signIn(@Body() signInDto: CreateUserDto) {
        const user = await this.userService.findOnebyemail(signInDto.email);
        if (!user) {
            throw new Error('User not found');
        }
        const isPasswordMatched = await bcrypt.compare(signInDto.password, user.password);
        if (!isPasswordMatched) {
            throw new Error('Invalid password');
        }
        const { password: _, ...result } = user;
        const payload = { sub: user.name, email: user.email, role: user.role };
        const token = await this.jwtService.signAsync(payload);
        return {
            user: {
                name: user.name,
                email: user.email,
                role: user.role
            }, token
        };
    }
}
