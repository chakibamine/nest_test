import { Body, Controller, Get, HttpCode, HttpStatus, Post, Request, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { AuthGuard } from './auth.guard';
import { Public } from './SkipAuth';
import { Roles } from 'src/role/roles.decorator';
import { Role } from 'src/role/role.enum';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Public()
    @HttpCode(HttpStatus.OK)
    @Post('login')
    async signIn(@Body() signInDto: CreateUserDto) {
        return this.authService.signIn(signInDto);
    }


    @UseGuards(AuthGuard)
    @Get('profile')
    getProfile(@Request() req) {
        return req.user;
    }

    @Roles(Role.Admin)
    @UseGuards(AuthGuard)
    @Get('admin')
    admin() {
        return 'admin';
    }

    @Roles(Role.User)
    @UseGuards(AuthGuard)
    @Get('user')
    user() {
        return 'user';
    }
}
