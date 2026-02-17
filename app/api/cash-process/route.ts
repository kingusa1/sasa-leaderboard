import { NextResponse } from 'next/server';
import { assignCashVoucher } from '@/lib/sheets';
import type { PlanKey } from '@/lib/sheets';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { clientName, clientPhone, clientEmail, salesPerson, plan } = body;

    if (!clientName || !clientPhone || !clientEmail || !salesPerson || !plan) {
      return NextResponse.json(
        { success: false, error: 'All fields are required' },
        { status: 400 }
      );
    }

    const validPlans: PlanKey[] = ['3month', '6month', '12month'];
    if (!validPlans.includes(plan)) {
      return NextResponse.json(
        { success: false, error: 'Invalid plan' },
        { status: 400 }
      );
    }

    const result = await assignCashVoucher({
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim(),
      clientEmail: clientEmail.trim(),
      salesPerson: salesPerson.trim(),
      plan,
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 409 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Cash process error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
