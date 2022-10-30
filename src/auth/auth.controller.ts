import { AuthDto } from './dto/auth.dto';
import { AuthService } from './auth.service';
import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { Msg, Csrf } from './interfaces/auth.interface';
import { Request, Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  
  @Get('/csrf')
  getCsrfToken(@Req() req: Request): Csrf {
    return { csrfToken: req.csrfToken() }
  }

  @Post('signup')
  singUp(@Body() dto: AuthDto): Promise<Msg> {
    return this.authService.singUp(dto)
  }

  // nestのpostメソッドを使うと全て201番のcreateが返されてしまうので、以下の記述で200番に変更している
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() dto: AuthDto,
    @Res({passthrough: true}) res: Response // expressのResponseの型を使うことでcookieが使える
  ): Promise<Msg> {
    const jwt = await this.authService.login(dto);
    res.cookie('access_token', jwt.accessToken, {
      httpOnly: true,
      secure: true, // localのみfalseとしておく　httpsできるようにtrueを設定する
      sameSite: 'none',
      path: '/'
    })
    return {
      message: 'ok'
    }
  }

  @HttpCode(HttpStatus.OK)
  @Post('/logout')
  logout(
    @Req() req: Request,
    @Res({passthrough: true}) res: Response
  ) {
    res.cookie('access_token', '', {
      httpOnly: true,
      secure: true, // localのみfalseとしておく　httpsできるようにtrueを設定する
      sameSite: 'none',
      path: '/'
    })
    return {
      message: 'ok'
    }
  }
}
