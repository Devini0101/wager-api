import { IsString, IsNotEmpty, IsEnum, ValidateNested, IsOptional, Length } from 'class-validator';
import { Type } from 'class-transformer';
import { WagerTransactionKind } from '../../domain/entities/wager-transaction.entity';

export class MoneyDto {
  @IsString()
  @IsNotEmpty()
  amount: string;

  @IsString()
  @Length(3, 3)
  currency: string;
}

export class CreateWagerTransactionDto {
  @IsString() @IsNotEmpty()
  providerId: string;

  @IsString()
  @IsNotEmpty()
  externalTransactionId: string;

  @IsString()
  @IsNotEmpty()
  playerId: string;

  @IsString()
  @IsNotEmpty()
  walletId: string;

  @IsString()
  @IsNotEmpty()
  roundId: string;

  @IsString()
  @IsNotEmpty()
  gameId: string;

  @IsEnum(WagerTransactionKind)
  kind: WagerTransactionKind;

  // @ValidateNested tells nest to validate daughter class also
  @ValidateNested()
  @Type(() => MoneyDto)
  money: MoneyDto;

  @IsOptional()
  @IsString()
  referenceExternalTransactionId?: string;
}