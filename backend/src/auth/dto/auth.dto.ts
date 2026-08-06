import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Length, Matches } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'demo', description: 'Username' })
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @Length(3, 50)
  username!: string;

  @ApiProperty({ example: 'User@12345', description: 'Password' })
  @IsString()
  @Length(8, 128)
  password!: string;

  @ApiProperty({ example: 'ABCD', description: 'CAPTCHA response (optional in dev)' })
  @IsString()
  @Matches(/^[a-zA-Z0-9]{4,6}$/)
  captcha!: string;
}

export class RefreshDto {
  @ApiProperty({ description: 'Refresh token value' })
  @IsString()
  @Length(50, 512)
  refreshToken!: string;
}

export class RegisterDto {
  @ApiProperty({ example: 'newuser' })
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @Length(3, 50)
  @Matches(/^[a-zA-Z0-9._-]+$/, { message: 'Username may only contain letters, numbers, . _ -' })
  username!: string;

  @ApiProperty({ example: 'newuser@example.com' })
  @IsString()
  @Matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, { message: 'A valid e-mail is required' })
  email!: string;

  @ApiProperty({
    example: 'Str0ng!Passw0rd',
    description: 'Min 8 chars, upper, lower, number, special char',
  })
  @IsString()
  @Length(8, 128)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/,
    {
      message:
        'Password must contain at least one uppercase, one lowercase, one number and one special character',
    },
  )
  password!: string;
}

export class ChangePasswordDto {
  @ApiProperty({ description: 'Current password' })
  @IsString()
  @Length(8, 128)
  currentPassword!: string;

  @ApiProperty({ description: 'New password' })
  @IsString()
  @Length(8, 128)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/,
    { message: 'Password must contain upper, lower, number and special character' },
  )
  newPassword!: string;

  @ApiProperty({ description: 'Confirm new password (must match)' })
  @IsString()
  @Length(8, 128)
  confirmPassword!: string;
}