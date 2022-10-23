import { AuthDto } from './dto/auth.dto';
import { PrismaService } from './../prisma/prisma.service';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';
import { Msg, Jwt } from './interfaces/auth.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService
  ) {}
  async singUp(dto: AuthDto): Promise<Msg> {
    const hashed = await bcrypt.hash(dto.password, 12)
    try {
      await this.prisma.user.create({
        data: {
          email: dto.email,
          hashedPassword: hashed
        }
      });
      return {
        message: 'ok'
      };
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ForbiddenException('This email is already taken');
        }
      }
      throw error;
    }
  }
  async login(dto: AuthDto): Promise<Jwt> {
    /*
    まずは、emailアドレスでユーザーが存在しているかどうか、確認する
    いなければ、ForbiddenExceptionをthrowする
    */
    const user = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      }
    });
    if (!user) throw new ForbiddenException('Email or password incorrect')
    /*
    ユーザーが確認できたら、次にパスワードが一致しているか確認する
    dtoで渡されたパスワードとDBから取得したuserのhash化されたパスワードを比較する
    */
    const isValid = await bcrypt.compare(dto.password, user.hashedPassword)
    if (!isValid) throw new ForbiddenException('Email or password incorrect')
    return this.generateJwt(user.id, user.email)

  }
  async generateJwt(userId: number, email: string): Promise<Jwt> {
    const payload = {
      sub: userId,
      email,
    };
    const secret = this.config.get('JWT_SECRET');
    const token = await this.jwt.signAsync(payload, {
      expiresIn: '5m',
      secret: secret,
    })
    return {
      accessToken: token
    }
  }

}
