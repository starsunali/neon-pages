import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';

export class CreatePageDto {
  @ApiProperty({ example: 'my-product' })
  @IsString()
  @Length(3, 80)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must be lowercase alphanumeric, hyphens only, no leading/trailing hyphen',
  })
  slug!: string;

  @ApiProperty({ example: 'My Product' })
  @IsString()
  @Length(1, 220)
  title!: string;

  @ApiProperty({ example: '## Overview\nPublic page content in Markdown.' })
  @IsString()
  @MaxLength(100_000)
  content!: string;

  @ApiPropertyOptional({ example: 'My Product — SEO title' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  seoTitle?: string;

  @ApiPropertyOptional({ example: 'Short description for search engines.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class UpdatePageDto {
  @ApiPropertyOptional({ example: 'My Updated Product' })
  @IsOptional()
  @IsString()
  @Length(3, 220)
  title?: string;

  @ApiPropertyOptional({ example: '## Updated content' })
  @IsOptional()
  @IsString()
  @MaxLength(100_000)
  content?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  seoTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class SlugParamDto {
  @ApiProperty({ example: 'my-product' })
  @IsNotEmpty()
  @IsString()
  slug!: string;
}