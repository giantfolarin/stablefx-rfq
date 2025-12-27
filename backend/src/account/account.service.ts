import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AccountService {
  constructor(private prisma: PrismaService) {}

  async getDefaultAccount() {
    return this.prisma.account.findUnique({
      where: { email: 'demo@stablefx.local' },
      include: { balances: true },
    });
  }

  async getAccount(id: string) {
    return this.prisma.account.findUnique({
      where: { id },
      include: { balances: true },
    });
  }
}
